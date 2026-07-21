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
import { fmtNum, fmtPct } from "@/lib/format";
import { socialPosts, socialSeries, socialTotals } from "@/lib/reports/queries";
import { ensureDb } from "@/lib/db/client";
import { cn } from "@/lib/utils";
import { ManagePanel } from "@/components/manage/manage-panel";

export const metadata: Metadata = { title: "Social" };
type Row = Record<string, unknown>;

const PLATFORMS: Record<string, string> = {
  facebook: "Facebook",
  linkedin: "LinkedIn",
  twitter: "X / Twitter",
  youtube: "YouTube",
};

export default async function SocialPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  ensureDb();
  const sp = await searchParams;
  const r = getRange(sp);
  const platform = PLATFORMS[str(sp.platform) ?? ""] ? (str(sp.platform) as string) : null;

  const totals = socialTotals(r.start, r.end) as Row[];
  const byPlatform = new Map(totals.map((t) => [String(t.platform), t]));

  return (
    <>
      <PageHeader title={platform ? `${PLATFORMS[platform]} Report` : "Social Media Overview"} description={r.label}>
        <RangePicker />
      </PageHeader>

      <div role="tablist" aria-label="Platform" className="mb-4 flex flex-wrap gap-1 border-b border-border">
        <Link role="tab" aria-selected={!platform} href={buildHref(sp, { platform: null })} className={cn("border-b-2 px-3 py-2 text-sm font-medium", !platform ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}>
          All platforms
        </Link>
        {Object.entries(PLATFORMS).map(([key, label]) => (
          <Link key={key} role="tab" aria-selected={platform === key} href={buildHref(sp, { platform: key })} className={cn("border-b-2 px-3 py-2 text-sm font-medium", platform === key ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}>
            {label}
          </Link>
        ))}
      </div>

      {platform ? (
        <PlatformView platform={platform} sp={sp} start={r.start} end={r.end} totals={byPlatform.get(platform)} />
      ) : (
        <OverviewView totals={totals} sp={sp} />
      )}

      <ManagePanel pageKey="social" />
    </>
  );
}

function OverviewView({ totals, sp }: { totals: Row[]; sp: SearchParams }) {
  const by = new Map(totals.map((t) => [String(t.platform), t]));
  const cols: Column<Row>[] = [
    { key: "platform", label: "Platform", render: (x) => <Link href={buildHref(sp, { platform: String(x.platform) })} className="text-primary hover:underline">{PLATFORMS[String(x.platform)] ?? String(x.platform)}</Link> },
    { key: "followers", label: "Followers", align: "right", render: (x) => fmtNum(Number(x.followers)) },
    { key: "impressions", label: "Impr.", align: "right", render: (x) => fmtNum(Number(x.impressions)) },
    { key: "engagements", label: "Engagements", align: "right", render: (x) => fmtNum(Number(x.engagements)) },
    { key: "eng_rate", label: "Eng. rate", align: "right", render: (x) => (Number(x.impressions) ? fmtPct((Number(x.engagements) / Number(x.impressions)) * 100) : "—") },
    { key: "clicks", label: "Clicks", align: "right", render: (x) => fmtNum(Number(x.clicks)) },
  ];
  return (
    <>
      <KpiGrid>
        {Object.entries(PLATFORMS).map(([key, label]) => {
          const t = by.get(key);
          return <KpiCard key={key} label={`${label} followers`} value={fmtNum(Number(t?.followers ?? 0))} hint={`${fmtNum(Number(t?.engagements ?? 0))} eng.`} />;
        })}
      </KpiGrid>
      <Card className="mt-4">
        <CardHeader><CardTitle>Platform comparison</CardTitle></CardHeader>
        <CardContent>
          <DataTable columns={cols} rows={totals} state={{ ns: "", total: 0, perPage: 20, page: 1, pages: 1, offset: 0, sort: "", dir: "desc", sortable: [], params: sp }} caption="Platform comparison" empty="No social data yet." />
        </CardContent>
      </Card>
    </>
  );
}

function PlatformView({ platform, sp, start, end, totals }: { platform: string; sp: SearchParams; start: string; end: string; totals?: Row }) {
  const series = socialSeries(platform, start, end) as Row[];
  const posts = socialPosts(platform) as Row[];
  const isYt = platform === "youtube";

  const dataTable = paginateRows(series, { sortable: ["date", "followers", "impressions", "engagements", "clicks", "video_views"], defaultSort: "date", ns: "sd", params: sp });
  const postsTable = paginateRows(posts, { sortable: ["posted_at", "title", "impressions", "engagements", "clicks", "video_views"], defaultSort: "posted_at", ns: "sp", params: sp });

  const dataCols: Column<Row>[] = [
    { key: "date", label: "Date", sortable: true, render: (x) => String(x.date) },
    { key: "followers", label: "Followers", align: "right", sortable: true, render: (x) => fmtNum(Number(x.followers)) },
    { key: "impressions", label: "Impr.", align: "right", sortable: true, render: (x) => fmtNum(Number(x.impressions)) },
    { key: "engagements", label: "Engagements", align: "right", sortable: true, render: (x) => fmtNum(Number(x.engagements)) },
    { key: "clicks", label: "Clicks", align: "right", sortable: true, render: (x) => fmtNum(Number(x.clicks)) },
    { key: "video_views", label: "Views", align: "right", sortable: true, render: (x) => fmtNum(Number(x.video_views)) },
  ];
  const postCols: Column<Row>[] = [
    { key: "posted_at", label: "Date", sortable: true, render: (x) => String(x.posted_at) },
    { key: "title", label: "Post", sortable: true, render: (x) => <a href={String(x.url)} target="_blank" rel="noopener" className="line-clamp-1 text-primary hover:underline">{String(x.title)}</a> },
    { key: "impressions", label: "Impr.", align: "right", sortable: true, render: (x) => fmtNum(Number(x.impressions)) },
    { key: "engagements", label: "Eng.", align: "right", sortable: true, render: (x) => fmtNum(Number(x.engagements)) },
    { key: "clicks", label: "Clicks", align: "right", sortable: true, render: (x) => fmtNum(Number(x.clicks)) },
    ...(isYt ? [{ key: "video_views", label: "Views", align: "right" as const, sortable: true, render: (x: Row) => fmtNum(Number(x.video_views)) }] : []),
  ];

  return (
    <>
      <KpiGrid>
        <KpiCard label={isYt ? "Subscribers" : "Followers"} value={fmtNum(Number(totals?.followers ?? 0))} />
        <KpiCard label="Impressions" value={fmtNum(Number(totals?.impressions ?? 0))} />
        <KpiCard label="Engagements" value={fmtNum(Number(totals?.engagements ?? 0))} />
        <KpiCard label={isYt ? "Video views" : "Link clicks"} value={fmtNum(Number(totals?.[isYt ? "video_views" : "clicks"] ?? 0))} />
      </KpiGrid>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <ChartCard title="Follower growth" type="area" data={series} xKey="date" series={[{ key: "followers", label: "Followers" }]} />
        <ChartCard title="Impressions & engagements" data={series} xKey="date" series={[{ key: "impressions", label: "Impressions" }, { key: "engagements", label: "Engagements" }]} />
      </div>
      <Card className="mt-4">
        <CardHeader><CardTitle>Recorded data points</CardTitle></CardHeader>
        <CardContent>
          <DataTable columns={dataCols} rows={dataTable.rows} state={dataTable.state} caption="Recorded data points" empty="No records in this range." />
        </CardContent>
      </Card>
      <Card className="mt-4">
        <CardHeader><CardTitle>Recent posts</CardTitle></CardHeader>
        <CardContent>
          <DataTable columns={postCols} rows={postsTable.rows} state={postsTable.state} caption="Recent posts" empty="No posts tracked yet for this platform." />
        </CardContent>
      </Card>
    </>
  );
}
