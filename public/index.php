<?php

/**
 * Content Marketing Reports — front controller.
 * Run locally with: php -S localhost:8000 -t public
 */

require dirname(__DIR__) . '/app/bootstrap.php';

use App\Core\DataSets;
use App\Core\DB;
use App\Core\Reports;
use App\Core\Settings;
use App\Services\SyncRunner;

DB::conn(); // boot the database (creates schema + demo data on first run)

$page = $_GET['page'] ?? 'dashboard';
[$start, $end, $prevStart, $prevEnd, $rangeLabel] = date_range();
$common = compact('start', 'end', 'prevStart', 'prevEnd', 'rangeLabel', 'page');

switch ($page) {
    case 'dashboard':
        render('dashboard', $common + [
            'title'       => 'Marketing Overview',
            'ga'          => Reports::gaTotals($start, $end),
            'gaPrev'      => Reports::gaTotals($prevStart, $prevEnd),
            'gsc'         => Reports::gscTotals($start, $end),
            'gscPrev'     => Reports::gscTotals($prevStart, $prevEnd),
            'gaSeries'    => Reports::gaSeries($start, $end),
            'gscSeries'   => Reports::gscSeries($start, $end),
            'channels'    => Reports::gaChannels($start, $end),
            'social'      => Reports::socialTotals($start, $end),
            'content'     => Reports::contentSummary($start, $end),
            'campaigns'   => array_slice(Reports::campaignTable($start, $end), 0, 5),
            'lastSync'    => Settings::get('last_sync_at'),
        ]);
        break;

    case 'content':
        $types = [
            'blog'          => 'Blog',
            'documentation' => 'Documentation',
            'landing_page'  => 'Landing Pages',
            'case_study'    => 'Case Studies',
        ];
        $type = isset($types[$_GET['type'] ?? '']) ? $_GET['type'] : 'blog';
        render('content', $common + [
            'title'  => $types[$type] . ' Report',
            'types'  => $types,
            'type'   => $type,
            'rows'   => Reports::contentTable($type, $start, $end),
            'series' => Reports::contentSeries($type, $start, $end),
        ]);
        break;

    case 'search-console':
        render('search_console', $common + [
            'title'   => 'Google Search Performance',
            'totals'  => Reports::gscTotals($start, $end),
            'prev'    => Reports::gscTotals($prevStart, $prevEnd),
            'series'  => Reports::gscSeries($start, $end),
            'queries' => Reports::gscTopQueries(),
            'pages'   => Reports::gscTopPages(),
        ]);
        break;

    case 'analytics':
        render('analytics', $common + [
            'title'    => 'Google Analytics (GA4)',
            'totals'   => Reports::gaTotals($start, $end),
            'prev'     => Reports::gaTotals($prevStart, $prevEnd),
            'series'   => Reports::gaSeries($start, $end),
            'channels' => Reports::gaChannels($start, $end),
            'pages'    => Reports::gaTopPages($start, $end),
        ]);
        break;

    case 'social':
        $platforms = ['facebook' => 'Facebook', 'linkedin' => 'LinkedIn', 'twitter' => 'X / Twitter', 'youtube' => 'YouTube'];
        $platform  = isset($platforms[$_GET['platform'] ?? '']) ? $_GET['platform'] : null;
        render('social', $common + [
            'title'     => $platform ? $platforms[$platform] . ' Report' : 'Social Media Overview',
            'platforms' => $platforms,
            'platform'  => $platform,
            'totals'    => Reports::socialTotals($start, $end),
            'prevTotals'=> Reports::socialTotals($prevStart, $prevEnd),
            'series'    => $platform ? Reports::socialSeries($platform, $start, $end) : [],
            'allSeries' => $platform ? [] : array_combine(
                array_keys($platforms),
                array_map(fn ($p) => Reports::socialSeries($p, $start, $end), array_keys($platforms))
            ),
            'posts'     => $platform ? Reports::socialPosts($platform) : [],
        ]);
        break;

    case 'campaigns':
        $rows = Reports::campaignTable($start, $end);
        $selected = null;
        $series = [];
        if (!empty($_GET['id'])) {
            foreach ($rows as $r) {
                if ($r['id'] == $_GET['id']) {
                    $selected = $r;
                    $series = Reports::campaignSeries((int) $r['id'], $start, $end);
                    break;
                }
            }
        }
        render('campaigns', $common + [
            'title'    => 'Campaign Reports',
            'rows'     => $rows,
            'selected' => $selected,
            'series'   => $series,
        ]);
        break;

    case 'keywords':
        $rows = Reports::keywordTable($start, $end);
        $selected = null;
        $series = [];
        if (!empty($_GET['id'])) {
            foreach ($rows as $r) {
                if ($r['id'] == $_GET['id']) {
                    $selected = $r;
                    $series = Reports::keywordSeries((int) $r['id'], $start, $end);
                    break;
                }
            }
        }
        render('keywords', $common + [
            'title'    => 'Keyword Performance',
            'rows'     => $rows,
            'selected' => $selected,
            'series'   => $series,
        ]);
        break;

    case 'email':
        render('email', $common + [
            'title'   => 'Email Marketing',
            'totals'  => Reports::emailTotals($start, $end),
            'prev'    => Reports::emailTotals($prevStart, $prevEnd),
            'monthly' => Reports::emailMonthly($start, $end),
            'rows'    => Reports::emailTable($start, $end),
        ]);
        break;

    case 'data':
        $sets   = DataSets::all();
        $setKey = isset($sets[$_GET['set'] ?? '']) ? $_GET['set'] : 'email_campaigns';
        $setDef = $sets[$setKey];

        if (!empty($_GET['template'])) {
            header('Content-Type: text/csv');
            header('Content-Disposition: attachment; filename="' . $setKey . '_template.csv"');
            echo DataSets::template($setKey);
            exit;
        }

        $flash = null;
        $importErrors = [];
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            try {
                switch ($_POST['action'] ?? '') {
                    case 'add':
                        DataSets::upsertRow($setKey, (array) ($_POST['f'] ?? []));
                        $flash = '✓ Entry saved.';
                        break;
                    case 'import':
                        if (empty($_FILES['csv']['tmp_name']) || $_FILES['csv']['error'] !== UPLOAD_ERR_OK) {
                            throw new RuntimeException('Upload failed — please choose a CSV file.');
                        }
                        $result = DataSets::importCsv($setKey, $_FILES['csv']['tmp_name'],
                                                      ['measure' => $_POST['measure'] ?? 'sessions']);
                        $flash = sprintf('✓ Import finished: %d rows imported/updated, %d skipped.',
                                         $result['ok'], $result['skipped']);
                        $importErrors = $result['errors'];
                        break;
                    case 'delete':
                        DataSets::deleteRow($setKey, (int) ($_POST['rowid'] ?? 0));
                        $flash = '✓ Row deleted.';
                        break;
                }
            } catch (RuntimeException $e) {
                $importErrors[] = $e->getMessage();
            }
        }

        render('data', $common + [
            'title'        => 'Data Manager',
            'sets'         => $sets,
            'setKey'       => $setKey,
            'set'          => $setDef,
            'flash'        => $flash,
            'importErrors' => $importErrors,
            'recent'       => DataSets::recentRows($setKey),
        ]);
        break;

    case 'reports':
        $years = Reports::availableYears();
        $year  = (int) ($_GET['year'] ?? $years[0]);
        render('reports', $common + [
            'title'   => 'Monthly & Yearly Reports',
            'years'   => $years,
            'year'    => $year,
            'monthly' => Reports::monthlyRollup($year),
            'yearly'  => Reports::yearlyRollup(),
        ]);
        break;

    case 'compare':
        $metrics = Reports::compareMetrics();
        $metric  = isset($metrics[$_GET['metric'] ?? '']) ? $_GET['metric'] : 'ga_sessions';
        $aStart  = $_GET['a_from'] ?? $start;
        $aEnd    = $_GET['a_to'] ?? $end;
        $bStart  = $_GET['b_from'] ?? $prevStart;
        $bEnd    = $_GET['b_to'] ?? $prevEnd;
        render('compare', $common + [
            'title'   => 'Compare Periods & Metrics',
            'metrics' => $metrics,
            'metric'  => $metric,
            'aStart'  => $aStart, 'aEnd' => $aEnd, 'bStart' => $bStart, 'bEnd' => $bEnd,
            'aSeries' => Reports::compareSeries($metric, $aStart, $aEnd),
            'bSeries' => Reports::compareSeries($metric, $bStart, $bEnd),
            'summary' => array_map(function ($key, $def) use ($aStart, $aEnd, $bStart, $bEnd) {
                return [
                    'key'   => $key,
                    'label' => $def[0],
                    'lower' => $def[3],
                    'a'     => Reports::compareValue($key, $aStart, $aEnd),
                    'b'     => Reports::compareValue($key, $bStart, $bEnd),
                ];
            }, array_keys($metrics), $metrics),
        ]);
        break;

    case 'settings':
        $saved = false;
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $fields = [
                'site_name', 'timezone', 'sync_time', 'cron_token',
                'google_service_account_json', 'gsc_site_url', 'ga4_property_id',
                'facebook_page_token', 'facebook_page_id',
                'linkedin_access_token', 'linkedin_org_urn',
                'twitter_bearer_token', 'twitter_user_id',
                'youtube_api_key', 'youtube_channel_id',
            ];
            foreach ($fields as $f) {
                if (array_key_exists($f, $_POST)) {
                    Settings::set($f, trim($_POST[$f]) ?: null);
                }
            }
            $saved = true;
        }
        render('settings', $common + [
            'title'   => 'Settings',
            'saved'   => $saved,
            'log'     => DB::all('SELECT * FROM sync_log ORDER BY id DESC LIMIT 30'),
        ]);
        break;

    case 'sync-now':
        $results = SyncRunner::runAll();
        render('sync_result', $common + ['title' => 'Manual Sync', 'results' => $results]);
        break;

    case 'cron':
        // Web cron fallback for shared hosting: /?page=cron&token=...
        header('Content-Type: application/json');
        $token = Settings::get('cron_token');
        if (!$token || !hash_equals($token, (string) ($_GET['token'] ?? ''))) {
            http_response_code(403);
            echo json_encode(['error' => 'invalid cron token']);
            exit;
        }
        echo json_encode(['ran' => SyncRunner::runIfDue() !== null ? 'yes' : 'not due yet']);
        exit;

    default:
        http_response_code(404);
        render('dashboard', $common + [
            'title' => 'Not found',
            'ga' => [], 'gaPrev' => [], 'gsc' => [], 'gscPrev' => [],
            'gaSeries' => [], 'gscSeries' => [], 'channels' => [], 'social' => [],
            'content' => [], 'campaigns' => [], 'lastSync' => null,
        ]);
}
