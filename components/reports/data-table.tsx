import Link from "next/link";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { buildHref, PAGE_SIZES, pkey, type PaginationState } from "@/lib/paginate";
import { cn } from "@/lib/utils";
import { RowsPerPage } from "./rows-per-page";

export type Column<T> = {
  key: string;
  label: string;
  align?: "left" | "right";
  sortable?: boolean;
  render?: (row: T) => React.ReactNode;
};

/**
 * Accessible, sortable, paginated table. Sorting/pagination are URL-driven so
 * it works without JS; the rows-per-page control is the only client bit.
 */
export function DataTable<T extends Record<string, unknown>>({
  columns,
  rows,
  state,
  caption,
  empty = "No data yet.",
}: {
  columns: Column<T>[];
  rows: T[];
  state: PaginationState;
  caption?: string;
  empty?: string;
}) {
  const { ns, params } = state;

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead>
            <tr className="border-b border-border">
              {columns.map((c) => {
                const active = state.sort === c.key;
                const nextDir = active && state.dir === "asc" ? "desc" : "asc";
                const align = c.align === "right" ? "text-right" : "text-left";
                if (!c.sortable) {
                  return (
                    <th key={c.key} scope="col" className={cn("px-3 py-2 text-xs font-semibold text-muted-foreground", align)}>
                      {c.label}
                    </th>
                  );
                }
                const Icon = active ? (state.dir === "asc" ? ArrowUp : ArrowDown) : ChevronsUpDown;
                return (
                  <th
                    key={c.key}
                    scope="col"
                    aria-sort={active ? (state.dir === "asc" ? "ascending" : "descending") : "none"}
                    className={cn("px-3 py-2 text-xs font-semibold text-muted-foreground", align)}
                  >
                    <Link
                      href={buildHref(params, {
                        [pkey("sort", ns)]: c.key,
                        [pkey("dir", ns)]: nextDir,
                        [pkey("pg", ns)]: null,
                      })}
                      className={cn(
                        "inline-flex items-center gap-1 hover:text-foreground",
                        c.align === "right" && "flex-row-reverse",
                        active && "text-foreground",
                      )}
                    >
                      {c.label}
                      <Icon className="size-3 opacity-70" aria-hidden />
                    </Link>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-3 py-8 text-center text-muted-foreground">
                  {empty}
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <tr key={i} className="border-b border-border/60 last:border-0 hover:bg-muted/40">
                  {columns.map((c) => (
                    <td
                      key={c.key}
                      className={cn(
                        "px-3 py-2 align-middle",
                        c.align === "right" && "text-right tabular-nums",
                      )}
                    >
                      {c.render ? c.render(row) : String(row[c.key] ?? "")}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <PaginationBar state={state} />
    </div>
  );
}

function PaginationBar({ state }: { state: PaginationState }) {
  const { ns, params, total, page, pages, perPage, offset } = state;
  if (total === 0) return null;
  const from = offset + 1;
  const to = Math.min(total, offset + perPage);

  const pageHref = (p: number) => buildHref(params, { [pkey("pg", ns)]: String(p) });
  const ppOptions = PAGE_SIZES.map((pp) => ({
    value: pp,
    href: buildHref(params, { [pkey("pp", ns)]: String(pp), [pkey("pg", ns)]: null }),
  }));

  const window = 2;
  const start = Math.max(1, page - window);
  const end = Math.min(pages, page + window);
  const nums: number[] = [];
  for (let p = start; p <= end; p++) nums.push(p);

  return (
    <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-border pt-3 text-xs text-muted-foreground">
      <span className="mr-auto">
        Showing {from.toLocaleString()}–{to.toLocaleString()} of {total.toLocaleString()}
      </span>
      {pages > 1 && (
        <nav aria-label="Pagination" className="flex items-center gap-1">
          <PageLink href={pageHref(page - 1)} disabled={page <= 1} label="Previous">
            ‹
          </PageLink>
          {start > 1 && (
            <>
              <PageLink href={pageHref(1)}>1</PageLink>
              {start > 2 && <span className="px-1">…</span>}
            </>
          )}
          {nums.map((p) => (
            <PageLink key={p} href={pageHref(p)} active={p === page}>
              {p}
            </PageLink>
          ))}
          {end < pages && (
            <>
              {end < pages - 1 && <span className="px-1">…</span>}
              <PageLink href={pageHref(pages)}>{pages}</PageLink>
            </>
          )}
          <PageLink href={pageHref(page + 1)} disabled={page >= pages} label="Next">
            ›
          </PageLink>
        </nav>
      )}
      <RowsPerPage perPage={perPage} options={ppOptions} />
    </div>
  );
}

function PageLink({
  href,
  children,
  active,
  disabled,
  label,
}: {
  href: string;
  children: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
  label?: string;
}) {
  if (disabled) {
    return (
      <span aria-disabled className="min-w-7 rounded-md border border-border px-2 py-1 text-center opacity-40">
        {children}
      </span>
    );
  }
  return (
    <Link
      href={href}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      className={cn(
        "min-w-7 rounded-md border border-border px-2 py-1 text-center font-semibold hover:bg-muted",
        active && "border-primary bg-primary text-primary-foreground hover:bg-primary",
      )}
    >
      {children}
    </Link>
  );
}
