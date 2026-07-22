import { sqlite } from "@/lib/db/client";

/*
 * Read-side query helpers for the report pages. Ported from the PHP Reports
 * class. All range params are [start, end] as 'YYYY-MM-DD'. Uses the raw
 * better-sqlite3 handle for the aggregate SQL.
 */

function all<T = Record<string, unknown>>(sql: string, ...params: unknown[]): T[] {
  return sqlite.prepare(sql).all(...params) as T[];
}
function get<T = Record<string, unknown>>(sql: string, ...params: unknown[]): T | undefined {
  return sqlite.prepare(sql).get(...params) as T | undefined;
}
function val<T = number>(sql: string, ...params: unknown[]): T {
  const row = sqlite.prepare(sql).get(...params) as Record<string, unknown> | undefined;
  return (row ? Object.values(row)[0] : null) as T;
}

/* ---------- Search Console ---------- */
export type GscTotals = { clicks: number; impressions: number; ctr: number; position: number };
export function gscTotals(start: string, end: string): GscTotals {
  return get<GscTotals>(
    `SELECT COALESCE(SUM(clicks),0) clicks, COALESCE(SUM(impressions),0) impressions,
            COALESCE(AVG(ctr),0) ctr, COALESCE(AVG(position),0) position
     FROM gsc_daily WHERE date BETWEEN ? AND ?`,
    start, end,
  )!;
}
export function gscSeries(start: string, end: string) {
  return all(`SELECT date, clicks, impressions, ctr, position FROM gsc_daily WHERE date BETWEEN ? AND ? ORDER BY date`, start, end);
}
export function gscTopQueries() {
  const latest = val<string | null>(`SELECT MAX(date) v FROM gsc_queries`);
  return latest
    ? all(`SELECT id, query, clicks, impressions, ctr, position FROM gsc_queries WHERE date = ? ORDER BY clicks DESC`, latest)
    : [];
}
export function gscTopPages() {
  const latest = val<string | null>(`SELECT MAX(date) v FROM gsc_pages`);
  return latest
    ? all(`SELECT id, page, clicks, impressions, ctr, position FROM gsc_pages WHERE date = ? ORDER BY clicks DESC`, latest)
    : [];
}

/* ---------- Google Analytics ---------- */
export type GaTotals = {
  sessions: number; users: number; new_users: number; pageviews: number;
  engagement_rate: number; avg_duration: number; conversions: number; bounce_rate: number;
};
export function gaTotals(start: string, end: string): GaTotals {
  return get<GaTotals>(
    `SELECT COALESCE(SUM(sessions),0) sessions, COALESCE(SUM(users),0) users,
            COALESCE(SUM(new_users),0) new_users, COALESCE(SUM(pageviews),0) pageviews,
            COALESCE(AVG(engagement_rate),0) engagement_rate, COALESCE(AVG(avg_duration),0) avg_duration,
            COALESCE(SUM(conversions),0) conversions, COALESCE(AVG(bounce_rate),0) bounce_rate
     FROM ga_daily WHERE date BETWEEN ? AND ?`,
    start, end,
  )!;
}
export function gaSeries(start: string, end: string) {
  return all(`SELECT date, sessions, users, pageviews, conversions FROM ga_daily WHERE date BETWEEN ? AND ? ORDER BY date`, start, end);
}
export function gaChannels(start: string, end: string) {
  return all(
    `SELECT channel, SUM(sessions) sessions, SUM(users) users, SUM(conversions) conversions
     FROM ga_channels WHERE date BETWEEN ? AND ? GROUP BY channel ORDER BY sessions DESC`,
    start, end,
  );
}
export function gaTopPages(start: string, end: string) {
  return all(
    `SELECT page, SUM(pageviews) pageviews, SUM(users) users FROM ga_pages
     WHERE date BETWEEN ? AND ? GROUP BY page ORDER BY pageviews DESC`,
    start, end,
  );
}

