/** Formatting helpers shared by every report. */

export function fmtNum(n: number | null | undefined): string {
  const v = Number(n ?? 0);
  if (Math.abs(v) >= 1_000_000) return round(v / 1_000_000, 1) + "M";
  if (Math.abs(v) >= 10_000) return round(v / 1_000, 1) + "K";
  return v === Math.trunc(v) ? v.toLocaleString("en-US") : v.toFixed(1);
}

export function fmtPct(n: number | null | undefined): string {
  return `${Number(n ?? 0).toFixed(1)}%`;
}

export function fmtMoney(n: number | null | undefined): string {
  return `$${Math.round(Number(n ?? 0)).toLocaleString("en-US")}`;
}

export function fmtDuration(seconds: number | null | undefined): string {
  const s = Math.round(Number(seconds ?? 0));
  return `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, "0")}s`;
}

export function fmtDate(d: string | null | undefined): string {
  return d ?? "";
}

function round(n: number, digits: number): number {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}

/** Percentage change; null when previous is 0 (no baseline). */
export function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

export type Delta = {
  change: number | null;
  direction: "up" | "down" | "flat";
  good: boolean | null;
  label: string;
};

/** Compute a delta with good/bad polarity ($lowerIsBetter flips it). */
export function delta(current: number, previous: number, lowerIsBetter = false): Delta {
  const change = pctChange(current, previous);
  if (change === null) return { change: null, direction: "flat", good: null, label: "—" };
  const up = change >= 0;
  const flat = Math.abs(change) < 0.05;
  return {
    change,
    direction: flat ? "flat" : up ? "up" : "down",
    good: flat ? null : lowerIsBetter ? !up : up,
    label: `${Math.abs(change).toFixed(1)}%`,
  };
}
