<?php

namespace App\Services;

use App\Core\DB;
use App\Core\Settings;
use RuntimeException;

/**
 * Pulls Google Search Console data via the Search Analytics API.
 * https://developers.google.com/webmaster-tools/v1/searchanalytics/query
 */
class SearchConsoleSync
{
    private const SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';

    public static function run(int $days = 90): string
    {
        $site = Settings::get('gsc_site_url');
        if (!$site || !GoogleClient::configured()) {
            throw new RuntimeException('skipped: Search Console site URL or Google credentials not configured');
        }

        // GSC data lags ~2 days behind real time.
        $end   = date('Y-m-d', strtotime('-2 days'));
        $start = date('Y-m-d', strtotime("-{$days} days"));
        $url   = 'https://searchconsole.googleapis.com/webmasters/v3/sites/'
               . rawurlencode($site) . '/searchAnalytics/query';

        // 1. Daily site totals
        $daily = GoogleClient::request('POST', $url, self::SCOPE, [
            'startDate'  => $start,
            'endDate'    => $end,
            'dimensions' => ['date'],
            'rowLimit'   => 1000,
        ]);
        foreach ($daily['rows'] ?? [] as $row) {
            DB::run(
                'INSERT INTO gsc_daily (date, clicks, impressions, ctr, position)
                 VALUES (:d, :c, :i, :ctr, :p)
                 ON CONFLICT(date) DO UPDATE SET
                   clicks = excluded.clicks, impressions = excluded.impressions,
                   ctr = excluded.ctr, position = excluded.position',
                [
                    ':d'   => $row['keys'][0],
                    ':c'   => (int) $row['clicks'],
                    ':i'   => (int) $row['impressions'],
                    ':ctr' => round($row['ctr'] * 100, 2),
                    ':p'   => round($row['position'], 1),
                ]
            );
        }

        // 2. Top queries (attributed to the sync end date, refreshed each run)
        self::syncDimension($url, $start, $end, 'query', 'gsc_queries', 'query');

        // 3. Top pages
        self::syncDimension($url, $start, $end, 'page', 'gsc_pages', 'page');

        // 4. Keyword rank tracking: update tracked keywords from query data
        self::updateKeywordRankings($url, $end);

        return sprintf('synced %d daily rows (%s → %s)', count($daily['rows'] ?? []), $start, $end);
    }

    private static function syncDimension(string $url, string $start, string $end, string $dimension, string $table, string $column): void
    {
        $res = GoogleClient::request('POST', $url, self::SCOPE, [
            'startDate'  => $start,
            'endDate'    => $end,
            'dimensions' => [$dimension],
            'rowLimit'   => 500,
        ]);
        foreach ($res['rows'] ?? [] as $row) {
            DB::run(
                "INSERT INTO {$table} (date, {$column}, clicks, impressions, ctr, position)
                 VALUES (:d, :k, :c, :i, :ctr, :p)
                 ON CONFLICT(date, {$column}) DO UPDATE SET
                   clicks = excluded.clicks, impressions = excluded.impressions,
                   ctr = excluded.ctr, position = excluded.position",
                [
                    ':d'   => $end,
                    ':k'   => $row['keys'][0],
                    ':c'   => (int) $row['clicks'],
                    ':i'   => (int) $row['impressions'],
                    ':ctr' => round($row['ctr'] * 100, 2),
                    ':p'   => round($row['position'], 1),
                ]
            );
        }
    }

    private static function updateKeywordRankings(string $url, string $date): void
    {
        $tracked = DB::all('SELECT id, keyword FROM keywords');
        if (!$tracked) {
            return;
        }
        $res = GoogleClient::request('POST', $url, self::SCOPE, [
            'startDate'         => $date,
            'endDate'           => $date,
            'dimensions'        => ['query'],
            'dimensionFilterGroups' => [[
                'filters' => array_map(
                    fn ($k) => ['dimension' => 'query', 'operator' => 'equals', 'expression' => $k['keyword']],
                    $tracked
                ),
                'groupType' => 'or',
            ]],
            'rowLimit' => 1000,
        ]);
        $byQuery = [];
        foreach ($res['rows'] ?? [] as $row) {
            $byQuery[mb_strtolower($row['keys'][0])] = $row;
        }
        foreach ($tracked as $kw) {
            $row = $byQuery[mb_strtolower($kw['keyword'])] ?? null;
            if (!$row) {
                continue;
            }
            DB::run(
                'INSERT INTO keyword_rankings (keyword_id, date, position, clicks, impressions, ctr)
                 VALUES (:id, :d, :p, :c, :i, :ctr)
                 ON CONFLICT(keyword_id, date) DO UPDATE SET
                   position = excluded.position, clicks = excluded.clicks,
                   impressions = excluded.impressions, ctr = excluded.ctr',
                [
                    ':id'  => $kw['id'],
                    ':d'   => $date,
                    ':p'   => round($row['position'], 1),
                    ':c'   => (int) $row['clicks'],
                    ':i'   => (int) $row['impressions'],
                    ':ctr' => round($row['ctr'] * 100, 2),
                ]
            );
        }
    }
}
