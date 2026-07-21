import { earliestDataDate, latestDataDate } from "./reports/queries";

export type Range = {
  start: string;
  end: string;
  prevStart: string;
  prevEnd: string;
  label: string;
  key: string;
};

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
function daysBetween(start: string, end: string): number {
  const ms = Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`);
  return Math.max(1, Math.round(ms / 86_400_000) + 1);
}

/**
 * Resolve the selected range. The window END anchors to the latest data point
 * (not today), so freshly imported data is always inside the default view.
 */
export function resolveRange(params: { range?: string; from?: string; to?: string }): Range {
  const key = params.range ?? "all";
  const latest = latestDataDate();
  const anchor = latest ?? addDays(new Date().toISOString().slice(0, 10), -1);

  let start: string;
  let end: string;
  let label: string;

  if (key === "custom" && params.from && params.to) {
    start = params.from;
    end = params.to;
    label = `${start} → ${end}`;
  } else if (key === "all") {
    start = earliestDataDate() ?? addDays(anchor, -365);
    end = anchor;
    label = "All time";
  } else {
    const days = key === "7d" ? 7 : key === "30d" ? 30 : key === "90d" ? 90 : key === "12m" ? 365 : 90;
    end = anchor;
    start = addDays(end, -(days - 1));
    const base =
      key === "7d" ? "Last 7 days" : key === "30d" ? "Last 30 days" : key === "12m" ? "Last 12 months" : "Last 90 days";
    label = `${base} (to ${end})`;
  }

  const span = daysBetween(start, end);
  const prevEnd = addDays(start, -1);
  const prevStart = addDays(prevEnd, -(span - 1));
  return { start, end, prevStart, prevEnd, label, key };
}
