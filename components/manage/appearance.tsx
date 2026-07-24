"use client";

import { useActionState, useState } from "react";
import { Check } from "lucide-react";
import {
  removeLogoAction,
  saveSettingsAction,
  uploadLogoAction,
  type ActionResult,
} from "@/lib/actions";
import { Button } from "@/components/ui/button";
import {
  ACCENT_PRESETS,
  DENSITY_OPTIONS,
  FONT_OPTIONS,
  RADIUS_OPTIONS,
} from "@/lib/appearance";
import { cn } from "@/lib/utils";

const inputCls =
  "w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function Result({ state }: { state: ActionResult }) {
  if (!state) return null;
  return (
    <p className={`text-xs ${state.ok ? "text-success" : "text-danger"}`} role="status">
      {state.ok ? "✓ " : "⚠ "}
      {state.message}
    </p>
  );
}

const DEFAULT_ACCENT = "#4553b0"; // the built-in indigo, for the picker swatch

/** Accent color, font, corner radius, and density — applied app-wide on save. */
export function AppearanceForm({
  values,
}: {
  values: { accent_color: string; brand_font: string; brand_radius: string; brand_density: string };
}) {
  const [state, action, pending] = useActionState(saveSettingsAction, null);
  const [accent, setAccent] = useState(values.accent_color);

  return (
    <form action={action} className="space-y-4">
      <fieldset className="space-y-1.5">
        <legend className="text-xs font-medium text-muted-foreground">Accent color</legend>
        <input type="hidden" name="accent_color" value={accent} />
        <div className="flex flex-wrap items-center gap-2">
          {ACCENT_PRESETS.map((p) => {
            const selected = accent.toLowerCase() === p.hex.toLowerCase();
            return (
              <button
                key={p.label}
                type="button"
                title={p.label}
                aria-label={`${p.label} accent`}
                aria-pressed={selected}
                onClick={() => setAccent(p.hex)}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full border-2 transition-transform hover:scale-110",
                  selected ? "border-foreground" : "border-transparent",
                )}
                style={{ backgroundColor: p.hex || DEFAULT_ACCENT }}
              >
                {selected && <Check className="size-4 text-white" aria-hidden />}
              </button>
            );
          })}
          <label className="ml-1 flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
            <input
              type="color"
              value={/^#[0-9a-f]{6}$/i.test(accent) ? accent : DEFAULT_ACCENT}
              onChange={(e) => setAccent(e.target.value)}
              aria-label="Custom accent color"
              className="h-8 w-10 cursor-pointer rounded-md border border-input bg-background p-0.5"
            />
            Custom
          </label>
        </div>
        <p className="text-xs text-muted-foreground">
          Colors buttons, links, charts’ focus states, and the active sidebar item — in light and dark mode.
        </p>
      </fieldset>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <label htmlFor="ap-font" className="text-xs font-medium text-muted-foreground">
            Font
          </label>
          <select id="ap-font" name="brand_font" defaultValue={values.brand_font || "system"} className={inputCls}>
            {FONT_OPTIONS.map((f) => (
              <option key={f.key} value={f.key}>
                {f.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor="ap-radius" className="text-xs font-medium text-muted-foreground">
            Corners
          </label>
          <select id="ap-radius" name="brand_radius" defaultValue={values.brand_radius || "default"} className={inputCls}>
            {RADIUS_OPTIONS.map((r) => (
              <option key={r.key} value={r.key}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor="ap-density" className="text-xs font-medium text-muted-foreground">
            Text size
          </label>
          <select id="ap-density" name="brand_density" defaultValue={values.brand_density || "default"} className={inputCls}>
            {DENSITY_OPTIONS.map((d) => (
              <option key={d.key} value={d.key}>
                {d.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Applying…" : "Apply appearance"}
        </Button>
        <Result state={state} />
      </div>
    </form>
  );
}

/** Upload / remove the app logo shown in the sidebar and top bar. */
export function LogoForm({ logo, siteName }: { logo: string | null; siteName: string }) {
  const [state, action, pending] = useActionState(uploadLogoAction, null);
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element -- data URL from settings
          <img src={logo} alt="Current logo" className="h-10 w-10 rounded-lg border border-border object-contain" />
        ) : (
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
            {(siteName.trim()[0] ?? "A").toUpperCase()}
          </span>
        )}
        <p className="text-xs text-muted-foreground">
          {logo
            ? "Your logo appears in the sidebar and top bar."
            : "No logo yet — the first letter of your site name is used. Upload a square PNG/SVG (max 300 KB)."}
        </p>
      </div>
      <form action={action} className="flex flex-wrap items-center gap-2">
        <input
          type="file"
          name="logo"
          accept="image/png,image/jpeg,image/svg+xml,image/webp,image/gif"
          required
          aria-label="Logo image file"
          className="max-w-64 rounded-md border border-input bg-background px-2 py-1.5 text-xs"
        />
        <Button type="submit" size="sm" variant="secondary" disabled={pending}>
          {pending ? "Uploading…" : "Upload logo"}
        </Button>
        {logo && (
          <Button type="submit" size="sm" variant="ghost" formAction={removeLogoAction} formNoValidate>
            Remove logo
          </Button>
        )}
      </form>
      <Result state={state} />
    </div>
  );
}
