import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { KpiCard, KpiGrid } from "@/components/reports/kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fmtNum } from "@/lib/format";
import { unifiedKeywords } from "@/lib/reports/queries";
import { deleteKeywordsAction } from "@/lib/actions";
import { ensureDb } from "@/lib/db/client";
import { KeywordsTable } from "@/components/reports/keywords-table";
import { ManagePanel } from "@/components/manage/manage-panel";

export const metadata: Metadata = { title: "Keywords" };

export default async function KeywordsPage() {
  ensureDb();
  const keywords = unifiedKeywords();

  const ranked = keywords.filter((k) => k.position !== null && Number.isFinite(Number(k.position)));
  const top10 = ranked.filter((k) => Number(k.position) <= 10).length;
  const improved = keywords.filter(
    (k) => k.position !== null && k.prev_position !== null && k.prev_position - Number(k.position) > 0,
  ).length;
  const totalVol = keywords.reduce((a, k) => a + Number(k.vol ?? 0), 0);

  return (
    <>
      <PageHeader
        title="Keywords"
        description={`${keywords.length} keywords tracked · rank tracker`}
      />
      <KpiGrid>
        <KpiCard label="Keywords" value={String(keywords.length)} />
        <KpiCard label="In top 10" value={String(top10)} />
        <KpiCard label="Improved" value={String(improved)} hint="vs previous check" />
        <KpiCard label="Total search volume" value={fmtNum(totalVol)} />
      </KpiGrid>
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Rank tracker</CardTitle>
        </CardHeader>
        <CardContent>
          <KeywordsTable keywords={keywords} deleteAction={deleteKeywordsAction} />
          <p className="mt-3 text-xs text-muted-foreground">
            Tracked keywords and every Content “Target keyword” appear here together — the two stay in sync automatically.
            Change compares the latest rank check with the one before it.
          </p>
        </CardContent>
      </Card>

      <ManagePanel pageKey="keywords" />
    </>
  );
}