/** Combined GSC + GA metrics per month (newest first, all data) — Search & Traffic monthly view. */
export function searchTrafficMonthly() {
  const gsc = new Map<string, { clicks: number; impressions: number; ctr: number; position: number }>();
  for (const r of all<{ ym: string; clicks: number; impressions: number; ctr: number; position: number }>(
    `SELECT strftime('%Y-%m', date) ym, SUM(clicks) clicks, SUM(impressions) impressions,
            AVG(ctr) ctr, AVG(position) position
     FROM gsc_daily GROUP BY ym`,
  )) gsc.set(r.ym, r);
  const ga = new Map<string, { sessions: number; users: number; conversions: number; pageviews: number }>();
  for (const r of all<{ ym: string; sessions: number; users: number; conversions: number; pageviews: number }>(
    `SELECT strftime('%Y-%m', date) ym, SUM(sessions) sessions, SUM(users) users,
            SUM(conversions) conversions, SUM(pageviews) pageviews
     FROM ga_daily GROUP BY ym`,
  )) ga.set(r.ym, r);
  const months = [...new Set([...gsc.keys(), ...ga.keys()])].filter(Boolean).sort().reverse();
  return months.map((ym) => ({
    ym,
    clicks: gsc.get(ym)?.clicks ?? 0,
    impressions: gsc.get(ym)?.impressions ?? 0,
    ctr: gsc.get(ym)?.ctr ?? 0,
    position: gsc.get(ym)?.position ?? 0,
    sessions: ga.get(ym)?.sessions ?? 0,
    users: ga.get(ym)?.users ?? 0,
    conversions: ga.get(ym)?.conversions ?? 0,
    pageviews: ga.get(ym)?.pageviews ?? 0,
  }));
}

/* ---------- Content ---------- */
export function contentSummary(start: string, end: string) {
  return all(
    `SELECT ci.type, COUNT(DISTINCT ci.id) items,
            COALESCE(SUM(cm.pageviews),0) pageviews, COALESCE(SUM(cm.visitors),0) visitors,
            COALESCE(SUM(cm.conversions),0) conversions
     FROM content_items ci
     LEFT JOIN content_metrics cm ON cm.content_id = ci.id AND cm.date BETWEEN ? AND ?
     GROUP BY ci.type`,
    start, end,
  );
}
export function contentTable(type: string, start: string, end: string) {
  return all(
    `SELECT ci.id, ci.title, ci.url, ci.author, ci.published_at, ci.funnel_stage,
            ci.target_keyword, ci.keyword_position, ci.search_volume, ci.views,
            COALESCE(SUM(cm.pageviews),0) pageviews, COALESCE(SUM(cm.visitors),0) visitors,
            COALESCE(AVG(cm.avg_time),0) avg_time, COALESCE(AVG(cm.bounce_rate),0) bounce_rate,
            COALESCE(SUM(cm.conversions),0) conversions
     FROM content_items ci
     LEFT JOIN content_metrics cm ON cm.content_id = ci.id AND cm.date BETWEEN ? AND ?
     WHERE ci.type = ? GROUP BY ci.id ORDER BY pageviews DESC`,
    start, end, type,
  );
}
export function contentSeries(type: string, start: string, end: string) {
  return all(
    `SELECT cm.date, SUM(cm.pageviews) pageviews, SUM(cm.visitors) visitors
     FROM content_metrics cm JOIN content_items ci ON ci.id = cm.content_id
     WHERE ci.type = ? AND cm.date BETWEEN ? AND ? GROUP BY cm.date ORDER BY cm.date`,
    type, start, end,
  );
}

/** All content of a type with its full metadata, newest first (no date filter). */
export function contentByType(type: string) {
  return all(
    `SELECT id, title, url, author, published_at, funnel_stage,
            target_keyword, keyword_position, ai_presence, search_volume, views
     FROM content_items WHERE type = ? ORDER BY published_at DESC, id DESC`,
    type,
  );
}

/** Count of content items published per month (YYYY-MM), for a given year. */
export function contentCountsByMonth(year: number): Map<string, number> {
  const rows = all<{ ym: string; c: number }>(
    `SELECT strftime('%Y-%m', published_at) ym, COUNT(*) c FROM content_items
     WHERE strftime('%Y', published_at) = ? GROUP BY ym`,
    String(year),
  );
  return new Map(rows.map((r) => [r.ym, r.c]));
}

