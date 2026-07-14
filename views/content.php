<?php
$totalPv   = array_sum(array_column($rows, 'pageviews'));
$totalVis  = array_sum(array_column($rows, 'visitors'));
$totalConv = array_sum(array_column($rows, 'conversions'));
?>
<div class="grid grid-4">
  <div class="card stat">
    <div class="stat-label">Published Items</div>
    <div class="stat-value"><?= count($rows) ?></div>
  </div>
  <div class="card stat">
    <div class="stat-label">Pageviews</div>
    <div class="stat-value"><?= fmt_num($totalPv) ?></div>
  </div>
  <div class="card stat">
    <div class="stat-label">Visitors</div>
    <div class="stat-value"><?= fmt_num($totalVis) ?></div>
  </div>
  <div class="card stat">
    <div class="stat-label">Conversions</div>
    <div class="stat-value"><?= fmt_num($totalConv) ?></div>
  </div>
</div>

<div class="card">
  <h2><?= h($types[$type]) ?> traffic over time</h2>
  <div class="chart-box">
    <canvas class="chart" data-chart="<?= chart_json([
        'type' => 'line',
        'labels' => array_column($series, 'date'),
        'datasets' => [
            ['label' => 'Pageviews', 'data' => array_map('intval', array_column($series, 'pageviews')), 'fill' => true],
            ['label' => 'Visitors',  'data' => array_map('intval', array_column($series, 'visitors'))],
        ],
    ]) ?>"></canvas>
  </div>
</div>

<div class="card" style="margin-top:16px">
  <h2>All <?= h(strtolower($types[$type])) ?></h2>
  <?php ['rows' => $ctRows, 'state' => $ctState] = paginate_rows($rows, ['title', 'funnel_stage', 'author', 'published_at', 'target_keyword', 'search_volume', 'views', 'pageviews', 'visitors', 'conversions'], 'pageviews', 'desc'); ?>
  <div class="table-wrap">
    <table class="data">
      <tr>
        <?= sortable_th('title', 'Title', $ctState) ?>
        <?= sortable_th('funnel_stage', 'Funnel', $ctState) ?>
        <?= sortable_th('author', 'Author', $ctState) ?>
        <?= sortable_th('published_at', 'Published', $ctState) ?>
        <?= sortable_th('target_keyword', 'Target keyword', $ctState) ?>
        <th class="num">Kw pos</th>
        <?= sortable_th('search_volume', 'Volume', $ctState, 'num') ?>
        <?= sortable_th('views', 'Views', $ctState, 'num') ?>
        <?= sortable_th('pageviews', 'Pageviews', $ctState, 'num') ?>
        <?= sortable_th('visitors', 'Visitors', $ctState, 'num') ?>
        <?= sortable_th('conversions', 'Conversions', $ctState, 'num') ?>
        <th></th>
      </tr>
      <?php foreach ($ctRows as $r): ?>
      <tr>
        <td><a href="<?= h($r['url']) ?>" target="_blank" rel="noopener"><span class="truncate"><?= h($r['title']) ?></span></a></td>
        <td><?= $r['funnel_stage'] ? '<span class="badge">' . h($r['funnel_stage']) . '</span>' : '—' ?></td>
        <td><?= h((string) $r['author']) ?></td>
        <td style="white-space:nowrap"><?= h((string) $r['published_at']) ?></td>
        <td><span class="truncate" style="max-width:180px"><?= h((string) $r['target_keyword']) ?></span></td>
        <td class="num"><?= h((string) ($r['keyword_position'] ?: '—')) ?></td>
        <td class="num"><?= $r['search_volume'] ? fmt_num($r['search_volume']) : '—' ?></td>
        <td class="num"><?= $r['views'] ? fmt_num($r['views']) : '—' ?></td>
        <td class="num"><?= fmt_num($r['pageviews']) ?></td>
        <td class="num"><?= fmt_num($r['visitors']) ?></td>
        <td class="num"><?= fmt_num($r['conversions']) ?></td>
        <td class="num"><?= delete_button('content_items', (int) $r['id']) ?></td>
      </tr>
      <?php endforeach; if (!$rows): ?>
      <tr><td colspan="12">No <?= h(strtolower($types[$type])) ?> tracked yet.</td></tr>
      <?php endif; ?>
    </table>
  </div>
  <?= pagination_bar($ctState) ?>
</div>
