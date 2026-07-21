/*
 * Minimal RFC-4180 CSV parser + the tolerant value cleaners ported from the
 * original PHP importer. Handles quoted fields with embedded commas, quotes
 * ("" escape), and newlines — needed for real spreadsheet exports.
 */

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  // Normalize newlines.
  const s = text.replace(/\r\n?/g, "\n");

  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }
  // Trailing field/row (no final newline).
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/** "1,234" → 1234, "45.0%" → 45, "–"/"" → null */
export function cleanNumber(v: string | null | undefined): number | null {
  let s = String(v ?? "").trim();
  s = s.replace(/[,%\s]/g, "");
  if (s === "" || s === "–" || s === "—" || s === "-" || s.toUpperCase() === "#N/A") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Accepts Y-m-d, "Jan'25", "Jan 2025", "2025-01" → YYYY-MM-DD (months → 1st). */
export function cleanDate(v: string | null | undefined): string | null {
  let s = String(v ?? "").trim().replace(/^[*†\s]+|[*†\s]+$/g, "");
  if (s === "") return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const ym = s.match(/^(\d{4})-(\d{2})$/);
  if (ym) return `${ym[1]}-${ym[2]}-01`;
  const mon = s.match(/^([A-Za-z]{3,9})\s*['’]?\s*(\d{2,4})$/u);
  if (mon) {
    const year = mon[2].length === 2 ? "20" + mon[2] : mon[2];
    const m = MONTHS[mon[1].slice(0, 3).toLowerCase()];
    if (m) return `${year}-${String(m).padStart(2, "0")}-01`;
  }
  // Only fall back to the lenient parser for strings that actually look like a
  // date: a month name, or slash/dash-separated numbers. This stops bare
  // decimals/percentages ("11.0", "1.24%") from being misread as dates — JS
  // Date.parse is far more permissive than PHP's strtotime.
  if (/%/.test(s) || !(/[A-Za-z]/.test(s) || /^\d{1,4}[/-]\d{1,2}([/-]\d{1,4})?$/.test(s))) {
    return null;
  }
  const ts = Date.parse(s);
  if (!Number.isNaN(ts)) {
    const d = new Date(ts);
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(
      d.getUTCDate(),
    ).padStart(2, "0")}`;
  }
  return null;
}

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

/** Normalize a header to a comparison key: "Total users" → "total_users". */
export function normalizeHeader(h: string): string {
  return h
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}
