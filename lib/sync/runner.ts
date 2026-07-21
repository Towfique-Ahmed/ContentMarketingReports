import { setSetting } from "@/lib/settings";
import { sqlite } from "@/lib/db/client";

export const SYNC_SOURCES = ["content", "search_console", "analytics", "social"] as const;
export type SyncSource = (typeof SYNC_SOURCES)[number];

export type SyncStatus = "ok" | "skipped" | "error";
export type SyncResult = Record<string, { status: SyncStatus; message: string }>;

export const SYNC_LABELS: Record<string, string> = {
  content: "Website content",
  search_console: "Search Console",
  analytics: "Google Analytics",
  social: "Social platforms",
};

function log(source: string, status: SyncStatus, message: string) {
  sqlite
    .prepare("INSERT INTO sync_log (source, ran_at, status, message) VALUES (?, datetime('now'), ?, ?)")
    .run(source, status, message);
  sqlite.prepare("DELETE FROM sync_log WHERE id NOT IN (SELECT id FROM sync_log ORDER BY id DESC LIMIT 500)").run();
  setSetting(`last_sync_${source}`, new Date().toISOString().slice(0, 19).replace("T", " "));
}

/**
 * Run a single data source. The concrete providers (GA4/GSC/social/content)
 * are implemented in ./providers and wired in Phase 5; until credentials are
 * present each returns a "skipped" status so the UI works end-to-end.
 */
export async function runSource(source: string): Promise<SyncResult> {
  const providers = await import("./providers");
  const runners: Record<string, () => Promise<string>> = {
    content: providers.syncContent,
    search_console: providers.syncSearchConsole,
    analytics: providers.syncAnalytics,
    social: providers.syncSocial,
  };
  const run = runners[source];
  if (!run) return { [source]: { status: "error", message: "unknown source" } };
  try {
    const message = await run();
    log(source, "ok", message);
    return { [source]: { status: "ok", message } };
  } catch (e) {
    const msg = (e as Error).message;
    const skipped = msg.startsWith("skipped");
    const status: SyncStatus = skipped ? "skipped" : "error";
    log(source, status, msg);
    return { [source]: { status, message: msg } };
  }
}

export async function runAll(): Promise<SyncResult> {
  let out: SyncResult = {};
  for (const s of SYNC_SOURCES) out = { ...out, ...(await runSource(s)) };
  setSetting("last_sync_at", new Date().toISOString().slice(0, 19).replace("T", " "));
  return out;
}
