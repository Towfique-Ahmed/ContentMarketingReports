<?php

namespace App\Core;

/**
 * Read-side query helpers for the report pages.
 * All range parameters are [startDate, endDate] as 'Y-m-d' strings.
 */
class Reports
{
    /* ---------- Google Search Console ---------- */

    public static function gscTotals(string $start, string $end): array
    {
        return DB::one(
            'SELECT COALESCE(SUM(clicks),0) clicks, COALESCE(SUM(impressions),0) impressions,
                    COALESCE(AVG(ctr),0) ctr, COALESCE(AVG(position),0) position
             FROM gsc_daily WHERE date BETWEEN :s AND :e',
            [':s' => $start, ':e' => $end]
        ) ?? ['clicks' => 0, 'impressions' => 0, 'ctr' => 0, 'position' => 0];
    }

    public static function gscSeries(string $start, string $end): array
    {
        return DB::all(
            'SELECT date, clicks, impressions, ctr, position FROM gsc_daily
             WHERE date BETWEEN :s AND :e ORDER BY date',
            [':s' => $start, ':e' => $end]
        );
    }

    public static function gscTopQueries(int $limit = 25): array
    {
        $latest = DB::value('SELECT MAX(date) FROM gsc_queries');
        return $latest ? DB::all(
            'SELECT id, query, clicks, impressions, ctr, position FROM gsc_queries
             WHERE date = :d ORDER BY clicks DESC LIMIT ' . (int) $limit,
            [':d' => $latest]
        ) : [];
    }

    public static function gscTopPages(int $limit = 25): array
    {
        $latest = DB::value('SELECT MAX(date) FROM gsc_pages');
        return $latest ? DB::all(
            'SELECT id, page, clicks, impressions, ctr, position FROM gsc_pages
             WHERE date = :d ORDER BY clicks DESC LIMIT ' . (int) $limit,
            [':d' => $latest]
        ) : [];
    }

    /* ---------- Google Analytics ---------- */

    public static function gaTotals(string $start, string $end): array
    {
        return DB::one(
            'SELECT COALESCE(SUM(sessions),0) sessions, COALESCE(SUM(users),0) users,
                    COALESCE(SUM(new_users),0) new_users, COALESCE(SUM(pageviews),0) pageviews,
                    COALESCE(AVG(engagement_rate),0) engagement_rate,
                    COALESCE(AVG(avg_duration),0) avg_duration,
                    COALESCE(SUM(conversions),0) conversions, COALESCE(AVG(bounce_rate),0) bounce_rate
             FROM ga_daily WHERE date BETWEEN :s AND :e',
            [':s' => $start, ':e' => $end]
        ) ?? [];
    }

    public static function gaSeries(string $start, string $end): array
    {
        return DB::all(
            'SELECT date, sessions, users, pageviews, conversions FROM ga_daily
             WHERE date BETWEEN :s AND :e ORDER BY date',
            [':s' => $start, ':e' => $end]
        );
    }

    public static function gaChannels(string $start, string $end): array
    {
        return DB::all(
            'SELECT channel, SUM(sessions) sessions, SUM(users) users, SUM(conversions) conversions
             FROM ga_channels WHERE date BETWEEN :s AND :e
             GROUP BY channel ORDER BY sessions DESC',
            [':s' => $start, ':e' => $end]
        );
    }

    public static function gaTopPages(string $start, string $end, int $limit = 25): array
    {
        return DB::all(
            'SELECT page, SUM(pageviews) pageviews, SUM(users) users
             FROM ga_pages WHERE date BETWEEN :s AND :e
             GROUP BY page ORDER BY pageviews DESC LIMIT ' . (int) $limit,
            [':s' => $start, ':e' => $end]
        );
    }

    /* ---------- Content ---------- */

    public static function contentSummary(string $start, string $end): array
    {
        return DB::all(
            "SELECT ci.type,
                    COUNT(DISTINCT ci.id) items,
                    COALESCE(SUM(cm.pageviews),0) pageviews,
                    COALESCE(SUM(cm.visitors),0) visitors,
                    COALESCE(SUM(cm.conversions),0) conversions
             FROM content_items ci
             LEFT JOIN content_metrics cm ON cm.content_id = ci.id AND cm.date BETWEEN :s AND :e
             GROUP BY ci.type",
            [':s' => $start, ':e' => $end]
        );
    }

