import { PageHeader } from "@/components/layout/page-header";
import { ensureDb } from "@/lib/db/client";

export default function OverviewPage() {
  // Ensure the database exists / is migrated on first request.
  ensureDb();

  return (
    <>
      <PageHeader
        title="Marketing Overview"
        description="Traffic, search, social, email and campaign performance at a glance."
      />
      <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
        <p className="text-sm text-muted-foreground">
          The dashboard is being rebuilt. Reports and KPI cards land in the next phase.
        </p>
      </div>
    </>
  );
}
