import { sqlite } from "@/lib/db/client";
import { cleanDate, cleanNumber, normalizeHeader, parseCsv } from "./csv";
import { DATASETS, getDataset, type Dataset, type Field } from "./config";

export type ImportResult = { ok: number; skipped: number; errors: string[] };
export type RowInput = Record<string, string | null | undefined>;

function castValue(field: Field, raw: string | null | undefined): string | number | null {
  switch (field.type) {
    case "date":
      return cleanDate(raw);
    case "int": {
      const n = cleanNumber(raw);
      return n === null ? 0 : Math.round(n);
    }
    case "float": {
      const n = cleanNumber(raw);
      return n === null ? 0 : n;
    }
    default: {
      const v = String(raw ?? "").trim();
      return v === "" ? null : v;
    }
  }
}

/** Resolve a lookup field to its foreign id, accepting either the raw id or the natural key. */
function resolveLookup(field: Field, raw: string | null | undefined): number {
  const [table, matchCol, idCol] = field.lookup!;
  const needle = String(raw ?? "").trim();
  if (needle === "") throw new Error(`Missing value for lookup`);
  if (/^\d+$/.test(needle)) {
    const hit = sqlite.prepare(`SELECT COUNT(*) c FROM ${table} WHERE ${idCol} = ?`).get(needle) as { c: number };
    if (hit.c > 0) return Number(needle);
  }
  const row = sqlite
    .prepare(
      `SELECT ${idCol} id FROM ${table} WHERE LOWER(${matchCol}) = LOWER(?) OR ${matchCol} LIKE ? ORDER BY LENGTH(${matchCol}) LIMIT 1`,
    )
    .get(needle, "%" + needle) as { id: number } | undefined;
  if (!row) throw new Error(`No match in ${table} for "${needle}"`);
  return Number(row.id);
}

/** Add or update one row (upsert by the dataset's natural key). */
export function upsertRow(setKey: string, input: RowInput): void {
  const set = getDataset(setKey);
  if (!set || set.matrix || !set.fields || !set.table || !set.unique) {
    throw new Error(`Unknown dataset: ${setKey}`);
  }
  const row: Record<string, string | number | null> = {};
  for (const [name, field] of Object.entries(set.fields)) {
    if (field.totalsOnly) continue;
    const provided = Object.prototype.hasOwnProperty.call(input, name);
    if (!provided && !field.required) continue;
    const raw = input[name];
    if (field.type === "lookup") {
      row[name] = resolveLookup(field, raw);
      continue;
    }
    const value = castValue(field, raw);
    if (field.required && (value === null || value === "")) {
      throw new Error(`Missing required field: ${name}`);
    }
    if (field.type === "select" && value !== null && !field.options!.includes(String(value))) {
      throw new Error(`Invalid value "${value}" for ${name} (allowed: ${field.options!.join(", ")})`);
    }
    row[name] = value;
  }

  const cols = Object.keys(row);
  const updates = cols.filter((c) => !set.unique!.includes(c));
  const setClause = (updates.length ? updates : set.unique).map((c) => `${c} = excluded.${c}`).join(", ");
  const sql = `INSERT INTO ${set.table} (${cols.join(", ")}) VALUES (${cols.map(() => "?").join(", ")}) ON CONFLICT(${set.unique.join(", ")}) DO UPDATE SET ${setClause}`;
  sqlite.prepare(sql).run(...cols.map((c) => row[c]));
}

/** Write a long-format Total rollup row to a site-totals table (keyed by date). */
function upsertTotals(cfg: { table: string; columns: string[] }, input: RowInput): boolean {
  const date = cleanDate(input.date);
  if (!date) return false;
  const vals: Record<string, number> = {};
  for (const col of cfg.columns) {
    if (Object.prototype.hasOwnProperty.call(input, col)) {
      const n = cleanNumber(input[col]);
      if (n !== null) vals[col] = Math.round(n * 100) / 100;
    }
  }
  const keys = Object.keys(vals);
  if (!keys.length) return false;
  const cols = ["date", ...keys];
  const setClause = keys.map((c) => `${c} = excluded.${c}`).join(", ");
  const sql = `INSERT INTO ${cfg.table} (${cols.join(", ")}) VALUES (${cols.map(() => "?").join(", ")}) ON CONFLICT(date) DO UPDATE SET ${setClause}`;
  sqlite.prepare(sql).run(date, ...keys.map((k) => vals[k]));
  return true;
}

export type ImportOptions = { defaults?: Record<string, string>; measure?: string };

