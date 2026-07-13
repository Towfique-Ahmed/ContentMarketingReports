#!/usr/bin/env php
<?php

/**
 * Import the bundled historical CSVs in database/imports/ into the database.
 *
 *   php bin/import.php
 *
 * Loads:
 *   - email-campaigns-2026.csv      → email_campaigns
 *   - website-traffic-jan25-may26.csv
 *       · Search Performance section  → gsc_daily (monthly, 1st of month)
 *       · "User acquisition by Channel"    section → ga_channels.users
 *       · "Traffic Acquisition by Channel" section → ga_channels.sessions
 *       · monthly totals rows          → ga_daily.users / ga_daily.sessions
 *
 * Safe to re-run: everything upserts by date key.
 */

require dirname(__DIR__) . '/app/bootstrap.php';

use App\Core\DataSets;
use App\Core\DB;

DB::conn();
$dir = BASE_PATH . '/database/imports';

/* ---- 1. Email campaigns ---- */
$emailFile = $dir . '/email-campaigns-2026.csv';
if (file_exists($emailFile)) {
    $r = DataSets::importCsv('email_campaigns', $emailFile);
    printf("email_campaigns:  %d imported, %d skipped\n", $r['ok'], $r['skipped']);
}

/* ---- 2. Traffic report: GSC monthly section ---- */
$trafficFile = $dir . '/website-traffic-jan25-may26.csv';
if (file_exists($trafficFile)) {
    $r = DataSets::importCsv('gsc_monthly', $trafficFile);
    printf("gsc_daily:        %d months imported\n", $r['ok']);

    /* ---- 3. Channel sections, measure detected from the section title ---- */
    $fh = fopen($trafficFile, 'r');
    $measure = null;   // users | sessions | null (ignore)
    $months  = [];
    $chOk    = 0;
    $totals  = [];     // measure → [date => total]
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
        // Any other section title (overviews, search performance) ends channel parsing
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
        if ($first === '' || in_array($norm, $skipLabels, true)) {
            // Keep the Total row for the site-level ga_daily rollup
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
    printf("ga_channels:      %d channel rows imported (users + sessions)\n", $chOk);

    /* ---- 4. Site-level monthly totals into ga_daily ---- */
    $gaOk = 0;
    $allDates = array_unique(array_merge(array_keys($totals['sessions'] ?? []), array_keys($totals['users'] ?? [])));
    foreach ($allDates as $date) {
        DB::run(
            'INSERT INTO ga_daily (date, sessions, users) VALUES (:d, :s, :u)
             ON CONFLICT(date) DO UPDATE SET sessions = excluded.sessions, users = excluded.users',
            [':d' => $date,
             ':s' => $totals['sessions'][$date] ?? 0,
             ':u' => $totals['users'][$date] ?? 0]
        );
        $gaOk++;
    }
    printf("ga_daily:         %d monthly totals imported\n", $gaOk);
}

echo "Done. Monthly figures are stored on the 1st of each month.\n";
