import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { delta as computeDelta } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Period-over-period change. Direction is carried by an arrow icon + text as
 * well as color, so it never relies on color alone (WCAG 1.4.1).
 */
export function DeltaBadge({
  current,
  previous,
  lowerIsBetter = false,
}: {
  current: number;
  previous: number;
  lowerIsBetter?: boolean;
}) {
  const d = computeDelta(current, previous);
  if (d.change === null) {
    return <span className="text-xs font-medium text-muted-foreground">—</span>;
  }
  const tone =
    d.good === null ? "text-muted-foreground" : d.good ? "text-success" : "text-danger";
  const Icon = d.direction === "up" ? ArrowUp : d.direction === "down" ? ArrowDown : Minus;
  const dirWord = d.direction === "up" ? "up" : d.direction === "down" ? "down" : "no change";
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-xs font-semibold", tone)}>
      <Icon className="size-3" aria-hidden />
      <span>{d.label}</span>
      <span className="sr-only"> {dirWord} versus previous period</span>
    </span>
  );
}
