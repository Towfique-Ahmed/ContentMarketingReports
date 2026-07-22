"use client";

import * as React from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Download, Filter, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fmtNum } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { UnifiedKeyword } from "@/lib/reports/queries";
import type { ActionResult } from "@/lib/actions";

type SortKey = "position" | "keyword" | "change" | "vol" | "difficulty" | "url";
type Dir = "asc" | "desc";

/** Movement of the latest rank vs the previous one (positive = moved up). */
function changeOf(k: UnifiedKeyword): number | null {
  if (k.position === null || k.prev_position === null) return null;
  const now = Number(k.position);
  if (!Number.isFinite(now)) return null;
  return k.prev_position - now;
}
function posNum(k: UnifiedKeyword): number {
  const n = Number(k.position);
  return Number.isFinite(n) ? n : Number.POSITIVE_INFINITY; // unranked sinks to the bottom
}
function rowKey(k: UnifiedKeyword): string {
  return `${k.source}:${k.id}`;
}
function pathOf(url: string | null): string {
  if (!url) return "—";
  try {
    return new URL(url).pathname || url;
  } catch {
    return url;
  }
}

export function KeywordsTable({
  keywords,
  deleteAction,
}: {
  keywords: UnifiedKeyword[];
  deleteAction: (ids: number[]) => Promise<ActionResult>;
}) {
  const [sort, setSort] = React.useState<SortKey>("position");
  const [dir, setDir] = React.useState<Dir>("asc");
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [query, setQuery] = React.useState("");
  const [showFilter, setShowFilter] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const [notice, setNotice] = React.useState<string | null>(null);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q
      ? keywords.filter((k) => k.keyword.toLowerCase().includes(q) || (k.url ?? "").toLowerCase().includes(q))
      : keywords;
    const sign = dir === "asc" ? 1 : -1;
    const cmp = (a: UnifiedKeyword, b: UnifiedKeyword): number => {
      switch (sort) {
        case "keyword":
          return sign * a.keyword.localeCompare(b.keyword);
        case "url":
          return sign * pathOf(a.url).localeCompare(pathOf(b.url));
        case "vol":
          return sign * (a.vol - b.vol);
        case "difficulty":
          return sign * ((a.difficulty ?? -1) - (b.difficulty ?? -1));
        case "change":
          return sign * ((changeOf(a) ?? -Infinity) - (changeOf(b) ?? -Infinity));
        case "position":
        default:
          return sign * (posNum(a) - posNum(b));
      }
    };
    return [...base].sort(cmp);
  }, [keywords, query, sort, dir]);

  const selectableIds = React.useMemo(
    () => filtered.filter((k) => k.source === "keyword").map(rowKey),
    [filtered],
  );
  const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selected.has(id));

  function toggleSort(key: SortKey) {
    if (sort === key) setDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSort(key);
      // Rank/volume/difficulty read best ascending-then-descending by nature.
      setDir(key === "vol" || key === "difficulty" || key === "change" ? "desc" : "asc");
    }
  }
  function toggleOne(k: UnifiedKeyword) {
    if (k.source !== "keyword") return; // content-derived rows aren't deletable here
    setSelected((prev) => {
      const next = new Set(prev);
      const id = rowKey(k);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }
  function toggleAll() {
    setSelected((prev) => {
      if (selectableIds.every((id) => prev.has(id))) return new Set();
      return new Set(selectableIds);
    });
  }

  function exportCsv() {
    const head = ["Position", "Keyword", "Change", "VOL", "SEO Difficulty", "URL"];
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const lines = [head.map(esc).join(",")];
    for (const k of filtered) {
      const ch = changeOf(k);
      lines.push(
        [
          k.position ?? "",
          k.keyword,
          ch === null ? "" : (ch > 0 ? "+" : "") + ch,
          String(k.vol ?? 0),
          k.difficulty ?? "",
          k.url ?? "",
        ]
          .map((v) => esc(String(v)))
          .join(","),
      );
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "keywords.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function onDelete() {
    const ids = [...selected]
      .filter((k) => k.startsWith("keyword:"))
      .map((k) => Number(k.split(":")[1]));
    if (ids.length === 0) return;
    startTransition(async () => {
      const res = await deleteAction(ids);
      setNotice(res?.message ?? null);
      if (res?.ok) setSelected(new Set());
    });
  }

  const selectedCount = selected.size;

  return (
    <div>
      {/* Toolbar — mirrors the Ubersuggest rank-tracker actions. */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-foreground">
          {selectedCount} of {keywords.length} Selected
        </span>
        <span className="mx-1 h-5 w-px bg-border" aria-hidden />
        <Button variant="outline" size="sm" onClick={exportCsv}>
          <Download aria-hidden /> Export to CSV
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled
          title="Difficulty updates require a keyword data source (e.g. an Ubersuggest sync). Set difficulty manually in the manage panel."
        >
          Update SEO Difficulty
        </Button>
        <Button variant="danger" size="sm" onClick={onDelete} disabled={pending || selectedCount === 0}>
          {pending ? <Loader2 className="animate-spin" aria-hidden /> : <Trash2 aria-hidden />} Delete
        </Button>
        <Button
          variant={showFilter ? "secondary" : "outline"}
          size="sm"
          onClick={() => setShowFilter((s) => !s)}
          aria-expanded={showFilter}
        >
          <Filter aria-hidden /> Filters
        </Button>
        {showFilter && (
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter by keyword or URL…"
            aria-label="Filter keywords"
            className="h-8 min-w-[14rem] flex-1 rounded-md border border-input bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        )}
      </div>

      {notice && (
        <p className="mb-2 text-xs text-muted-foreground" role="status">
          {notice}
        </p>
      )}

      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left text-muted-foreground">
              <th className="w-10 px-3 py-2">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  aria-label="Select all tracked keywords"
                  className="size-4 accent-primary"
                />
              </th>
              <SortTh label="Position" col="position" sort={sort} dir={dir} onSort={toggleSort} align="right" />
              <SortTh label="Keyword" col="keyword" sort={sort} dir={dir} onSort={toggleSort} />
              <SortTh label="Change" col="change" sort={sort} dir={dir} onSort={toggleSort} align="right" />
              <SortTh label="VOL" col="vol" sort={sort} dir={dir} onSort={toggleSort} align="right" />
              <SortTh label="SEO Difficulty" col="difficulty" sort={sort} dir={dir} onSort={toggleSort} align="right" />
              <SortTh label="URL" col="url" sort={sort} dir={dir} onSort={toggleSort} />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-10 text-center text-sm text-muted-foreground">
                  No keywords yet. Track them in the manage panel, or set a “Target keyword” on a Content item — it appears here automatically.
                </td>
              </tr>
            ) : (
              filtered.map((k) => {
                const ch = changeOf(k);
                const id = rowKey(k);
                return (
                  <tr key={id} className="border-b border-border/60 last:border-0 hover:bg-muted/30">
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={selected.has(id)}
                        onChange={() => toggleOne(k)}
                        disabled={k.source !== "keyword"}
                        aria-label={`Select ${k.keyword}`}
                        title={k.source === "keyword" ? undefined : "From a Content target keyword — edit it on the Content page"}
                        className="size-4 accent-primary disabled:opacity-40"
                      />
                    </td>
                    <td className="px-3 py-2 text-right font-semibold tabular-nums">{k.position ?? "—"}</td>
                    <td className="px-3 py-2">
                      <span className="font-medium text-foreground">{k.keyword}</span>
                      {k.source === "content" && (
                        <span className="ml-2 rounded-full border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                          content
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      <ChangeCell change={ch} />
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{k.vol ? fmtNum(k.vol) : "—"}</td>
                    <td className="px-3 py-2 text-right">
                      <Difficulty value={k.difficulty} />
                    </td>
                    <td className="px-3 py-2">
                      {k.url ? (
                        <a href={k.url} target="_blank" rel="noopener" className="line-clamp-1 max-w-[22rem] text-primary hover:underline">
                          {pathOf(k.url)}
                        </a>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SortTh({
  label,
  col,
  sort,
  dir,
  onSort,
  align = "left",
}: {
  label: string;
  col: SortKey;
  sort: SortKey;
  dir: Dir;
  onSort: (c: SortKey) => void;
  align?: "left" | "right";
}) {
  const active = sort === col;
  return (
    <th className={cn("px-3 py-2 font-semibold", align === "right" && "text-right")}>
      <button
        type="button"
        onClick={() => onSort(col)}
        className={cn(
          "inline-flex items-center gap-1 hover:text-foreground",
          align === "right" && "flex-row-reverse",
          active && "text-foreground",
        )}
        aria-label={`Sort by ${label}${active ? (dir === "asc" ? ", ascending" : ", descending") : ""}`}
      >
        {label}
        {active ? (
          dir === "asc" ? <ArrowUp className="size-3" aria-hidden /> : <ArrowDown className="size-3" aria-hidden />
        ) : (
          <ArrowUpDown className="size-3 opacity-40" aria-hidden />
        )}
      </button>
    </th>
  );
}

function ChangeCell({ change }: { change: number | null }) {
  if (change === null) return <span className="text-muted-foreground">—</span>;
  if (Math.abs(change) < 0.05) return <span className="text-muted-foreground">0</span>;
  const up = change > 0;
  return (
    <span className={cn("inline-flex items-center justify-end gap-0.5 font-semibold", up ? "text-success" : "text-danger")}>
      {up ? <ArrowUp className="size-3" aria-hidden /> : <ArrowDown className="size-3" aria-hidden />}
      {Math.abs(change) % 1 === 0 ? Math.abs(change) : Math.abs(change).toFixed(1)}
      <span className="sr-only">{up ? "positions up" : "positions down"}</span>
    </span>
  );
}

/** SEO difficulty pill, colour-coded green→amber→red (never colour-only: the number carries the value). */
function Difficulty({ value }: { value: number | null }) {
  if (value === null || value === undefined) return <span className="text-muted-foreground">—</span>;
  const v = Number(value);
  const tone = v < 30 ? "bg-success/15 text-success" : v < 60 ? "bg-warning/15 text-warning" : "bg-danger/15 text-danger";
  return <span className={cn("inline-block min-w-9 rounded-md px-2 py-0.5 text-center text-xs font-semibold tabular-nums", tone)}>{v}</span>;
}
