/*
 * Appearance options & helpers shared by the client (settings forms) and the
 * server (lib/branding.ts). Pure data — no database imports, so it's safe in
 * client bundles.
 */

export type FontKey = "system" | "inter" | "lora" | "georgia" | "mono";
export type RadiusKey = "none" | "small" | "default" | "large";
export type DensityKey = "compact" | "default" | "relaxed";

export const FONT_OPTIONS: { key: FontKey; label: string; stack: string }[] = [
  { key: "system", label: "System default", stack: `ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif` },
  { key: "inter", label: "Inter (modern sans)", stack: `"Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif` },
  { key: "lora", label: "Lora (serif)", stack: `"Lora", Georgia, "Times New Roman", serif` },
  { key: "georgia", label: "Georgia (classic serif)", stack: `Georgia, "Times New Roman", serif` },
  { key: "mono", label: "Monospace", stack: `ui-monospace, "Cascadia Code", "Source Code Pro", Menlo, Consolas, monospace` },
];

export const RADIUS_OPTIONS: { key: RadiusKey; label: string; value: string }[] = [
  { key: "none", label: "Square", value: "0px" },
  { key: "small", label: "Subtle", value: "0.375rem" },
  { key: "default", label: "Rounded", value: "0.75rem" },
  { key: "large", label: "Extra round", value: "1rem" },
];

export const DENSITY_OPTIONS: { key: DensityKey; label: string; value: string }[] = [
  { key: "compact", label: "Compact", value: "14px" },
  { key: "default", label: "Comfortable", value: "16px" },
  { key: "relaxed", label: "Relaxed", value: "17.5px" },
];

/** Curated accent presets shown as swatches (any hex works via the picker). */
export const ACCENT_PRESETS: { label: string; hex: string }[] = [
  { label: "Indigo (default)", hex: "" },
  { label: "Blue", hex: "#2a78d6" },
  { label: "Teal", hex: "#0f766e" },
  { label: "Green", hex: "#188a54" },
  { label: "Orange", hex: "#c2570f" },
  { label: "Rose", hex: "#d3316b" },
  { label: "Purple", hex: "#7c3aed" },
  { label: "Slate", hex: "#52606d" },
];

export const HEX_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

/** #rgb / #rrggbb → hue/sat/light (0-360, 0-100, 0-100). */
export function hexToHsl(hex: string): { h: number; s: number; l: number } {
  let m = hex.replace("#", "");
  if (m.length === 3) m = m.split("").map((c) => c + c).join("");
  const r = parseInt(m.slice(0, 2), 16) / 255;
  const g = parseInt(m.slice(2, 4), 16) / 255;
  const b = parseInt(m.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}
