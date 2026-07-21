/*
 * Sync providers — thin wrappers that each throw a "skipped: …" error until
 * credentials are present, then delegate to the real implementation. The
 * runner turns "skipped" into a non-error status, so the UI works whether or
 * not sources are connected.
 */
import { getSetting } from "@/lib/settings";

export async function syncSearchConsole(): Promise<string> {
  if (!getSetting("gsc_site_url") || !getSetting("google_service_account_json")) {
    throw new Error("skipped: Search Console URL or Google credentials not configured");
  }
  return (await import("./google")).syncSearchConsole();
}

export async function syncAnalytics(): Promise<string> {
  if (!getSetting("ga4_property_id") || !getSetting("google_service_account_json")) {
    throw new Error("skipped: GA4 property ID or Google credentials not configured");
  }
  return (await import("./google")).syncAnalytics();
}

export async function syncSocial(): Promise<string> {
  return (await import("./social")).syncSocial();
}

export async function syncContent(): Promise<string> {
  if (!getSetting("site_base_url")) {
    throw new Error("skipped: website URL not configured");
  }
  return (await import("./content")).syncContent();
}
