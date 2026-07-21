/*
 * Sync providers. Real GA4/GSC/social/content implementations land in Phase 5.
 * Each throws "skipped: …" until its credentials are configured, so the sync
 * UI works end-to-end today and starts pulling real data once connected.
 */
import { getSetting } from "@/lib/settings";

export async function syncSearchConsole(): Promise<string> {
  if (!getSetting("gsc_site_url") || !getSetting("google_service_account_json")) {
    throw new Error("skipped: Search Console URL or Google credentials not configured");
  }
  throw new Error("skipped: live sync ships in the next update — import CSVs for now");
}

export async function syncAnalytics(): Promise<string> {
  if (!getSetting("ga4_property_id") || !getSetting("google_service_account_json")) {
    throw new Error("skipped: GA4 property ID or Google credentials not configured");
  }
  throw new Error("skipped: live sync ships in the next update — import CSVs for now");
}

export async function syncSocial(): Promise<string> {
  throw new Error("skipped: no social credentials configured");
}

export async function syncContent(): Promise<string> {
  if (!getSetting("site_base_url")) {
    throw new Error("skipped: website URL not configured");
  }
  throw new Error("skipped: live sync ships in the next update — add content via CSV/manual entry");
}
