"use server";

import { revalidatePath } from "next/cache";
import { deleteRow, importCsv, upsertRow, type RowInput } from "./datasets/import";
import { ALLOWED_SETTINGS, setSetting } from "./settings";
import { runSource, SYNC_SOURCES } from "./sync/runner";

export type ActionResult = { ok: boolean; message: string } | null;

/** Add / update one row (used with useActionState). */
export async function addRowAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const set = String(formData.get("__set") ?? "");
    const input: RowInput = {};
    for (const [k, v] of formData.entries()) {
      if (!k.startsWith("__")) input[k] = typeof v === "string" ? v : "";
    }
    upsertRow(set, input);
    revalidatePath("/", "layout");
    return { ok: true, message: "Entry saved." };
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}

/** Import a CSV file into a dataset (used with useActionState). */
export async function importCsvAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const set = String(formData.get("__set") ?? "");
    const file = formData.get("csv");
    if (!file || typeof file === "string" || file.size === 0) {
      return { ok: false, message: "Please choose a CSV file." };
    }
    const text = await file.text();
    const opts: { defaults?: Record<string, string>; measure?: string } = {};
    const dt = formData.get("default_type");
    if (dt) opts.defaults = { type: String(dt) };
    const measure = formData.get("measure");
    if (measure) opts.measure = String(measure);
    const r = importCsv(set, text, opts);
    revalidatePath("/", "layout");
    const suffix = r.errors.length ? ` · ${r.errors.slice(0, 3).join(" · ")}` : "";
    return { ok: true, message: `Imported/updated ${r.ok}, skipped ${r.skipped}.${suffix}` };
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}

/** Save the settings fields present in the form (allow-listed). */
export async function saveSettingsAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    for (const key of ALLOWED_SETTINGS) {
      if (formData.has(key)) setSetting(key, String(formData.get(key) ?? "").trim() || null);
    }
    revalidatePath("/", "layout");
    return { ok: true, message: "Settings saved." };
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}

/** Delete one row (plain form action). */
export async function deleteRowAction(formData: FormData): Promise<void> {
  const set = String(formData.get("__set") ?? "");
  const rowid = Number(formData.get("__rowid") ?? 0);
  if (set && rowid) {
    deleteRow(set, rowid);
    revalidatePath("/", "layout");
  }
}

/** Run one data source now (or all). */
export async function runSyncAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const source = String(formData.get("source") ?? "");
    const results = source && SYNC_SOURCES.includes(source as (typeof SYNC_SOURCES)[number])
      ? await runSource(source)
      : { [source || "all"]: { status: "error", message: "unknown source" } };
    revalidatePath("/", "layout");
    const parts = Object.entries(results).map(([k, v]) => `${k}: ${v.status}`);
    const anyError = Object.values(results).some((v) => v.status === "error");
    return { ok: !anyError, message: parts.join(" · ") };
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}

/**
 * Delete tracked keywords (and their ranking history) by id. Content-derived
 * rows on the Keywords page aren't tracked keywords, so they're ignored here —
 * they disappear only when their content item's target keyword is cleared.
 */
export async function deleteKeywordsAction(ids: number[]): Promise<ActionResult> {
  try {
    const clean = ids.map(Number).filter((n) => Number.isInteger(n) && n > 0);
    if (clean.length === 0) return { ok: false, message: "Nothing selected to delete." };
    const { sqlite } = await import("./db/client");
    const placeholders = clean.map(() => "?").join(",");
    sqlite.prepare(`DELETE FROM keyword_rankings WHERE keyword_id IN (${placeholders})`).run(...clean);
    const res = sqlite.prepare(`DELETE FROM keywords WHERE id IN (${placeholders})`).run(...clean);
    revalidatePath("/", "layout");
    return { ok: true, message: `Deleted ${res.changes} keyword${res.changes === 1 ? "" : "s"}.` };
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}

const LOGO_TYPES = ["image/png", "image/jpeg", "image/svg+xml", "image/webp", "image/gif"];
const LOGO_MAX_BYTES = 300 * 1024;

/** Upload the app logo (stored as a data URL in settings, shown app-wide). */
export async function uploadLogoAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const file = formData.get("logo");
    if (!file || typeof file === "string" || file.size === 0) {
      return { ok: false, message: "Please choose an image file." };
    }
    if (!LOGO_TYPES.includes(file.type)) {
      return { ok: false, message: "Use a PNG, JPG, SVG, WebP, or GIF image." };
    }
    if (file.size > LOGO_MAX_BYTES) {
      return { ok: false, message: "Image too large — keep the logo under 300 KB." };
    }
    const buf = Buffer.from(await file.arrayBuffer());
    setSetting("brand_logo", `data:${file.type};base64,${buf.toString("base64")}`);
    revalidatePath("/", "layout");
    return { ok: true, message: "Logo updated." };
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}

