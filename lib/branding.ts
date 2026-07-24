import { getSetting } from "./settings";
import {
  DENSITY_OPTIONS,
  FONT_OPTIONS,
  HEX_RE,
  RADIUS_OPTIONS,
  hexToHsl,
  type DensityKey,
  type FontKey,
  type RadiusKey,
} from "./appearance";

/*
 * App-wide branding & appearance, stored in settings and applied once in the
 * dashboard layout so every page stays in sync: site name, logo, accent color,
 * font family, corner radius, and UI density. Server-only (reads the DB);
 * the option lists live in lib/appearance.ts so client forms can share them.
 */

export type Branding = {
  siteName: string;
  logo: string | null; // data URL
  accent: string | null; // hex like #4051b5, null = built-in indigo
  font: FontKey;
  radius: RadiusKey;
  density: DensityKey;
};

function pick<T extends string>(value: string | null, allowed: readonly T[], fallback: T): T {
  return allowed.includes((value ?? "") as T) ? (value as T) : fallback;
}

export function getBranding(): Branding {
  const accentRaw = (getSetting("accent_color") ?? "").trim();
  return {
    siteName: getSetting("site_name") || "Marketing Reports",
    logo: getSetting("brand_logo"),
    accent: HEX_RE.test(accentRaw) ? accentRaw : null,
    font: pick(getSetting("brand_font"), ["system", "inter", "lora", "georgia", "mono"] as const, "system"),
    radius: pick(getSetting("brand_radius"), ["none", "small", "default", "large"] as const, "default"),
    density: pick(getSetting("brand_density"), ["compact", "default", "relaxed"] as const, "default"),
  };
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/**
 * CSS overrides applied per request from saved settings. Accent lightness is
 * re-anchored per mode (like the built-in indigo) so text contrast holds for
 * any hue the user picks.
 */
export function themeCss(b: Branding): string {
  const parts: string[] = [];
  const root: string[] = [];

  const font = FONT_OPTIONS.find((f) => f.key === b.font);
  if (font && b.font !== "system") root.push(`--font-sans: ${font.stack};`);
  const radius = RADIUS_OPTIONS.find((r) => r.key === b.radius);
  if (radius && b.radius !== "default") root.push(`--radius: ${radius.value};`);

  if (b.accent) {
    const { h, s: rawS, l } = hexToHsl(b.accent);
    const s = clamp(rawS, 25, 92);
    root.push(
      `--primary: ${h} ${s}% ${clamp(l, 34, 52)}%;`,
      `--ring: ${h} ${s}% ${clamp(l, 36, 54)}%;`,
      `--accent: ${h} ${clamp(s, 25, 55)}% 95%;`,
      `--accent-foreground: ${h} ${s}% 34%;`,
    );
    parts.push(
      `.dark{--primary: ${h} ${clamp(s, 30, 70)}% 66%; --primary-foreground: ${h} 40% 10%;` +
        ` --ring: ${h} ${clamp(s, 30, 70)}% 68%; --accent: ${h} 30% 20%; --accent-foreground: ${h} 62% 82%;}`,
    );
  }

  if (root.length) parts.unshift(`:root{${root.join(" ")}}`);
  const density = DENSITY_OPTIONS.find((d) => d.key === b.density);
  if (density && b.density !== "default") parts.push(`html{font-size: ${density.value};}`);
  return parts.join("\n");
}
