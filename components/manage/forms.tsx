"use client";

import { useActionState } from "react";
import {
  addRowAction,
  importCsvAction,
  runSyncAction,
  saveSettingsAction,
  type ActionResult,
} from "@/lib/actions";
import { Button } from "@/components/ui/button";
import type { SettingField } from "@/lib/manage-config";

export type FieldDescriptor = {
  name: string;
  label: string;
  kind: "date" | "number" | "text" | "select" | "lookup";
  step?: string;
  required?: boolean;
  options?: string[];
  lookup?: { id: number; label: string }[];
};

function Result({ state }: { state: ActionResult }) {
  if (!state) return null;
  return (
    <p className={`mt-2 text-xs ${state.ok ? "text-success" : "text-danger"}`} role="status">
      {state.ok ? "✓ " : "⚠ "}
      {state.message}
    </p>
  );
}

const inputCls =
  "w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function AddRowForm({ setKey, fields }: { setKey: string; fields: FieldDescriptor[] }) {
  const [state, action, pending] = useActionState(addRowAction, null);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="__set" value={setKey} />
      {fields.map((f) => (
        <div key={f.name} className="space-y-1">
          <label htmlFor={`${setKey}-${f.name}`} className="text-xs font-medium text-muted-foreground">
            {f.label}
            {f.required && " *"}
          </label>
          {f.kind === "select" ? (
            <select id={`${setKey}-${f.name}`} name={f.name} required={f.required} className={inputCls}>
              {f.options!.map((o) => (
                <option key={o} value={o}>
                  {o.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          ) : f.kind === "lookup" ? (
            <select id={`${setKey}-${f.name}`} name={f.name} required={f.required} className={inputCls}>
              {(f.lookup ?? []).map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label.length > 70 ? o.label.slice(0, 70) + "…" : o.label}
                </option>
              ))}
            </select>
          ) : (
            <input
              id={`${setKey}-${f.name}`}
              name={f.name}
              type={f.kind === "date" ? "date" : f.kind === "number" ? "number" : "text"}
              step={f.step}
              required={f.required}
              className={inputCls}
            />
          )}
        </div>
      ))}
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Saving…" : "Save entry"}
      </Button>
      <Result state={state} />
    </form>
  );
}

export function ImportForm({ setKey, variant }: { setKey: string; variant?: "content" | "channels" }) {
  const [state, action, pending] = useActionState(importCsvAction, null);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="__set" value={setKey} />
      <div className="space-y-1">
        <label htmlFor={`${setKey}-csv`} className="text-xs font-medium text-muted-foreground">
          CSV file
        </label>
        <input id={`${setKey}-csv`} type="file" name="csv" accept=".csv,text/csv" required className={inputCls} />
      </div>
      {variant === "content" && (
        <div className="space-y-1">
          <label htmlFor={`${setKey}-dt`} className="text-xs font-medium text-muted-foreground">
            If the file has no type column, treat rows as…
          </label>
          <select id={`${setKey}-dt`} name="default_type" className={inputCls}>
            <option value="blog">Blog</option>
            <option value="documentation">Documentation</option>
            <option value="landing_page">Landing Page</option>
            <option value="case_study">Case Study</option>
          </select>
        </div>
      )}
      {variant === "channels" && (
        <div className="space-y-1">
          <label htmlFor={`${setKey}-measure`} className="text-xs font-medium text-muted-foreground">
            The numbers in the sheet are…
          </label>
          <select id={`${setKey}-measure`} name="measure" className={inputCls}>
            <option value="sessions">Sessions</option>
            <option value="users">Users</option>
            <option value="conversions">Conversions</option>
          </select>
        </div>
      )}
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" variant="secondary" disabled={pending}>
          {pending ? "Importing…" : "Upload & import"}
        </Button>
        <a href={`/api/template?set=${setKey}`} className="text-xs text-primary hover:underline">
          Download template
        </a>
      </div>
      <Result state={state} />
    </form>
  );
}

export function SettingsForm({ fields, values }: { fields: SettingField[]; values: Record<string, string> }) {
  const [state, action, pending] = useActionState(saveSettingsAction, null);
  return (
    <form action={action} className="space-y-3">
      {fields.map((f) => (
        <div key={f.name} className="space-y-1">
          <label htmlFor={`s-${f.name}`} className="text-xs font-medium text-muted-foreground">
            {f.label}
          </label>
          {f.type === "textarea" || f.type === "json" ? (
            <textarea
              id={`s-${f.name}`}
              name={f.name}
              defaultValue={values[f.name] ?? ""}
              placeholder={f.placeholder}
              rows={f.type === "json" ? 5 : 3}
              className={inputCls}
            />
          ) : (
            <input
              id={`s-${f.name}`}
              name={f.name}
              type={f.type === "password" ? "password" : "text"}
              defaultValue={values[f.name] ?? ""}
              placeholder={f.placeholder}
              autoComplete="off"
              className={inputCls}
            />
          )}
          {f.hint && <p className="text-xs text-muted-foreground">{f.hint}</p>}
        </div>
      ))}
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Saving…" : "Save settings"}
      </Button>
      <Result state={state} />
    </form>
  );
}

export function SyncButton({ source, label, last }: { source: string; label: string; last?: string }) {
  const [state, action, pending] = useActionState(runSyncAction, null);
  return (
    <form action={action} className="inline-flex items-center gap-2">
      <input type="hidden" name="source" value={source} />
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending ? "Syncing…" : `Sync ${label}`}
      </Button>
      {last && <span className="text-xs text-muted-foreground">last: {last}</span>}
      {state && <span className={`text-xs ${state.ok ? "text-success" : "text-danger"}`}>{state.message}</span>}
    </form>
  );
}
