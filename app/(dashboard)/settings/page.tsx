import { headers } from "next/headers";
import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SettingsForm, SyncButton } from "@/components/manage/forms";
import { ClearDataButton } from "@/components/manage/danger-zone";
import { getSetting } from "@/lib/settings";
import { SYNC_LABELS, SYNC_SOURCES } from "@/lib/sync/runner";
import { sqlite } from "@/lib/db/client";
import { ensureDb } from "@/lib/db/client";
import type { SettingField } from "@/lib/manage-config";

export const metadata: Metadata = { title: "Settings" };

const GENERAL: SettingField[] = [
  { name: "site_name", label: "Site / team name" },
  { name: "timezone", label: "Timezone", placeholder: "UTC, Asia/Dhaka, America/New_York…" },
  { name: "sync_time", label: "Daily sync time (HH:MM)", placeholder: "06:00" },
  { name: "accent_color", label: "Accent color (hex)", placeholder: "#2a78d6" },
  { name: "cron_token", label: "Web-cron token" },
  { name: "mcp_token", label: "MCP token" },
];

const GOOGLE: SettingField[] = [
  { name: "google_service_account_json", label: "Google service account JSON key", type: "json" },
  { name: "gsc_site_url", label: "Search Console property URL", placeholder: "sc-domain:example.com" },
  { name: "ga4_property_id", label: "GA4 numeric property ID" },
  { name: "site_base_url", label: "Website URL (content discovery)", placeholder: "https://example.com" },
  { name: "wp_username", label: "WordPress username" },
  { name: "wp_app_password", label: "WordPress application password", type: "password" },
];

const SOCIAL: SettingField[] = [
  { name: "facebook_page_token", label: "Facebook page token", type: "password" },
  { name: "facebook_page_id", label: "Facebook page ID" },
  { name: "linkedin_access_token", label: "LinkedIn access token", type: "password" },
  { name: "linkedin_org_urn", label: "LinkedIn org URN" },
  { name: "twitter_bearer_token", label: "X / Twitter bearer token", type: "password" },
  { name: "twitter_user_id", label: "X / Twitter user ID" },
  { name: "youtube_api_key", label: "YouTube API key", type: "password" },
  { name: "youtube_channel_id", label: "YouTube channel ID" },
];

function values(fields: SettingField[]) {
  const v: Record<string, string> = {};
  for (const f of fields) v[f.name] = getSetting(f.name) ?? "";
  return v;
}

export default async function SettingsPage() {
  ensureDb();
  const host = (await headers()).get("host") ?? "your-domain";
  const mcpToken = getSetting("mcp_token") ?? "";
  const log = sqlite.prepare("SELECT source, ran_at, status, message FROM sync_log ORDER BY id DESC LIMIT 20").all() as {
    source: string;
    ran_at: string;
    status: string;
    message: string;
  }[];

  return (
    <>
      <PageHeader title="Settings" description="Connections, sync, and data management." />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>General</CardTitle></CardHeader>
          <CardContent><SettingsForm fields={GENERAL} values={values(GENERAL)} /></CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Google (Search Console + GA4) &amp; website</CardTitle></CardHeader>
          <CardContent><SettingsForm fields={GOOGLE} values={values(GOOGLE)} /></CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Social platforms</CardTitle></CardHeader>
          <CardContent><SettingsForm fields={SOCIAL} values={values(SOCIAL)} /></CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Run sync</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Last full sync: {getSetting("last_sync_at") ?? "never"}.
            </p>
            <div className="flex flex-col gap-2">
              {SYNC_SOURCES.map((s) => (
                <SyncButton key={s} source={s} label={SYNC_LABELS[s] ?? s} last={getSetting(`last_sync_${s}`) ?? undefined} />
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Claude MCP connector</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="text-muted-foreground">
              Add this as a custom connector in Claude (needs public HTTPS):
            </p>
            <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">
              https://{host}/api/mcp?token={mcpToken}
            </pre>
          </CardContent>
        </Card>

        <Card className="border-danger/40">
          <CardHeader><CardTitle>Report data</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              The app starts empty — reports show 0 until real data arrives. Wipe everything to start over;
              settings and credentials are kept.
            </p>
            <ClearDataButton />
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader><CardTitle>Sync history</CardTitle></CardHeader>
        <CardContent>
          {log.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">No syncs recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="px-2 py-1.5 font-semibold">When</th>
                    <th className="px-2 py-1.5 font-semibold">Source</th>
                    <th className="px-2 py-1.5 font-semibold">Status</th>
                    <th className="px-2 py-1.5 font-semibold">Message</th>
                  </tr>
                </thead>
                <tbody>
                  {log.map((l, i) => (
                    <tr key={i} className="border-b border-border/60">
                      <td className="px-2 py-1.5 tabular-nums">{l.ran_at}</td>
                      <td className="px-2 py-1.5">{l.source}</td>
                      <td className={`px-2 py-1.5 font-semibold ${l.status === "error" ? "text-danger" : l.status === "skipped" ? "text-warning" : "text-success"}`}>{l.status}</td>
                      <td className="px-2 py-1.5 text-muted-foreground">{l.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
