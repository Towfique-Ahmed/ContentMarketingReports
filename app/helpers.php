<?php

/** HTML-escape */
function h(?string $s): string
{
    return htmlspecialchars((string) $s, ENT_QUOTES, 'UTF-8');
}

/** 12345678 → 12.3M, 4321 → 4.3K */
function fmt_num(float|int|null $n): string
{
    $n = (float) ($n ?? 0);
    if (abs($n) >= 1_000_000) return round($n / 1_000_000, 1) . 'M';
    if (abs($n) >= 10_000)    return round($n / 1_000, 1) . 'K';
    return number_format($n, $n == (int) $n ? 0 : 1);
}

function fmt_pct(float|int|null $n): string
{
    return number_format((float) ($n ?? 0), 1) . '%';
}

function fmt_money(float|int|null $n): string
{
    return '$' . number_format((float) ($n ?? 0), 0);
}

function fmt_duration(float|int|null $seconds): string
{
    $s = (int) ($seconds ?? 0);
    return sprintf('%dm %02ds', intdiv($s, 60), $s % 60);
}

/** % change between two values; null when previous is 0 */
function pct_change(float $current, float $previous): ?float
{
    if ($previous == 0.0) {
        return null;
    }
    return (($current - $previous) / abs($previous)) * 100;
}

/**
 * Delta badge HTML. $lowerIsBetter flips the good/bad coloring
 * (e.g. average position, bounce rate, cost).
 */
function delta_badge(float $current, float $previous, bool $lowerIsBetter = false): string
{
    $change = pct_change($current, $previous);
    if ($change === null) {
        return '<span class="delta delta-flat">—</span>';
    }
    $up   = $change >= 0;
    $good = $lowerIsBetter ? !$up : $up;
    $cls  = abs($change) < 0.05 ? 'delta-flat' : ($good ? 'delta-good' : 'delta-bad');
    $arrow = abs($change) < 0.05 ? '·' : ($up ? '▲' : '▼');
    return '<span class="delta ' . $cls . '">' . $arrow . ' ' . number_format(abs($change), 1) . '%</span>';
}

/**
 * Resolve the selected date range from ?range= / ?from= / ?to=.
 * Returns [start, end, previousStart, previousEnd, label].
 */
/**
 * Resolve the selected date range.
 *
 * The window's END is anchored to the latest data point (not today's
 * calendar date), so whatever you add or import most recently is always
 * inside the default view — data never "disappears" behind an empty
 * trailing window when the data is monthly or lags real time.
 *
 * Returns [start, end, previousStart, previousEnd, label].
 */
function date_range(): array
{
    // Default to "All time" so every page shows all data out of the box.
    $range  = $_GET['range'] ?? 'all';
    $latest = \App\Core\Reports::latestDataDate();
    $anchor = $latest ?: date('Y-m-d', strtotime('-1 day'));

    if ($range === 'custom' && !empty($_GET['from']) && !empty($_GET['to'])) {
        $start = $_GET['from'];
        $end   = $_GET['to'];
        $label = "$start → $end";
    } elseif ($range === 'all') {
        $earliest = \App\Core\Reports::earliestDataDate();
        $start = $earliest ?: date('Y-m-d', strtotime('-12 months'));
        $end   = $anchor;
        $label = 'All time';
    } else {
        $days = match ($range) {
            '7d'  => 7,
            '30d' => 30,
            '90d' => 90,
            '12m' => 365,
            default => 90,
        };
        // End at the latest data; start counts back from there.
        $end   = $anchor;
        $start = date('Y-m-d', strtotime("$end -" . ($days - 1) . ' days'));
        $label = match ($range) {
            '7d' => 'Last 7 days', '30d' => 'Last 30 days',
            '90d' => 'Last 90 days', '12m' => 'Last 12 months',
            default => 'Last 90 days',
        } . ' (to ' . $end . ')';
    }

    $span      = max(1, (strtotime($end) - strtotime($start)) / 86400 + 1);
    $prevEnd   = date('Y-m-d', strtotime($start . ' -1 day'));
    $prevStart = date('Y-m-d', strtotime($prevEnd . ' -' . ($span - 1) . ' days'));

    return [$start, $end, $prevStart, $prevEnd, $label];
}

/** Render a view inside the shared layout. */
function render(string $view, array $data = []): void
{
    extract($data);
    ob_start();
    require BASE_PATH . '/views/' . $view . '.php';
    $content = ob_get_clean();
    require BASE_PATH . '/views/layout.php';
}

/** JSON payload for a chart, safely embedded in a data attribute. */
function chart_json(array $data): string
{
    return h(json_encode($data));
}

/**
 * Canonical sidebar structure: section label => [key => [label, url, page, subKey]].
 * Keys are stable identifiers used by the show/hide preferences in Settings.
 */
