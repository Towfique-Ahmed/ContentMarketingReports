export const PAGE_SIZES = [20, 25, 50, 100, 150, 200] as const;

export type SearchParams = Record<string, string | string[] | undefined>;

export type PaginationState = {
  ns: string;
  total: number;
  perPage: number;
  page: number;
  pages: number;
  offset: number;
  sort: string;
  dir: "asc" | "desc";
  sortable: string[];
  params: SearchParams;
};

function key(base: string, ns: string) {
  return ns ? `${base}_${ns}` : base;
}
function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

/** Build a relative "?query" string from the current params plus overrides. */
export function buildHref(params: SearchParams, overrides: Record<string, string | null>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    const val = first(v);
    if (val !== undefined && val !== "") sp.set(k, val);
  }
  for (const [k, v] of Object.entries(overrides)) {
    if (v === null || v === "") sp.delete(k);
    else sp.set(k, v);
  }
  const s = sp.toString();
  return s ? `?${s}` : "?";
}

/** Sort + slice a fetched result set based on URL params. */
export function paginateRows<T extends Record<string, unknown>>(
  rows: T[],
  opts: {
    sortable?: string[];
    defaultSort?: string;
    defaultDir?: "asc" | "desc";
    ns?: string;
    params: SearchParams;
  },
): { rows: T[]; state: PaginationState } {
  const { sortable = [], defaultSort = "", defaultDir = "desc", ns = "", params } = opts;

  let sort = first(params[key("sort", ns)]) ?? defaultSort;
  if (sort && !sortable.includes(sort)) sort = defaultSort;
  const dir = (first(params[key("dir", ns)]) ?? defaultDir).toLowerCase() === "asc" ? "asc" : "desc";

  let sorted = rows;
  if (sort) {
    const numeric = rows.every((r) => {
      const v = r[sort];
      return v === null || v === undefined || v === "" || !Number.isNaN(Number(v));
    });
    sorted = [...rows].sort((a, b) => {
      const x = a[sort];
      const y = b[sort];
      if (numeric) return Number(x ?? 0) - Number(y ?? 0);
      return String(x ?? "").localeCompare(String(y ?? ""), undefined, { sensitivity: "base" });
    });
    if (dir === "desc") sorted.reverse();
  }

  const total = sorted.length;
  let perPage = Number(first(params[key("pp", ns)]) ?? PAGE_SIZES[0]);
  if (!PAGE_SIZES.includes(perPage as (typeof PAGE_SIZES)[number])) perPage = PAGE_SIZES[0];
  const pages = Math.max(1, Math.ceil(total / perPage));
  const page = Math.max(1, Math.min(pages, Number(first(params[key("pg", ns)]) ?? 1)));
  const offset = (page - 1) * perPage;

  return {
    rows: sorted.slice(offset, offset + perPage),
    state: { ns, total, perPage, page, pages, offset, sort, dir, sortable, params },
  };
}

export const pkey = key;
