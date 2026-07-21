import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { RangePicker } from "@/components/layout/range-picker";
import { KpiCard, KpiGrid } from "@/components/reports/kpi-card";
import { DataTable, type Column } from "@/components/reports/data-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getRange } from "@/lib/params";
import { paginateRows, type SearchParams } from "@/lib/paginate";
import { fmtMoney, fmtNum, fmtPct } from "@/lib/format";
import { campaignTable } from "@/lib/reports/queries";
import { ensureDb } from "@/lib/db/client";

export const metadata: Metadata = { title: "Campaigns" };
type Row = Record<string, unknown>;

const STATUS_TONE: Record<string, string> = {
  active: "text-success",
  paused: "text-warning",
  completed: "text-muted-foreground",
  planned: "text-chart-1",
};

export default async function CampaignsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  ensureDb();
  const sp = await searchParams;
  const r = getRange(sp);
  const rows = campaignTable(r.start, r.end) as Row[];

  const cost = rows.reduce((a, x) => a + Number(x.cost), 0);
  const revenue = rows.reduce((a, x) => a + Number(x.revenue), 0);
  const conv = rows.reduce((a, x) => a + Number(x.conversions), 0);

  const table = paginateRows(rows, {
    sortable: ["name", "channel", "status", "start_date", "budget", "cost", "impressions", "clicks", "conversions", "revenue"],
    defaultSort: "revenue",
    params: sp,
  });

  const cols: Column<Row>[] = [
    { key: "name", label: "Campaign", sortable: true, render: (x) => <span className="line-clamp-1">{String(x.name)}</span> },
    { key: "channel", label: "Channel", sortable: true, render: (x) => String(x.channel) },
    { key: "status", label: "Status", sortable: true, render: (x) => <span className={`text-xs font-semibold ${STATUS_TONE[String(x.status)] ?? ""}`}>{cap(String(x.status))}</span> },
    { key: "budget", label: "Budget", align: "right", sortable: true, render: (x) => fmtMoney(Number(x.budget)) },
    { key: "cost", label: "Spend", align: "right", sortable: true, render: (x) => fmtMoney(Number(x.cost)) },
    { key: "clicks", label: "Clicks", align: "right", sortable: true, render: (x) => fmtNum(Number(x.clicks)) },
    { key: "conversions", label: "Conv.", align: "right", sortable: true, render: (x) => fmtNum(Number(x.conversions)) },
    { key: "cpa", label: "CPA", align: "right", render: (x) => (Number(x.conversions) ? fmtMoney(Number(x.cost) / Number(x.conversions)) : "—") },
    { key: "revenue", label: "Revenue", align: "right", sortable: true, render: (x) => fmtMoney(Number(x.revenue)) },
    { key: "roas", label: "ROAS", align: "right", render: (x) => (Number(x.cost) ? (Number(x.revenue) / Number(x.cost)).toFixed(1) + "x" : "—") },
  ];

  return (
    <>
      <PageHeader title="Campaign Reports" description={r.label}>
        <RangePicker />
      </PageHeader>
      <KpiGrid>
        <KpiCard label="Total spend" value={fmtMoney(cost)} />
        <KpiCard label="Total revenue" value={fmtMoney(revenue)} />
        <KpiCard label="Blended ROAS" value={cost ? (revenue / cost).toFixed(2) + "x" : "—"} />
        <KpiCard label="Cost / conversion" value={conv ? fmtMoney(cost / conv) : "—"} />
      </KpiGrid>
      <Card className="mt-4">
        <CardHeader><CardTitle>All campaigns</CardTitle></CardHeader>
        <CardContent>
          <DataTable columns={cols} rows={table.rows} state={table.state} caption="All campaigns" empty="No campaigns yet — add them from the manage panel." />
        </CardContent>
      </Card>
    </>
  );
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