/* ---------- Social ---------- */
export function socialTotals(start: string, end: string) {
  return all(
    `SELECT platform, MAX(followers) followers, SUM(impressions) impressions,
            SUM(engagements) engagements, SUM(clicks) clicks, SUM(video_views) video_views
     FROM social_daily WHERE date BETWEEN ? AND ? GROUP BY platform`,
    start, end,
  );
}
export function socialSeries(platform: string, start: string, end: string) {
  return all(
    `SELECT id, date, followers, impressions, engagements, clicks, video_views
     FROM social_daily WHERE platform = ? AND date BETWEEN ? AND ? ORDER BY date`,
    platform, start, end,
  );
}
export function socialPosts(platform: string) {
  return all(
    `SELECT id, posted_at, title, url, impressions, engagements, clicks, video_views
     FROM social_posts WHERE platform = ? ORDER BY posted_at DESC`,
    platform,
  );
}

/* ---------- Campaigns ---------- */
export function campaignTable(start: string, end: string) {
  return all(
    `SELECT c.id, c.name, c.channel, c.status, c.start_date, c.end_date, c.budget,
            COALESCE(SUM(m.impressions),0) impressions, COALESCE(SUM(m.clicks),0) clicks,
            COALESCE(SUM(m.conversions),0) conversions, COALESCE(SUM(m.cost),0) cost,
            COALESCE(SUM(m.revenue),0) revenue
     FROM campaigns c LEFT JOIN campaign_metrics m ON m.campaign_id = c.id AND m.date BETWEEN ? AND ?
     GROUP BY c.id ORDER BY revenue DESC`,
    start, end,
  );
}
export function campaignSeries(id: number, start: string, end: string) {
  return all(
    `SELECT date, impressions, clicks, conversions, cost, revenue FROM campaign_metrics
     WHERE campaign_id = ? AND date BETWEEN ? AND ? ORDER BY date`,
    id, start, end,
  );
}

/* ---------- Keywords ---------- */
export function keywordTable(start: string, end: string) {
  return all(
    `SELECT k.id, k.keyword, k.target_url, k.search_volume, k.difficulty,
            (SELECT position FROM keyword_rankings r WHERE r.keyword_id = k.id AND r.date <= ? ORDER BY r.date DESC LIMIT 1) position,
            (SELECT position FROM keyword_rankings r WHERE r.keyword_id = k.id AND r.date <= ? ORDER BY r.date DESC LIMIT 1) prev_position,
            (SELECT SUM(clicks) FROM keyword_rankings r WHERE r.keyword_id = k.id AND r.date BETWEEN ? AND ?) clicks,
            (SELECT SUM(impressions) FROM keyword_rankings r WHERE r.keyword_id = k.id AND r.date BETWEEN ? AND ?) impressions
     FROM keywords k ORDER BY clicks DESC`,
    end, start, start, end, start, end,
  );
}
export function keywordSeries(id: number, start: string, end: string) {
  return all(
    `SELECT date, position, clicks, impressions FROM keyword_rankings
     WHERE keyword_id = ? AND date BETWEEN ? AND ? ORDER BY date`,
    id, start, end,
  );
}

/* ---------- Email ---------- */
export type EmailTotals = { campaigns: number; sent: number; delivered: number; opens: number; clicks: number; unsubscribes: number };
export function emailTotals(start: string, end: string): EmailTotals {
  return get<EmailTotals>(
    `SELECT COUNT(*) campaigns, COALESCE(SUM(sent),0) sent, COALESCE(SUM(delivered),0) delivered,
            COALESCE(SUM(opens),0) opens, COALESCE(SUM(clicks),0) clicks, COALESCE(SUM(unsubscribes),0) unsubscribes
     FROM email_campaigns WHERE date BETWEEN ? AND ?`,
    start, end,
  )!;
}
export function emailTable(start: string, end: string) {
  return all(
    `SELECT id, date, name, type, list_name, subject, sent, delivered, opens, clicks, unsubscribes, notes
     FROM email_campaigns WHERE date BETWEEN ? AND ? ORDER BY date DESC`,
    start, end,
  );
}
export function emailMonthly(start: string, end: string) {
  return all(
    `SELECT strftime('%Y-%m', date) ym, SUM(sent) sent, SUM(opens) opens, SUM(clicks) clicks
     FROM email_campaigns WHERE date BETWEEN ? AND ? GROUP BY ym ORDER BY ym`,
    start, end,
  );
}
/** Every email campaign, newest first (no date filter) — for the month-grouped view. */
export function emailAll() {
  return all(
    `SELECT id, date, name, type, list_name, subject, sent, delivered, opens, clicks, unsubscribes, notes
     FROM email_campaigns ORDER BY date DESC, id DESC`,
  );
}
/** Every campaign with its lifetime metric totals, newest first (no date filter). */
export function campaignAll() {
  return all(
    `SELECT c.id, c.name, c.channel, c.status, c.start_date, c.end_date, c.budget,
            COALESCE(SUM(m.impressions),0) impressions, COALESCE(SUM(m.clicks),0) clicks,
            COALESCE(SUM(m.conversions),0) conversions, COALESCE(SUM(m.cost),0) cost,
            COALESCE(SUM(m.revenue),0) revenue
     FROM campaigns c LEFT JOIN campaign_metrics m ON m.campaign_id = c.id
     GROUP BY c.id ORDER BY c.start_date DESC, c.id DESC`,
  );
}

