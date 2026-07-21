/*
 * Config-driven datasets — the single source of truth for the manual-entry
 * forms, the tolerant CSV importer, and the downloadable templates. Field keys
 * are the real DB column names. Ported from the PHP DataSets definitions.
 */

export type FieldType = "date" | "text" | "int" | "float" | "select" | "lookup";

export interface Field {
  type: FieldType;
  label?: string;
  required?: boolean;
  aliases?: string[];
  options?: string[];
  /** [table, matchColumn, idColumn] */
  lookup?: [string, string, string];
  /** Recognized on import + routed to the totals table, hidden from the form/template. */
  totalsOnly?: boolean;
}

export interface Dataset {
  key: string;
  label: string;
  table?: string;
  unique?: string[];
  help?: string;
  fields?: Record<string, Field>;
  matrix?: "gsc" | "channels";
  rowFilter?: "channel_not_total";
  totals?: { table: string; columns: string[] };
}

export const DATASETS: Record<string, Dataset> = {
  ga_daily: {
    key: "ga_daily",
    label: "Google Analytics — site totals",
    table: "ga_daily",
    unique: ["date"],
    help: "One row per day (or per month — use the 1st of the month).",
    fields: {
      date: { type: "date", required: true },
      sessions: { type: "int" },
      users: { type: "int" },
      new_users: { type: "int" },
      pageviews: { type: "int", aliases: ["views", "page_views"] },
      engagement_rate: { type: "float", label: "Engagement rate %" },
      avg_duration: { type: "float", label: "Avg duration (sec)" },
      conversions: { type: "int", aliases: ["key_events", "leads"] },
      bounce_rate: { type: "float", label: "Bounce rate %" },
    },
  },
  ga_channels: {
    key: "ga_channels",
    label: "Google Analytics — channel breakdown",
    table: "ga_channels",
    unique: ["date", "channel"],
    help: "Sessions/users per acquisition channel per day or month. Long-format GA4 exports import directly; Total rows fill the site totals.",
    fields: {
      date: { type: "date", required: true, aliases: ["month"] },
      channel: { type: "text", required: true },
      sessions: { type: "int" },
      users: { type: "int", aliases: ["total_users"] },
      new_users: { type: "int" },
      conversions: { type: "int", aliases: ["key_events"] },
      engagement_rate: { type: "float", totalsOnly: true, aliases: ["engagement_rate"] },
      avg_duration: {
        type: "float",
        totalsOnly: true,
        aliases: ["avg_session_duration", "avg_time_session", "avg_duration_sec"],
      },
      bounce_rate: { type: "float", totalsOnly: true, aliases: ["bounce_rate"] },
    },
    rowFilter: "channel_not_total",
    totals: {
      table: "ga_daily",
      columns: ["sessions", "users", "new_users", "conversions", "engagement_rate", "avg_duration", "bounce_rate"],
    },
  },
  gsc_daily: {
    key: "gsc_daily",
    label: "Google Search Console — totals",
    table: "gsc_daily",
    unique: ["date"],
    help: "Clicks / impressions / CTR / position per day or month.",
    fields: {
      date: { type: "date", required: true },
      clicks: { type: "int" },
      impressions: { type: "int" },
      ctr: { type: "float", label: "CTR %" },
      position: { type: "float", aliases: ["avg_position", "avgposition"] },
    },
  },
  content_items: {
    key: "content_items",
    label: "Content — items (blog, docs, landing, case studies)",
    table: "content_items",
    unique: ["type", "url"],
    help: "The content inventory. Metrics attach to items by URL.",
    fields: {
      type: {
        type: "select",
        required: true,
        options: ["blog", "documentation", "landing_page", "case_study"],
      },
      title: { type: "text", required: true, aliases: ["topic"] },
      url: { type: "text", required: true, aliases: ["links", "link"] },
      author: { type: "text" },
      published_at: { type: "date", aliases: ["publish_date", "date"] },
      funnel_stage: { type: "select", options: ["TOFU", "MOFU", "BOFU"], aliases: ["funnel"] },
      reviewer: { type: "text" },
      publisher: { type: "text" },
      target_keyword: { type: "text" },
      keyword_position: {
        type: "text",
        label: "Keyword position",
        aliases: ["primary_keyword_position", "position"],
      },
      search_volume: { type: "int", aliases: ["search_volume_combined_us_uk_au_ca"] },
      ai_presence: { type: "text", label: "AI presence", aliases: ["ai_presence_rank_screenshot"] },
      views: { type: "int", label: "Total views", aliases: ["blog_views"] },
    },
  },
  content_metrics: {
    key: "content_metrics",
    label: "Content — performance metrics",
    table: "content_metrics",
    unique: ["content_id", "date"],
    help: "Reference the content item by its URL.",
    fields: {
      content_id: {
        type: "lookup",
        required: true,
        label: "Content (by URL)",
        lookup: ["content_items", "url", "id"],
        aliases: ["url", "content_url", "content"],
      },
      date: { type: "date", required: true },
      pageviews: { type: "int", aliases: ["views", "page_views"] },
      visitors: { type: "int", aliases: ["users"] },
      avg_time: { type: "float", label: "Avg time (sec)" },
      bounce_rate: { type: "float", label: "Bounce rate %" },
      conversions: { type: "int", aliases: ["leads"] },
    },
  },
  social_daily: {
    key: "social_daily",
    label: "Social — account metrics",
    table: "social_daily",
    unique: ["date", "platform"],
    help: "Follower and engagement snapshots per platform per day or month.",
    fields: {
      date: { type: "date", required: true },
      platform: {
        type: "select",
        required: true,
        options: ["facebook", "linkedin", "twitter", "youtube"],
      },
      followers: { type: "int", aliases: ["subscribers"] },
      impressions: { type: "int" },
      engagements: { type: "int" },
      clicks: { type: "int" },
      posts: { type: "int" },
      video_views: { type: "int" },
    },
  },
  social_posts: {
    key: "social_posts",
    label: "Social — individual posts",
    table: "social_posts",
    unique: ["platform", "url"],
    fields: {
      platform: {
        type: "select",
        required: true,
        options: ["facebook", "linkedin", "twitter", "youtube"],
      },
      posted_at: { type: "date", required: true, aliases: ["date"] },
      title: { type: "text", required: true, aliases: ["post", "text"] },
      url: { type: "text", required: true, aliases: ["link"] },
      impressions: { type: "int" },
      engagements: { type: "int" },
      clicks: { type: "int" },
      video_views: { type: "int", aliases: ["views"] },
    },
  },
  campaigns: {
    key: "campaigns",
    label: "Campaigns — definitions",
    table: "campaigns",
    unique: ["name", "channel"],
    fields: {
      name: { type: "text", required: true, aliases: ["campaign"] },
      channel: { type: "text", required: true },
      status: { type: "select", options: ["planned", "active", "paused", "completed"] },
      start_date: { type: "date" },
      end_date: { type: "date" },
      budget: { type: "float" },
    },
  },
  campaign_metrics: {
    key: "campaign_metrics",
    label: "Campaigns — daily metrics",
    table: "campaign_metrics",
    unique: ["campaign_id", "date"],
    help: "Reference the campaign by its exact name.",
    fields: {
      campaign_id: {
        type: "lookup",
        required: true,
        label: "Campaign (by name)",
        lookup: ["campaigns", "name", "id"],
        aliases: ["campaign", "campaign_name", "name"],
      },
      date: { type: "date", required: true },
      impressions: { type: "int" },
      clicks: { type: "int" },
      conversions: { type: "int", aliases: ["leads"] },
      cost: { type: "float", aliases: ["spend"] },
      revenue: { type: "float" },
    },
  },
  keywords: {
    key: "keywords",
    label: "Keywords — tracked list",
    table: "keywords",
    unique: ["keyword"],
    fields: {
      keyword: { type: "text", required: true },
      target_url: { type: "text", aliases: ["url", "page"] },
      search_volume: { type: "int", aliases: ["volume"] },
      difficulty: { type: "int", aliases: ["kd"] },
    },
  },
  keyword_rankings: {
    key: "keyword_rankings",
    label: "Keywords — ranking history",
    table: "keyword_rankings",
    unique: ["keyword_id", "date"],
    help: "Reference the keyword by its exact text.",
    fields: {
      keyword_id: {
        type: "lookup",
        required: true,
        label: "Keyword",
        lookup: ["keywords", "keyword", "id"],
        aliases: ["keyword", "query"],
      },
      date: { type: "date", required: true },
      position: { type: "float", aliases: ["rank", "avg_position"] },
      clicks: { type: "int" },
      impressions: { type: "int" },
      ctr: { type: "float", label: "CTR %" },
    },
  },
  email_campaigns: {
    key: "email_campaigns",
    label: "Email marketing — campaign sends",
    table: "email_campaigns",
    unique: ["date", "name"],
    help: "Date, Campaign, Type, Sent, Delivered, Opens, Clicks, Unsubscribes. Rates are computed automatically.",
    fields: {
      date: { type: "date", required: true },
      name: { type: "text", required: true, aliases: ["campaign", "email_title"] },
      type: { type: "text", aliases: ["type_category", "category"] },
      sent: { type: "int", aliases: ["audience_sent_to", "audience"] },
      delivered: { type: "int" },
      opens: { type: "int" },
      clicks: { type: "int" },
      unsubscribes: { type: "int", aliases: ["unsubs", "unsubscribed"] },
      list_name: { type: "text", label: "List", aliases: ["which_list", "list"] },
      segment: { type: "text", aliases: ["segmentation"] },
      subject: { type: "text", label: "Subject line", aliases: ["winning_subject_line", "subject_line"] },
      author: { type: "text" },
      notes: { type: "text" },
    },
  },
  gsc_monthly: {
    key: "gsc_monthly",
    label: "Search Console — monthly matrix (sheet export)",
    matrix: "gsc",
    help: "Rows are metrics (Clicks, Impressions, CTR, Avg. position), columns are months (Jan'25, Feb'25…). Other rows are ignored.",
  },
  ga_channels_monthly: {
    key: "ga_channels_monthly",
    label: "GA channels — monthly matrix (sheet export)",
    matrix: "channels",
    help: "Rows are channels, columns are months. Choose whether the numbers are sessions, users, or conversions. Total rows are skipped.",
  },
};

export function getDataset(key: string): Dataset | undefined {
  return DATASETS[key];
}
