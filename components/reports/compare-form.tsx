"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function CompareForm({
  metrics,
  defaults,
}: {
  metrics: { key: string; label: string }[];
  defaults: { metric: string; aFrom: string; aTo: string; bFrom: string; bTo: string };
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [state, setState] = useState(defaults);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const sp = new URLSearchParams(params.toString());
    sp.set("metric", state.metric);
    sp.set("a_from", state.aFrom);
    sp.set("a_to", state.aTo);
    sp.set("b_from", state.bFrom);
    sp.set("b_to", state.bTo);
    router.push(`?${sp.toString()}`);
  }

  const field = "rounded-md border border-input bg-background px-2 py-1.5 text-sm";
  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4">
      <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
        Metric
        <select className={field} value={state.metric} onChange={(e) => setState({ ...state, metric: e.target.value })}>
          {metrics.map((m) => (
            <option key={m.key} value={m.key}>{m.label}</option>
          ))}
        </select>
      </label>
      <fieldset className="flex items-end gap-2">
        <legend className="sr-only">Period A</legend>
        <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">Period A from
          <input type="date" className={field} value={state.aFrom} onChange={(e) => setState({ ...state, aFrom: e.target.value })} required />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">to
          <input type="date" className={field} value={state.aTo} onChange={(e) => setState({ ...state, aTo: e.target.value })} required />
        </label>
      </fieldset>
      <fieldset className="flex items-end gap-2">
        <legend className="sr-only">Period B</legend>
        <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">Period B from
          <input type="date" className={field} value={state.bFrom} onChange={(e) => setState({ ...state, bFrom: e.target.value })} required />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">to
          <input type="date" className={field} value={state.bTo} onChange={(e) => setState({ ...state, bTo: e.target.value })} required />
        </label>
      </fieldset>
      <Button type="submit">Compare</Button>
    </form>
  );
}
