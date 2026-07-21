import { NextRequest } from "next/server";
import { getSetting } from "@/lib/settings";
import { runAll } from "@/lib/sync/runner";
import { ensureDb } from "@/lib/db/client";

export const dynamic = "force-dynamic";

/**
 * Web-cron endpoint for scheduled syncs. Point an external scheduler at:
 *   GET /api/cron?token=<cron_token>
 * Fires the full sync when the configured daily time has passed and it hasn't
 * run yet today.
 */
export async function GET(req: NextRequest) {
  ensureDb();
  const token = getSetting("cron_token");
  const given = req.nextUrl.searchParams.get("token") ?? "";
  if (!token || given !== token) {
    return Response.json({ error: "invalid cron token" }, { status: 403 });
  }

  const syncTime = getSetting("sync_time") ?? "06:00";
  const last = getSetting("last_sync_at") ?? "";
  const now = new Date();
  const dueAt = `${now.toISOString().slice(0, 10)} ${syncTime}:00`;
  const nowStr = now.toISOString().slice(0, 19).replace("T", " ");
  const force = req.nextUrl.searchParams.get("force") === "1";

  if (!force && !(nowStr >= dueAt && last.slice(0, 10) !== now.toISOString().slice(0, 10))) {
    return Response.json({ ran: "not due yet" });
  }
  const results = await runAll();
  return Response.json({ ran: "yes", results });
}
