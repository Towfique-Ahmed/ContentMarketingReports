<?php

namespace App\Core;

use RuntimeException;

/**
 * Config-driven manual entry + CSV import for every dataset.
 *
 * Each dataset definition drives three things:
 *   - the "add row" form on the Data Manager page
 *   - the downloadable CSV template (headers = field names + aliases accepted)
 *   - the CSV importer (tolerant of "1,234", "45.0%", "–" and blank rows)
 *
 * Two special matrix importers understand the wide spreadsheet exports the
 * team already uses (rows × month'YY columns): 'gsc_monthly' and
 * 'ga_channels_monthly'. Monthly figures are stored on the first day of the
 * month, so the monthly/yearly rollups aggregate them correctly.
 */
class DataSets
{
    public static function all(): array
    {
        return [
            'ga_daily' => [
                'label'  => 'Google Analytics — site totals',
                'table'  => 'ga_daily',
                'unique' => ['date'],
                'help'   => 'One row per day (or per month — use the 1st of the month).',
                'fields' => [
                    'date'            => ['type' => 'date',  'required' => true],
                    'sessions'        => ['type' => 'int'],
                    'users'           => ['type' => 'int'],
                    'new_users'       => ['type' => 'int'],
                    'pageviews'       => ['type' => 'int', 'aliases' => ['views', 'page_views']],
                    'engagement_rate' => ['type' => 'float', 'label' => 'Engagement rate %'],
                    'avg_duration'    => ['type' => 'float', 'label' => 'Avg duration (sec)'],
                    'conversions'     => ['type' => 'int', 'aliases' => ['key_events', 'leads']],
                    'bounce_rate'     => ['type' => 'float', 'label' => 'Bounce rate %'],
                ],
            ],
            'ga_channels' => [
                'label'  => 'Google Analytics — channel breakdown',
                'table'  => 'ga_channels',
                'unique' => ['date', 'channel'],
                'help'   => 'Sessions/users per acquisition channel per day or month. Long-format GA4 exports (Month, Channel, Total users, …) import directly; "Total" rows are skipped.',
                'fields' => [
                    'date'        => ['type' => 'date', 'required' => true, 'aliases' => ['month']],
                    'channel'     => ['type' => 'text', 'required' => true],
                    'sessions'    => ['type' => 'int'],
                    'users'       => ['type' => 'int', 'aliases' => ['total_users']],
                    'new_users'   => ['type' => 'int'],
                    'conversions' => ['type' => 'int', 'aliases' => ['key_events']],
                    // Site-level metrics carried on the "Total" row only: recognized
                    // on import and routed to ga_daily, but never written to the
                    // channel table and hidden from the channel form/template.
                    'engagement_rate' => ['type' => 'float', 'totals_only' => true,
                                          'aliases' => ['engagement_rate']],
                    'avg_duration'    => ['type' => 'float', 'totals_only' => true,
                                          'aliases' => ['avg_session_duration', 'avg_time_session', 'avg_duration_sec']],
                    'bounce_rate'     => ['type' => 'float', 'totals_only' => true,
                                          'aliases' => ['bounce_rate']],
                ],
                'row_filter' => 'channel_not_total',
                // "Total"/"TOTAL" rollup rows in a long-format GA export are
                // routed to the site-totals table instead of being dropped, so
                // one channel export fills both the channel breakdown and the
                // top-line Analytics numbers in a single upload.
                'totals' => [
                    'table'   => 'ga_daily',
                    'columns' => ['sessions', 'users', 'new_users', 'conversions',
                                  'engagement_rate', 'avg_duration', 'bounce_rate'],
                ],
            ],
            'gsc_daily' => [
                'label'  => 'Google Search Console — totals',
                'table'  => 'gsc_daily',
                'unique' => ['date'],
                'help'   => 'Clicks / impressions / CTR / position per day or month.',
                'fields' => [
                    'date'        => ['type' => 'date', 'required' => true],
                    'clicks'      => ['type' => 'int'],
                    'impressions' => ['type' => 'int'],
                    'ctr'         => ['type' => 'float', 'label' => 'CTR %'],
                    'position'    => ['type' => 'float', 'aliases' => ['avg_position', 'avgposition']],
                ],
            ],
            'content_items' => [
                'label'  => 'Content — items (blog, docs, landing, case studies)',
                'table'  => 'content_items',
                'unique' => ['type', 'url'],
                'help'   => 'The content inventory. Metrics attach to items by URL.',
                'fields' => [
                    'type'         => ['type' => 'select', 'required' => true,
                                       'options' => ['blog', 'documentation', 'landing_page', 'case_study']],
                    'title'        => ['type' => 'text', 'required' => true, 'aliases' => ['topic']],
                    'url'          => ['type' => 'text', 'required' => true, 'aliases' => ['links', 'link']],
                    'author'       => ['type' => 'text'],
                    'published_at' => ['type' => 'date', 'aliases' => ['publish_date', 'date']],
                    'funnel_stage' => ['type' => 'select', 'options' => ['TOFU', 'MOFU', 'BOFU'],
                                       'aliases' => ['funnel']],
                    'reviewer'     => ['type' => 'text'],
                    'publisher'    => ['type' => 'text'],
                    'target_keyword'   => ['type' => 'text'],
                    'keyword_position' => ['type' => 'text', 'label' => 'Keyword position',
                                           'aliases' => ['primary_keyword_position', 'position']],
                    'search_volume'    => ['type' => 'int',
                                           'aliases' => ['search_volume_combined_us_uk_au_ca']],
                    'ai_presence'  => ['type' => 'text', 'label' => 'AI presence',
                                       'aliases' => ['ai_presence_rank_screenshot']],
                    'views'        => ['type' => 'int', 'label' => 'Total views', 'aliases' => ['blog_views']],
                ],
            ],
            'content_metrics' => [
                'label'  => 'Content — performance metrics',
                'table'  => 'content_metrics',
                'unique' => ['content_id', 'date'],
                'help'   => 'Reference the content item by its URL.',
                'fields' => [
                    'content_id'  => ['type' => 'lookup', 'required' => true, 'label' => 'Content (by URL)',
                                      'lookup' => ['content_items', 'url', 'id'],
                                      'aliases' => ['url', 'content_url', 'content']],
                    'date'        => ['type' => 'date', 'required' => true],
                    'pageviews'   => ['type' => 'int', 'aliases' => ['views', 'page_views']],
                    'visitors'    => ['type' => 'int', 'aliases' => ['users']],
                    'avg_time'    => ['type' => 'float', 'label' => 'Avg time (sec)'],
                    'bounce_rate' => ['type' => 'float', 'label' => 'Bounce rate %'],
                    'conversions' => ['type' => 'int', 'aliases' => ['leads']],
                ],
            ],
            'social_daily' => [
                'label'  => 'Social — account metrics',
                'table'  => 'social_daily',
                'unique' => ['date', 'platform'],
                'help'   => 'Follower and engagement snapshots per platform per day or month.',
                'fields' => [
                    'date'        => ['type' => 'date', 'required' => true],
                    'platform'    => ['type' => 'select', 'required' => true,
                                      'options' => ['facebook', 'linkedin', 'twitter', 'youtube']],
                    'followers'   => ['type' => 'int', 'aliases' => ['subscribers']],
                    'impressions' => ['type' => 'int'],
                    'engagements' => ['type' => 'int'],
                    'clicks'      => ['type' => 'int'],
                    'posts'       => ['type' => 'int'],
                    'video_views' => ['type' => 'int'],
                ],
            ],
            'social_posts' => [
                'label'  => 'Social — individual posts',
                'table'  => 'social_posts',
                'unique' => ['platform', 'url'],
                'fields' => [
                    'platform'    => ['type' => 'select', 'required' => true,
                                      'options' => ['facebook', 'linkedin', 'twitter', 'youtube']],
                    'posted_at'   => ['type' => 'date', 'required' => true, 'aliases' => ['date']],
                    'title'       => ['type' => 'text', 'required' => true, 'aliases' => ['post', 'text']],
                    'url'         => ['type' => 'text', 'required' => true, 'aliases' => ['link']],
                    'impressions' => ['type' => 'int'],
                    'engagements' => ['type' => 'int'],
                    'clicks'      => ['type' => 'int'],
                    'video_views' => ['type' => 'int', 'aliases' => ['views']],
                ],
            ],
            'campaigns' => [
                'label'  => 'Campaigns — definitions',
                'table'  => 'campaigns',
                'unique' => ['name', 'channel'],
                'fields' => [
                    'name'       => ['type' => 'text', 'required' => true, 'aliases' => ['campaign']],
                    'channel'    => ['type' => 'text', 'required' => true],
                    'status'     => ['type' => 'select', 'options' => ['planned', 'active', 'paused', 'completed']],
                    'start_date' => ['type' => 'date'],
                    'end_date'   => ['type' => 'date'],
                    'budget'     => ['type' => 'float'],
                ],
            ],
            'campaign_metrics' => [
                'label'  => 'Campaigns — daily metrics',
                'table'  => 'campaign_metrics',
                'unique' => ['campaign_id', 'date'],
                'help'   => 'Reference the campaign by its exact name.',
                'fields' => [
                    'campaign_id' => ['type' => 'lookup', 'required' => true, 'label' => 'Campaign (by name)',
                                      'lookup' => ['campaigns', 'name', 'id'],
                                      'aliases' => ['campaign', 'campaign_name', 'name']],
                    'date'        => ['type' => 'date', 'required' => true],
                    'impressions' => ['type' => 'int'],
                    'clicks'      => ['type' => 'int'],
                    'conversions' => ['type' => 'int', 'aliases' => ['leads']],
                    'cost'        => ['type' => 'float', 'aliases' => ['spend']],
                    'revenue'     => ['type' => 'float'],
                ],
            ],
            'keywords' => [
                'label'  => 'Keywords — tracked list',
                'table'  => 'keywords',
                'unique' => ['keyword'],
                'fields' => [
                    'keyword'       => ['type' => 'text', 'required' => true],
                    'target_url'    => ['type' => 'text', 'aliases' => ['url', 'page']],
                    'search_volume' => ['type' => 'int', 'aliases' => ['volume']],
                    'difficulty'    => ['type' => 'int', 'aliases' => ['kd']],
                ],
            ],
            'keyword_rankings' => [
                'label'  => 'Keywords — ranking history',
                'table'  => 'keyword_rankings',
                'unique' => ['keyword_id', 'date'],
                'help'   => 'Reference the keyword by its exact text.',
                'fields' => [
                    'keyword_id'  => ['type' => 'lookup', 'required' => true, 'label' => 'Keyword',
                                      'lookup' => ['keywords', 'keyword', 'id'],
                                      'aliases' => ['keyword', 'query']],
                    'date'        => ['type' => 'date', 'required' => true],
                    'position'    => ['type' => 'float', 'aliases' => ['rank', 'avg_position']],
                    'clicks'      => ['type' => 'int'],
                    'impressions' => ['type' => 'int'],
                    'ctr'         => ['type' => 'float', 'label' => 'CTR %'],
                ],
            ],
            'email_campaigns' => [
                'label'  => 'Email marketing — campaign sends',
                'table'  => 'email_campaigns',
                'unique' => ['date', 'name'],
                'help'   => 'Matches the "Email Marketing Performance" sheet export — Date, Campaign, Type, Sent, Delivered, Opens, Clicks, Unsubscribes. Open/click rates are computed automatically.',
                'fields' => [
                    'date'         => ['type' => 'date', 'required' => true],
                    'name'         => ['type' => 'text', 'required' => true, 'aliases' => ['campaign', 'email_title']],
                    'type'         => ['type' => 'text', 'aliases' => ['type_category', 'category']],
                    'sent'         => ['type' => 'int', 'aliases' => ['audience_sent_to', 'audience']],
                    'delivered'    => ['type' => 'int'],
                    'opens'        => ['type' => 'int'],
                    'clicks'       => ['type' => 'int'],
                    'unsubscribes' => ['type' => 'int', 'aliases' => ['unsubs', 'unsubscribed']],
                    'list_name'    => ['type' => 'text', 'label' => 'List', 'aliases' => ['which_list', 'list']],
                    'segment'      => ['type' => 'text', 'aliases' => ['segmentation']],
                    'subject'      => ['type' => 'text', 'label' => 'Subject line',
                                       'aliases' => ['winning_subject_line', 'subject_line']],
                    'author'       => ['type' => 'text'],
                    'notes'        => ['type' => 'text'],
                ],
            ],
            // ---- Wide "months as columns" spreadsheet formats ----
            'gsc_monthly' => [
                'label'  => 'Search Console — monthly matrix (sheet export)',
                'matrix' => 'gsc',
                'help'   => "For sheets where rows are the metrics (Clicks, Impressions, CTR, Avg. position) and columns are months (Jan'25, Feb'25, …). Any other rows in the file are ignored, so you can upload the whole traffic report export.",
            ],
            'ga_channels_monthly' => [
                'label'  => 'GA channels — monthly matrix (sheet export)',
                'matrix' => 'channels',
                'help'   => "For sheets where rows are channels (Organic Search, Direct, …) and columns are months (Jan'25, Feb'25, …). Choose whether the numbers are sessions or users. Upload only the relevant section of the sheet — the Total row is skipped automatically.",
            ],
        ];
    }

