import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { KpiCard, KpiGrid } from "@/components/reports/kpi-card";
import { ChartCard } from "@/components/charts/chart-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fmtNum } from "@/lib/format";
import { monthsWithData, monthSummary, yearlyRollup } from "@/lib/reports/queries";
import { ensureDb } from "@/lib/db/client";

export const metadata: Metadata = { title: "Monthly & Yearly Report" };

type Row = Record<string, unknown>;

function monthLabel(m: string) {
  const [y, mo] = m.split("-");
  return new Date(Date.UTC(Number(y), Number(mo) - 1, 1)).toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
}

export default async function MonthlyYearlyPage() {
  ensureDb();

  const runningYear = new Date().getFullYear();
  const allMonths = monthsWithData();
  // Months of the running year, chronological.
  const months = allMonths.filter((m) => m.startsWith(String(runningYear))).sort();
  const summaries = months.map((m) => monthSummary(m));

  // Running-year totals (sum of its months).
  const yt = summaries.reduce(
    (a, s) => ({
      sessions: a.sessions + s.sessions,
      users: a.users + s.users,
      conversions: a.conversions + s.conversions,
      gsc_clicks: a.gsc_clicks + s.gsc_clicks,
      content: a.content + s.content_published,
      email_sent: a.email_sent + s.email_sent,
    }),
    { sessions: 0, users: 0, conversions: 0, gsc_clicks: 0, content: 0, email_sent: 0 },
  );

  const chartData: Row[] = summaries.map((s) => ({
    month: monthLabel(s.month),
    Sessions: s.sessions,
    "Search clicks": s.gsc_clicks,
  }));

  // Year-over-year totals (all years with GA data), newest first.
  const years = (yearlyRollup() as Row[]).slice().reverse();

  return (
    <>
      <PageHeader
        title="Monthly & Yearly Report"
        description={`${runningYear} month by month, plus year-over-year totals`}
      />

      {months.length > 0 && (
        <KpiGrid>
          <KpiCard label={`${runningYear} sessions`} value={fmtNum(yt.sessions)} />
          <KpiCard label={`${runningYear} users`} value={fmtNum(yt.users)} />
          <KpiCard label={`${runningYear} search clicks`} value={fmtNum(yt.gsc_clicks)} />
          <KpiCard label={`${runningYear} content published`} value={fmtNum(yt.content)} />
        </KpiGrid>
      )}

      <div className="mt-4">
        <ChartCard
          title={`${runningYear} — sessions & search clicks by month`}
          type="bar"
          data={chartData}
          xKey="month"
          series={[{ key: "Sessions", label: "Sessions" }, { key: "Search clicks", label: "Search clicks" }]}
        />
      </div>

      <Card className="mt-4">
        <CardHeader><CardTitle>{runningYear} — month by month</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="px-3 py-2 text-xs font-semibold">Month</th>
                <th className="px-3 py-2 text-right text-xs font-semibold">Sessions</th>
                <th className="px-3 py-2 text-right text-xs font-semibold">Users</th>
                <th className="px-3 py-2 text-right text-xs font-semibold">Conversions</th>
                <th className="px-3 py-2 text-right text-xs font-semibold">Search clicks</th>
                <th className="px-3 py-2 text-right text-xs font-semibold">Impressions</th>
                <th className="px-3 py-2 text-right text-xs font-semibold">Content</th>
                <th className="px-3 py-2 text-right text-xs font-semibold">Emails sent</th>
                <th className="px-3 py-2 text-right text-xs font-semibold">Social eng.</th>
              </tr>
            </thead>
            <tbody>
              {summaries.length === 0 ? (
                <tr><td colSpan={9} className="px-3 py-8 text-center text-muted-foreground">No data for {runningYear} yet.</td></tr>
              ) : (
                summaries.map((s) => (
                  <tr key={s.month} className="border-b border-border/60 last:border-0 hover:bg-muted/40">
                    <td className="whitespace-nowrap px-3 py-2 font-medium">{monthLabel(s.month)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmtNum(s.sessions)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmtNum(s.users)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmtNum(s.conversions)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmtNum(s.gsc_clicks)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmtNum(s.gsc_impressions)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmtNum(s.content_published)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmtNum(s.email_sent)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmtNum(s.social_engagements)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader><CardTitle>Year over year</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="px-3 py-2 text-xs font-semibold">Year</th>
                <th className="px-3 py-2 text-right text-xs font-semibold">Sessions</th>
                <th className="px-3 py-2 text-right text-xs font-semibold">Users</th>
                <th className="px-3 py-2 text-right text-xs font-semibold">Pageviews</th>
                <th className="px-3 py-2 text-right text-xs font-semibold">Conversions</th>
                <th className="px-3 py-2 text-right text-xs font-semibold">Search clicks</th>
                <th className="px-3 py-2 text-right text-xs font-semibold">Social eng.</th>
              </tr>
            </thead>
            <tbody>
              {years.length === 0 ? (
                <tr><td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">No yearly data yet.</td></tr>
              ) : (
                years.map((y) => (
                  <tr key={String(y.y)} className={`border-b border-border/60 last:border-0 hover:bg-muted/40 ${Number(y.y) === runningYear ? "font-medium" : ""}`}>
                    <td className="px-3 py-2">{String(y.y)}{Number(y.y) === runningYear ? " (current)" : ""}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmtNum(Number(y.sessions))}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmtNum(Number(y.users))}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmtNum(Number(y.pageviews))}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmtNum(Number(y.conversions))}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmtNum(Number(y.gsc_clicks))}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmtNum(Number(y.social_engagements))}</td>
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
