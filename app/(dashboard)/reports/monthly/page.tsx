import Link from "next/link";
import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { KpiCard, KpiGrid } from "@/components/reports/kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fmtMoney, fmtNum, fmtPct } from "@/lib/format";
import { monthContent, monthsWithData, monthSummary } from "@/lib/reports/queries";
import { ensureDb } from "@/lib/db/client";
import { str } from "@/lib/params";
import { buildHref, type SearchParams } from "@/lib/paginate";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Monthly Report" };

function monthLabel(m: string) {
  const [y, mo] = m.split("-");
  return new Date(Date.UTC(Number(y), Number(mo) - 1, 1)).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}

export default async function MonthlyPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  ensureDb();
  const sp = await searchParams;
  const months = monthsWithData();
  const selected = months.includes(str(sp.month) ?? "") ? (str(sp.month) as string) : months[0];

  if (!selected) {
    return (
      <>
        <PageHeader title="Monthly Report" />
        <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          No data yet. Import data to see monthly reports.
        </div>
      </>
    );
  }

  const s = monthSummary(selected);
  const content = monthContent(selected);

  return (
    <>
      <PageHeader title="Monthly Report" description={monthLabel(selected)} />
      <div className="mb-4 flex flex-wrap gap-1">
        {months.slice(0, 18).map((m) => (
          <Link
            key={m}
            href={buildHref(sp, { month: m })}
            className={cn(
              "rounded-md border px-2.5 py-1 text-xs font-medium",
              m === selected ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:bg-muted",
            )}
          >
            {monthLabel(m)}
          </Link>
        ))}
      </div>

      <KpiGrid>
        <KpiCard label="Sessions" value={fmtNum(s.sessions)} />
        <KpiCard label="Users" value={fmtNum(s.users)} />
        <KpiCard label="Conversions" value={fmtNum(s.conversions)} />
        <KpiCard label="Search clicks" value={fmtNum(s.gsc_clicks)} />
        <KpiCard label="Impressions" value={fmtNum(s.gsc_impressions)} />
        <KpiCard label="Avg CTR" value={fmtPct(s.gsc_ctr)} />
        <KpiCard label="Content published" value={String(s.content_published)} />
        <KpiCard label="Emails sent" value={fmtNum(s.email_sent)} />
      </KpiGrid>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>Social</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            <Line label="Impressions" value={fmtNum(s.social_impressions)} />
            <Line label="Engagements" value={fmtNum(s.social_engagements)} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Campaigns</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            <Line label="Spend" value={fmtMoney(s.campaign_cost)} />
            <Line label="Revenue" value={fmtMoney(s.campaign_revenue)} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Email</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            <Line label="Campaigns" value={String(s.email_campaigns)} />
            <Line label="Opens" value={fmtNum(s.email_opens)} />
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader><CardTitle>Content published this month</CardTitle></CardHeader>
        <CardContent>
          {content.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Nothing published in {monthLabel(selected)}.</p>
          ) : (
            <ul className="divide-y divide-border/60 text-sm">
              {content.map((c) => (
                <li key={String(c.id)} className="flex items-center justify-between gap-3 py-2">
                  <a href={String(c.url)} target="_blank" rel="noopener" className="line-clamp-1 text-primary hover:underline">{String(c.title)}</a>
                  <span className="shrink-0 text-xs text-muted-foreground">{String(c.type)} · {String(c.published_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  );
}
