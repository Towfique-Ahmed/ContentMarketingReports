"use client";

import { useActionState, useState } from "react";
import { ChevronDown, Trash2 } from "lucide-react";
import {
  deleteCustomPageAction,
  saveCustomPageAction,
  saveNavVisibilityAction,
  type ActionResult,
} from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { PAGE_ICONS, type NavItem } from "@/lib/nav";
import { navIcon } from "@/components/layout/nav-icons";
import { cn } from "@/lib/utils";

export type CustomPageData = {
  id: number;
  title: string;
  slug: string;
  section: string | null;
  icon: string | null;
  kind: string | null;
  url: string | null;
  content: string | null;
  position: number | null;
};

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

/** Create/edit form for a sidebar page. Used in Settings and on the page itself. */
export function CustomPageForm({
  page,
  sections,
  onDone,
}: {
  page?: CustomPageData;
  sections: string[];
  onDone?: () => void;
}) {
  const [state, action, pending] = useActionState(saveCustomPageAction, null);
  const [kind, setKind] = useState(page?.kind === "link" ? "link" : "notes");
  const [icon, setIcon] = useState(page?.icon || "file-text");
  const uid = page?.id ?? "new";

  return (
    <form action={action} className="space-y-3">
      {page && <input type="hidden" name="id" value={page.id} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label htmlFor={`cp-title-${uid}`} className="text-xs font-medium text-muted-foreground">
            Page name *
          </label>
          <input
            id={`cp-title-${uid}`}
            name="title"
            required
            defaultValue={page?.title ?? ""}
            placeholder="e.g. Competitors, Briefs, Ideas…"
            className={inputCls}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor={`cp-section-${uid}`} className="text-xs font-medium text-muted-foreground">
            Sidebar category
          </label>
          <input
            id={`cp-section-${uid}`}
            name="section"
            defaultValue={page?.section ?? ""}
            placeholder='e.g. "My pages" — type a new name to create a category'
            list={`cp-sections-${uid}`}
            className={inputCls}
          />
          <datalist id={`cp-sections-${uid}`}>
            {sections.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </div>
      </div>

      <fieldset className="space-y-1">
        <legend className="text-xs font-medium text-muted-foreground">Icon</legend>
        <input type="hidden" name="icon" value={icon} />
        <div className="flex flex-wrap gap-1">
          {PAGE_ICONS.map((opt) => {
            const Icon = navIcon(opt.key);
            const selected = icon === opt.key;
            return (
              <button
                key={opt.key}
                type="button"
                title={opt.label}
                aria-label={`${opt.label} icon`}
                aria-pressed={selected}
                onClick={() => setIcon(opt.key)}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-md border transition-colors",
                  selected
                    ? "border-primary bg-accent text-accent-foreground"
                    : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="size-4" aria-hidden />
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label htmlFor={`cp-kind-${uid}`} className="text-xs font-medium text-muted-foreground">
            Type
          </label>
          <select
            id={`cp-kind-${uid}`}
            name="kind"
            value={kind}
            onChange={(e) => setKind(e.target.value)}
            className={inputCls}
          >
            <option value="notes">Page (notes & links you write)</option>
            <option value="link">External link (opens in a new tab)</option>
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor={`cp-pos-${uid}`} className="text-xs font-medium text-muted-foreground">
            Order (low numbers first)
          </label>
          <input
            id={`cp-pos-${uid}`}
            name="position"
            type="number"
            defaultValue={page?.position ?? 0}
            className={inputCls}
          />
        </div>
      </div>

      {kind === "link" ? (
        <div className="space-y-1">
          <label htmlFor={`cp-url-${uid}`} className="text-xs font-medium text-muted-foreground">
            URL *
          </label>
          <input
            id={`cp-url-${uid}`}
            name="url"
            type="url"
            required
            defaultValue={page?.url ?? ""}
            placeholder="https://…"
            className={inputCls}
          />
        </div>
      ) : (
        <div className="space-y-1">
          <label htmlFor={`cp-content-${uid}`} className="text-xs font-medium text-muted-foreground">
            Page content
          </label>
          <textarea
            id={`cp-content-${uid}`}
            name="content"
            rows={page ? 12 : 5}
            defaultValue={page?.content ?? ""}
            placeholder={"# Heading\nWrite notes here…\n\n- bullet lists\n- **bold**, [links](https://example.com)"}
            className={inputCls}
          />
          <p className="text-xs text-muted-foreground">
            Supports simple formatting: # headings, - lists, **bold**, [text](url) links.
          </p>
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving…" : page ? "Save page" : "Add to sidebar"}
        </Button>
        {onDone && (
          <Button type="button" size="sm" variant="ghost" onClick={onDone}>
            Cancel
          </Button>
        )}
        <Result state={state} />
      </div>
    </form>
  );
}

/** Settings panel: list existing custom pages with edit/delete, plus add. */
export function CustomPagesManager({ pages, sections }: { pages: CustomPageData[]; sections: string[] }) {
  const [editing, setEditing] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);

  return (
    <div className="space-y-3">
      {pages.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No custom pages yet — add your own pages or links and they appear in the left sidebar instantly.
        </p>
      )}
      <ul className="space-y-1.5">
        {pages.map((p) => {
          const Icon = navIcon(p.icon || "file-text");
          return (
            <li key={p.id} className="rounded-md border border-border">
              <div className="flex items-center gap-2 px-3 py-2">
                <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{p.title}</span>
                <span className="hidden text-xs text-muted-foreground sm:inline">
                  {(p.section || "My pages") + (p.kind === "link" ? " · link" : "")}
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  aria-expanded={editing === p.id}
                  onClick={() => setEditing(editing === p.id ? null : p.id)}
                >
                  Edit
                  <ChevronDown className={cn("size-3.5 transition-transform", editing === p.id && "rotate-180")} aria-hidden />
                </Button>
                <form
                  action={deleteCustomPageAction}
                  onSubmit={(e) => {
                    if (!confirm(`Delete "${p.title}" from the sidebar?`)) e.preventDefault();
                  }}
                >
                  <input type="hidden" name="id" value={p.id} />
                  <Button type="submit" size="icon" variant="ghost" aria-label={`Delete ${p.title}`}>
                    <Trash2 className="size-4 text-danger" aria-hidden />
                  </Button>
                </form>
              </div>
              {editing === p.id && (
                <div className="border-t border-border p-3">
                  <CustomPageForm page={p} sections={sections} onDone={() => setEditing(null)} />
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {adding ? (
        <div className="rounded-md border border-border p-3">
          <CustomPageForm sections={sections} onDone={() => setAdding(false)} />
        </div>
      ) : (
        <Button type="button" size="sm" variant="secondary" onClick={() => setAdding(true)}>
          + Add a page or link
        </Button>
      )}
    </div>
  );
}

/** Show/hide built-in report pages in the sidebar. */
export function NavVisibilityForm({ items, hidden }: { items: NavItem[]; hidden: string[] }) {
  const [state, action, pending] = useActionState(saveNavVisibilityAction, null);
  const hiddenSet = new Set(hidden);
  return (
    <form action={action} className="space-y-3">
      <div className="grid gap-1.5 sm:grid-cols-2">
        {items.map((item) => {
          const Icon = navIcon(item.icon);
          return (
            <label key={item.key} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted">
              <input
                type="checkbox"
                name="visible"
                value={item.key}
                defaultChecked={!hiddenSet.has(item.key)}
                className="size-4 accent-[hsl(var(--primary))]"
              />
              <Icon className="size-4 text-muted-foreground" aria-hidden />
              {item.label}
            </label>
          );
        })}
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" variant="secondary" disabled={pending}>
          {pending ? "Saving…" : "Save visibility"}
        </Button>
        <Result state={state} />
      </div>
    </form>
  );
}
