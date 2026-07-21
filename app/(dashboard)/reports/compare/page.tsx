import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { CompareForm } from "@/components/reports/compare-form";
import { DeltaBadge } from "@/components/reports/delta-badge";
import { ChartCard } from "@/components/charts/chart-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/reports/data-table";
import { COMPARE_METRICS, compareSeries, compareValue, earliestDataDate, latestDataDate } from "@/lib/reports/queries";
import { ensureDb } from "@/lib/db/client";
import { str } from "@/lib/params";
import type { SearchParams } from "@/lib/paginate";

export const metadata: Metadata = { title: "Compare Report" };
type Row = Record<string, unknown>;

function addDays(date: string, n: number) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export default async function ComparePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  ensureDb();
  const sp = await searchParams;
  const latest = latestDataDate() ?? new Date().toISOString().slice(0, 10);
  const earliest = earliestDataDate() ?? addDays(latest, -60);

  const metric = COMPARE_METRICS[str(sp.metric) ?? ""] ? (str(sp.metric) as string) : "ga_sessions";
  const aTo = str(sp.a_to) ?? latest;
  const aFrom = str(sp.a_from) ?? (addDays(aTo, -29) < earliest ? earliest : addDays(aTo, -29));
  const bTo = str(sp.b_to) ?? addDays(aFrom, -1);
  const bFrom = str(sp.b_from) ?? addDays(bTo, -29);

  const m = COMPARE_METRICS[metric];
  const aVal = compareValue(metric, aFrom, aTo);
  const bVal = compareValue(metric, bFrom, bTo);

  const aSeries = compareSeries(metric, aFrom, aTo) as Row[];
  const bSeries = compareSeries(metric, bFrom, bTo) as Row[];
  const overlay: Row[] = [];
  const n = Math.max(aSeries.length, bSeries.length);
  for (let i = 0; i < n; i++) {
    overlay.push({ i: i + 1, "Period A": Number(aSeries[i]?.value ?? 0), "Period B": Number(bSeries[i]?.value ?? 0) });
  }

  // All-metric delta table.
  const allRows: Row[] = Object.entries(COMPARE_METRICS).map(([key, def]) => {
    const a = compareValue(key, aFrom, aTo);
    const b = compareValue(key, bFrom, bTo);
    return { metric: def.label, a, b, lowerIsBetter: def.lowerIsBetter };
  });
  const cols: Column<Row>[] = [
    { key: "metric", label: "Metric", render: (x) => String(x.metric) },
    { key: "a", label: "Period A", align: "right", render: (x) => Number(x.a).toLocaleString("en-US", { maximumFractionDigits: 1 }) },
    { key: "b", label: "Period B", align: "right", render: (x) => Number(x.b).toLocaleString("en-US", { maximumFractionDigits: 1 }) },
    { key: "delta", label: "Change", align: "right", render: (x) => <DeltaBadge current={Number(x.a)} previous={Number(x.b)} lowerIsBetter={Boolean(x.lowerIsBetter)} /> },
  ];

  const metricOptions = Object.entries(COMPARE_METRICS).map(([key, def]) => ({ key, label: def.label }));

  return (
    <>
      <PageHeader title="Compare" description="Any metric across two date ranges" />
      <CompareForm metrics={metricOptions} defaults={{ metric, aFrom, aTo, bFrom, bTo }} />

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <div className="text-xs font-medium uppercase text-muted-foreground">Period A · {aFrom} → {aTo}</div>
          <div className="mt-2 text-2xl font-semibold">{aVal.toLocaleString("en-US", { maximumFractionDigits: 1 })}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs font-medium uppercase text-muted-foreground">Period B · {bFrom} → {bTo}</div>
          <div className="mt-2 text-2xl font-semibold">{bVal.toLocaleString("en-US", { maximumFractionDigits: 1 })}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs font-medium uppercase text-muted-foreground">Change ({m.label})</div>
          <div className="mt-2 text-2xl font-semibold"><DeltaBadge current={aVal} previous={bVal} lowerIsBetter={m.lowerIsBetter} /></div>
        </Card>
      </div>

      <div className="mt-4">
        <ChartCard title={`${m.label} — day-by-day overlay`} data={overlay} xKey="i" series={[{ key: "Period A", label: "Period A" }, { key: "Period B", label: "Period B" }]} />
      </div>

      <Card className="mt-4">
        <CardHeader><CardTitle>All metrics</CardTitle></CardHeader>
        <CardContent>
          <DataTable columns={cols} rows={allRows} state={{ ns: "", total: 0, perPage: 20, page: 1, pages: 1, offset: 0, sort: "", dir: "desc", sortable: [], params: sp }} caption="All metrics comparison" />
        </CardContent>
      </Card>
    </>
  );
}