/**
 * Unified keyword list for the Keywords page: tracked keywords (with latest
 * ranking + change) PLUS every content target keyword not already tracked, so
 * a keyword set on the Content page auto-appears here.
 */
export type UnifiedKeyword = {
  id: number;
  source: "keyword" | "content";
  keyword: string;
  url: string | null;
  position: string | null;
  prev_position: number | null;
  vol: number;
  difficulty: number | null;
};
export function unifiedKeywords(): UnifiedKeyword[] {
  const tracked = all<UnifiedKeyword>(
    `SELECT k.id, 'keyword' source, k.keyword, k.target_url url,
            CAST((SELECT position FROM keyword_rankings r WHERE r.keyword_id = k.id ORDER BY r.date DESC LIMIT 1) AS TEXT) position,
            (SELECT position FROM keyword_rankings r WHERE r.keyword_id = k.id ORDER BY r.date DESC LIMIT 1 OFFSET 1) prev_position,
            k.search_volume vol, k.difficulty
     FROM keywords k`,
  );
  const content = all<UnifiedKeyword>(
    `SELECT ci.id, 'content' source, ci.target_keyword keyword, ci.url,
            ci.keyword_position position, NULL prev_position,
            ci.search_volume vol, NULL difficulty
     FROM content_items ci
     WHERE ci.target_keyword IS NOT NULL AND TRIM(ci.target_keyword) <> ''
       AND LOWER(ci.target_keyword) NOT IN (SELECT LOWER(keyword) FROM keywords)
     GROUP BY LOWER(ci.target_keyword)`,
  );
  return [...tracked, ...content];
}

/* ---------- Data extent ---------- */
export function latestDataDate(): string | null {
  return val<string | null>(
    `SELECT MAX(d) v FROM (
        SELECT MAX(date) d FROM ga_daily
        UNION ALL SELECT MAX(date) FROM gsc_daily
        UNION ALL SELECT MAX(date) FROM social_daily
        UNION ALL SELECT MAX(date) FROM email_campaigns
        UNION ALL SELECT MAX(date) FROM campaign_metrics
        UNION ALL SELECT MAX(published_at) FROM content_items
        UNION ALL SELECT MAX(date) FROM keyword_rankings)`,
  );
}
export function earliestDataDate(): string | null {
  return val<string | null>(
    `SELECT MIN(d) v FROM (
        SELECT MIN(date) d FROM ga_daily
        UNION ALL SELECT MIN(date) FROM gsc_daily
        UNION ALL SELECT MIN(date) FROM social_daily
        UNION ALL SELECT MIN(date) FROM email_campaigns
        UNION ALL SELECT MIN(date) FROM campaign_metrics
        UNION ALL SELECT MIN(published_at) FROM content_items
        UNION ALL SELECT MIN(date) FROM keyword_rankings) WHERE d IS NOT NULL`,
  );
}

