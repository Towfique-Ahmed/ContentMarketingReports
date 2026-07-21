"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AXIS_COLOR, CHART_PALETTE, GRID_COLOR } from "@/lib/chart-palette";
import { fmtDuration, fmtMoney, fmtNum, fmtPct } from "@/lib/format";

export type Series = { key: string; label: string };
export type ValueFormat = "num" | "money" | "pct" | "duration";

const FORMATTERS: Record<ValueFormat, (n: number) => string> = {
  num: fmtNum,
  money: fmtMoney,
  pct: fmtPct,
  duration: fmtDuration,
};

type Props = {
  type?: "line" | "area" | "bar";
  data: Record<string, unknown>[];
  xKey: string;
  series: Series[];
  height?: number;
  /** value format (string so it can cross the server→client boundary) */
  format?: ValueFormat;
};

/**
 * Theme-aware categorical chart with a legend (identity is never color-alone),
 * a crosshair tooltip, and a toggleable accessible data table (WCAG).
 */
export function SeriesChart({ type = "line", data, xKey, series, height = 260, format = "num" }: Props) {
  const valueFormat = FORMATTERS[format];
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [showTable, setShowTable] = useState(false);
  useEffect(() => setMounted(true), []);

  const dark = mounted && resolvedTheme === "dark";
  const palette = dark ? CHART_PALETTE.dark : CHART_PALETTE.light;
  const axis = dark ? AXIS_COLOR.dark : AXIS_COLOR.light;
  const grid = dark ? GRID_COLOR.dark : GRID_COLOR.light;

  const summary = `${type} chart of ${series.map((s) => s.label).join(", ")} over ${data.length} points`;

  const axisProps = {
    stroke: axis,
    tick: { fill: axis, fontSize: 11 },
    tickLine: false,
    axisLine: { stroke: grid },
  } as const;
  const tooltipStyle = {
    contentStyle: {
      background: "hsl(var(--popover))",
      border: "1px solid hsl(var(--border))",
      borderRadius: 8,
      fontSize: 12,
      color: "hsl(var(--popover-foreground))",
    },
    labelStyle: { color: "hsl(var(--muted-foreground))" },
    formatter: (v: number) => valueFormat(Number(v)),
  };

  return (
    <div>
      <div className="mb-1 flex justify-end">
        <button
          type="button"
          onClick={() => setShowTable((v) => !v)}
          className="rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-pressed={showTable}
        >
          {showTable ? "View chart" : "View as table"}
        </button>
      </div>

      {showTable ? (
        <DataFallback data={data} xKey={xKey} series={series} valueFormat={valueFormat} />
      ) : (
        <div role="img" aria-label={summary} style={{ width: "100%", height }}>
          <ResponsiveContainer width="100%" height="100%">
            {type === "bar" ? (
              <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
                <XAxis dataKey={xKey} {...axisProps} minTickGap={24} />
                <YAxis {...axisProps} width={44} tickFormatter={(v) => valueFormat(Number(v))} />
                <Tooltip {...tooltipStyle} cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }} />
                {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
                {series.map((s, i) => (
                  <Bar key={s.key} dataKey={s.key} name={s.label} fill={palette[i % palette.length]} radius={[3, 3, 0, 0]} />
                ))}
              </BarChart>
            ) : type === "area" ? (
              <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
                <XAxis dataKey={xKey} {...axisProps} minTickGap={24} />
                <YAxis {...axisProps} width={44} tickFormatter={(v) => valueFormat(Number(v))} />
                <Tooltip {...tooltipStyle} />
                {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
                {series.map((s, i) => {
                  const c = palette[i % palette.length];
                  return (
                    <Area key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={c} fill={c} fillOpacity={0.15} strokeWidth={2} />
                  );
                })}
              </AreaChart>
            ) : (
              <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
                <XAxis dataKey={xKey} {...axisProps} minTickGap={24} />
                <YAxis {...axisProps} width={44} tickFormatter={(v) => valueFormat(Number(v))} />
                <Tooltip {...tooltipStyle} />
                {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
                {series.map((s, i) => (
                  <Line
                    key={s.key}
                    type="monotone"
                    dataKey={s.key}
                    name={s.label}
                    stroke={palette[i % palette.length]}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                ))}
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function DataFallback({
  data,
  xKey,
  series,
  valueFormat,
}: {
  data: Record<string, unknown>[];
  xKey: string;
  series: Series[];
  valueFormat: (n: number) => string;
}) {
  return (
    <div className="max-h-[260px] overflow-auto rounded-md border border-border">
      <table className="w-full text-xs">
        <thead className="sticky top-0 bg-muted">
          <tr>
            <th scope="col" className="px-3 py-2 text-left font-semibold text-muted-foreground">
              {xKey}
            </th>
            {series.map((s) => (
              <th key={s.key} scope="col" className="px-3 py-2 text-right font-semibold text-muted-foreground">
                {s.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} className="border-t border-border/60">
              <td className="px-3 py-1.5">{String(row[xKey] ?? "")}</td>
              {series.map((s) => (
                <td key={s.key} className="px-3 py-1.5 text-right tabular-nums">
                  {valueFormat(Number(row[s.key] ?? 0))}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