/** Remove the uploaded logo (falls back to the letter mark). */
export async function removeLogoAction(): Promise<void> {
  setSetting("brand_logo", null);
  revalidatePath("/", "layout");
}

/** Which built-in sidebar pages are visible (checkbox form → nav_hidden). */
export async function saveNavVisibilityAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const { HIDEABLE_NAV } = await import("./nav");
    const visible = new Set(formData.getAll("visible").map(String));
    const hidden = HIDEABLE_NAV.map((i) => i.key).filter((k) => !visible.has(k));
    setSetting("nav_hidden", hidden.join(",") || null);
    revalidatePath("/", "layout");
    return { ok: true, message: "Sidebar updated." };
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}

function slugify(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "page"
  );
}

/** Create or update a user page / link in the sidebar. */
export async function saveCustomPageAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const { sqlite } = await import("./db/client");
    const id = Number(formData.get("id") ?? 0);
    const title = String(formData.get("title") ?? "").trim();
    if (!title) return { ok: false, message: "A page name is required." };
    const section = String(formData.get("section") ?? "").trim();
    const icon = String(formData.get("icon") ?? "file-text").trim() || "file-text";
    const kind = formData.get("kind") === "link" ? "link" : "notes";
    const url = String(formData.get("url") ?? "").trim();
    const content = String(formData.get("content") ?? "");
    const position = Number(formData.get("position") ?? 0) || 0;
    if (kind === "link" && !/^https?:\/\//.test(url)) {
      return { ok: false, message: "External links need a full URL starting with http(s)://" };
    }

    if (id > 0) {
      sqlite
        .prepare(
          "UPDATE custom_pages SET title=?, section=?, icon=?, kind=?, url=?, content=?, position=? WHERE id=?",
        )
        .run(title, section, icon, kind, url, content, position, id);
    } else {
      // Keep slugs unique by suffixing -2, -3, … when the title repeats.
      const base = slugify(title);
      let slug = base;
      for (let n = 2; sqlite.prepare("SELECT 1 FROM custom_pages WHERE slug=?").get(slug); n++) {
        slug = `${base}-${n}`;
      }
      sqlite
        .prepare(
          "INSERT INTO custom_pages (title, slug, section, icon, kind, url, content, position) VALUES (?,?,?,?,?,?,?,?)",
        )
        .run(title, slug, section, icon, kind, url, content, position);
    }
    revalidatePath("/", "layout");
    return { ok: true, message: id > 0 ? "Page updated." : "Page added to the sidebar." };
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}

/** Delete a user page (plain form action). */
export async function deleteCustomPageAction(formData: FormData): Promise<void> {
  const id = Number(formData.get("id") ?? 0);
  if (id > 0) {
    const { sqlite } = await import("./db/client");
    sqlite.prepare("DELETE FROM custom_pages WHERE id=?").run(id);
    revalidatePath("/", "layout");
  }
}

/** Wipe all report data; settings/credentials are kept. */
export async function clearDataAction(): Promise<void> {
  const tables = [
    "content_metrics", "content_items", "gsc_daily", "gsc_queries", "gsc_pages",
    "ga_daily", "ga_channels", "ga_pages", "social_daily", "social_posts",
    "campaign_metrics", "campaigns", "keyword_rankings", "keywords",
    "email_campaigns", "monthly_notes",
  ];
  const { sqlite } = await import("./db/client");
  for (const t of tables) sqlite.prepare(`DELETE FROM ${t}`).run();
  revalidatePath("/", "layout");
}
