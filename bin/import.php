#!/usr/bin/env php
<?php

/**
 * Import the bundled historical CSVs in database/imports/ into the database.
 *
 *   php bin/import.php
 *
 * Loads (all files optional — missing ones are skipped):
 *   - content-report-2026.csv           → content_items (blogs with funnel stage,
 *                                          target keyword, positions, views, volume)
 *   - email-tracker-2026.csv            → email_campaigns (real campaign sends)
 *   - user-acquisition-jan25-may26.csv  → ga_channels (users/new users/key events
 *                                          per channel per month) + ga_daily users
 *   - gsc-performance-jan25-may26.csv   → gsc_daily (monthly clicks/impressions/CTR/position)
 *   - website-traffic-jan25-may26.csv   → gsc_daily + ga_channels sessions + ga_daily sessions
 *
 * Safe to re-run: everything upserts by its natural key.
 */

require dirname(__DIR__) . '/app/bootstrap.php';

use App\Core\DataSets;
use App\Core\DB;

DB::conn();
$dir = BASE_PATH . '/database/imports';

$csv = function (string $file, string $set, array $options = []) use ($dir): void {
    $path = "$dir/$file";
    if (!file_exists($path)) {
        return;
    }
    $r = DataSets::importCsv($set, $path, $options);
    printf("%-24s → %-16s %d imported/updated, %d skipped\n", $file, $set, $r['ok'], $r['skipped']);
    foreach ($r['errors'] as $e) {
        echo "    note: $e\n";
    }
};

/* ---- 1. Content report (blog inventory with SEO metadata) ---- */
$csv('content-report-2026.csv', 'content_items', ['defaults' => ['type' => 'blog']]);

/* ---- 2. Email tracker (real campaign sends) ---- */
$csv('email-tracker-2026.csv', 'email_campaigns');

/* ---- 3. GSC monthly performance matrix ---- */
$csv('gsc-performance-jan25-may26.csv', 'gsc_monthly');

/* ---- 4. User acquisition (long format: month, channel, users, new users…) ---- */
$uaFile = "$dir/user-acquisition-jan25-may26.csv";
if (file_exists($uaFile)) {
    $csv('user-acquisition-jan25-may26.csv', 'ga_channels'); // Total rows skipped by row filter

    // Second pass: the "Total" rows carry site-level monthly users for ga_daily.
    $fh = fopen($uaFile, 'r');
    $cols = null;
    $gaOk = 0;
    while (($cells = fgetcsv($fh, null, ",", "\"", "")) !== false) {
        if ($cols === null) {
            $lowered = array_map(fn ($c) => strtolower(trim((string) $c)), $cells);
            $m = array_search('month', $lowered, true);
            $c = array_search('channel', $lowered, true);
            $u = array_search('total users', $lowered, true);
            $n = array_search('new users', $lowered, true);
            if ($m !== false && $c !== false && $u !== false) {
                $cols = [$m, $c, $u, $n];
            }
            continue;
        }
        [$mI, $cI, $uI, $nI] = $cols;
        if (strcasecmp(trim((string) ($cells[$cI] ?? '')), 'total') !== 0) {
            continue;
        }
        $date  = DataSets::cleanDate($cells[$mI] ?? null);
        $users = DataSets::cleanNumber($cells[$uI] ?? null);
        if (!$date || $users === null) {
            continue;
        }
        $newUsers = $nI !== false ? DataSets::cleanNumber($cells[$nI] ?? null) : null;
        DB::run(
            'INSERT INTO ga_daily (date, users, new_users) VALUES (:d, :u, :n)
             ON CONFLICT(date) DO UPDATE SET users = excluded.users,
               new_users = CASE WHEN excluded.new_users > 0 THEN excluded.new_users ELSE ga_daily.new_users END',
            [':d' => $date, ':u' => (int) $users, ':n' => (int) ($newUsers ?? 0)]
        );
        $gaOk++;
    }
    fclose($fh);
    printf("%-24s → %-16s %d monthly user totals\n", 'user-acquisition (totals)', 'ga_daily', $gaOk);
}

/* ---- 5. Older traffic report (GSC matrix + channel sessions + session totals) ---- */
$trafficFile = "$dir/website-traffic-jan25-may26.csv";
if (file_exists($trafficFile)) {
    $csv('website-traffic-jan25-may26.csv', 'gsc_monthly');

    $fh = fopen($trafficFile, 'r');
    $measure = null;
    $months  = [];
    $chOk    = 0;
    $totals  = [];
    $skipLabels = ['total', 'metric', 'channel', 'clicks', 'impressions', 'ctr',
                   'position', 'avg_position', 'average_position'];
    while (($cells = fgetcsv($fh, null, ",", "\"", "")) !== false) {
        $first = trim((string) ($cells[0] ?? ''));
        $lower = strtolower($first);
        if (str_contains($lower, 'user acquisition by channel')) {
            $measure = 'users';
            $months = [];
            continue;
        }
        if (str_contains($lower, 'traffic acquisition by channel')) {
            $measure = 'sessions';
            $months = [];
            continue;
        }
        if (str_contains($lower, 'overview') || str_contains($lower, 'search performance')) {
            $measure = null;
            $months = [];
            continue;
        }
        if ($measure === null) {
            continue;
        }
        if ($m = DataSets::monthColumns($cells)) {
            $months = $m;
            continue;
        }
        if (!$months || $first === '') {
            continue;
        }
        $norm = preg_replace('/[^a-z0-9]+/', '_', $lower);
        if (in_array($norm, $skipLabels, true)) {
            if ($norm === 'total') {
                foreach ($months as $i => $date) {
                    $n = DataSets::cleanNumber($cells[$i] ?? null);
                    if ($n !== null) {
                        $totals[$measure][$date] = (int) $n;
                    }
                }
            }
            continue;
        }
        foreach ($months as $i => $date) {
            $n = DataSets::cleanNumber($cells[$i] ?? null);
            if ($n === null) {
                continue;
            }
            DB::run(
                "INSERT INTO ga_channels (date, channel, {$measure}) VALUES (:d, :ch, :v)
                 ON CONFLICT(date, channel) DO UPDATE SET {$measure} = excluded.{$measure}",
                [':d' => $date, ':ch' => $first, ':v' => (int) $n]
            );
        }
        $chOk++;
    }
    fclose($fh);
    printf("%-24s → %-16s %d channel rows\n", 'website-traffic (channels)', 'ga_channels', $chOk);

    $gaOk = 0;
    $allDates = array_unique(array_merge(array_keys($totals['sessions'] ?? []), array_keys($totals['users'] ?? [])));
    foreach ($allDates as $date) {
        DB::run(
            'INSERT INTO ga_daily (date, sessions, users) VALUES (:d, :s, :u)
             ON CONFLICT(date) DO UPDATE SET
               sessions = CASE WHEN excluded.sessions > 0 THEN excluded.sessions ELSE ga_daily.sessions END,
               users    = CASE WHEN excluded.users    > 0 THEN excluded.users    ELSE ga_daily.users    END',
            [':d' => $date,
             ':s' => $totals['sessions'][$date] ?? 0,
             ':u' => $totals['users'][$date] ?? 0]
        );
        $gaOk++;
    }
    printf("%-24s → %-16s %d monthly session totals\n", 'website-traffic (totals)', 'ga_daily', $gaOk);
}

echo "Done. Monthly figures are stored on the 1st of each month.\n";
