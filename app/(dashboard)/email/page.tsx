import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { fmtNum, fmtPct } from "@/lib/format";
import { emailAll } from "@/lib/reports/queries";
import { ensureDb } from "@/lib/db/client";
import { groupByMonth, monthLabel } from "@/lib/month";
import { ManagePanel } from "@/components/manage/manage-panel";

export const metadata: Metadata = { title: "Email" };
type Row = Record<string, unknown>;

function rate(part: unknown, delivered: unknown, sent: unknown): number {
  const den = Number(delivered) || Number(sent);
  return den ? (Number(part) / den) * 100 : 0;
}

export default async function EmailPage() {
  ensureDb();
  const rows = emailAll() as Row[];
  const months = groupByMonth(rows, (r) => r.date);
  const totalSent = rows.reduce((a, x) => a + Number(x.sent ?? 0), 0);

  return (
    <>
      <PageHeader
        title="Email Marketing"
        description={`${rows.length} campaigns · ${fmtNum(totalSent)} sent · grouped by month`}
      />

      {rows.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          No email campaigns tracked yet. Import your email report or add sends in the manage panel below.
        </Card>
      ) : (
        <div className="space-y-6">
          {months.map(({ ym, rows: group }) => (
            <section key={ym} aria-label={monthLabel(ym)}>
              <div className="mb-2 flex items-baseline justify-between">
                <h2 className="text-sm font-semibold text-foreground">{monthLabel(ym)}</h2>
                <span className="text-xs text-muted-foreground">{group.length} sends</span>
              </div>
              <Card className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      <th className="px-3 py-2 font-semibold">Date</th>
                      <th className="px-3 py-2 font-semibold">Campaign</th>
                      <th className="px-3 py-2 font-semibold">Type</th>
                      <th className="px-3 py-2 font-semibold">List</th>
                      <th className="px-3 py-2 text-right font-semibold">Sent</th>
                      <th className="px-3 py-2 text-right font-semibold">Opens</th>
                      <th className="px-3 py-2 text-right font-semibold">Open %</th>
                      <th className="px-3 py-2 text-right font-semibold">Clicks</th>
                      <th className="px-3 py-2 text-right font-semibold">Click %</th>
                      <th className="px-3 py-2 text-right font-semibold">Unsub</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.map((x) => (
                      <tr key={String(x.id)} className="border-b border-border/60 last:border-0 hover:bg-muted/40">
                        <td className="whitespace-nowrap px-3 py-2 tabular-nums">{String(x.date ?? "—")}</td>
                        <td className="px-3 py-2"><span className="line-clamp-1 max-w-[22rem] font-medium">{String(x.name)}</span></td>
                        <td className="whitespace-nowrap px-3 py-2">{String(x.type ?? "—")}</td>
                        <td className="whitespace-nowrap px-3 py-2">{String(x.list_name ?? "—")}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{fmtNum(Number(x.sent))}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{fmtNum(Number(x.opens))}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{fmtPct(rate(x.opens, x.delivered, x.sent))}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{fmtNum(Number(x.clicks))}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{fmtPct(rate(x.clicks, x.delivered, x.sent))}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{fmtNum(Number(x.unsubscribes))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </section>
          ))}
        </div>
      )}

      <ManagePanel pageKey="email" />
    </>
  );
}
