import { PageHeader } from "@/components/layout/page-header";

export function ComingSoon({ title }: { title: string }) {
  return (
    <>
      <PageHeader title={title} />
      <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
        <p className="text-sm text-muted-foreground">This report lands in the next build phase.</p>
      </div>
    </>
  );
}