    public static function contentTable(string $type, string $start, string $end): array
    {
        return DB::all(
            "SELECT ci.id, ci.title, ci.url, ci.author, ci.published_at,
                    COALESCE(SUM(cm.pageviews),0) pageviews,
                    COALESCE(SUM(cm.visitors),0) visitors,
                    COALESCE(AVG(cm.avg_time),0) avg_time,
                    COALESCE(AVG(cm.bounce_rate),0) bounce_rate,
                    COALESCE(SUM(cm.conversions),0) conversions
             FROM content_items ci
             LEFT JOIN content_metrics cm ON cm.content_id = ci.id AND cm.date BETWEEN :s AND :e
             WHERE ci.type = :t
             GROUP BY ci.id ORDER BY pageviews DESC",
            [':t' => $type, ':s' => $start, ':e' => $end]
        );
    }

    public static function contentSeries(string $type, string $start, string $end): array
    {
        return DB::all(
            "SELECT cm.date, SUM(cm.pageviews) pageviews, SUM(cm.visitors) visitors
             FROM content_metrics cm
             JOIN content_items ci ON ci.id = cm.content_id
             WHERE ci.type = :t AND cm.date BETWEEN :s AND :e
             GROUP BY cm.date ORDER BY cm.date",
            [':t' => $type, ':s' => $start, ':e' => $end]
        );
    }

    /* ---------- Social ---------- */

    public static function socialTotals(string $start, string $end): array
    {
        return DB::all(
            'SELECT platform,
                    MAX(followers) followers,
                    SUM(impressions) impressions, SUM(engagements) engagements,
                    SUM(clicks) clicks, SUM(video_views) video_views
             FROM social_daily WHERE date BETWEEN :s AND :e
             GROUP BY platform',
            [':s' => $start, ':e' => $end]
        );
    }

    public static function socialSeries(string $platform, string $start, string $end): array
    {
        return DB::all(
            'SELECT date, followers, impressions, engagements, clicks, video_views
             FROM social_daily WHERE platform = :p AND date BETWEEN :s AND :e ORDER BY date',
            [':p' => $platform, ':s' => $start, ':e' => $end]
        );
    }

    public static function socialPosts(string $platform, int $limit = 20): array
    {
        return DB::all(
            'SELECT id, posted_at, title, url, impressions, engagements, clicks, video_views
             FROM social_posts WHERE platform = :p ORDER BY posted_at DESC LIMIT ' . (int) $limit,
            [':p' => $platform]
        );
    }

    /* ---------- Campaigns ---------- */

    public static function campaignTable(string $start, string $end): array
    {
        return DB::all(
            'SELECT c.id, c.name, c.channel, c.status, c.start_date, c.end_date, c.budget,
                    COALESCE(SUM(m.impressions),0) impressions, COALESCE(SUM(m.clicks),0) clicks,
                    COALESCE(SUM(m.conversions),0) conversions, COALESCE(SUM(m.cost),0) cost,
                    COALESCE(SUM(m.revenue),0) revenue
             FROM campaigns c
             LEFT JOIN campaign_metrics m ON m.campaign_id = c.id AND m.date BETWEEN :s AND :e
             GROUP BY c.id ORDER BY revenue DESC',
            [':s' => $start, ':e' => $end]
        );
    }

    public static function campaignSeries(int $campaignId, string $start, string $end): array
    {
        return DB::all(
            'SELECT date, impressions, clicks, conversions, cost, revenue
             FROM campaign_metrics WHERE campaign_id = :id AND date BETWEEN :s AND :e ORDER BY date',
            [':id' => $campaignId, ':s' => $start, ':e' => $end]
        );
    }

    /* ---------- Keywords ---------- */

