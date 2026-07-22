import Link from "next/link";
import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { KpiCard, KpiGrid } from "@/components/reports/kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { str } from "@/lib/params";
import { buildHref, type SearchParams } from "@/lib/paginate";
import { fmtNum, fmtPct } from "@/lib/format";
import { socialPosts, socialSeries, socialTotals } from "@/lib/reports/queries";
import { ensureDb } from "@/lib/db/client";
import { cn } from "@/lib/utils";
import { groupByMonth, monthLabel } from "@/lib/month";
import { ManagePanel } from "@/components/manage/manage-panel";

export const metadata: Metadata = { title: "Social" };
type Row = Record<string, unknown>;

const ALL_START = "0000-01-01";
const ALL_END = "9999-12-31";

const PLATFORMS: Record<string, string> = {
  facebook: "Facebook",
  linkedin: "LinkedIn",
  twitter: "X / Twitter",
  youtube: "YouTube",
};

export default async function SocialPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  ensureDb();
  const sp = await searchParams;
  const platform = PLATFORMS[str(sp.platform) ?? ""] ? (str(sp.platform) as string) : null;

  const totals = socialTotals(ALL_START, ALL_END) as Row[];
  const byPlatform = new Map(totals.map((t) => [String(t.platform), t]));

  return (
    <>
      <PageHeader title={platform ? `${PLATFORMS[platform]} Report` : "Social Media Overview"} description="All-time · grouped by month" />

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
        <PlatformView platform={platform} sp={sp} totals={byPlatform.get(platform)} />
      ) : (
        <OverviewView totals={totals} sp={sp} />
      )}

      <ManagePanel pageKey="social" />
    </>
  );
}

function OverviewView({ totals, sp }: { totals: Row[]; sp: SearchParams }) {
  const by = new Map(totals.map((t) => [String(t.platform), t]));
  return (
    <>
      <KpiGrid>
        {Object.entries(PLATFORMS).map(([key, label]) => {
          const t = by.get(key);
          return <KpiCard key={key} label={`${label} followers`} value={fmtNum(Number(t?.followers ?? 0))} hint={`${fmtNum(Number(t?.engagements ?? 0))} eng.`} />;
        })}
      </KpiGrid>
      <Card className="mt-4 overflow-x-auto">
        <CardHeader><CardTitle>Platform comparison</CardTitle></CardHeader>
        <CardContent className="px-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-y border-border text-left text-muted-foreground">
                <th className="px-4 py-2 font-semibold">Platform</th>
                <th className="px-4 py-2 text-right font-semibold">Followers</th>
                <th className="px-4 py-2 text-right font-semibold">Impr.</th>
                <th className="px-4 py-2 text-right font-semibold">Engagements</th>
                <th className="px-4 py-2 text-right font-semibold">Eng. rate</th>
                <th className="px-4 py-2 text-right font-semibold">Clicks</th>
              </tr>
            </thead>
            <tbody>
              {totals.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">No social data yet — add it from the manage panel.</td></tr>
              ) : (
                totals.map((x) => (
                  <tr key={String(x.platform)} className="border-b border-border/60 last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-2"><Link href={buildHref(sp, { platform: String(x.platform) })} className="font-medium text-primary hover:underline">{PLATFORMS[String(x.platform)] ?? String(x.platform)}</Link></td>
                    <td className="px-4 py-2 text-right tabular-nums">{fmtNum(Number(x.followers))}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{fmtNum(Number(x.impressions))}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{fmtNum(Number(x.engagements))}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{Number(x.impressions) ? fmtPct((Number(x.engagements) / Number(x.impressions)) * 100) : "—"}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{fmtNum(Number(x.clicks))}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </>
  );
}

function PlatformView({ platform, totals }: { platform: string; sp: SearchParams; totals?: Row }) {
  const series = socialSeries(platform, ALL_START, ALL_END) as Row[];
  const posts = socialPosts(platform) as Row[];
  const isYt = platform === "youtube";

  const postMonths = groupByMonth(posts, (p) => p.posted_at);

  return (
    <>
      <KpiGrid>
        <KpiCard label={isYt ? "Subscribers" : "Followers"} value={fmtNum(Number(totals?.followers ?? 0))} />
        <KpiCard label="Impressions" value={fmtNum(Number(totals?.impressions ?? 0))} />
        <KpiCard label="Engagements" value={fmtNum(Number(totals?.engagements ?? 0))} />
        <KpiCard label={isYt ? "Video views" : "Link clicks"} value={fmtNum(Number(totals?.[isYt ? "video_views" : "clicks"] ?? 0))} />
      </KpiGrid>

      <h2 className="mb-2 mt-6 text-sm font-semibold text-foreground">Posts by month</h2>
      {posts.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">No posts tracked yet for this platform — add them from the manage panel.</Card>
      ) : (
        <div className="space-y-6">
          {postMonths.map(({ ym, rows }) => (
            <section key={ym} aria-label={monthLabel(ym)}>
              <div className="mb-2 flex items-baseline justify-between">
                <h3 className="text-sm font-semibold text-foreground">{monthLabel(ym)}</h3>
                <span className="text-xs text-muted-foreground">{rows.length} posts</span>
              </div>
              <Card className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      <th className="px-3 py-2 font-semibold">Date</th>
                      <th className="px-3 py-2 font-semibold">Post</th>
                      <th className="px-3 py-2 text-right font-semibold">Impr.</th>
                      <th className="px-3 py-2 text-right font-semibold">Eng.</th>
                      <th className="px-3 py-2 text-right font-semibold">Clicks</th>
                      {isYt && <th className="px-3 py-2 text-right font-semibold">Views</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((x) => (
                      <tr key={String(x.id)} className="border-b border-border/60 last:border-0 hover:bg-muted/40">
                        <td className="whitespace-nowrap px-3 py-2 tabular-nums">{String(x.posted_at ?? "—")}</td>
                        <td className="px-3 py-2"><a href={String(x.url)} target="_blank" rel="noopener" className="line-clamp-1 max-w-[26rem] text-primary hover:underline">{String(x.title)}</a></td>
                        <td className="px-3 py-2 text-right tabular-nums">{fmtNum(Number(x.impressions))}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{fmtNum(Number(x.engagements))}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{fmtNum(Number(x.clicks))}</td>
                        {isYt && <td className="px-3 py-2 text-right tabular-nums">{fmtNum(Number(x.video_views))}</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </section>
          ))}
        </div>
      )}

      {series.length > 0 && (
        <>
          <h2 className="mb-2 mt-8 text-sm font-semibold text-foreground">Account metrics by month</h2>
          <Card className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="px-3 py-2 font-semibold">Date</th>
                  <th className="px-3 py-2 text-right font-semibold">Followers</th>
                  <th className="px-3 py-2 text-right font-semibold">Impr.</th>
                  <th className="px-3 py-2 text-right font-semibold">Engagements</th>
                  <th className="px-3 py-2 text-right font-semibold">Clicks</th>
                  <th className="px-3 py-2 text-right font-semibold">Views</th>
                </tr>
              </thead>
              <tbody>
                {[...series].reverse().map((x) => (
                  <tr key={String(x.id)} className="border-b border-border/60 last:border-0 hover:bg-muted/40">
                    <td className="whitespace-nowrap px-3 py-2 tabular-nums">{String(x.date ?? "—")}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmtNum(Number(x.followers))}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmtNum(Number(x.impressions))}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmtNum(Number(x.engagements))}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmtNum(Number(x.clicks))}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmtNum(Number(x.video_views))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </>
  );
}
