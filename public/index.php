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
    case 'analytics':
        // Old URLs redirect to the combined report
        header('Location: ' . url_with(['page' => 'search-performance']));
        exit;

    case 'search-performance':
        render('search_performance', $common + [
            'title'     => 'Search Performance Report',
            'gsc'       => Reports::gscTotals($start, $end),
            'gscPrev'   => Reports::gscTotals($prevStart, $prevEnd),
            'gscSeries' => Reports::gscSeries($start, $end),
            'queries'   => Reports::gscTopQueries(),
            'pages'     => Reports::gscTopPages(),
            'ga'        => Reports::gaTotals($start, $end),
            'gaPrev'    => Reports::gaTotals($prevStart, $prevEnd),
            'gaSeries'  => Reports::gaSeries($start, $end),
            'channels'  => Reports::gaChannels($start, $end),
            'gaPages'   => Reports::gaTopPages($start, $end),
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
                        $importOptions = ['measure' => $_POST['measure'] ?? 'sessions'];
                        if (!empty($_POST['default_type'])) {
                            $importOptions['defaults'] = ['type' => $_POST['default_type']];
                        }
                        $result = DataSets::importCsv($setKey, $_FILES['csv']['tmp_name'], $importOptions);
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

    case 'monthly':
        $months = Reports::monthsWithData();
        $month  = $_GET['month'] ?? null;
        if ($month !== null && !preg_match('/^\d{4}-\d{2}$/', $month)) {
            $month = null;
        }

        // --- Month-page controls: add note, delete note, delete a source's month data ---
        $flash = null;
        if ($_SERVER['REQUEST_METHOD'] === 'POST' && $month) {
            [$mStart, $mEnd] = Reports::monthBounds($month);
            switch ($_POST['action'] ?? '') {
                case 'add_note':
                    $note = trim((string) ($_POST['note'] ?? ''));
                    $cat  = in_array($_POST['category'] ?? '', ['highlight', 'release', 'content', 'social', 'email', 'other'], true)
                          ? $_POST['category'] : 'highlight';
                    if ($note !== '') {
                        DB::run('INSERT INTO monthly_notes (month, category, note) VALUES (:m, :c, :n)',
                                [':m' => $month, ':c' => $cat, ':n' => $note]);
                        $flash = '✓ Note added.';
                    }
                    break;
                case 'delete_month_source':
                    $sources = [
                        'analytics'      => ['ga_daily', 'ga_channels', 'ga_pages'],
                        'search_console' => ['gsc_daily', 'gsc_queries', 'gsc_pages'],
                        'social'         => ['social_daily'],
                        'email'          => ['email_campaigns'],
                        'campaigns'      => ['campaign_metrics'],
                        'content_metrics'=> ['content_metrics'],
                        'keywords'       => ['keyword_rankings'],
                    ];
                    $key = $_POST['source'] ?? '';
                    if (isset($sources[$key])) {
                        foreach ($sources[$key] as $table) {
                            DB::run("DELETE FROM {$table} WHERE date BETWEEN :s AND :e",
                                    [':s' => $mStart, ':e' => $mEnd]);
                        }
                        $flash = "✓ Deleted {$key} data for {$month}.";
                    }
                    break;
            }
            $months = Reports::monthsWithData(); // refresh after changes
        }

        // --- CSV export of one month's summary ---
        if ($month && !empty($_GET['export'])) {
            $summary = Reports::monthSummary($month);
            header('Content-Type: text/csv');
            header('Content-Disposition: attachment; filename="report-' . $month . '.csv"');
            $out = fopen('php://output', 'w');
            fputcsv($out, ['Metric', 'Value'], ',', '"', '');
            foreach ($summary as $k => $v) {
                fputcsv($out, [$k, $v], ',', '"', '');
            }
            foreach (Reports::monthNotes($month) as $n) {
                fputcsv($out, ['note (' . $n['category'] . ')', $n['note']], ',', '"', '');
            }
            fclose($out);
            exit;
        }

        if ($month) {
            [$mStart, $mEnd] = Reports::monthBounds($month);
            $prevMonth = date('Y-m', strtotime($mStart . ' -1 month'));
            $nextMonth = date('Y-m', strtotime($mStart . ' +1 month'));
            render('monthly', $common + [
                'title'      => date('F Y', strtotime($mStart)) . ' — Monthly Report',
                'months'     => $months,
                'month'      => $month,
                'prevMonth'  => in_array($prevMonth, $months, true) ? $prevMonth : null,
                'nextMonth'  => in_array($nextMonth, $months, true) ? $nextMonth : null,
                'summary'    => Reports::monthSummary($month),
                'prevSummary'=> Reports::monthSummary($prevMonth),
                'channels'   => Reports::gaChannels($mStart, $mEnd),
                'content'    => Reports::monthContent($month),
                'emails'     => Reports::emailTable($mStart, $mEnd),
                'social'     => Reports::socialTotals($mStart, $mEnd),
                'notes'      => Reports::monthNotes($month),
                'flash'      => $flash,
            ]);
        } else {
            render('monthly', $common + [
                'title'     => 'Monthly Reports',
                'months'    => $months,
                'month'     => null,
                'summaries' => array_map(fn ($m) => Reports::monthSummary($m), array_slice($months, 0, 24)),
                'flash'     => $flash,
            ]);
        }
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
        $flash = null;
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            if (($_POST['action'] ?? '') === 'clear_data') {
                // Wipe all report data (demo or otherwise); settings/credentials stay.
                foreach (['content_metrics', 'content_items', 'gsc_daily', 'gsc_queries', 'gsc_pages',
                          'ga_daily', 'ga_channels', 'ga_pages', 'social_daily', 'social_posts',
                          'campaign_metrics', 'campaigns', 'keyword_rankings', 'keywords',
                          'email_campaigns'] as $table) {
                    DB::run("DELETE FROM {$table}");
                }
                Settings::set('demo_mode', '0');
                $flash = '✓ All report data deleted. Every report now shows 0 until the API sync or your imports fill it with real data. Run a sync from the button below.';
            } else {
                $fields = [
                    'site_name', 'timezone', 'sync_time', 'cron_token', 'mcp_token',
                    'site_base_url', 'content_path_rules', 'wp_username', 'wp_app_password',
                    'content_exclude_blog', 'content_exclude_documentation',
                    'content_exclude_landing_page', 'content_exclude_case_study',
                    'brand_logo', 'brand_logo_url', 'accent_color',
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
                if (isset($_POST['nav_form'])) {
                    $visible = (array) ($_POST['nav_visible'] ?? []);
                    $allKeys = [];
                    foreach (nav_structure() as $items) {
                        $allKeys = array_merge($allKeys, array_keys($items));
                    }
                    $hidden = array_values(array_diff($allKeys, $visible, ['settings']));
                    Settings::set('nav_hidden', json_encode($hidden));
                }
                $saved = true;
            }
        }
        if (!Settings::get('mcp_token')) {
            Settings::set('mcp_token', bin2hex(random_bytes(16)));
        }
        render('settings', $common + [
            'title'   => 'Settings',
            'saved'   => $saved,
            'flash'   => $flash,
            'log'     => DB::all('SELECT * FROM sync_log ORDER BY id DESC LIMIT 30'),
        ]);
        break;

    case 'delete-row':
        $deletable = ['content_items', 'content_metrics', 'campaigns', 'campaign_metrics',
                      'keywords', 'keyword_rankings', 'social_posts', 'social_daily',
                      'email_campaigns', 'gsc_queries', 'gsc_pages', 'gsc_daily',
                      'ga_daily', 'ga_channels', 'ga_pages', 'monthly_notes'];
        if ($_SERVER['REQUEST_METHOD'] === 'POST' && in_array($_POST['table'] ?? '', $deletable, true)) {
            DB::run("DELETE FROM {$_POST['table']} WHERE rowid = :id", [':id' => (int) ($_POST['id'] ?? 0)]);
        }
        $back = (string) ($_POST['back'] ?? '');
        if (!str_starts_with($back, '?') && !preg_match('#^/(?!/)#', $back)) {
            $back = '?page=dashboard';
        }
        header('Location: ' . $back);
        exit;

    case 'sync-now':
        $results = SyncRunner::runAll();
        render('sync_result', $common + ['title' => 'Manual Sync', 'results' => $results]);
        break;

    case 'mcp':
        \App\Services\McpServer::handle();
        exit;

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