    public static function keywordTable(string $start, string $end): array
    {
        return DB::all(
            'SELECT k.id, k.keyword, k.target_url, k.search_volume, k.difficulty,
                    (SELECT position FROM keyword_rankings r WHERE r.keyword_id = k.id AND r.date <= :e ORDER BY r.date DESC LIMIT 1) position,
                    (SELECT position FROM keyword_rankings r WHERE r.keyword_id = k.id AND r.date <= :s ORDER BY r.date DESC LIMIT 1) prev_position,
                    (SELECT SUM(clicks) FROM keyword_rankings r WHERE r.keyword_id = k.id AND r.date BETWEEN :s AND :e) clicks,
                    (SELECT SUM(impressions) FROM keyword_rankings r WHERE r.keyword_id = k.id AND r.date BETWEEN :s AND :e) impressions
             FROM keywords k ORDER BY clicks DESC',
            [':s' => $start, ':e' => $end]
        );
    }

    public static function keywordSeries(int $keywordId, string $start, string $end): array
    {
        return DB::all(
            'SELECT date, position, clicks, impressions FROM keyword_rankings
             WHERE keyword_id = :id AND date BETWEEN :s AND :e ORDER BY date',
            [':id' => $keywordId, ':s' => $start, ':e' => $end]
        );
    }

    /* ---------- Email marketing ---------- */

    public static function emailTotals(string $start, string $end): array
    {
        return DB::one(
            'SELECT COUNT(*) campaigns, COALESCE(SUM(sent),0) sent, COALESCE(SUM(delivered),0) delivered,
                    COALESCE(SUM(opens),0) opens, COALESCE(SUM(clicks),0) clicks,
                    COALESCE(SUM(unsubscribes),0) unsubscribes
             FROM email_campaigns WHERE date BETWEEN :s AND :e',
            [':s' => $start, ':e' => $end]
        ) ?? [];
    }

    public static function emailTable(string $start, string $end): array
    {
        return DB::all(
            'SELECT id, date, name, type, sent, delivered, opens, clicks, unsubscribes, notes
             FROM email_campaigns WHERE date BETWEEN :s AND :e ORDER BY date DESC',
            [':s' => $start, ':e' => $end]
        );
    }

    public static function emailMonthly(string $start, string $end): array
    {
        return DB::all(
            "SELECT strftime('%Y-%m', date) ym, SUM(sent) sent, SUM(opens) opens, SUM(clicks) clicks
             FROM email_campaigns WHERE date BETWEEN :s AND :e GROUP BY ym ORDER BY ym",
            [':s' => $start, ':e' => $end]
        );
    }

    /* ---------- Monthly / yearly rollups ---------- */

    public static function monthlyRollup(int $year): array
    {
        $rows = DB::all(
            "SELECT strftime('%Y-%m', date) ym,
                    SUM(sessions) sessions, SUM(users) users, SUM(pageviews) pageviews, SUM(conversions) conversions
             FROM ga_daily WHERE strftime('%Y', date) = :y GROUP BY ym ORDER BY ym",
            [':y' => (string) $year]
        );
        $gsc = [];
        foreach (DB::all(
            "SELECT strftime('%Y-%m', date) ym, SUM(clicks) clicks, SUM(impressions) impressions
             FROM gsc_daily WHERE strftime('%Y', date) = :y GROUP BY ym",
            [':y' => (string) $year]
        ) as $r) {
            $gsc[$r['ym']] = $r;
        }
        $social = [];
        foreach (DB::all(
            "SELECT strftime('%Y-%m', date) ym, SUM(engagements) engagements, SUM(impressions) impressions
             FROM social_daily WHERE strftime('%Y', date) = :y GROUP BY ym",
            [':y' => (string) $year]
        ) as $r) {
            $social[$r['ym']] = $r;
        }
        foreach ($rows as &$row) {
            $row['gsc_clicks']         = (int) ($gsc[$row['ym']]['clicks'] ?? 0);
            $row['gsc_impressions']    = (int) ($gsc[$row['ym']]['impressions'] ?? 0);
            $row['social_engagements'] = (int) ($social[$row['ym']]['engagements'] ?? 0);
        }
        return $rows;
    }

