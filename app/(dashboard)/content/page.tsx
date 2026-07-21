import Link from "next/link";
import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { RangePicker } from "@/components/layout/range-picker";
import { KpiCard, KpiGrid } from "@/components/reports/kpi-card";
import { DataTable, type Column } from "@/components/reports/data-table";
import { ChartCard } from "@/components/charts/chart-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getRange, str } from "@/lib/params";
import { buildHref, paginateRows, type SearchParams } from "@/lib/paginate";
import { fmtNum } from "@/lib/format";
import { contentSeries, contentTable } from "@/lib/reports/queries";
import { ensureDb } from "@/lib/db/client";
import { cn } from "@/lib/utils";
import { ManagePanel } from "@/components/manage/manage-panel";

export const metadata: Metadata = { title: "Content" };

const TYPES: Record<string, string> = {
  blog: "Blog",
  documentation: "Documentation",
  landing_page: "Landing Pages",
  case_study: "Case Studies",
};

type Row = Record<string, unknown>;

export default async function ContentPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  ensureDb();
  const sp = await searchParams;
  const r = getRange(sp);
  const type = TYPES[str(sp.type) ?? ""] ? (str(sp.type) as string) : "blog";

  const rows = contentTable(type, r.start, r.end) as Row[];
  const series = contentSeries(type, r.start, r.end) as Row[];
  const totalPv = rows.reduce((a, x) => a + Number(x.pageviews), 0);
  const totalVis = rows.reduce((a, x) => a + Number(x.visitors), 0);
  const totalConv = rows.reduce((a, x) => a + Number(x.conversions), 0);

  const table = paginateRows(rows, {
    sortable: ["title", "funnel_stage", "author", "published_at", "search_volume", "views", "pageviews", "visitors", "conversions"],
    defaultSort: "pageviews",
    params: sp,
  });

  const cols: Column<Row>[] = [
    {
      key: "title",
      label: "Title",
      sortable: true,
      render: (x) => (
        <a href={String(x.url)} target="_blank" rel="noopener" className="line-clamp-1 text-primary hover:underline">
          {String(x.title)}
        </a>
      ),
    },
    { key: "funnel_stage", label: "Funnel", sortable: true, render: (x) => (x.funnel_stage ? <span className="rounded-full border border-border px-2 py-0.5 text-xs">{String(x.funnel_stage)}</span> : "—") },
    { key: "author", label: "Author", sortable: true, render: (x) => String(x.author ?? "—") },
    { key: "published_at", label: "Published", sortable: true, render: (x) => String(x.published_at ?? "—") },
    { key: "search_volume", label: "Volume", align: "right", sortable: true, render: (x) => (x.search_volume ? fmtNum(Number(x.search_volume)) : "—") },
    { key: "views", label: "Views", align: "right", sortable: true, render: (x) => (x.views ? fmtNum(Number(x.views)) : "—") },
    { key: "pageviews", label: "Pageviews", align: "right", sortable: true, render: (x) => fmtNum(Number(x.pageviews)) },
    { key: "visitors", label: "Visitors", align: "right", sortable: true, render: (x) => fmtNum(Number(x.visitors)) },
    { key: "conversions", label: "Conv.", align: "right", sortable: true, render: (x) => fmtNum(Number(x.conversions)) },
  ];

  return (
    <>
      <PageHeader title="Content" description={r.label}>
        <RangePicker />
      </PageHeader>

      <div role="tablist" aria-label="Content type" className="mb-4 flex flex-wrap gap-1 border-b border-border">
        {Object.entries(TYPES).map(([key, label]) => (
          <Link
            key={key}
            role="tab"
            aria-selected={type === key}
            href={buildHref(sp, { type: key })}
            className={cn(
              "border-b-2 px-3 py-2 text-sm font-medium",
              type === key ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </Link>
        ))}
      </div>

      <KpiGrid>
        <KpiCard label="Published items" value={String(rows.length)} />
        <KpiCard label="Pageviews" value={fmtNum(totalPv)} />
        <KpiCard label="Visitors" value={fmtNum(totalVis)} />
        <KpiCard label="Conversions" value={fmtNum(totalConv)} />
      </KpiGrid>

      <div className="mt-4">
        <ChartCard
          title={`${TYPES[type]} traffic over time`}
          type="area"
          data={series}
          xKey="date"
          series={[{ key: "pageviews", label: "Pageviews" }, { key: "visitors", label: "Visitors" }]}
        />
      </div>

      <Card className="mt-4">
        <CardHeader><CardTitle>All {TYPES[type].toLowerCase()}</CardTitle></CardHeader>
        <CardContent>
          <DataTable columns={cols} rows={table.rows} state={table.state} caption={`All ${TYPES[type]}`} empty={`No ${TYPES[type].toLowerCase()} tracked yet.`} />
        </CardContent>
      </Card>

      <ManagePanel pageKey="content" />
    </>
  );
}
