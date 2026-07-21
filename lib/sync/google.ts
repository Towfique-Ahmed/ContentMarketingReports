import crypto from "node:crypto";
import { getSetting } from "@/lib/settings";
import { sqlite } from "@/lib/db/client";
import { cleanDate } from "@/lib/datasets/csv";

/*
 * Google service-account auth (JWT → access token) + Search Console and GA4
 * Data API syncs. Ported from the PHP GoogleClient / SearchConsoleSync /
 * AnalyticsSync. One service account key covers both APIs.
 */

type ServiceAccount = { client_email: string; private_key: string };

function serviceAccount(): ServiceAccount {
  const raw = getSetting("google_service_account_json");
  if (!raw) throw new Error("skipped: Google service account JSON not configured");
  const sa = JSON.parse(raw) as ServiceAccount;
  if (!sa.client_email || !sa.private_key) throw new Error("Invalid service account JSON (missing client_email/private_key)");
  return sa;
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function accessToken(scope: string): Promise<string> {
  const sa = serviceAccount();
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = base64url(
    JSON.stringify({
      iss: sa.client_email,
      scope,
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  );
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(`${header}.${claim}`);
  const signature = base64url(signer.sign(sa.private_key));
  const assertion = `${header}.${claim}.${signature}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
  });
  const data = (await res.json()) as { access_token?: string; error_description?: string };
  if (!data.access_token) throw new Error("Google auth failed: " + (data.error_description ?? res.status));
  return data.access_token;
}

async function apiPost<T>(url: string, token: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Google API ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return (await res.json()) as T;
}

/* ---------- Search Console ---------- */
const GSC_SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";
type GscRow = { keys: string[]; clicks: number; impressions: number; ctr: number; position: number };

export async function syncSearchConsole(days = 90): Promise<string> {
  const site = getSetting("gsc_site_url");
  if (!site) throw new Error("skipped: Search Console site URL not configured");
  const token = await accessToken(GSC_SCOPE);
  const end = addDays(today(), -2); // GSC lags ~2 days
  const start = addDays(end, -(days - 1));
  const url = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site)}/searchAnalytics/query`;

  const daily = await apiPost<{ rows?: GscRow[] }>(url, token, { startDate: start, endDate: end, dimensions: ["date"], rowLimit: 1000 });
  const insDaily = sqlite.prepare(
    `INSERT INTO gsc_daily (date, clicks, impressions, ctr, position) VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(date) DO UPDATE SET clicks=excluded.clicks, impressions=excluded.impressions, ctr=excluded.ctr, position=excluded.position`,
  );
  for (const row of daily.rows ?? []) {
    insDaily.run(row.keys[0], Math.round(row.clicks), Math.round(row.impressions), round2(row.ctr * 100), round1(row.position));
  }
  await syncDimension(url, token, start, end, "query", "gsc_queries", "query");
  await syncDimension(url, token, start, end, "page", "gsc_pages", "page");
  await updateKeywordRankings(url, token, end);
  return `synced ${daily.rows?.length ?? 0} daily rows (${start} → ${end})`;
}

async function syncDimension(url: string, token: string, start: string, end: string, dimension: string, table: string, column: string) {
  const res = await apiPost<{ rows?: GscRow[] }>(url, token, { startDate: start, endDate: end, dimensions: [dimension], rowLimit: 500 });
  const stmt = sqlite.prepare(
    `INSERT INTO ${table} (date, ${column}, clicks, impressions, ctr, position) VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(date, ${column}) DO UPDATE SET clicks=excluded.clicks, impressions=excluded.impressions, ctr=excluded.ctr, position=excluded.position`,
  );
  for (const row of res.rows ?? []) {
    stmt.run(end, row.keys[0], Math.round(row.clicks), Math.round(row.impressions), round2(row.ctr * 100), round1(row.position));
  }
}

async function updateKeywordRankings(url: string, token: string, date: string) {
  const tracked = sqlite.prepare("SELECT id, keyword FROM keywords").all() as { id: number; keyword: string }[];
  if (!tracked.length) return;
  const res = await apiPost<{ rows?: GscRow[] }>(url, token, {
    startDate: date,
    endDate: date,
    dimensions: ["query"],
    dimensionFilterGroups: [{ filters: tracked.map((k) => ({ dimension: "query", operator: "equals", expression: k.keyword })), groupType: "or" }],
    rowLimit: 1000,
  });
  const byQuery = new Map((res.rows ?? []).map((r) => [r.keys[0].toLowerCase(), r]));
  const stmt = sqlite.prepare(
    `INSERT INTO keyword_rankings (keyword_id, date, position, clicks, impressions, ctr) VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(keyword_id, date) DO UPDATE SET position=excluded.position, clicks=excluded.clicks, impressions=excluded.impressions, ctr=excluded.ctr`,
  );
  for (const kw of tracked) {
    const row = byQuery.get(kw.keyword.toLowerCase());
    if (!row) continue;
    stmt.run(kw.id, date, round1(row.position), Math.round(row.clicks), Math.round(row.impressions), round2(row.ctr * 100));
  }
}

/* ---------- GA4 Data API ---------- */
const GA_SCOPE = "https://www.googleapis.com/auth/analytics.readonly";

export async function syncAnalytics(days = 90): Promise<string> {
  const propertyId = getSetting("ga4_property_id");
  if (!propertyId) throw new Error("skipped: GA4 property ID not configured");
  const token = await accessToken(GA_SCOPE);
  const end = addDays(today(), -1);
  const start = addDays(end, -(days - 1));
  const url = `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`;

  const report = await apiPost<{ rows?: { dimensionValues: { value: string }[]; metricValues: { value: string }[] }[] }>(url, token, {
    dateRanges: [{ startDate: start, endDate: end }],
    dimensions: [{ name: "date" }],
    metrics: [
      { name: "sessions" }, { name: "totalUsers" }, { name: "newUsers" }, { name: "screenPageViews" },
      { name: "engagementRate" }, { name: "averageSessionDuration" }, { name: "conversions" }, { name: "bounceRate" },
    ],
    limit: 100000,
  });
  const stmt = sqlite.prepare(
    `INSERT INTO ga_daily (date, sessions, users, new_users, pageviews, engagement_rate, avg_duration, conversions, bounce_rate)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(date) DO UPDATE SET sessions=excluded.sessions, users=excluded.users, new_users=excluded.new_users,
       pageviews=excluded.pageviews, engagement_rate=excluded.engagement_rate, avg_duration=excluded.avg_duration,
       conversions=excluded.conversions, bounce_rate=excluded.bounce_rate`,
  );
  let n = 0;
  for (const row of report.rows ?? []) {
    const d = cleanDate(row.dimensionValues[0].value.replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3"));
    if (!d) continue;
    const m = row.metricValues.map((v) => Number(v.value));
    stmt.run(d, Math.round(m[0]), Math.round(m[1]), Math.round(m[2]), Math.round(m[3]), round2(m[4] * 100), round1(m[5]), Math.round(m[6]), round2(m[7] * 100));
    n++;
  }
  return `synced ${n} GA4 daily rows (${start} → ${end})`;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}
function addDays(date: string, n: number) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
const round1 = (n: number) => Math.round(n * 10) / 10;
const round2 = (n: number) => Math.round(n * 100) / 100;
