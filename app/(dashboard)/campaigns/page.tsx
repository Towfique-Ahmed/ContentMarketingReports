import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { fmtMoney, fmtNum } from "@/lib/format";
import { campaignAll } from "@/lib/reports/queries";
import { ensureDb } from "@/lib/db/client";
import { groupByMonth, monthLabel } from "@/lib/month";
import { ManagePanel } from "@/components/manage/manage-panel";

export const metadata: Metadata = { title: "Campaigns" };
type Row = Record<string, unknown>;

const STATUS_TONE: Record<string, string> = {
  active: "text-success",
  paused: "text-warning",
  completed: "text-muted-foreground",
  planned: "text-chart-1",
};

function cap(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : "—";
}

export default async function CampaignsPage() {
  ensureDb();
  const rows = campaignAll() as Row[];
  const months = groupByMonth(rows, (r) => r.start_date);
  const revenue = rows.reduce((a, x) => a + Number(x.revenue ?? 0), 0);

  return (
    <>
      <PageHeader
        title="Campaign Reports"
        description={`${rows.length} campaigns · ${fmtMoney(revenue)} revenue · grouped by month`}
      />

      {rows.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          No campaigns tracked yet. Add campaigns and their metrics in the manage panel below.
        </Card>
      ) : (
        <div className="space-y-6">
          {months.map(({ ym, rows: group }) => (
            <section key={ym} aria-label={ym === "0000-00" ? "No start date" : monthLabel(ym)}>
              <div className="mb-2 flex items-baseline justify-between">
                <h2 className="text-sm font-semibold text-foreground">{ym === "0000-00" ? "No start date" : monthLabel(ym)}</h2>
                <span className="text-xs text-muted-foreground">{group.length} campaigns</span>
              </div>
              <Card className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      <th className="px-3 py-2 font-semibold">Started</th>
                      <th className="px-3 py-2 font-semibold">Campaign</th>
                      <th className="px-3 py-2 font-semibold">Channel</th>
                      <th className="px-3 py-2 font-semibold">Status</th>
                      <th className="px-3 py-2 text-right font-semibold">Spend</th>
                      <th className="px-3 py-2 text-right font-semibold">Clicks</th>
                      <th className="px-3 py-2 text-right font-semibold">Conv.</th>
                      <th className="px-3 py-2 text-right font-semibold">Revenue</th>
                      <th className="px-3 py-2 text-right font-semibold">ROAS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.map((x) => (
                      <tr key={String(x.id)} className="border-b border-border/60 last:border-0 hover:bg-muted/40">
                        <td className="whitespace-nowrap px-3 py-2 tabular-nums">{String(x.start_date ?? "—")}</td>
                        <td className="px-3 py-2"><span className="line-clamp-1 max-w-[22rem] font-medium">{String(x.name)}</span></td>
                        <td className="whitespace-nowrap px-3 py-2">{String(x.channel ?? "—")}</td>
                        <td className="px-3 py-2"><span className={`font-semibold ${STATUS_TONE[String(x.status)] ?? ""}`}>{cap(String(x.status ?? ""))}</span></td>
                        <td className="px-3 py-2 text-right tabular-nums">{fmtMoney(Number(x.cost))}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{fmtNum(Number(x.clicks))}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{fmtNum(Number(x.conversions))}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{fmtMoney(Number(x.revenue))}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{Number(x.cost) ? (Number(x.revenue) / Number(x.cost)).toFixed(1) + "x" : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </section>
          ))}
        </div>
      )}

      <ManagePanel pageKey="campaigns" />
    </>
  );
}