    public static function get(string $key): ?array
    {
        return self::all()[$key] ?? null;
    }

    /* ------------------------------------------------------------------ */
    /* Value cleaning                                                      */
    /* ------------------------------------------------------------------ */

    /** "1,234" → 1234, "45.0%" → 45.0, "–"/"" → null */
    public static function cleanNumber(?string $v): ?float
    {
        $v = trim((string) $v);
        $v = str_replace([',', '%', ' '], '', $v);
        if ($v === '' || $v === '–' || $v === '—' || $v === '-' || strtoupper($v) === '#N/A') {
            return null;
        }
        return is_numeric($v) ? (float) $v : null;
    }

    /** Accepts Y-m-d, d/m/Y, "Jan'25", "Jan 2025", "2025-01" → Y-m-d (months → 1st). */
    public static function cleanDate(?string $v): ?string
    {
        $v = trim(trim((string) $v), "*† \t");
        if ($v === '') {
            return null;
        }
        if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $v)) {
            return $v;
        }
        if (preg_match('/^(\d{4})-(\d{2})$/', $v, $m)) {
            return "$m[1]-$m[2]-01";
        }
        if (preg_match("/^([A-Za-z]{3,9})\\s*['’]?\\s*(\\d{2,4})$/u", $v, $m)) {
            $year  = strlen($m[2]) === 2 ? '20' . $m[2] : $m[2];
            $month = date_parse($m[1] . ' 1 ' . $year);
            if ($month['month']) {
                return sprintf('%s-%02d-01', $year, $month['month']);
            }
        }
        $ts = strtotime($v);
        return $ts ? date('Y-m-d', $ts) : null;
    }

    private static function normalizeHeader(string $h): string
    {
        return trim(preg_replace('/[^a-z0-9]+/', '_', strtolower(trim($h))), '_');
    }

    private static function castValue(array $spec, ?string $raw): mixed
    {
        return match ($spec['type']) {
            'date'  => self::cleanDate($raw),
            'int'   => ($n = self::cleanNumber($raw)) === null ? 0 : (int) round($n),
            'float' => ($n = self::cleanNumber($raw)) === null ? 0.0 : $n,
            default => trim((string) $raw) ?: null,
        };
    }

    /* ------------------------------------------------------------------ */
    /* Row upsert (used by the manual form and the CSV importer)           */
    /* ------------------------------------------------------------------ */

    /** @param array<string, string|null> $input keyed by field name (lookup fields take the match value) */
    public static function upsertRow(string $setKey, array $input): void
    {
        $set = self::get($setKey);
        if (!$set || isset($set['matrix'])) {
            throw new RuntimeException("Unknown dataset: $setKey");
        }

        $row = [];
        foreach ($set['fields'] as $name => $spec) {
            // Totals-only fields never belong to this table's own row (they are
            // routed to the site-totals table for "Total" rows instead).
            if ($spec['totals_only'] ?? false) {
                continue;
            }
            // Only write fields the caller actually provided — a CSV without a
            // "users" column must not zero out users stored by another import.
            if (!array_key_exists($name, $input) && !($spec['required'] ?? false)) {
                continue;
            }
            $raw = $input[$name] ?? null;
            if ($spec['type'] === 'lookup') {
                [$table, $matchCol, $idCol] = $spec['lookup'];
                $needle = trim((string) $raw);
                if ($needle === '') {
                    throw new RuntimeException("Missing value for {$name}");
                }
                // Accept either the raw id (form select) or the natural key (CSV)
                if (ctype_digit($needle) && DB::value("SELECT COUNT(*) FROM {$table} WHERE {$idCol} = ?", [$needle])) {
                    $row[$name] = (int) $needle;
                } else {
                    $id = DB::value(
                        "SELECT {$idCol} FROM {$table} WHERE LOWER({$matchCol}) = LOWER(?)
                         OR {$matchCol} LIKE ? ORDER BY LENGTH({$matchCol}) LIMIT 1",
                        [$needle, '%' . $needle]
                    );
                    if (!$id) {
                        throw new RuntimeException("No match in {$table} for \"{$needle}\"");
                    }
                    $row[$name] = (int) $id;
                }
                continue;
            }
            $value = self::castValue($spec, $raw);
            if (($spec['required'] ?? false) && ($value === null || $value === '')) {
                throw new RuntimeException("Missing required field: {$name}");
            }
            if ($spec['type'] === 'select' && $value !== null && !in_array($value, $spec['options'], true)) {
                throw new RuntimeException("Invalid value \"{$value}\" for {$name} (allowed: " . implode(', ', $spec['options']) . ')');
            }
            $row[$name] = $value;
        }

        $cols    = array_keys($row);
        $unique  = $set['unique'];
        $updates = array_diff($cols, $unique);
        $sql = sprintf(
            'INSERT INTO %s (%s) VALUES (%s) ON CONFLICT(%s) DO UPDATE SET %s',
            $set['table'],
            implode(', ', $cols),
            implode(', ', array_map(fn ($c) => ":$c", $cols)),
            implode(', ', $unique),
            implode(', ', array_map(fn ($c) => "$c = excluded.$c", $updates ?: $unique))
        );
        DB::run($sql, array_combine(array_map(fn ($c) => ":$c", $cols), array_values($row)));
    }

    /* ------------------------------------------------------------------ */
    /* CSV import                                                          */
    /* ------------------------------------------------------------------ */

    /** @return array{ok: int, skipped: int, errors: string[]} */
    public static function importCsv(string $setKey, string $filePath, array $options = []): array
    {
        $set = self::get($setKey);
        if (!$set) {
            throw new RuntimeException("Unknown dataset: $setKey");
        }
        if (isset($set['matrix'])) {
            return $set['matrix'] === 'gsc'
                ? self::importGscMatrix($filePath)
                : self::importChannelMatrix($filePath, $options['measure'] ?? 'sessions');
        }

        $fh = fopen($filePath, 'r');
        if (!$fh) {
            throw new RuntimeException('Could not open the uploaded file.');
        }

        // Alias map: normalized header → field name
        $aliasMap = [];
        foreach ($set['fields'] as $name => $spec) {
            $aliasMap[self::normalizeHeader($name)] = $name;
            $aliasMap[self::normalizeHeader($spec['label'] ?? $name)] = $name;
            foreach ($spec['aliases'] ?? [] as $alias) {
                $aliasMap[self::normalizeHeader($alias)] = $name;
            }
        }

        // Find the header row (skips leading title rows in sheet exports).
        // First match wins per field, so "Sessions %" can't clobber "Sessions".
        $columns = null;
        while (($cells = fgetcsv($fh, null, ",", "\"", "")) !== false) {
            $mapped = [];
            foreach ($cells as $i => $h) {
                $key = self::normalizeHeader((string) $h);
                if (isset($aliasMap[$key]) && !in_array($aliasMap[$key], $mapped, true)) {
                    $mapped[$i] = $aliasMap[$key];
                }
            }
            if (count($mapped) >= 2) {
                $columns = $mapped;
                break;
            }
        }
        if ($columns === null) {
            fclose($fh);
            throw new RuntimeException('Could not find a header row matching this dataset. Download the template for the expected columns.');
        }

        $ok = 0;
        $skipped = 0;
        $errors = [];
        $line = 1;
        $defaults = (array) ($options['defaults'] ?? []);
        while (($cells = fgetcsv($fh, null, ",", "\"", "")) !== false) {
            $line++;
            $input = [];
            foreach ($columns as $i => $field) {
                $input[$field] = $cells[$i] ?? null;
            }
            // Skip fully empty rows (sheet exports pad with hundreds of them)
            if (implode('', array_map(fn ($v) => trim((string) $v), $input)) === '') {
                $skipped++;
                continue;
            }
            // Fill columns absent from the file (e.g. content type chosen at upload)
            foreach ($defaults as $field => $value) {
                if (!isset($input[$field]) || trim((string) $input[$field]) === '') {
                    $input[$field] = $value;
                }
            }
            // Dataset-specific row filters (e.g. GA "Total" rollup rows): route
            // them to the site-totals table when configured, otherwise skip.
            if (($set['row_filter'] ?? '') === 'channel_not_total'
                && strcasecmp(trim((string) ($input['channel'] ?? '')), 'total') === 0) {
                if (!empty($set['totals']) && self::upsertTotals($set['totals'], $input)) {
                    $ok++;
                } else {
                    $skipped++;
                }
                continue;
            }
            try {
                self::upsertRow($setKey, $input);
                $ok++;
            } catch (RuntimeException $e) {
                $skipped++;
                if (count($errors) < 5) {
                    $errors[] = "Row $line: " . $e->getMessage();
                }
            }
        }
        fclose($fh);
        return ['ok' => $ok, 'skipped' => $skipped, 'errors' => $errors];
    }

    /**
     * Write a long-format "Total" rollup row to a site-totals table (keyed by
     * date). Only columns actually present in the row are written, so it never
     * zeroes metrics an earlier import stored. Returns true when a row was set.
     *
     * @param array{table: string, columns: list<string>} $cfg
     * @param array<string, string|null>                   $input
     */
    private static function upsertTotals(array $cfg, array $input): bool
    {
        $date = self::cleanDate($input['date'] ?? null);
        if (!$date) {
            return false;
        }
        $vals = [];
        foreach ($cfg['columns'] as $col) {
            if (array_key_exists($col, $input)) {
                $n = self::cleanNumber($input[$col] ?? null);
                if ($n !== null) {
                    // Keep decimals for rate/duration columns; whole numbers land
                    // in INTEGER columns fine via SQLite's numeric affinity.
                    $vals[$col] = round($n, 2);
                }
            }
        }
        if (!$vals) {
            return false;
        }
        $cols   = array_merge(['date'], array_keys($vals));
        $params = [':date' => $date];
        foreach ($vals as $c => $v) {
            $params[":{$c}"] = $v;
        }
        DB::run(
            sprintf(
                'INSERT INTO %s (%s) VALUES (%s) ON CONFLICT(date) DO UPDATE SET %s',
                $cfg['table'],
                implode(', ', $cols),
                implode(', ', array_map(fn ($c) => ":{$c}", $cols)),
                implode(', ', array_map(fn ($c) => "{$c} = excluded.{$c}", array_keys($vals)))
            ),
            $params
        );
        return true;
    }

    /** CSV template with headers + one example row. */
    public static function template(string $setKey): string
    {
        $set = self::get($setKey);
        if (!$set || isset($set['matrix'])) {
            $example = $setKey === 'gsc_monthly'
                ? "Metric,Jan'25,Feb'25,Mar'25\nClicks,\"2,317\",\"2,626\",\"4,051\"\nImpressions,\"186,408\",\"204,914\",\"287,549\"\nCTR,1.24%,1.28%,1.41%\nAvg. position,30.2,29.6,31.4\n"
                : "Channel,Jan'25,Feb'25,Mar'25\nOrganic Search,\"5,730\",\"5,656\",\"6,891\"\nDirect,\"3,491\",\"3,560\",\"4,561\"\n";
            return $example;
        }
        $headers = [];
        $example = [];
        foreach ($set['fields'] as $name => $spec) {
            if ($spec['totals_only'] ?? false) {
                continue;
            }
            if ($spec['type'] === 'lookup') {
                [, $matchCol] = $spec['lookup'];
                $headers[] = $matchCol;
                $example[] = 'existing ' . $matchCol;
                continue;
            }
            $headers[] = $name;
            $example[] = match ($spec['type']) {
                'date'   => date('Y-m-d'),
                'int'    => '123',
                'float'  => '4.5',
                'select' => $spec['options'][0],
                default  => 'text',
            };
        }
        return implode(',', $headers) . "\n" . implode(',', $example) . "\n";
    }

    /* ------------------------------------------------------------------ */
    /* Matrix importers for the wide sheet exports                         */
    /* ------------------------------------------------------------------ */

    private static function isBlankRow(array $cells): bool
    {
        foreach ($cells as $c) {
            if (trim((string) $c) !== '') {
                return false;
            }
        }
        return true;
    }

    /** @return array<int, string> column index → Y-m-01, from a header row */
    public static function monthColumns(array $cells): array
    {
        $months = [];
        foreach ($cells as $i => $cell) {
            if ($i === 0) {
                continue;
            }
            $date = self::cleanDate((string) $cell);
            if ($date && preg_match('/-01$/', $date)) {
                $months[$i] = $date;
            }
        }
        return count($months) >= 2 ? $months : [];
    }

    private static function importGscMatrix(string $filePath): array
    {
        $metricMap = [
            'clicks' => 'clicks', 'impressions' => 'impressions',
            'ctr' => 'ctr', 'avg_position' => 'position', 'position' => 'position',
            'avg_pos' => 'position', 'average_position' => 'position',
        ];
        $fh = fopen($filePath, 'r');
        if (!$fh) {
            throw new RuntimeException('Could not open the uploaded file.');
        }
        $months = [];
        $data   = []; // date → [col => value]
        while (($cells = fgetcsv($fh, null, ",", "\"", "")) !== false) {
            if (self::isBlankRow($cells)) {
                $months = []; // section break — wait for the next month header
                continue;
            }
            if ($m = self::monthColumns($cells)) {
                $months = $m;
                continue;
            }
            if (!$months) {
                continue;
            }
            $label = $metricMap[self::normalizeHeader((string) ($cells[0] ?? ''))] ?? null;
            if (!$label) {
                continue;
            }
            foreach ($months as $i => $date) {
                $n = self::cleanNumber($cells[$i] ?? null);
                if ($n !== null) {
                    $data[$date][$label] = $n;
                }
            }
        }
        fclose($fh);
        if (!$data) {
            throw new RuntimeException('No Clicks/Impressions/CTR/Avg. position rows with month columns found.');
        }
        $ok = 0;
        foreach ($data as $date => $vals) {
            DB::run(
                'INSERT INTO gsc_daily (date, clicks, impressions, ctr, position)
                 VALUES (:d, :c, :i, :ctr, :p)
                 ON CONFLICT(date) DO UPDATE SET
                   clicks = excluded.clicks, impressions = excluded.impressions,
                   ctr = excluded.ctr, position = excluded.position',
                [':d' => $date, ':c' => (int) ($vals['clicks'] ?? 0), ':i' => (int) ($vals['impressions'] ?? 0),
                 ':ctr' => round($vals['ctr'] ?? 0, 2), ':p' => round($vals['position'] ?? 0, 1)]
            );
            $ok++;
        }
        return ['ok' => $ok, 'skipped' => 0, 'errors' => []];
    }

    private static function importChannelMatrix(string $filePath, string $measure): array
    {
        $col = in_array($measure, ['sessions', 'users', 'conversions'], true) ? $measure : 'sessions';
        $fh = fopen($filePath, 'r');
        if (!$fh) {
            throw new RuntimeException('Could not open the uploaded file.');
        }
        $months = [];
        $ok = 0;
        $skipped = 0;
        while (($cells = fgetcsv($fh, null, ",", "\"", "")) !== false) {
            if (self::isBlankRow($cells)) {
                $months = []; // section break — wait for the next month header
                continue;
            }
            if ($m = self::monthColumns($cells)) {
                $months = $m;
                continue;
            }
            if (!$months) {
                continue;
            }
            $channel = trim((string) ($cells[0] ?? ''));
            $norm = self::normalizeHeader($channel);
            // Skip totals, header echoes, and Search-Console metric rows that share
            // the same month-matrix layout elsewhere in a full sheet export.
            $notChannels = ['total', 'metric', 'channel', 'clicks', 'impressions', 'ctr',
                            'position', 'avg_position', 'average_position', 'total_users',
                            'new_users', 'returning_users'];
            if ($channel === '' || in_array($norm, $notChannels, true)) {
                $skipped++;
                continue;
            }
            $any = false;
            foreach ($months as $i => $date) {
                $n = self::cleanNumber($cells[$i] ?? null);
                if ($n === null) {
                    continue;
                }
                DB::run(
                    "INSERT INTO ga_channels (date, channel, {$col}) VALUES (:d, :ch, :v)
                     ON CONFLICT(date, channel) DO UPDATE SET {$col} = excluded.{$col}",
                    [':d' => $date, ':ch' => $channel, ':v' => (int) $n]
                );
                $any = true;
            }
            $any ? $ok++ : $skipped++;
        }
        fclose($fh);
        if (!$ok) {
            throw new RuntimeException('No channel rows with month columns found in the file.');
        }
        return ['ok' => $ok, 'skipped' => $skipped, 'errors' => []];
    }

    /* ------------------------------------------------------------------ */
    /* Recent rows + delete (for the Data Manager page)                    */
    /* ------------------------------------------------------------------ */

    public static function recentRows(string $setKey, int $limit = 15): array
    {
        $set = self::get($setKey);
        if (!$set || isset($set['matrix'])) {
            return [];
        }
        return DB::all("SELECT rowid AS _rowid, * FROM {$set['table']} ORDER BY rowid DESC LIMIT " . (int) $limit);
    }

    public static function deleteRow(string $setKey, int $rowid): void
    {
        $set = self::get($setKey);
        if ($set && !isset($set['matrix'])) {
            DB::run("DELETE FROM {$set['table']} WHERE rowid = :id", [':id' => $rowid]);
        }
    }

    /** Options for a lookup field's form select: [id => display]. */
    public static function lookupOptions(array $spec): array
    {
        [$table, $matchCol, $idCol] = $spec['lookup'];
        $out = [];
        foreach (DB::all("SELECT {$idCol} AS id, {$matchCol} AS label FROM {$table} ORDER BY {$matchCol} LIMIT 500") as $r) {
            $out[(int) $r['id']] = $r['label'];
        }
        return $out;
    }
}
