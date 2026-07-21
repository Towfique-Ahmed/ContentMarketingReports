import { Eye, MousePointerClick, Search, Target, TrendingUp, Users } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { RangePicker } from "@/components/layout/range-picker";
import { KpiCard, KpiGrid } from "@/components/reports/kpi-card";
import { ChartCard } from "@/components/charts/chart-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { resolveRange } from "@/lib/date-range";
import { fmtNum, fmtPct } from "@/lib/format";
import {
  gaChannels,
  gaSeries,
  gaTotals,
  gscSeries,
  gscTotals,
} from "@/lib/reports/queries";
import { ensureDb } from "@/lib/db/client";

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  ensureDb();
  const sp = await searchParams;
  const r = resolveRange({
    range: str(sp.range),
    from: str(sp.from),
    to: str(sp.to),
  });

  const ga = gaTotals(r.start, r.end);
  const gaPrev = gaTotals(r.prevStart, r.prevEnd);
  const gsc = gscTotals(r.start, r.end);
  const gscPrev = gscTotals(r.prevStart, r.prevEnd);
  const gaS = gaSeries(r.start, r.end);
  const gscS = gscSeries(r.start, r.end);
  const channels = gaChannels(r.start, r.end).slice(0, 8);
  const maxCh = Math.max(1, ...channels.map((c) => Number(c.sessions)));

  return (
    <>
      <PageHeader title="Marketing Overview" description={r.label}>
        <RangePicker />
      </PageHeader>

      <KpiGrid>
        <KpiCard label="Sessions" value={fmtNum(ga.sessions)} current={ga.sessions} previous={gaPrev.sessions} icon={TrendingUp} />
        <KpiCard label="Users" value={fmtNum(ga.users)} current={ga.users} previous={gaPrev.users} icon={Users} />
        <KpiCard label="Search clicks" value={fmtNum(gsc.clicks)} current={gsc.clicks} previous={gscPrev.clicks} icon={MousePointerClick} />
        <KpiCard label="Impressions" value={fmtNum(gsc.impressions)} current={gsc.impressions} previous={gscPrev.impressions} icon={Eye} />
        <KpiCard label="Conversions" value={fmtNum(ga.conversions)} current={ga.conversions} previous={gaPrev.conversions} icon={Target} />
        <KpiCard label="Avg position" value={ga ? gsc.position.toFixed(1) : "—"} current={gsc.position} previous={gscPrev.position} lowerIsBetter icon={Search} />
        <KpiCard label="Engagement rate" value={fmtPct(ga.engagement_rate)} current={ga.engagement_rate} previous={gaPrev.engagement_rate} />
        <KpiCard label="Avg CTR" value={fmtPct(gsc.ctr)} current={gsc.ctr} previous={gscPrev.ctr} />
      </KpiGrid>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Traffic trend"
          description="Sessions and users over the selected range"
          data={gaS}
          xKey="date"
          type="area"
          series={[
            { key: "sessions", label: "Sessions" },
            { key: "users", label: "Users" },
          ]}
        />
        <ChartCard
          title="Search clicks"
          description="Google Search Console clicks"
          data={gscS}
          xKey="date"
          series={[{ key: "clicks", label: "Clicks" }]}
        />
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Top acquisition channels</CardTitle>
        </CardHeader>
        <CardContent>
          {channels.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No channel data yet. Import GA4 data from the Search &amp; Traffic page.
            </p>
          ) : (
            <ul className="space-y-2">
              {channels.map((c) => (
                <li key={String(c.channel)} className="grid grid-cols-[10rem_1fr_5rem] items-center gap-3 text-sm">
                  <span className="truncate">{String(c.channel)}</span>
                  <span className="h-2 rounded-full bg-muted">
                    <span
                      className="block h-2 rounded-full bg-chart-1"
                      style={{ width: `${(Number(c.sessions) / maxCh) * 100}%` }}
                    />
                  </span>
                  <span className="text-right tabular-nums text-muted-foreground">{fmtNum(Number(c.sessions))}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </>
  );
}

function str(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}