/** Import a CSV string into a dataset. Tolerant of spreadsheet exports. */
export function importCsv(setKey: string, text: string, options: ImportOptions = {}): ImportResult {
  const set = getDataset(setKey);
  if (!set) throw new Error(`Unknown dataset: ${setKey}`);
  if (set.matrix) {
    return set.matrix === "gsc" ? importGscMatrix(text) : importChannelMatrix(text, options.measure ?? "sessions");
  }
  const fields = set.fields!;
  const rows = parseCsv(text);

  // Alias map: normalized header → field name.
  const aliasMap: Record<string, string> = {};
  for (const [name, field] of Object.entries(fields)) {
    aliasMap[normalizeHeader(name)] = name;
    if (field.label) aliasMap[normalizeHeader(field.label)] = name;
    for (const a of field.aliases ?? []) aliasMap[normalizeHeader(a)] = name;
  }

  // Find the header row (skips leading title rows); first match wins per field.
  let columns: Record<number, string> | null = null;
  let start = 0;
  for (let r = 0; r < rows.length; r++) {
    const mapped: Record<number, string> = {};
    const seen = new Set<string>();
    rows[r].forEach((h, i) => {
      const key = normalizeHeader(String(h));
      if (aliasMap[key] && !seen.has(aliasMap[key])) {
        mapped[i] = aliasMap[key];
        seen.add(aliasMap[key]);
      }
    });
    if (Object.keys(mapped).length >= 2) {
      columns = mapped;
      start = r + 1;
      break;
    }
  }
  if (!columns) {
    throw new Error("Could not find a header row matching this dataset. Download the template for the expected columns.");
  }

  let ok = 0;
  let skipped = 0;
  const errors: string[] = [];
  const defaults = options.defaults ?? {};

  for (let r = start; r < rows.length; r++) {
    const cells = rows[r];
    const input: RowInput = {};
    for (const [i, field] of Object.entries(columns)) input[field] = cells[Number(i)] ?? null;

    if (Object.values(input).every((v) => String(v ?? "").trim() === "")) {
      skipped++;
      continue;
    }
    for (const [field, value] of Object.entries(defaults)) {
      if (!input[field] || String(input[field]).trim() === "") input[field] = value;
    }
    // Total rollup rows → site totals (or skip when no totals config).
    if (set.rowFilter === "channel_not_total" && String(input.channel ?? "").trim().toLowerCase() === "total") {
      if (set.totals && upsertTotals(set.totals, input)) ok++;
      else skipped++;
      continue;
    }
    try {
      upsertRow(setKey, input);
      ok++;
    } catch (e) {
      skipped++;
      if (errors.length < 5) errors.push(`Row ${r + 1}: ${(e as Error).message}`);
    }
  }
  return { ok, skipped, errors };
}

/* ---------- Matrix importers (wide "months as columns" exports) ---------- */

function isBlankRow(cells: string[]): boolean {
  return cells.every((c) => String(c ?? "").trim() === "");
}

/** column index → YYYY-MM-01, from a month header row. */
function monthColumns(cells: string[]): Record<number, string> {
  const months: Record<number, string> = {};
  cells.forEach((cell, i) => {
    if (i === 0) return;
    const d = cleanDate(String(cell));
    if (d && /-01$/.test(d)) months[i] = d;
  });
  return Object.keys(months).length >= 2 ? months : {};
}

function importGscMatrix(text: string): ImportResult {
  const metricMap: Record<string, string> = {
    clicks: "clicks",
    impressions: "impressions",
    ctr: "ctr",
    avg_position: "position",
    position: "position",
    avg_pos: "position",
    average_position: "position",
  };
  const rows = parseCsv(text);
  let months: Record<number, string> = {};
  const data: Record<string, Record<string, number>> = {};
  for (const cells of rows) {
    if (isBlankRow(cells)) {
      months = {};
      continue;
    }
    const m = monthColumns(cells);
    if (Object.keys(m).length) {
      months = m;
      continue;
    }
    if (!Object.keys(months).length) continue;
    const label = metricMap[normalizeHeader(String(cells[0] ?? ""))];
    if (!label) continue;
    for (const [i, date] of Object.entries(months)) {
      const n = cleanNumber(cells[Number(i)]);
      if (n !== null) (data[date] ??= {})[label] = n;
    }
  }
  const dates = Object.keys(data);
  if (!dates.length) throw new Error("No Clicks/Impressions/CTR/Avg. position rows with month columns found.");
  const stmt = sqlite.prepare(
    `INSERT INTO gsc_daily (date, clicks, impressions, ctr, position) VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(date) DO UPDATE SET clicks = excluded.clicks, impressions = excluded.impressions, ctr = excluded.ctr, position = excluded.position`,
  );
  for (const date of dates) {
    const v = data[date];
    stmt.run(date, Math.round(v.clicks ?? 0), Math.round(v.impressions ?? 0), round2(v.ctr ?? 0), round1(v.position ?? 0));
  }
  return { ok: dates.length, skipped: 0, errors: [] };
}

