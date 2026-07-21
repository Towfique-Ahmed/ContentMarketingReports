"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";

const PRESETS: { key: string; label: string }[] = [
  { key: "7d", label: "7D" },
  { key: "30d", label: "30D" },
  { key: "90d", label: "90D" },
  { key: "12m", label: "12M" },
  { key: "all", label: "All" },
];

/** Date-range control. Writes ?range= (and ?from/?to for custom) to the URL. */
export function RangePicker() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const current = params.get("range") ?? "all";
  const [from, setFrom] = useState(params.get("from") ?? "");
  const [to, setTo] = useState(params.get("to") ?? "");
  const [customOpen, setCustomOpen] = useState(current === "custom");

  function go(next: Record<string, string | null>) {
    const sp = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v === null || v === "") sp.delete(k);
      else sp.set(k, v);
    }
    router.push(`${pathname}?${sp.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-1">
      <div role="group" aria-label="Date range" className="flex items-center gap-1 rounded-lg border border-border p-0.5">
        {PRESETS.map((p) => (
          <button
            key={p.key}
            type="button"
            aria-pressed={current === p.key}
            onClick={() => {
              setCustomOpen(false);
              go({ range: p.key, from: null, to: null });
            }}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs font-semibold transition-colors",
              current === p.key
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {p.label}
          </button>
        ))}
        <button
          type="button"
          aria-pressed={current === "custom"}
          onClick={() => setCustomOpen((v) => !v)}
          className={cn(
            "rounded-md px-2.5 py-1 text-xs font-semibold transition-colors",
            current === "custom"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          Custom
        </button>
      </div>
      {customOpen && (
        <form
          className="flex items-center gap-1"
          onSubmit={(e) => {
            e.preventDefault();
            if (from && to) go({ range: "custom", from, to });
          }}
        >
          <label className="sr-only" htmlFor="range-from">From</label>
          <input
            id="range-from"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-md border border-input bg-background px-2 py-1 text-xs"
            required
          />
          <span aria-hidden className="text-muted-foreground">→</span>
          <label className="sr-only" htmlFor="range-to">To</label>
          <input
            id="range-to"
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-md border border-input bg-background px-2 py-1 text-xs"
            required
          />
          <button
            type="submit"
            className="rounded-md bg-secondary px-2.5 py-1 text-xs font-semibold text-secondary-foreground hover:bg-secondary/80"
          >
            Go
          </button>
        </form>
      )}
    </div>
  );
}
