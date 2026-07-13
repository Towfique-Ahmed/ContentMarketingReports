<?php

namespace App\Services;

use App\Core\DB;
use App\Core\Settings;
use RuntimeException;

/**
 * Pulls GA4 data via the Google Analytics Data API v1beta.
 * https://developers.google.com/analytics/devguides/reporting/data/v1/rest/v1beta/properties/runReport
 */
class AnalyticsSync
{
    private const SCOPE = 'https://www.googleapis.com/auth/analytics.readonly';

    public static function run(int $days = 90): string
    {
        $propertyId = Settings::get('ga4_property_id');
        if (!$propertyId || !GoogleClient::configured()) {
            throw new RuntimeException('skipped: GA4 property ID or Google credentials not configured');
        }

        $url   = "https://analyticsdata.googleapis.com/v1beta/properties/{$propertyId}:runReport";
        $range = [['startDate' => "{$days}daysAgo", 'endDate' => 'yesterday']];

        // 1. Daily site totals
        $res = GoogleClient::request('POST', $url, self::SCOPE, [
            'dateRanges' => $range,
            'dimensions' => [['name' => 'date']],
            'metrics'    => [
                ['name' => 'sessions'], ['name' => 'totalUsers'], ['name' => 'newUsers'],
                ['name' => 'screenPageViews'], ['name' => 'engagementRate'],
                ['name' => 'averageSessionDuration'], ['name' => 'conversions'],
                ['name' => 'bounceRate'],
            ],
            'limit' => 1000,
        ]);
        $count = 0;
        foreach ($res['rows'] ?? [] as $row) {
            $d = $row['dimensionValues'][0]['value'];             // YYYYMMDD
            $m = array_map(fn ($v) => $v['value'], $row['metricValues']);
            DB::run(
                'INSERT INTO ga_daily (date, sessions, users, new_users, pageviews,
                                       engagement_rate, avg_duration, conversions, bounce_rate)
                 VALUES (:d, :s, :u, :nu, :pv, :er, :ad, :cv, :br)
                 ON CONFLICT(date) DO UPDATE SET
                   sessions = excluded.sessions, users = excluded.users,
                   new_users = excluded.new_users, pageviews = excluded.pageviews,
                   engagement_rate = excluded.engagement_rate, avg_duration = excluded.avg_duration,
                   conversions = excluded.conversions, bounce_rate = excluded.bounce_rate',
                [
                    ':d'  => substr($d, 0, 4) . '-' . substr($d, 4, 2) . '-' . substr($d, 6, 2),
                    ':s'  => (int) $m[0], ':u' => (int) $m[1], ':nu' => (int) $m[2],
                    ':pv' => (int) $m[3],
                    ':er' => round((float) $m[4] * 100, 2),
                    ':ad' => round((float) $m[5], 1),
                    ':cv' => (int) round((float) $m[6]),
                    ':br' => round((float) $m[7] * 100, 2),
                ]
            );
            $count++;
        }

        // 2. Sessions by channel group
        $res = GoogleClient::request('POST', $url, self::SCOPE, [
            'dateRanges' => $range,
            'dimensions' => [['name' => 'date'], ['name' => 'sessionDefaultChannelGroup']],
            'metrics'    => [['name' => 'sessions'], ['name' => 'totalUsers'], ['name' => 'conversions']],
            'limit'      => 10000,
        ]);
        foreach ($res['rows'] ?? [] as $row) {
            $d = $row['dimensionValues'][0]['value'];
            $m = array_map(fn ($v) => $v['value'], $row['metricValues']);
            DB::run(
                'INSERT INTO ga_channels (date, channel, sessions, users, conversions)
                 VALUES (:d, :ch, :s, :u, :cv)
                 ON CONFLICT(date, channel) DO UPDATE SET
                   sessions = excluded.sessions, users = excluded.users, conversions = excluded.conversions',
                [
                    ':d'  => substr($d, 0, 4) . '-' . substr($d, 4, 2) . '-' . substr($d, 6, 2),
                    ':ch' => $row['dimensionValues'][1]['value'],
                    ':s'  => (int) $m[0], ':u' => (int) $m[1], ':cv' => (int) round((float) $m[2]),
                ]
            );
        }

        // 3. Top pages (yesterday), also used to refresh per-content metrics
        $res = GoogleClient::request('POST', $url, self::SCOPE, [
            'dateRanges' => [['startDate' => 'yesterday', 'endDate' => 'yesterday']],
            'dimensions' => [['name' => 'date'], ['name' => 'pagePath']],
            'metrics'    => [['name' => 'screenPageViews'], ['name' => 'totalUsers']],
            'orderBys'   => [['metric' => ['metricName' => 'screenPageViews'], 'desc' => true]],
            'limit'      => 500,
        ]);
        foreach ($res['rows'] ?? [] as $row) {
            $d = $row['dimensionValues'][0]['value'];
            $date = substr($d, 0, 4) . '-' . substr($d, 4, 2) . '-' . substr($d, 6, 2);
            $path = $row['dimensionValues'][1]['value'];
            $pv   = (int) $row['metricValues'][0]['value'];
            $u    = (int) $row['metricValues'][1]['value'];
            DB::run(
                'INSERT INTO ga_pages (date, page, pageviews, users) VALUES (:d, :p, :pv, :u)
                 ON CONFLICT(date, page) DO UPDATE SET
                   pageviews = excluded.pageviews, users = excluded.users',
                [':d' => $date, ':p' => $path, ':pv' => $pv, ':u' => $u]
            );

            // Attribute traffic to known content items whose URL ends with this path
            $item = DB::one(
                "SELECT id FROM content_items WHERE url LIKE :like ORDER BY LENGTH(url) ASC LIMIT 1",
                [':like' => '%' . rtrim($path, '/') . '%']
            );
            if ($item) {
                DB::run(
                    'INSERT INTO content_metrics (content_id, date, pageviews, visitors)
                     VALUES (:id, :d, :pv, :u)
                     ON CONFLICT(content_id, date) DO UPDATE SET
                       pageviews = excluded.pageviews, visitors = excluded.visitors',
                    [':id' => $item['id'], ':d' => $date, ':pv' => $pv, ':u' => $u]
                );
            }
        }

        return sprintf('synced %d daily rows (last %d days)', $count, $days);
    }
}
