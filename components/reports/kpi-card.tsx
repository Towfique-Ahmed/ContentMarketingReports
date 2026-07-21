import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { DeltaBadge } from "./delta-badge";

export function KpiCard({
  label,
  value,
  current,
  previous,
  lowerIsBetter,
  icon: Icon,
  hint,
}: {
  label: string;
  value: string;
  current?: number;
  previous?: number;
  lowerIsBetter?: boolean;
  icon?: LucideIcon;
  hint?: string;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
        {Icon && <Icon className="size-4 text-muted-foreground" aria-hidden />}
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight">{value}</div>
      <div className="mt-1 flex items-center gap-2">
        {current !== undefined && previous !== undefined && (
          <DeltaBadge current={current} previous={previous} lowerIsBetter={lowerIsBetter} />
        )}
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
    </Card>
  );
}

export function KpiGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">{children}</div>;
}
