#!/usr/bin/env php
<?php

/**
 * Import the bundled historical CSVs in database/imports/ into the database.
 *
 *   php bin/import.php
 *
 * Loads (all files optional — missing ones are skipped):
 *   - content-report-2026.csv            → content_items (blogs with funnel stage,
 *                                           target keyword, positions, views, volume)
 *   - email-tracker-2026.csv             → email_campaigns (real campaign sends)
 *   - gsc-performance-jan25-may26.csv    → gsc_daily (monthly clicks/impressions/CTR/position)
 *   - user-acquisition-jan25-may26.csv   → ga_channels users/new users/key events per
 *                                           channel per month; TOTAL rows → ga_daily users
 *   - traffic-acquisition-jan25-may26.csv→ ga_channels sessions per channel per month;
 *                                           TOTAL rows → ga_daily sessions
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
    printf("%-36s → %-14s %d imported/updated, %d skipped\n", $file, $set, $r['ok'], $r['skipped']);
    foreach ($r['errors'] as $e) {
        echo "    note: $e\n";
    }
};

/**
 * Pull the monthly "Total" rows out of a long-format GA export
 * (Month, Channel, …) into site-level ga_daily columns.
 * $map: ga_daily column => CSV header (lowercase, single-spaced).
 */
$importTotals = function (string $file, array $map) use ($dir): void {
    $path = "$dir/$file";
    if (!file_exists($path)) {
        return;
    }
    $fh = fopen($path, 'r');
    $cols = null;
    $ok = 0;
    while (($cells = fgetcsv($fh, null, ",", "\"", "")) !== false) {
        if ($cols === null) {
            $lowered = array_map(fn ($c) => strtolower(trim(preg_replace('/\s+/', ' ', (string) $c))), $cells);
            $m = array_search('month', $lowered, true);
            $c = array_search('channel', $lowered, true);
            if ($m === false || $c === false) {
                continue;
            }
            $found = [];
            foreach ($map as $dbCol => $header) {
                $i = array_search($header, $lowered, true);
                if ($i !== false) {
                    $found[$dbCol] = $i;
                }
            }
            if ($found) {
                $cols = [$m, $c, $found];
            }
            continue;
        }
        [$mI, $cI, $found] = $cols;
        if (strcasecmp(trim((string) ($cells[$cI] ?? '')), 'total') !== 0) {
            continue;
        }
        $date = DataSets::cleanDate($cells[$mI] ?? null);
        if (!$date) {
            continue;
        }
        $sets = [];
        $params = [':d' => $date];
        foreach ($found as $dbCol => $i) {
            $n = DataSets::cleanNumber($cells[$i] ?? null);
            if ($n !== null) {
                $sets[] = $dbCol;
                $params[":{$dbCol}"] = (int) $n;
            }
        }
        if (!$sets) {
            continue; // trailing placeholder rows with no numbers
        }
        DB::run(
            sprintf(
                'INSERT INTO ga_daily (date, %s) VALUES (:d, %s) ON CONFLICT(date) DO UPDATE SET %s',
                implode(', ', $sets),
                implode(', ', array_map(fn ($s) => ":{$s}", $sets)),
                implode(', ', array_map(fn ($s) => "{$s} = excluded.{$s}", $sets))
            ),
            $params
        );
        $ok++;
    }
    fclose($fh);
    printf("%-36s → %-14s %d monthly totals\n", "$file (Total rows)", 'ga_daily', $ok);
};

/* ---- 1. Content report (blog inventory with SEO metadata) ---- */
$csv('content-report-2026.csv', 'content_items', ['defaults' => ['type' => 'blog']]);

/* ---- 2. Email tracker (real campaign sends) ---- */
$csv('email-tracker-2026.csv', 'email_campaigns');

/* ---- 3. GSC monthly performance matrix ---- */
$csv('gsc-performance-jan25-may26.csv', 'gsc_monthly');

/* ---- 4. User acquisition: users/new users/key events per channel ---- */
$csv('user-acquisition-jan25-may26.csv', 'ga_channels');
$importTotals('user-acquisition-jan25-may26.csv', [
    'users'     => 'total users',
    'new_users' => 'new users',
]);

/* ---- 5. Traffic acquisition: sessions per channel ---- */
$csv('traffic-acquisition-jan25-may26.csv', 'ga_channels');
$importTotals('traffic-acquisition-jan25-may26.csv', [
    'sessions' => 'sessions',
]);

echo "Done. Monthly figures are stored on the 1st of each month.\n";
