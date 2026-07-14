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
function date_range(): array
{
    $range = $_GET['range'] ?? '30d';
    $end   = date('Y-m-d', strtotime('-1 day'));

    if ($range === 'custom' && !empty($_GET['from']) && !empty($_GET['to'])) {
        $start = $_GET['from'];
        $end   = $_GET['to'];
        $label = "$start → $end";
    } else {
        $days = match ($range) {
            '7d'  => 7,
            '90d' => 90,
            '12m' => 365,
            default => 30,
        };
        $start = date('Y-m-d', strtotime("-{$days} days"));
        $label = match ($range) {
            '7d' => 'Last 7 days', '90d' => 'Last 90 days',
            '12m' => 'Last 12 months', default => 'Last 30 days',
        };
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
    // key => [label, url, page, subKey, icon]
    return [
        '' => [
            'overview' => ['Overview', '?page=dashboard', 'dashboard', null, '🏠'],
        ],
        'Content' => [
            'blog'          => ['Blog', '?page=content&type=blog', 'content', 'blog', '✍️'],
            'documentation' => ['Documentation', '?page=content&type=documentation', 'content', 'documentation', '📚'],
            'landing_pages' => ['Landing Pages', '?page=content&type=landing_page', 'content', 'landing_page', '🛬'],
            'case_studies'  => ['Case Studies', '?page=content&type=case_study', 'content', 'case_study', '🏆'],
        ],
        'Acquisition' => [
            'search_performance' => ['Search Performance', '?page=search-performance', 'search-performance', null, '🔍'],
            'keywords'           => ['Keywords', '?page=keywords', 'keywords', null, '🔑'],
            'email'              => ['Email Marketing', '?page=email', 'email', null, '✉️'],
        ],
        'Social Media' => [
            'social_all'      => ['All Platforms', '?page=social', 'social', '', '🌐'],
            'social_facebook' => ['Facebook', '?page=social&platform=facebook', 'social', 'facebook', '📘'],
            'social_linkedin' => ['LinkedIn', '?page=social&platform=linkedin', 'social', 'linkedin', '💼'],
            'social_twitter'  => ['X / Twitter', '?page=social&platform=twitter', 'social', 'twitter', '🐦'],
            'social_youtube'  => ['YouTube', '?page=social&platform=youtube', 'social', 'youtube', '▶️'],
        ],
        'Reporting' => [
            'campaigns' => ['Campaigns', '?page=campaigns', 'campaigns', null, '📣'],
            'compare'   => ['Compare', '?page=compare', 'compare', null, '⚖️'],
            'reports'   => ['Monthly & Yearly', '?page=reports', 'reports', null, '🗓️'],
            'data'      => ['Data Manager', '?page=data', 'data', null, '🗃️'],
            'settings'  => ['Settings & Sync', '?page=settings', 'settings', null, '⚙️'],
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