    public static function yearlyRollup(): array
    {
        $rows = DB::all(
            "SELECT strftime('%Y', date) y,
                    SUM(sessions) sessions, SUM(users) users, SUM(pageviews) pageviews, SUM(conversions) conversions
             FROM ga_daily GROUP BY y ORDER BY y"
        );
        foreach ($rows as &$row) {
            $row['gsc_clicks'] = (int) DB::value(
                "SELECT COALESCE(SUM(clicks),0) FROM gsc_daily WHERE strftime('%Y', date) = :y", [':y' => $row['y']]
            );
            $row['social_engagements'] = (int) DB::value(
                "SELECT COALESCE(SUM(engagements),0) FROM social_daily WHERE strftime('%Y', date) = :y", [':y' => $row['y']]
            );
        }
        return $rows;
    }

    public static function availableYears(): array
    {
        $years = DB::all("SELECT DISTINCT strftime('%Y', date) y FROM ga_daily ORDER BY y DESC");
        return array_map(fn ($r) => (int) $r['y'], $years) ?: [(int) date('Y')];
    }

    /* ---------- Comparison engine ---------- */

    /**
     * The metric catalog for the Compare page: label, table, value expression,
     * and whether lower is better (position, bounce, cost).
     */
    public static function compareMetrics(): array
    {
        return [
            'ga_sessions'        => ['Sessions (GA4)',            'ga_daily',      'SUM(sessions)',      false],
            'ga_users'           => ['Users (GA4)',               'ga_daily',      'SUM(users)',         false],
            'ga_pageviews'       => ['Pageviews (GA4)',           'ga_daily',      'SUM(pageviews)',     false],
            'ga_conversions'     => ['Conversions (GA4)',         'ga_daily',      'SUM(conversions)',   false],
            'ga_bounce'          => ['Bounce rate % (GA4)',       'ga_daily',      'AVG(bounce_rate)',   true],
            'gsc_clicks'         => ['Clicks (Search Console)',   'gsc_daily',     'SUM(clicks)',        false],
            'gsc_impressions'    => ['Impressions (Search)',      'gsc_daily',     'SUM(impressions)',   false],
            'gsc_ctr'            => ['CTR % (Search Console)',    'gsc_daily',     'AVG(ctr)',           false],
            'gsc_position'       => ['Avg position (Search)',     'gsc_daily',     'AVG(position)',      true],
            'social_impressions' => ['Impressions (all social)',  'social_daily',  'SUM(impressions)',   false],
            'social_engagements' => ['Engagements (all social)',  'social_daily',  'SUM(engagements)',   false],
            'campaign_clicks'    => ['Clicks (campaigns)',        'campaign_metrics', 'SUM(clicks)',     false],
            'campaign_conv'      => ['Conversions (campaigns)',   'campaign_metrics', 'SUM(conversions)', false],
            'campaign_cost'      => ['Spend $ (campaigns)',       'campaign_metrics', 'SUM(cost)',       true],
            'campaign_revenue'   => ['Revenue $ (campaigns)',     'campaign_metrics', 'SUM(revenue)',    false],
            'email_sent'         => ['Emails sent',               'email_campaigns', 'SUM(sent)',        false],
            'email_opens'        => ['Email opens',               'email_campaigns', 'SUM(opens)',       false],
            'email_clicks'       => ['Email clicks',              'email_campaigns', 'SUM(clicks)',      false],
            'email_open_rate'    => ['Email open rate %',         'email_campaigns', '100.0*SUM(opens)/NULLIF(SUM(delivered),0)', false],
            'email_unsubs'       => ['Email unsubscribes',        'email_campaigns', 'SUM(unsubscribes)', true],
        ];
    }

    public static function compareValue(string $metricKey, string $start, string $end): float
    {
        $m = self::compareMetrics()[$metricKey] ?? null;
        if (!$m) {
            return 0.0;
        }
        [, $table, $expr] = $m;
        return (float) (DB::value(
            "SELECT COALESCE($expr, 0) FROM $table WHERE date BETWEEN :s AND :e",
            [':s' => $start, ':e' => $end]
        ) ?: 0);
    }

    public static function compareSeries(string $metricKey, string $start, string $end): array
    {
        $m = self::compareMetrics()[$metricKey] ?? null;
        if (!$m) {
            return [];
        }
        [, $table, $expr] = $m;
        return DB::all(
            "SELECT date, COALESCE($expr, 0) value FROM $table
             WHERE date BETWEEN :s AND :e GROUP BY date ORDER BY date",
            [':s' => $start, ':e' => $end]
        );
    }
}