function nav_structure(): array
{
    // key => [label, url, page, subKey]
    return [
        '' => [
            'overview' => ['Overview', '?page=dashboard', 'dashboard', null],
        ],
        'Content' => [
            'blog'          => ['Blog', '?page=content&type=blog', 'content', 'blog'],
            'documentation' => ['Documentation', '?page=content&type=documentation', 'content', 'documentation'],
            'landing_pages' => ['Landing Pages', '?page=content&type=landing_page', 'content', 'landing_page'],
            'case_studies'  => ['Case Studies', '?page=content&type=case_study', 'content', 'case_study'],
        ],
        'Acquisition' => [
            'search_performance' => ['Search Performance', '?page=search-performance', 'search-performance', null],
            'keywords'           => ['Keywords', '?page=keywords', 'keywords', null],
            'email'              => ['Email Marketing', '?page=email', 'email', null],
        ],
        'Social Media' => [
            'social_all'      => ['All Platforms', '?page=social', 'social', ''],
            'social_facebook' => ['Facebook', '?page=social&platform=facebook', 'social', 'facebook'],
            'social_linkedin' => ['LinkedIn', '?page=social&platform=linkedin', 'social', 'linkedin'],
            'social_twitter'  => ['X / Twitter', '?page=social&platform=twitter', 'social', 'twitter'],
            'social_youtube'  => ['YouTube', '?page=social&platform=youtube', 'social', 'youtube'],
        ],
        'Reporting' => [
            'monthly'   => ['Monthly Reports', '?page=monthly', 'monthly', null],
            'reports'   => ['Yearly Report', '?page=reports', 'reports', null],
            'campaigns' => ['Campaigns', '?page=campaigns', 'campaigns', null],
            'compare'   => ['Compare', '?page=compare', 'compare', null],
            'data'      => ['Data Manager', '?page=data', 'data', null],
            'settings'  => ['Settings & Sync', '?page=settings', 'settings', null],
        ],
    ];
}

/** Nav item keys hidden via Settings ('settings' can never be hidden). */
function nav_hidden(): array
{
    $hidden = json_decode((string) \App\Core\Settings::get('nav_hidden', '[]'), true);
    return is_array($hidden) ? array_values(array_diff($hidden, ['settings'])) : [];
}

/**
 * Inline ✕ delete button for a table row. Posts to the central delete-row
 * endpoint and returns to the current page. Deleting a parent (content item,
 * campaign, keyword) also removes its metrics via ON DELETE CASCADE.
 */
function delete_button(string $table, int $id): string
{
    $back = h($_SERVER['REQUEST_URI'] ?? '?page=dashboard');
    return '<form method="post" action="?page=delete-row" class="inline-del"'
        . ' onsubmit="return confirm(\'Delete this row? This cannot be undone.\')">'
        . '<input type="hidden" name="table" value="' . h($table) . '">'
        . '<input type="hidden" name="id" value="' . $id . '">'
        . '<input type="hidden" name="back" value="' . $back . '">'
        . '<button type="submit" title="Delete" aria-label="Delete">✕</button></form>';
}

/** Preserve current query string while overriding some params. */
function url_with(array $overrides): string
{
    $params = array_merge($_GET, $overrides);
    return '?' . http_build_query(array_filter($params, fn ($v) => $v !== null && $v !== ''));
}

/* ------------------------------------------------------------------ */
/* Pagination + sorting (server-side, no JavaScript required)          */
/* ------------------------------------------------------------------ */

/** Allowed page sizes offered in the rows-per-page selector. */
const PAGE_SIZES = [20, 25, 50, 100, 150, 200];

/** Namespaced query-param name so several tables can paginate on one page. */
function pkey(string $base, string $ns = ''): string
{
    return $ns === '' ? $base : $base . '_' . $ns;
}

/**
 * Sort and paginate an already-fetched result set in PHP.
 *
 * Reads pg / pp / sort / dir from $_GET (namespaced with $ns, e.g. pg_posts)
 * so multiple independent tables can live on one page. Sorting is column-safe
 * because it only ever orders by a key that exists in the row.
 *
 * @param array<int, array<string, mixed>> $rows        full result set
 * @param list<string>                      $sortable    columns the user may sort by
 * @param string                            $defaultSort initial sort column ('' = keep input order)
 * @param string                            $defaultDir  'asc' or 'desc'
 * @return array{rows: array, state: array<string, mixed>}
 */
