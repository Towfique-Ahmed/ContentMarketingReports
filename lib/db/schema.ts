import { sql } from "drizzle-orm";
import {
  integer,
  real,
  sqliteTable,
  text,
  unique,
} from "drizzle-orm/sqlite-core";

/*
 * Data model — ported 1:1 from the original SQLite schema so existing exports
 * and the tolerant CSV importers keep working. Monthly figures are stored on
 * the first day of the month; daily figures on their own date.
 */

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value"),
});

export const contentItems = sqliteTable(
  "content_items",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    type: text("type").notNull(), // blog | documentation | landing_page | case_study
    title: text("title").notNull(),
    url: text("url").notNull(),
    author: text("author"),
    publishedAt: text("published_at"),
    funnelStage: text("funnel_stage"),
    reviewer: text("reviewer"),
    publisher: text("publisher"),
    targetKeyword: text("target_keyword"),
    keywordPosition: text("keyword_position"),
    searchVolume: integer("search_volume").default(0),
    aiPresence: text("ai_presence"),
    views: integer("views").default(0),
  },
  (t) => ({ uq: unique().on(t.type, t.url) }),
);

export const contentMetrics = sqliteTable(
  "content_metrics",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    contentId: integer("content_id")
      .notNull()
      .references(() => contentItems.id, { onDelete: "cascade" }),
    date: text("date").notNull(),
    pageviews: integer("pageviews").default(0),
    visitors: integer("visitors").default(0),
    avgTime: real("avg_time").default(0),
    bounceRate: real("bounce_rate").default(0),
    conversions: integer("conversions").default(0),
  },
  (t) => ({ uq: unique().on(t.contentId, t.date) }),
);

export const gscDaily = sqliteTable("gsc_daily", {
  date: text("date").primaryKey(),
  clicks: integer("clicks").default(0),
  impressions: integer("impressions").default(0),
  ctr: real("ctr").default(0),
  position: real("position").default(0),
});

export const gscQueries = sqliteTable(
  "gsc_queries",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    date: text("date").notNull(),
    query: text("query").notNull(),
    clicks: integer("clicks").default(0),
    impressions: integer("impressions").default(0),
    ctr: real("ctr").default(0),
    position: real("position").default(0),
  },
  (t) => ({ uq: unique().on(t.date, t.query) }),
);

export const gscPages = sqliteTable(
  "gsc_pages",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    date: text("date").notNull(),
    page: text("page").notNull(),
    clicks: integer("clicks").default(0),
    impressions: integer("impressions").default(0),
    ctr: real("ctr").default(0),
    position: real("position").default(0),
  },
  (t) => ({ uq: unique().on(t.date, t.page) }),
);

export const gaDaily = sqliteTable("ga_daily", {
  date: text("date").primaryKey(),
  sessions: integer("sessions").default(0),
  users: integer("users").default(0),
  newUsers: integer("new_users").default(0),
  pageviews: integer("pageviews").default(0),
  engagementRate: real("engagement_rate").default(0), // 0-100
  avgDuration: real("avg_duration").default(0), // seconds
  conversions: integer("conversions").default(0),
  bounceRate: real("bounce_rate").default(0), // 0-100
});

export const gaChannels = sqliteTable(
  "ga_channels",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    date: text("date").notNull(),
    channel: text("channel").notNull(),
    sessions: integer("sessions").default(0),
    users: integer("users").default(0),
    newUsers: integer("new_users").default(0),
    conversions: integer("conversions").default(0),
  },
  (t) => ({ uq: unique().on(t.date, t.channel) }),
);

export const gaPages = sqliteTable(
  "ga_pages",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    date: text("date").notNull(),
    page: text("page").notNull(),
    pageviews: integer("pageviews").default(0),
    users: integer("users").default(0),
  },
  (t) => ({ uq: unique().on(t.date, t.page) }),
);

export const socialDaily = sqliteTable(
  "social_daily",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    date: text("date").notNull(),
    platform: text("platform").notNull(),
    followers: integer("followers").default(0),
    impressions: integer("impressions").default(0),
    engagements: integer("engagements").default(0),
    clicks: integer("clicks").default(0),
    posts: integer("posts").default(0),
    videoViews: integer("video_views").default(0),
  },
  (t) => ({ uq: unique().on(t.date, t.platform) }),
);

export const socialPosts = sqliteTable(
  "social_posts",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    platform: text("platform").notNull(),
    postedAt: text("posted_at").notNull(),
    title: text("title").notNull(),
    url: text("url").notNull(),
    impressions: integer("impressions").default(0),
    engagements: integer("engagements").default(0),
    clicks: integer("clicks").default(0),
    videoViews: integer("video_views").default(0),
  },
  (t) => ({ uq: unique().on(t.platform, t.url) }),
);

export const campaigns = sqliteTable(
  "campaigns",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    channel: text("channel").notNull(),
    status: text("status").default("active"),
    startDate: text("start_date"),
    endDate: text("end_date"),
    budget: real("budget").default(0),
  },
  (t) => ({ uq: unique().on(t.name, t.channel) }),
);

export const campaignMetrics = sqliteTable(
  "campaign_metrics",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    campaignId: integer("campaign_id")
      .notNull()
      .references(() => campaigns.id, { onDelete: "cascade" }),
    date: text("date").notNull(),
    impressions: integer("impressions").default(0),
    clicks: integer("clicks").default(0),
    conversions: integer("conversions").default(0),
    cost: real("cost").default(0),
    revenue: real("revenue").default(0),
  },
  (t) => ({ uq: unique().on(t.campaignId, t.date) }),
);

export const keywords = sqliteTable("keywords", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  keyword: text("keyword").notNull().unique(),
  targetUrl: text("target_url"),
  searchVolume: integer("search_volume").default(0),
  difficulty: integer("difficulty").default(0),
});

export const keywordRankings = sqliteTable(
  "keyword_rankings",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    keywordId: integer("keyword_id")
      .notNull()
      .references(() => keywords.id, { onDelete: "cascade" }),
    date: text("date").notNull(),
    position: real("position").default(0),
    clicks: integer("clicks").default(0),
    impressions: integer("impressions").default(0),
    ctr: real("ctr").default(0),
  },
  (t) => ({ uq: unique().on(t.keywordId, t.date) }),
);

export const emailCampaigns = sqliteTable(
  "email_campaigns",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    date: text("date").notNull(),
    name: text("name").notNull(),
    type: text("type"),
    sent: integer("sent").default(0),
    delivered: integer("delivered").default(0),
    opens: integer("opens").default(0),
    clicks: integer("clicks").default(0),
    unsubscribes: integer("unsubscribes").default(0),
    listName: text("list_name"),
    segment: text("segment"),
    subject: text("subject"),
    author: text("author"),
    notes: text("notes"),
  },
  (t) => ({ uq: unique().on(t.date, t.name) }),
);

export const monthlyNotes = sqliteTable("monthly_notes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  month: text("month").notNull(), // YYYY-MM
  category: text("category"),
  note: text("note"),
});

export const syncLog = sqliteTable("sync_log", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  source: text("source").notNull(),
  ranAt: text("ran_at").default(sql`CURRENT_TIMESTAMP`),
  status: text("status"),
  message: text("message"),
});
