import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { RangePicker } from "@/components/layout/range-picker";
import { KpiCard, KpiGrid } from "@/components/reports/kpi-card";
import { DataTable, type Column } from "@/components/reports/data-table";
import { ChartCard } from "@/components/charts/chart-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getRange } from "@/lib/params";
import { paginateRows, type SearchParams } from "@/lib/paginate";
import { fmtNum, fmtPct } from "@/lib/format";
import { emailMonthly, emailTable, emailTotals } from "@/lib/reports/queries";
import { ensureDb } from "@/lib/db/client";
import { ManagePanel } from "@/components/manage/manage-panel";

export const metadata: Metadata = { title: "Email" };
type Row = Record<string, unknown>;

export default async function EmailPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  ensureDb();
  const sp = await searchParams;
  const r = getRange(sp);
  const t = emailTotals(r.start, r.end);
  const prev = emailTotals(r.prevStart, r.prevEnd);
  const monthly = emailMonthly(r.start, r.end) as Row[];
  const rows = emailTable(r.start, r.end) as Row[];

  const den = t.delivered || t.sent;
  const prevDen = prev.delivered || prev.sent;
  const openRate = den ? (t.opens / den) * 100 : 0;
  const clickRate = den ? (t.clicks / den) * 100 : 0;
  const prevOpen = prevDen ? (prev.opens / prevDen) * 100 : 0;
  const prevClick = prevDen ? (prev.clicks / prevDen) * 100 : 0;

  const table = paginateRows(rows, {
    sortable: ["date", "name", "type", "list_name", "sent", "delivered", "opens", "clicks", "unsubscribes"],
    defaultSort: "date",
    params: sp,
  });

  const cols: Column<Row>[] = [
    { key: "date", label: "Date", sortable: true, render: (x) => String(x.date) },
    { key: "name", label: "Campaign", sortable: true, render: (x) => <span className="line-clamp-1">{String(x.name)}</span> },
    { key: "type", label: "Type", sortable: true, render: (x) => String(x.type ?? "—") },
    { key: "sent", label: "Sent", align: "right", sortable: true, render: (x) => fmtNum(Number(x.sent)) },
    { key: "opens", label: "Opens", align: "right", sortable: true, render: (x) => fmtNum(Number(x.opens)) },
    { key: "open_rate", label: "Open %", align: "right", render: (x) => fmtPct(rate(x.opens, x.delivered, x.sent)) },
    { key: "clicks", label: "Clicks", align: "right", sortable: true, render: (x) => fmtNum(Number(x.clicks)) },
    { key: "click_rate", label: "Click %", align: "right", render: (x) => fmtPct(rate(x.clicks, x.delivered, x.sent)) },
    { key: "unsubscribes", label: "Unsub", align: "right", sortable: true, render: (x) => fmtNum(Number(x.unsubscribes)) },
  ];

  return (
    <>
      <PageHeader title="Email Marketing" description={r.label}>
        <RangePicker />
      </PageHeader>
      <KpiGrid>
        <KpiCard label="Campaigns sent" value={String(t.campaigns)} />
        <KpiCard label="Emails sent" value={fmtNum(t.sent)} current={t.sent} previous={prev.sent} />
        <KpiCard label="Open rate" value={fmtPct(openRate)} current={openRate} previous={prevOpen} />
        <KpiCard label="Click rate" value={fmtPct(clickRate)} current={clickRate} previous={prevClick} />
      </KpiGrid>
      <div className="mt-4">
        <ChartCard
          title="Sent, opens & clicks by month"
          type="bar"
          data={monthly}
          xKey="ym"
          series={[{ key: "sent", label: "Sent" }, { key: "opens", label: "Opens" }, { key: "clicks", label: "Clicks" }]}
        />
      </div>
      <Card className="mt-4">
        <CardHeader><CardTitle>All campaigns</CardTitle></CardHeader>
        <CardContent>
          <DataTable columns={cols} rows={table.rows} state={table.state} caption="All email campaigns" empty="No email campaigns in this range — add them from the manage panel." />
        </CardContent>
      </Card>

      <ManagePanel pageKey="email" />
    </>
  );
}

function rate(part: unknown, delivered: unknown, sent: unknown): number {
  const den = Number(delivered) || Number(sent);
  return den ? (Number(part) / den) * 100 : 0;
}
