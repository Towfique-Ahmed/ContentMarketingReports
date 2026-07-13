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
  <h2>All <?= h(strtolower($types[$type])) ?> — sorted by pageviews</h2>
  <div class="table-wrap">
    <table class="data">
      <tr>
        <th>Title</th><th>Author</th><th>Published</th>
        <th class="num">Pageviews</th><th class="num">Visitors</th>
        <th class="num">Avg time</th><th class="num">Bounce</th><th class="num">Conversions</th>
      </tr>
      <?php foreach ($rows as $r): ?>
      <tr>
        <td><a href="<?= h($r['url']) ?>" target="_blank" rel="noopener"><span class="truncate"><?= h($r['title']) ?></span></a></td>
        <td><?= h($r['author']) ?></td>
        <td><?= h($r['published_at']) ?></td>
        <td class="num"><?= fmt_num($r['pageviews']) ?></td>
        <td class="num"><?= fmt_num($r['visitors']) ?></td>
        <td class="num"><?= fmt_duration($r['avg_time']) ?></td>
        <td class="num"><?= fmt_pct($r['bounce_rate']) ?></td>
        <td class="num"><?= fmt_num($r['conversions']) ?></td>
      </tr>
      <?php endforeach; if (!$rows): ?>
      <tr><td colspan="8">No <?= h(strtolower($types[$type])) ?> tracked yet.</td></tr>
      <?php endif; ?>
    </table>
  </div>
</div>
