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

/** Preserve current query string while overriding some params. */
function url_with(array $overrides): string
{
    $params = array_merge($_GET, $overrides);
    return '?' . http_build_query(array_filter($params, fn ($v) => $v !== null && $v !== ''));
}