/* ---------- Monthly / yearly ---------- */
export function monthsWithData(): string[] {
  const rows = all<{ m: string }>(
    `SELECT DISTINCT m FROM (
        SELECT strftime('%Y-%m', date) m FROM ga_daily
        UNION SELECT strftime('%Y-%m', date) FROM gsc_daily
        UNION SELECT strftime('%Y-%m', date) FROM social_daily
        UNION SELECT strftime('%Y-%m', date) FROM email_campaigns
        UNION SELECT strftime('%Y-%m', published_at) FROM content_items WHERE published_at IS NOT NULL
        UNION SELECT strftime('%Y-%m', date) FROM campaign_metrics
        UNION SELECT month FROM monthly_notes) WHERE m IS NOT NULL ORDER BY m DESC`,
  );
  return rows.map((r) => r.m);
}
export function monthBounds(month: string): [string, string] {
  const start = `${month}-01`;
  const d = new Date(`${start}T00:00:00Z`);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0));
  return [start, last.toISOString().slice(0, 10)];
}
export function monthSummary(month: string) {
  const [s, e] = monthBounds(month);
  const ga = gaTotals(s, e);
  const gsc = gscTotals(s, e);
  const email = emailTotals(s, e);
  const social = get<{ impressions: number; engagements: number }>(
    `SELECT COALESCE(SUM(impressions),0) impressions, COALESCE(SUM(engagements),0) engagements FROM social_daily WHERE date BETWEEN ? AND ?`, s, e,
  )!;
  const campaign = get<{ cost: number; revenue: number; conversions: number }>(
    `SELECT COALESCE(SUM(cost),0) cost, COALESCE(SUM(revenue),0) revenue, COALESCE(SUM(conversions),0) conversions FROM campaign_metrics WHERE date BETWEEN ? AND ?`, s, e,
  )!;
  return {
    month,
    sessions: ga.sessions, users: ga.users, new_users: ga.new_users, pageviews: ga.pageviews, conversions: ga.conversions,
    gsc_clicks: gsc.clicks, gsc_impressions: gsc.impressions, gsc_ctr: gsc.ctr, gsc_position: gsc.position,
    content_published: val<number>(`SELECT COUNT(*) v FROM content_items WHERE strftime('%Y-%m', published_at) = ?`, month),
    email_campaigns: email.campaigns, email_sent: email.sent, email_opens: email.opens,
    social_impressions: social.impressions, social_engagements: social.engagements,
    campaign_cost: campaign.cost, campaign_revenue: campaign.revenue,
  };
}
export function monthContent(month: string) {
  return all(
    `SELECT id, type, title, url, author, published_at, funnel_stage, target_keyword, views
     FROM content_items WHERE strftime('%Y-%m', published_at) = ? ORDER BY published_at DESC`, month,
  );
}
export function monthNotes(month: string) {
  return all(`SELECT id, category, note FROM monthly_notes WHERE month = ? ORDER BY id`, month);
}
export function monthlyRollup(year: number) {
  const rows = all<Record<string, number | string>>(
    `SELECT strftime('%Y-%m', date) ym, SUM(sessions) sessions, SUM(users) users, SUM(pageviews) pageviews, SUM(conversions) conversions
     FROM ga_daily WHERE strftime('%Y', date) = ? GROUP BY ym ORDER BY ym`, String(year),
  );
  const gsc = new Map<string, { clicks: number; impressions: number }>();
  for (const r of all<{ ym: string; clicks: number; impressions: number }>(
    `SELECT strftime('%Y-%m', date) ym, SUM(clicks) clicks, SUM(impressions) impressions FROM gsc_daily WHERE strftime('%Y', date) = ? GROUP BY ym`, String(year),
  )) gsc.set(r.ym, r);
  const soc = new Map<string, { engagements: number }>();
  for (const r of all<{ ym: string; engagements: number }>(
    `SELECT strftime('%Y-%m', date) ym, SUM(engagements) engagements FROM social_daily WHERE strftime('%Y', date) = ? GROUP BY ym`, String(year),
  )) soc.set(r.ym, r);
  return rows.map((r) => ({
    ...r,
    gsc_clicks: gsc.get(r.ym as string)?.clicks ?? 0,
    gsc_impressions: gsc.get(r.ym as string)?.impressions ?? 0,
    social_engagements: soc.get(r.ym as string)?.engagements ?? 0,
  }));
}
export function yearlyRollup() {
  const rows = all<Record<string, number | string>>(
    `SELECT strftime('%Y', date) y, SUM(sessions) sessions, SUM(users) users, SUM(pageviews) pageviews, SUM(conversions) conversions
     FROM ga_daily GROUP BY y ORDER BY y`,
  );
  return rows.map((r) => ({
    ...r,
    gsc_clicks: val<number>(`SELECT COALESCE(SUM(clicks),0) v FROM gsc_daily WHERE strftime('%Y', date) = ?`, r.y),
    social_engagements: val<number>(`SELECT COALESCE(SUM(engagements),0) v FROM social_daily WHERE strftime('%Y', date) = ?`, r.y),
  }));
}
export function availableYears(): number[] {
  const rows = all<{ y: string }>(`SELECT DISTINCT strftime('%Y', date) y FROM ga_daily ORDER BY y DESC`);
  return rows.length ? rows.map((r) => Number(r.y)) : [new Date().getFullYear()];
}

