"use server";

import { revalidatePath } from "next/cache";
import { deleteRow, importCsv, upsertRow, type RowInput } from "./datasets/import";
import { ALLOWED_SETTINGS, setSetting } from "./settings";
import { runSource, SYNC_SOURCES } from "./sync/runner";

export type ActionResult = { ok: boolean; message: string } | null;

/** Add / update one row (used with useActionState). */
export async function addRowAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const set = String(formData.get("__set") ?? "");
    const input: RowInput = {};
    for (const [k, v] of formData.entries()) {
      if (!k.startsWith("__")) input[k] = typeof v === "string" ? v : "";
    }
    upsertRow(set, input);
    revalidatePath("/", "layout");
    return { ok: true, message: "Entry saved." };
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}

/** Import a CSV file into a dataset (used with useActionState). */
export async function importCsvAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const set = String(formData.get("__set") ?? "");
    const file = formData.get("csv");
    if (!file || typeof file === "string" || file.size === 0) {
      return { ok: false, message: "Please choose a CSV file." };
    }
    const text = await file.text();
    const opts: { defaults?: Record<string, string>; measure?: string } = {};
    const dt = formData.get("default_type");
    if (dt) opts.defaults = { type: String(dt) };
    const measure = formData.get("measure");
    if (measure) opts.measure = String(measure);
    const r = importCsv(set, text, opts);
    revalidatePath("/", "layout");
    const suffix = r.errors.length ? ` · ${r.errors.slice(0, 3).join(" · ")}` : "";
    return { ok: true, message: `Imported/updated ${r.ok}, skipped ${r.skipped}.${suffix}` };
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}

/** Save the settings fields present in the form (allow-listed). */
export async function saveSettingsAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    for (const key of ALLOWED_SETTINGS) {
      if (formData.has(key)) setSetting(key, String(formData.get(key) ?? "").trim() || null);
    }
    revalidatePath("/", "layout");
    return { ok: true, message: "Settings saved." };
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}

/** Delete one row (plain form action). */
export async function deleteRowAction(formData: FormData): Promise<void> {
  const set = String(formData.get("__set") ?? "");
  const rowid = Number(formData.get("__rowid") ?? 0);
  if (set && rowid) {
    deleteRow(set, rowid);
    revalidatePath("/", "layout");
  }
}

/** Run one data source now (or all). */
export async function runSyncAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const source = String(formData.get("source") ?? "");
    const results = source && SYNC_SOURCES.includes(source as (typeof SYNC_SOURCES)[number])
      ? await runSource(source)
      : { [source || "all"]: { status: "error", message: "unknown source" } };
    revalidatePath("/", "layout");
    const parts = Object.entries(results).map(([k, v]) => `${k}: ${v.status}`);
    const anyError = Object.values(results).some((v) => v.status === "error");
    return { ok: !anyError, message: parts.join(" · ") };
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}

/**
 * Delete tracked keywords (and their ranking history) by id. Content-derived
 * rows on the Keywords page aren't tracked keywords, so they're ignored here —
 * they disappear only when their content item's target keyword is cleared.
 */
export async function deleteKeywordsAction(ids: number[]): Promise<ActionResult> {
  try {
    const clean = ids.map(Number).filter((n) => Number.isInteger(n) && n > 0);
    if (clean.length === 0) return { ok: false, message: "Nothing selected to delete." };
    const { sqlite } = await import("./db/client");
    const placeholders = clean.map(() => "?").join(",");
    sqlite.prepare(`DELETE FROM keyword_rankings WHERE keyword_id IN (${placeholders})`).run(...clean);
    const res = sqlite.prepare(`DELETE FROM keywords WHERE id IN (${placeholders})`).run(...clean);
    revalidatePath("/", "layout");
    return { ok: true, message: `Deleted ${res.changes} keyword${res.changes === 1 ? "" : "s"}.` };
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}

/** Wipe all report data; settings/credentials are kept. */
export async function clearDataAction(): Promise<void> {
  const tables = [
    "content_metrics", "content_items", "gsc_daily", "gsc_queries", "gsc_pages",
    "ga_daily", "ga_channels", "ga_pages", "social_daily", "social_posts",
    "campaign_metrics", "campaigns", "keyword_rankings", "keywords",
    "email_campaigns", "monthly_notes",
  ];
  const { sqlite } = await import("./db/client");
  for (const t of tables) sqlite.prepare(`DELETE FROM ${t}`).run();
  revalidatePath("/", "layout");
}
