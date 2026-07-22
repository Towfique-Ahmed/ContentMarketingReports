import Link from "next/link";
import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { RangePicker } from "@/components/layout/range-picker";
import { KpiCard, KpiGrid } from "@/components/reports/kpi-card";
import { DataTable, type Column } from "@/components/reports/data-table";
import { ChartCard } from "@/components/charts/chart-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getRange } from "@/lib/params";
import { paginateRows, type SearchParams } from "@/lib/paginate";
import { fmtDuration, fmtNum, fmtPct } from "@/lib/format";
import {
  gaChannels,
  gaSeries,
  gaTopPages,
  gaTotals,
  gscSeries,
  gscTopPages,
  gscTopQueries,
  gscTotals,
  searchTrafficMonthly,
} from "@/lib/reports/queries";
import { ensureDb } from "@/lib/db/client";
import { monthLabel } from "@/lib/month";
import { ManagePanel } from "@/components/manage/manage-panel";

export const metadata: Metadata = { title: "Search & Traffic" };

type Row = Record<string, unknown>;

export default async function SearchPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  ensureDb();
  const sp = await searchParams;
  const r = getRange(sp);

  const gsc = gscTotals(r.start, r.end);
  const gscPrev = gscTotals(r.prevStart, r.prevEnd);
  const ga = gaTotals(r.start, r.end);
  const gaPrev = gaTotals(r.prevStart, r.prevEnd);
  const gscS = gscSeries(r.start, r.end);
  const gaS = gaSeries(r.start, r.end);
  const channels = gaChannels(r.start, r.end);

  const queries = paginateRows(gscTopQueries() as Row[], {
    sortable: ["query", "clicks", "impressions", "ctr", "position"],
    defaultSort: "clicks",
    ns: "q",
    params: sp,
  });
  const pages = paginateRows(gscTopPages() as Row[], {
    sortable: ["page", "clicks", "impressions", "ctr", "position"],
    defaultSort: "clicks",
    ns: "p",
    params: sp,
  });
  const gaPages = paginateRows(gaTopPages(r.start, r.end) as Row[], {
    sortable: ["page", "pageviews", "users"],
    defaultSort: "pageviews",
    ns: "gp",
    params: sp,
  });
  const monthly = searchTrafficMonthly();

  const queryCols: Column<Row>[] = [
    { key: "query", label: "Query", sortable: true, render: (x) => <span className="line-clamp-1">{String(x.query)}</span> },
    { key: "clicks", label: "Clicks", align: "right", sortable: true, render: (x) => fmtNum(Number(x.clicks)) },
    { key: "impressions", label: "Impressions", align: "right", sortable: true, render: (x) => fmtNum(Number(x.impressions)) },
    { key: "ctr", label: "CTR", align: "right", sortable: true, render: (x) => fmtPct(Number(x.ctr)) },
    { key: "position", label: "Pos.", align: "right", sortable: true, render: (x) => Number(x.position).toFixed(1) },
  ];
  const pageCols: Column<Row>[] = [
    {
      key: "page",
      label: "Page",
      sortable: true,
      render: (x) => (
        <a href={String(x.page)} target="_blank" rel="noopener" className="line-clamp-1 text-primary hover:underline">
          {pathOf(String(x.page))}
        </a>
      ),
    },
    { key: "clicks", label: "Clicks", align: "right", sortable: true, render: (x) => fmtNum(Number(x.clicks)) },
    { key: "impressions", label: "Impr.", align: "right", sortable: true, render: (x) => fmtNum(Number(x.impressions)) },
    { key: "ctr", label: "CTR", align: "right", sortable: true, render: (x) => fmtPct(Number(x.ctr)) },
    { key: "position", label: "Pos.", align: "right", sortable: true, render: (x) => Number(x.position).toFixed(1) },
  ];
  const gaPageCols: Column<Row>[] = [
    { key: "page", label: "Page", sortable: true, render: (x) => <span className="line-clamp-1">{String(x.page)}</span> },
    { key: "pageviews", label: "Pageviews", align: "right", sortable: true, render: (x) => fmtNum(Number(x.pageviews)) },
    { key: "users", label: "Users", align: "right", sortable: true, render: (x) => fmtNum(Number(x.users)) },
  ];

  return (
    <>
      <PageHeader title="Search & Traffic" description={r.label}>
        <RangePicker />
      </PageHeader>

      <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Google Search Console</h2>
      <KpiGrid>
        <KpiCard label="Clicks" value={fmtNum(gsc.clicks)} current={gsc.clicks} previous={gscPrev.clicks} />
        <KpiCard label="Impressions" value={fmtNum(gsc.impressions)} current={gsc.impressions} previous={gscPrev.impressions} />
        <KpiCard label="Avg CTR" value={fmtPct(gsc.ctr)} current={gsc.ctr} previous={gscPrev.ctr} />
        <KpiCard label="Avg position" value={gsc.position.toFixed(1)} current={gsc.position} previous={gscPrev.position} lowerIsBetter />
      </KpiGrid>

      <h2 className="mb-2 mt-6 text-sm font-semibold text-muted-foreground">Google Analytics (GA4)</h2>
      <KpiGrid>
        <KpiCard label="Sessions" value={fmtNum(ga.sessions)} current={ga.sessions} previous={gaPrev.sessions} />
        <KpiCard label="Users" value={fmtNum(ga.users)} current={ga.users} previous={gaPrev.users} />
        <KpiCard label="New users" value={fmtNum(ga.new_users)} current={ga.new_users} previous={gaPrev.new_users} />
        <KpiCard label="Conversions" value={fmtNum(ga.conversions)} current={ga.conversions} previous={gaPrev.conversions} />
        <KpiCard label="Engagement rate" value={fmtPct(ga.engagement_rate)} current={ga.engagement_rate} previous={gaPrev.engagement_rate} />
        <KpiCard label="Avg duration" value={fmtDuration(ga.avg_duration)} current={ga.avg_duration} previous={gaPrev.avg_duration} />
        <KpiCard label="Bounce rate" value={fmtPct(ga.bounce_rate)} current={ga.bounce_rate} previous={gaPrev.bounce_rate} lowerIsBetter />
        <KpiCard label="Pageviews" value={fmtNum(ga.pageviews)} current={ga.pageviews} previous={gaPrev.pageviews} />
      </KpiGrid>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <ChartCard title="Search — clicks & impressions" data={gscS} xKey="date" series={[{ key: "clicks", label: "Clicks" }]} />
        <ChartCard title="Average position (lower is better)" data={gscS} xKey="date" series={[{ key: "position", label: "Avg position" }]} />
        <ChartCard title="Sessions & users" type="area" data={gaS} xKey="date" series={[{ key: "sessions", label: "Sessions" }, { key: "users", label: "Users" }]} />
        <Card>
          <CardHeader><CardTitle>Acquisition channels</CardTitle></CardHeader>
          <CardContent>
            <DataTable
              caption="Acquisition channels"
              columns={[
                { key: "channel", label: "Channel", render: (x) => String(x.channel) },
                { key: "sessions", label: "Sessions", align: "right", render: (x) => fmtNum(Number(x.sessions)) },
                { key: "users", label: "Users", align: "right", render: (x) => fmtNum(Number(x.users)) },
                { key: "conversions", label: "Conv.", align: "right", render: (x) => fmtNum(Number(x.conversions)) },
              ]}
              rows={channels.slice(0, 12) as Row[]}
              state={{ ns: "", total: 0, perPage: 20, page: 1, pages: 1, offset: 0, sort: "", dir: "desc", sortable: [], params: sp }}
              empty="No channel data for this range."
            />
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Top search queries</CardTitle></CardHeader>
          <CardContent>
            <DataTable columns={queryCols} rows={queries.rows} state={queries.state} caption="Top search queries" empty="No query data yet — run a sync." />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Top pages in search</CardTitle></CardHeader>
          <CardContent>
            <DataTable columns={pageCols} rows={pages.rows} state={pages.state} caption="Top pages in search" empty="No page data yet — run a sync." />
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader><CardTitle>Top pages by traffic (GA4)</CardTitle></CardHeader>
        <CardContent>
          <DataTable columns={gaPageCols} rows={gaPages.rows} state={gaPages.state} caption="Top pages by traffic" empty="No GA page data for this range." />
        </CardContent>
      </Card>

      <Card className="mt-4 overflow-x-auto">
        <CardHeader><CardTitle>Monthly breakdown</CardTitle></CardHeader>
        <CardContent className="px-0">
          {monthly.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-muted-foreground">No monthly data yet — run a sync or import Search Console / GA data.</p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-y border-border text-left text-muted-foreground">
                  <th className="px-4 py-2 font-semibold">Month</th>
                  <th className="px-4 py-2 text-right font-semibold">Clicks</th>
                  <th className="px-4 py-2 text-right font-semibold">Impressions</th>
                  <th className="px-4 py-2 text-right font-semibold">CTR</th>
                  <th className="px-4 py-2 text-right font-semibold">Avg pos.</th>
                  <th className="px-4 py-2 text-right font-semibold">Sessions</th>
                  <th className="px-4 py-2 text-right font-semibold">Users</th>
                  <th className="px-4 py-2 text-right font-semibold">Conv.</th>
                </tr>
              </thead>
              <tbody>
                {monthly.map((m) => (
                  <tr key={m.ym} className="border-b border-border/60 last:border-0 hover:bg-muted/30">
                    <td className="whitespace-nowrap px-4 py-2 font-medium">{monthLabel(m.ym)}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{fmtNum(m.clicks)}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{fmtNum(m.impressions)}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{m.ctr ? fmtPct(m.ctr) : "—"}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{m.position ? m.position.toFixed(1) : "—"}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{fmtNum(m.sessions)}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{fmtNum(m.users)}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{fmtNum(m.conversions)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <ManagePanel pageKey="search" />
    </>
  );
}

function pathOf(url: string): string {
  try {
    return new URL(url).pathname || url;
  } catch {
    return url;
  }
}
