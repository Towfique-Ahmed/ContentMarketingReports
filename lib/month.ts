/*
 * Shared helpers for the "grouped by month" report layout (Content, Email,
 * Campaigns, Social). Rows are bucketed by the YYYY-MM of a date field and
 * rendered newest-month-first, mirroring the source spreadsheets.
 */

export function monthKey(d: unknown): string {
  const s = String(d ?? "");
  return /^\d{4}-\d{2}/.test(s) ? s.slice(0, 7) : "0000-00";
}

export function monthLabel(ym: string): string {
  if (ym === "0000-00") return "No date";
  const [y, m] = ym.split("-");
  return new Date(Date.UTC(Number(y), Number(m) - 1, 1)).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Bucket rows by the month of `dateField`, newest month first. */
export function groupByMonth<T>(rows: T[], dateField: (r: T) => unknown): { ym: string; rows: T[] }[] {
  const groups = new Map<string, T[]>();
  for (const r of rows) {
    const k = monthKey(dateField(r));
    (groups.get(k) ?? groups.set(k, []).get(k)!).push(r);
  }
  return [...groups.keys()]
    .sort()
    .reverse()
    .map((ym) => ({ ym, rows: groups.get(ym)! }));
}
