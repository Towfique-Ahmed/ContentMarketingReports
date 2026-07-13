-- Content Marketing Reports — SQLite schema

CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT
);

-- Content inventory: blog posts, docs, landing pages, case studies
CREATE TABLE IF NOT EXISTS content_items (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    type         TEXT NOT NULL CHECK (type IN ('blog','documentation','landing_page','case_study')),
    title        TEXT NOT NULL,
    url          TEXT NOT NULL,
    author       TEXT,
    published_at TEXT,
    UNIQUE(type, url)
);

-- Daily per-content metrics (fed from GA4 page reports or manual import)
CREATE TABLE IF NOT EXISTS content_metrics (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    content_id  INTEGER NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
    date        TEXT NOT NULL,
    pageviews   INTEGER DEFAULT 0,
    visitors    INTEGER DEFAULT 0,
    avg_time    REAL    DEFAULT 0,   -- seconds
    bounce_rate REAL    DEFAULT 0,   -- 0-100
    conversions INTEGER DEFAULT 0,
    UNIQUE(content_id, date)
);

-- Google Search Console: site-level daily totals
CREATE TABLE IF NOT EXISTS gsc_daily (
    date        TEXT PRIMARY KEY,
    clicks      INTEGER DEFAULT 0,
    impressions INTEGER DEFAULT 0,
    ctr         REAL    DEFAULT 0,   -- 0-100
    position    REAL    DEFAULT 0
);

-- Google Search Console: query-level (rolling window, refreshed each sync)
CREATE TABLE IF NOT EXISTS gsc_queries (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    date        TEXT NOT NULL,
    query       TEXT NOT NULL,
    clicks      INTEGER DEFAULT 0,
    impressions INTEGER DEFAULT 0,
    ctr         REAL    DEFAULT 0,
    position    REAL    DEFAULT 0,
    UNIQUE(date, query)
);

-- Google Search Console: page-level
CREATE TABLE IF NOT EXISTS gsc_pages (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    date        TEXT NOT NULL,
    page        TEXT NOT NULL,
    clicks      INTEGER DEFAULT 0,
    impressions INTEGER DEFAULT 0,
    ctr         REAL    DEFAULT 0,
    position    REAL    DEFAULT 0,
    UNIQUE(date, page)
);

-- GA4: site-level daily totals
CREATE TABLE IF NOT EXISTS ga_daily (
    date             TEXT PRIMARY KEY,
    sessions         INTEGER DEFAULT 0,
    users            INTEGER DEFAULT 0,
    new_users        INTEGER DEFAULT 0,
    pageviews        INTEGER DEFAULT 0,
    engagement_rate  REAL    DEFAULT 0,  -- 0-100
    avg_duration     REAL    DEFAULT 0,  -- seconds
    conversions      INTEGER DEFAULT 0,
    bounce_rate      REAL    DEFAULT 0   -- 0-100
);

-- GA4: daily sessions by default channel group
CREATE TABLE IF NOT EXISTS ga_channels (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    date        TEXT NOT NULL,
    channel     TEXT NOT NULL,
    sessions    INTEGER DEFAULT 0,
    users       INTEGER DEFAULT 0,
    conversions INTEGER DEFAULT 0,
    UNIQUE(date, channel)
);

-- GA4: daily top pages
CREATE TABLE IF NOT EXISTS ga_pages (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    date      TEXT NOT NULL,
    page      TEXT NOT NULL,
    pageviews INTEGER DEFAULT 0,
    users     INTEGER DEFAULT 0,
    UNIQUE(date, page)
);

-- Social: daily account-level metrics per platform
CREATE TABLE IF NOT EXISTS social_daily (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    date        TEXT NOT NULL,
    platform    TEXT NOT NULL CHECK (platform IN ('facebook','linkedin','twitter','youtube')),
    followers   INTEGER DEFAULT 0,
    impressions INTEGER DEFAULT 0,
    engagements INTEGER DEFAULT 0,
    clicks      INTEGER DEFAULT 0,
    posts       INTEGER DEFAULT 0,
    video_views INTEGER DEFAULT 0,
    UNIQUE(date, platform)
);

-- Social: individual posts / videos
CREATE TABLE IF NOT EXISTS social_posts (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    platform    TEXT NOT NULL,
    posted_at   TEXT NOT NULL,
    title       TEXT NOT NULL,
    url         TEXT,
    impressions INTEGER DEFAULT 0,
    engagements INTEGER DEFAULT 0,
    clicks      INTEGER DEFAULT 0,
    video_views INTEGER DEFAULT 0,
    UNIQUE(platform, url)
);

-- Marketing campaigns
CREATE TABLE IF NOT EXISTS campaigns (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL,
    channel    TEXT NOT NULL,            -- e.g. Email, Paid Search, Social, Content
    status     TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('planned','active','paused','completed')),
    start_date TEXT,
    end_date   TEXT,
    budget     REAL DEFAULT 0,
    UNIQUE(name, channel)
);

CREATE TABLE IF NOT EXISTS campaign_metrics (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    date        TEXT NOT NULL,
    impressions INTEGER DEFAULT 0,
    clicks      INTEGER DEFAULT 0,
    conversions INTEGER DEFAULT 0,
    cost        REAL DEFAULT 0,
    revenue     REAL DEFAULT 0,
    UNIQUE(campaign_id, date)
);

-- Tracked keywords
CREATE TABLE IF NOT EXISTS keywords (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    keyword       TEXT NOT NULL UNIQUE,
    target_url    TEXT,
    search_volume INTEGER DEFAULT 0,
    difficulty    INTEGER DEFAULT 0     -- 0-100
);

CREATE TABLE IF NOT EXISTS keyword_rankings (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    keyword_id  INTEGER NOT NULL REFERENCES keywords(id) ON DELETE CASCADE,
    date        TEXT NOT NULL,
    position    REAL    DEFAULT 0,
    clicks      INTEGER DEFAULT 0,
    impressions INTEGER DEFAULT 0,
    ctr         REAL    DEFAULT 0,
    UNIQUE(keyword_id, date)
);

-- Sync history
CREATE TABLE IF NOT EXISTS sync_log (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    source   TEXT NOT NULL,
    ran_at   TEXT NOT NULL,
    status   TEXT NOT NULL,             -- ok | error | skipped
    message  TEXT
);

CREATE INDEX IF NOT EXISTS idx_content_metrics_date ON content_metrics(date);
CREATE INDEX IF NOT EXISTS idx_gsc_queries_date     ON gsc_queries(date);
CREATE INDEX IF NOT EXISTS idx_gsc_pages_date       ON gsc_pages(date);
CREATE INDEX IF NOT EXISTS idx_ga_channels_date     ON ga_channels(date);
CREATE INDEX IF NOT EXISTS idx_ga_pages_date        ON ga_pages(date);
CREATE INDEX IF NOT EXISTS idx_social_daily_date    ON social_daily(date);
CREATE INDEX IF NOT EXISTS idx_campaign_metrics_date ON campaign_metrics(date);
CREATE INDEX IF NOT EXISTS idx_keyword_rankings_date ON keyword_rankings(date);