function importChannelMatrix(text: string, measure: string): ImportResult {
  const col = ["sessions", "users", "conversions"].includes(measure) ? measure : "sessions";
  const rows = parseCsv(text);
  let months: Record<number, string> = {};
  let ok = 0;
  let skipped = 0;
  const notChannels = new Set([
    "total", "metric", "channel", "clicks", "impressions", "ctr", "position",
    "avg_position", "average_position", "total_users", "new_users", "returning_users",
  ]);
  const stmt = sqlite.prepare(
    `INSERT INTO ga_channels (date, channel, ${col}) VALUES (?, ?, ?) ON CONFLICT(date, channel) DO UPDATE SET ${col} = excluded.${col}`,
  );
  for (const cells of rows) {
    if (isBlankRow(cells)) {
      months = {};
      continue;
    }
    const m = monthColumns(cells);
    if (Object.keys(m).length) {
      months = m;
      continue;
    }
    if (!Object.keys(months).length) continue;
    const channel = String(cells[0] ?? "").trim();
    if (channel === "" || notChannels.has(normalizeHeader(channel))) {
      skipped++;
      continue;
    }
    let any = false;
    for (const [i, date] of Object.entries(months)) {
      const n = cleanNumber(cells[Number(i)]);
      if (n === null) continue;
      stmt.run(date, channel, Math.round(n));
      any = true;
    }
    any ? ok++ : skipped++;
  }
  if (!ok) throw new Error("No channel rows with month columns found in the file.");
  return { ok, skipped, errors: [] };
}

/* ---------- Templates, recent rows, delete, lookups ---------- */

export function template(setKey: string): string {
  const set = getDataset(setKey);
  if (!set || set.matrix) {
    return setKey === "gsc_monthly"
      ? "Metric,Jan'25,Feb'25,Mar'25\nClicks,\"2,317\",\"2,626\",\"4,051\"\nImpressions,\"186,408\",\"204,914\",\"287,549\"\nCTR,1.24%,1.28%,1.41%\nAvg. position,30.2,29.6,31.4\n"
      : "Channel,Jan'25,Feb'25,Mar'25\nOrganic Search,\"5,730\",\"5,656\",\"6,891\"\nDirect,\"3,491\",\"3,560\",\"4,561\"\n";
  }
  const headers: string[] = [];
  const example: string[] = [];
  for (const [name, field] of Object.entries(set.fields!)) {
    if (field.totalsOnly) continue;
    if (field.type === "lookup") {
      headers.push(field.lookup![1]);
      example.push("existing " + field.lookup![1]);
      continue;
    }
    headers.push(name);
    example.push(
      field.type === "date"
        ? new Date().toISOString().slice(0, 10)
        : field.type === "int"
          ? "123"
          : field.type === "float"
            ? "4.5"
            : field.type === "select"
              ? field.options![0]
              : "text",
    );
  }
  return headers.join(",") + "\n" + example.join(",") + "\n";
}

export function recentRows(setKey: string, limit = 15): Record<string, unknown>[] {
  const set = getDataset(setKey);
  if (!set || set.matrix || !set.table) return [];
  const n = Math.max(1, Math.min(1000, limit));
  return sqlite.prepare(`SELECT rowid AS _rowid, * FROM ${set.table} ORDER BY rowid DESC LIMIT ?`).all(n) as Record<
    string,
    unknown
  >[];
}

export function deleteRow(setKey: string, rowid: number): void {
  const set = getDataset(setKey);
  if (set && !set.matrix && set.table) {
    sqlite.prepare(`DELETE FROM ${set.table} WHERE rowid = ?`).run(rowid);
  }
}

export function lookupOptions(field: Field): { id: number; label: string }[] {
  const [table, matchCol, idCol] = field.lookup!;
  return sqlite
    .prepare(`SELECT ${idCol} id, ${matchCol} label FROM ${table} ORDER BY ${matchCol} LIMIT 500`)
    .all() as { id: number; label: string }[];
}

const round1 = (n: number) => Math.round(n * 10) / 10;
const round2 = (n: number) => Math.round(n * 100) / 100;

export { DATASETS };