/* ---------- Compare engine ---------- */
export type CompareMetric = { label: string; table: string; expr: string; lowerIsBetter: boolean };
export const COMPARE_METRICS: Record<string, CompareMetric> = {
  ga_sessions: { label: "Sessions (GA4)", table: "ga_daily", expr: "SUM(sessions)", lowerIsBetter: false },
  ga_users: { label: "Users (GA4)", table: "ga_daily", expr: "SUM(users)", lowerIsBetter: false },
  ga_pageviews: { label: "Pageviews (GA4)", table: "ga_daily", expr: "SUM(pageviews)", lowerIsBetter: false },
  ga_conversions: { label: "Conversions (GA4)", table: "ga_daily", expr: "SUM(conversions)", lowerIsBetter: false },
  ga_bounce: { label: "Bounce rate % (GA4)", table: "ga_daily", expr: "AVG(bounce_rate)", lowerIsBetter: true },
  gsc_clicks: { label: "Clicks (Search Console)", table: "gsc_daily", expr: "SUM(clicks)", lowerIsBetter: false },
  gsc_impressions: { label: "Impressions (Search)", table: "gsc_daily", expr: "SUM(impressions)", lowerIsBetter: false },
  gsc_ctr: { label: "CTR % (Search Console)", table: "gsc_daily", expr: "AVG(ctr)", lowerIsBetter: false },
  gsc_position: { label: "Avg position (Search)", table: "gsc_daily", expr: "AVG(position)", lowerIsBetter: true },
  social_impressions: { label: "Impressions (all social)", table: "social_daily", expr: "SUM(impressions)", lowerIsBetter: false },
  social_engagements: { label: "Engagements (all social)", table: "social_daily", expr: "SUM(engagements)", lowerIsBetter: false },
  campaign_clicks: { label: "Clicks (campaigns)", table: "campaign_metrics", expr: "SUM(clicks)", lowerIsBetter: false },
  campaign_conv: { label: "Conversions (campaigns)", table: "campaign_metrics", expr: "SUM(conversions)", lowerIsBetter: false },
  campaign_cost: { label: "Spend $ (campaigns)", table: "campaign_metrics", expr: "SUM(cost)", lowerIsBetter: true },
  campaign_revenue: { label: "Revenue $ (campaigns)", table: "campaign_metrics", expr: "SUM(revenue)", lowerIsBetter: false },
  email_sent: { label: "Emails sent", table: "email_campaigns", expr: "SUM(sent)", lowerIsBetter: false },
  email_opens: { label: "Email opens", table: "email_campaigns", expr: "SUM(opens)", lowerIsBetter: false },
  email_clicks: { label: "Email clicks", table: "email_campaigns", expr: "SUM(clicks)", lowerIsBetter: false },
  email_unsubs: { label: "Email unsubscribes", table: "email_campaigns", expr: "SUM(unsubscribes)", lowerIsBetter: true },
};
export function compareValue(metricKey: string, start: string, end: string): number {
  const m = COMPARE_METRICS[metricKey];
  if (!m) return 0;
  return val<number>(`SELECT COALESCE(${m.expr}, 0) v FROM ${m.table} WHERE date BETWEEN ? AND ?`, start, end) ?? 0;
}
export function compareSeries(metricKey: string, start: string, end: string) {
  const m = COMPARE_METRICS[metricKey];
  if (!m) return [];
  return all(`SELECT date, COALESCE(${m.expr}, 0) value FROM ${m.table} WHERE date BETWEEN ? AND ? GROUP BY date ORDER BY date`, start, end);
}
