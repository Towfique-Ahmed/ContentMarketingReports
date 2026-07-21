/*
 * Per-page data-management config: which datasets can be added/imported on a
 * report page, which sync sources feed it, and which settings fields belong to
 * it. Plain data (client-safe). Ported from the PHP page_manage_config.
 */
export type SettingField = {
  name: string;
  label: string;
  type?: "text" | "password" | "textarea" | "json";
  hint?: string;
  placeholder?: string;
};

export type ManageConfig = {
  label: string;
  datasets: string[];
  sync: string[];
  settings: SettingField[];
};

export const MANAGE_CONFIG: Record<string, ManageConfig> = {
  content: {
    label: "content",
    datasets: ["content_items", "content_metrics"],
    sync: ["content"],
    settings: [
      { name: "site_base_url", label: "Website URL", placeholder: "https://example.com", hint: "The daily sync auto-discovers content from this site (WordPress REST API or XML sitemaps)." },
      { name: "wp_username", label: "WordPress username (optional)" },
      { name: "wp_app_password", label: "WordPress application password (optional)", type: "password" },
      { name: "content_path_rules", label: "Content URL rules (type=path, one per line)", type: "textarea", placeholder: "blog=/blog/\ndocumentation=/docs/" },
    ],
  },
  search: {
    label: "search & analytics",
    datasets: ["gsc_daily", "gsc_monthly", "ga_daily", "ga_channels", "ga_channels_monthly"],
    sync: ["search_console", "analytics"],
    settings: [
      { name: "google_service_account_json", label: "Google service account JSON key", type: "json", hint: "One service account works for both Search Console and GA4.", placeholder: '{ "type": "service_account", … }' },
      { name: "gsc_site_url", label: "Search Console property URL", placeholder: "sc-domain:example.com or https://example.com/" },
      { name: "ga4_property_id", label: "GA4 numeric property ID", placeholder: "123456789" },
    ],
  },
  keywords: {
    label: "keywords",
    datasets: ["keywords", "keyword_rankings"],
    sync: ["search_console"],
    settings: [
      { name: "gsc_site_url", label: "Search Console property URL", placeholder: "sc-domain:example.com", hint: "Tracked-keyword rankings are pulled from Search Console query data on each sync." },
    ],
  },
  social: {
    label: "social",
    datasets: ["social_daily", "social_posts"],
    sync: ["social"],
    settings: [
      { name: "facebook_page_token", label: "Facebook page access token", type: "password" },
      { name: "facebook_page_id", label: "Facebook page ID" },
      { name: "linkedin_access_token", label: "LinkedIn access token", type: "password" },
      { name: "linkedin_org_urn", label: "LinkedIn organization URN" },
      { name: "twitter_bearer_token", label: "X / Twitter bearer token", type: "password" },
      { name: "twitter_user_id", label: "X / Twitter numeric user ID" },
      { name: "youtube_api_key", label: "YouTube Data API key", type: "password" },
      { name: "youtube_channel_id", label: "YouTube channel ID" },
    ],
  },
  campaigns: {
    label: "campaigns",
    datasets: ["campaigns", "campaign_metrics"],
    sync: [],
    settings: [],
  },
  email: {
    label: "email",
    datasets: ["email_campaigns"],
    sync: [],
    settings: [],
  },
};
