import Link from "next/link";
import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { getRange, str } from "@/lib/params";
import { buildHref, type SearchParams } from "@/lib/paginate";
import { fmtNum } from "@/lib/format";
import { contentByType } from "@/lib/reports/queries";
import { ensureDb } from "@/lib/db/client";
import { cn } from "@/lib/utils";
import { ManagePanel } from "@/components/manage/manage-panel";

export const metadata: Metadata = { title: "Content" };

const TYPES: Record<string, string> = {
  blog: "Blog",
  documentation: "Documentation",
  landing_page: "Landing Pages",
  case_study: "Case Studies",
};

type Row = Record<string, unknown>;

function monthKey(published: unknown): string {
  const s = String(published ?? "");
  return /^\d{4}-\d{2}/.test(s) ? s.slice(0, 7) : "0000-00";
}
function monthLabel(ym: string): string {
  if (ym === "0000-00") return "No publish date";
  const [y, m] = ym.split("-");
  return new Date(Date.UTC(Number(y), Number(m) - 1, 1)).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default async function ContentPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  ensureDb();
  const sp = await searchParams;
  const type = TYPES[str(sp.type) ?? ""] ? (str(sp.type) as string) : "blog";
  const items = contentByType(type) as Row[];

  // Group by publish month, newest month first (spreadsheet layout).
  const groups = new Map<string, Row[]>();
  for (const it of items) {
    const k = monthKey(it.published_at);
    (groups.get(k) ?? groups.set(k, []).get(k)!).push(it);
  }
  const months = [...groups.keys()].sort().reverse();
  const totalViews = items.reduce((a, x) => a + Number(x.views ?? 0), 0);

  return (
    <>
      <PageHeader
        title="Content"
        description={`${items.length} ${TYPES[type].toLowerCase()} · ${fmtNum(totalViews)} views · grouped by month`}
      />

      <div role="tablist" aria-label="Content type" className="mb-4 flex flex-wrap gap-1 border-b border-border">
        {Object.entries(TYPES).map(([key, label]) => (
          <Link
            key={key}
            role="tab"
            aria-selected={type === key}
            href={buildHref(sp, { type: key })}
            className={cn(
              "border-b-2 px-3 py-2 text-sm font-medium",
              type === key ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </Link>
        ))}
      </div>

      {items.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          No {TYPES[type].toLowerCase()} tracked yet. Import your content report or add items in the manage panel below.
        </Card>
      ) : (
        <div className="space-y-6">
          {months.map((ym) => (
            <section key={ym} aria-label={monthLabel(ym)}>
              <div className="mb-2 flex items-baseline justify-between">
                <h2 className="text-sm font-semibold text-foreground">{monthLabel(ym)}</h2>
                <span className="text-xs text-muted-foreground">{groups.get(ym)!.length} items</span>
              </div>
              <Card className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      <th className="px-3 py-2 font-semibold">Published</th>
                      <th className="px-3 py-2 font-semibold">Topic</th>
                      <th className="px-3 py-2 font-semibold">Funnel</th>
                      <th className="px-3 py-2 font-semibold">Author</th>
                      <th className="px-3 py-2 font-semibold">Reviewer</th>
                      <th className="px-3 py-2 font-semibold">Publisher</th>
                      <th className="px-3 py-2 font-semibold">Target keyword</th>
                      <th className="px-3 py-2 text-right font-semibold">Kw pos</th>
                      <th className="px-3 py-2 font-semibold">AI presence</th>
                      <th className="px-3 py-2 text-right font-semibold">Views</th>
                      <th className="px-3 py-2 text-right font-semibold">Volume</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groups.get(ym)!.map((x) => (
                      <tr key={String(x.id)} className="border-b border-border/60 last:border-0 hover:bg-muted/40">
                        <td className="whitespace-nowrap px-3 py-2 tabular-nums">{String(x.published_at ?? "—")}</td>
                        <td className="px-3 py-2">
                          <a href={String(x.url)} target="_blank" rel="noopener" className="line-clamp-1 max-w-[26rem] text-primary hover:underline">
                            {String(x.title)}
                          </a>
                        </td>
                        <td className="px-3 py-2">{x.funnel_stage ? <span className="rounded-full border border-border px-2 py-0.5">{String(x.funnel_stage)}</span> : "—"}</td>
                        <td className="whitespace-nowrap px-3 py-2">{String(x.author ?? "—")}</td>
                        <td className="whitespace-nowrap px-3 py-2">{String(x.reviewer ?? "—")}</td>
                        <td className="whitespace-nowrap px-3 py-2">{String(x.publisher ?? "—")}</td>
                        <td className="px-3 py-2"><span className="line-clamp-1 max-w-[16rem]">{String(x.target_keyword ?? "—")}</span></td>
                        <td className="px-3 py-2 text-right">{String(x.keyword_position ?? "—")}</td>
                        <td className="px-3 py-2"><span className="line-clamp-1 max-w-[12rem]">{String(x.ai_presence ?? "—")}</span></td>
                        <td className="px-3 py-2 text-right tabular-nums">{x.views ? fmtNum(Number(x.views)) : "—"}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{x.search_volume ? fmtNum(Number(x.search_volume)) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </section>
          ))}
        </div>
      )}

      <ManagePanel pageKey="content" />
    </>
  );
}