function paginate_rows(array $rows, array $sortable = [], string $defaultSort = '', string $defaultDir = 'desc', string $ns = ''): array
{
    $sort = (string) ($_GET[pkey('sort', $ns)] ?? $defaultSort);
    if ($sort !== '' && !in_array($sort, $sortable, true)) {
        $sort = $defaultSort;
    }
    $dir = strtolower((string) ($_GET[pkey('dir', $ns)] ?? $defaultDir)) === 'asc' ? 'asc' : 'desc';

    if ($sort !== '') {
        // Numeric when every present value in the column is numeric.
        $numeric = true;
        foreach ($rows as $r) {
            $v = $r[$sort] ?? null;
            if ($v !== null && $v !== '' && !is_numeric($v)) {
                $numeric = false;
                break;
            }
        }
        usort($rows, function ($a, $b) use ($sort, $numeric) {
            $x = $a[$sort] ?? null;
            $y = $b[$sort] ?? null;
            if ($numeric) {
                return ((float) $x) <=> ((float) $y);
            }
            return strcasecmp((string) $x, (string) $y);
        });
        if ($dir === 'desc') {
            $rows = array_reverse($rows);
        }
    }

    $total   = count($rows);
    $perPage = (int) ($_GET[pkey('pp', $ns)] ?? PAGE_SIZES[0]);
    if (!in_array($perPage, PAGE_SIZES, true)) {
        $perPage = PAGE_SIZES[0];
    }
    $pages = max(1, (int) ceil($total / $perPage));
    $page  = max(1, min($pages, (int) ($_GET[pkey('pg', $ns)] ?? 1)));
    $offset = ($page - 1) * $perPage;

    return [
        'rows'  => array_slice($rows, $offset, $perPage),
        'state' => [
            'ns' => $ns, 'total' => $total, 'per_page' => $perPage,
            'page' => $page, 'pages' => $pages, 'offset' => $offset,
            'sort' => $sort, 'dir' => $dir, 'sortable' => $sortable,
        ],
    ];
}

/**
 * A sortable table header cell. Falls back to a plain <th> when the column
 * isn't in the sortable allow-list. Clicking toggles asc/desc and resets to
 * page 1. $align adds a class (e.g. 'num') for right-aligned numeric columns.
 */
function sortable_th(string $col, string $label, array $state, string $align = ''): string
{
    $ns   = $state['ns'] ?? '';
    $cls  = $align ? ' class="' . h($align) . '"' : '';
    if (!in_array($col, $state['sortable'] ?? [], true)) {
        return '<th' . $cls . '>' . h($label) . '</th>';
    }
    $active = ($state['sort'] ?? '') === $col;
    $nextDir = ($active && ($state['dir'] ?? '') === 'asc') ? 'desc' : 'asc';
    $arrow = $active ? ($state['dir'] === 'asc' ? ' ▲' : ' ▼') : '';
    $href = url_with([
        pkey('sort', $ns) => $col,
        pkey('dir', $ns)  => $nextDir,
        pkey('pg', $ns)   => null,
    ]);
    return '<th' . $cls . '><a class="sort-link' . ($active ? ' active' : '') . '" href="'
        . h($href) . '">' . h($label) . $arrow . '</a></th>';
}

/**
 * Render the pagination bar: "showing X–Y of Z", a rows-per-page selector,
 * and Prev / page-number / Next links. No-ops when there's nothing to show.
 */
function pagination_bar(array $state): string
{
    $total = (int) ($state['total'] ?? 0);
    if ($total === 0) {
        return '';
    }
    $ns   = $state['ns'] ?? '';
    $page = (int) $state['page'];
    $pages = (int) $state['pages'];
    $per  = (int) $state['per_page'];
    $from = (int) $state['offset'] + 1;
    $to   = min($total, (int) $state['offset'] + $per);

    // Rows-per-page selector (auto-navigates on change).
    $opts = '';
    foreach (PAGE_SIZES as $size) {
        $url = url_with([pkey('pp', $ns) => $size, pkey('pg', $ns) => null]);
        $opts .= '<option value="' . h($url) . '"' . ($size === $per ? ' selected' : '') . '>' . $size . '</option>';
    }
    $selector = '<label class="pp-select">Rows: <select onchange="location.href=this.value">' . $opts . '</select></label>';

    // Page links: first, window around current, last.
    $links = '';
    if ($pages > 1) {
        $mk = function (int $p, string $text, bool $disabled = false, bool $active = false) use ($ns): string {
            if ($disabled) {
                return '<span class="pg-link disabled">' . h($text) . '</span>';
            }
            if ($active) {
                return '<span class="pg-link active">' . h($text) . '</span>';
            }
            return '<a class="pg-link" href="' . h(url_with([pkey('pg', $ns) => $p])) . '">' . h($text) . '</a>';
        };
        $links .= $mk($page - 1, '‹ Prev', $page <= 1);
        $window = 2;
        $start = max(1, $page - $window);
        $end   = min($pages, $page + $window);
        if ($start > 1) {
            $links .= $mk(1, '1');
            if ($start > 2) {
                $links .= '<span class="pg-gap">…</span>';
            }
        }
        for ($p = $start; $p <= $end; $p++) {
            $links .= $mk($p, (string) $p, false, $p === $page);
        }
        if ($end < $pages) {
            if ($end < $pages - 1) {
                $links .= '<span class="pg-gap">…</span>';
            }
            $links .= $mk($pages, (string) $pages);
        }
        $links .= $mk($page + 1, 'Next ›', $page >= $pages);
    }

    return '<div class="pagination">'
        . '<span class="pg-count">Showing ' . $from . '–' . $to . ' of ' . number_format($total) . '</span>'
        . '<span class="pg-links">' . $links . '</span>'
        . $selector
        . '</div>';
}
