import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable, type Column } from "@/components/reports/data-table";
import { ChartCard } from "@/components/charts/chart-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fmtNum } from "@/lib/format";
import { yearlyRollup } from "@/lib/reports/queries";
import { ensureDb } from "@/lib/db/client";
import type { SearchParams } from "@/lib/paginate";

export const metadata: Metadata = { title: "Yearly Report" };
type Row = Record<string, unknown>;

export default async function YearlyPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  ensureDb();
  const sp = await searchParams;
  const rows = yearlyRollup() as Row[];

  const cols: Column<Row>[] = [
    { key: "y", label: "Year", render: (x) => String(x.y) },
    { key: "sessions", label: "Sessions", align: "right", render: (x) => fmtNum(Number(x.sessions)) },
    { key: "users", label: "Users", align: "right", render: (x) => fmtNum(Number(x.users)) },
    { key: "pageviews", label: "Pageviews", align: "right", render: (x) => fmtNum(Number(x.pageviews)) },
    { key: "conversions", label: "Conversions", align: "right", render: (x) => fmtNum(Number(x.conversions)) },
    { key: "gsc_clicks", label: "Search clicks", align: "right", render: (x) => fmtNum(Number(x.gsc_clicks)) },
    { key: "social_engagements", label: "Social eng.", align: "right", render: (x) => fmtNum(Number(x.social_engagements)) },
  ];

  return (
    <>
      <PageHeader title="Yearly Report" description="Year-over-year rollup across sources" />
      <ChartCard
        title="Sessions & search clicks by year"
        type="bar"
        data={rows}
        xKey="y"
        series={[{ key: "sessions", label: "Sessions" }, { key: "gsc_clicks", label: "Search clicks" }]}
      />
      <Card className="mt-4">
        <CardHeader><CardTitle>Yearly totals</CardTitle></CardHeader>
        <CardContent>
          <DataTable columns={cols} rows={rows} state={{ ns: "", total: 0, perPage: 20, page: 1, pages: 1, offset: 0, sort: "", dir: "desc", sortable: [], params: sp }} caption="Yearly totals" empty="No data yet." />
        </CardContent>
      </Card>
    </>
  );
}
