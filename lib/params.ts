import { resolveRange, type Range } from "./date-range";
import type { SearchParams } from "./paginate";

export function str(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export function getRange(sp: SearchParams): Range {
  return resolveRange({ range: str(sp.range), from: str(sp.from), to: str(sp.to) });
}
