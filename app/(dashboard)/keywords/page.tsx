import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { RangePicker } from "@/components/layout/range-picker";
import { KpiCard, KpiGrid } from "@/components/reports/kpi-card";
import { DataTable, type Column } from "@/components/reports/data-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getRange } from "@/lib/params";
import { paginateRows, type SearchParams } from "@/lib/paginate";
import { fmtNum } from "@/lib/format";
import { keywordTable } from "@/lib/reports/queries";
import { ensureDb } from "@/lib/db/client";

export const metadata: Metadata = { title: "Keywords" };
type Row = Record<string, unknown>;

export default async function KeywordsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  ensureDb();
  const sp = await searchParams;
  const r = getRange(sp);
  const rows = keywordTable(r.start, r.end) as Row[];

  const ranked = rows.filter((x) => x.position !== null);
  const top10 = ranked.filter((x) => Number(x.position) <= 10).length;
  const improved = ranked.filter((x) => x.prev_position !== null && Number(x.position) < Number(x.prev_position)).length;
  const totalClicks = rows.reduce((a, x) => a + Number(x.clicks ?? 0), 0);

  const table = paginateRows(rows, {
    sortable: ["keyword", "target_url", "search_volume", "difficulty", "position", "clicks", "impressions"],
    defaultSort: "clicks",
    params: sp,
  });

  const cols: Column<Row>[] = [
    { key: "keyword", label: "Keyword", sortable: true, render: (x) => String(x.keyword) },
    { key: "target_url", label: "Target", sortable: true, render: (x) => <span className="line-clamp-1 text-muted-foreground">{pathOf(String(x.target_url ?? ""))}</span> },
    { key: "search_volume", label: "Volume", align: "right", sortable: true, render: (x) => fmtNum(Number(x.search_volume)) },
    { key: "difficulty", label: "KD", align: "right", sortable: true, render: (x) => String(x.difficulty ?? "—") },
    { key: "position", label: "Position", align: "right", sortable: true, render: (x) => (x.position !== null ? Number(x.position).toFixed(1) : "—") },
    { key: "change", label: "Change", align: "right", render: (x) => <Change position={x.position} prev={x.prev_position} /> },
    { key: "clicks", label: "Clicks", align: "right", sortable: true, render: (x) => fmtNum(Number(x.clicks ?? 0)) },
    { key: "impressions", label: "Impr.", align: "right", sortable: true, render: (x) => fmtNum(Number(x.impressions ?? 0)) },
  ];

  return (
    <>
      <PageHeader title="Keyword Performance" description={r.label}>
        <RangePicker />
      </PageHeader>
      <KpiGrid>
        <KpiCard label="Tracked keywords" value={String(rows.length)} />
        <KpiCard label="In top 10" value={String(top10)} />
        <KpiCard label="Improved" value={String(improved)} hint="this period" />
        <KpiCard label="Clicks from tracked" value={fmtNum(totalClicks)} />
      </KpiGrid>
      <Card className="mt-4">
        <CardHeader><CardTitle>Keyword rankings</CardTitle></CardHeader>
        <CardContent>
          <DataTable columns={cols} rows={table.rows} state={table.state} caption="Keyword rankings" empty="No keywords tracked yet — they sync from Search Console query data." />
          <p className="mt-2 text-xs text-muted-foreground">Change compares the end of the range with its start.</p>
        </CardContent>
      </Card>
    </>
  );
}

function Change({ position, prev }: { position: unknown; prev: unknown }) {
  if (position === null || prev === null || position === undefined || prev === undefined) return <span className="text-muted-foreground">—</span>;
  const diff = Number(prev) - Number(position); // positive = moved up
  if (Math.abs(diff) < 0.05) return <span className="inline-flex items-center gap-0.5 text-muted-foreground"><Minus className="size-3" aria-hidden />0</span>;
  const up = diff > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 font-semibold ${up ? "text-success" : "text-danger"}`}>
      {up ? <ArrowUp className="size-3" aria-hidden /> : <ArrowDown className="size-3" aria-hidden />}
      {Math.abs(diff).toFixed(1)}
      <span className="sr-only">{up ? "improved" : "declined"}</span>
    </span>
  );
}

function pathOf(url: string): string {
  try {
    return new URL(url).pathname || url;
  } catch {
    return url;
  }
}
