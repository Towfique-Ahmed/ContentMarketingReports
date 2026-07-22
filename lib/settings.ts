import { eq } from "drizzle-orm";
import { db } from "./db/client";
import { settings } from "./db/schema";

export function getSetting(key: string): string | null {
  const row = db.select().from(settings).where(eq(settings.key, key)).get();
  return row?.value ?? null;
}

export function setSetting(key: string, value: string | null): void {
  db
    .insert(settings)
    .values({ key, value })
    .onConflictDoUpdate({ target: settings.key, set: { value } })
    .run();
}

export function allSettings(): Record<string, string> {
  const rows = db.select().from(settings).all();
  const out: Record<string, string> = {};
  for (const r of rows) if (r.value != null) out[r.key] = r.value;
  return out;
}

/** Every settings key a form may write — shared allow-list. */
export const ALLOWED_SETTINGS = [
  "site_name", "timezone", "sync_time", "cron_token", "mcp_token",
  "site_base_url", "content_path_rules", "content_type_map", "wp_username", "wp_app_password",
  "content_exclude_blog", "content_exclude_documentation",
  "content_exclude_landing_page", "content_exclude_case_study",
  "brand_logo", "accent_color",
  "google_service_account_json", "gsc_site_url", "ga4_property_id",
  "facebook_page_token", "facebook_page_id",
  "linkedin_access_token", "linkedin_org_urn",
  "twitter_bearer_token", "twitter_user_id",
  "youtube_api_key", "youtube_channel_id",
] as const;
