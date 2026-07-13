<?php
$ranked   = array_filter($rows, fn ($r) => $r['position'] !== null);
$top10    = count(array_filter($ranked, fn ($r) => $r['position'] <= 10));
$improved = count(array_filter($ranked, fn ($r) => $r['prev_position'] !== null && $r['position'] < $r['prev_position']));
$totClk   = array_sum(array_map(fn ($r) => (int) $r['clicks'], $rows));
?>
<div class="grid grid-4">
  <div class="card stat">
    <div class="stat-label">Tracked Keywords</div>
    <div class="stat-value"><?= count($rows) ?></div>
  </div>
  <div class="card stat">
    <div class="stat-label">In Top 10</div>
    <div class="stat-value"><?= $top10 ?></div>
  </div>
  <div class="card stat">
    <div class="stat-label">Improved This Period</div>
    <div class="stat-value"><?= $improved ?></div>
  </div>
  <div class="card stat">
    <div class="stat-label">Clicks From Tracked</div>
    <div class="stat-value"><?= fmt_num($totClk) ?></div>
  </div>
</div>

<?php if ($selected): ?>
<div class="card">
  <h2>“<?= h($selected['keyword']) ?>” — ranking history <span class="sub" style="display:inline">(lower is better)</span>
    <a class="btn btn-secondary" style="float:right" href="<?= h(url_with(['id' => null])) ?>">← all keywords</a></h2>
  <div class="chart-box">
    <canvas class="chart" data-chart="<?= chart_json([
        'type' => 'line',
        'inverted' => true,
        'labels' => array_column($series, 'date'),
        'datasets' => [['label' => 'Position', 'data' => array_map('floatval', array_column($series, 'position')), 'color' => '#4a3aa7', 'fill' => true]],
    ]) ?>"></canvas>
  </div>
</div>
<?php endif; ?>

<div class="card" style="margin-top:16px">
  <h2>Keyword rankings</h2>
  <div class="table-wrap">
    <table class="data">
      <tr>
        <th>Keyword</th><th>Target page</th>
        <th class="num">Volume</th><th class="num">Difficulty</th>
        <th class="num">Position</th><th class="num">Change</th>
        <th class="num">Clicks</th><th class="num">Impressions</th>
      </tr>
      <?php foreach ($rows as $r): ?>
      <tr>
        <td><a href="<?= h(url_with(['id' => $r['id']])) ?>"><?= h($r['keyword']) ?></a></td>
        <td><span class="truncate" style="max-width:240px"><?= h(parse_url((string) $r['target_url'], PHP_URL_PATH) ?: $r['target_url']) ?></span></td>
        <td class="num"><?= fmt_num($r['search_volume']) ?></td>
        <td class="num"><?= (int) $r['difficulty'] ?></td>
        <td class="num"><?= $r['position'] !== null ? number_format((float) $r['position'], 1) : '—' ?></td>
        <td class="num">
          <?php if ($r['position'] !== null && $r['prev_position'] !== null):
              $diff = (float) $r['prev_position'] - (float) $r['position']; // positive = moved up
              if (abs($diff) < 0.05): ?><span class="delta delta-flat">·</span>
              <?php elseif ($diff > 0): ?><span class="delta delta-good">▲ <?= number_format($diff, 1) ?></span>
              <?php else: ?><span class="delta delta-bad">▼ <?= number_format(abs($diff), 1) ?></span>
              <?php endif;
          else: ?>—<?php endif; ?>
        </td>
        <td class="num"><?= fmt_num($r['clicks']) ?></td>
        <td class="num"><?= fmt_num($r['impressions']) ?></td>
      </tr>
      <?php endforeach; if (!$rows): ?>
      <tr><td colspan="8">No keywords tracked yet — they sync automatically from Search Console query data.</td></tr>
      <?php endif; ?>
    </table>
  </div>
  <p class="hint">Position change compares the end of the selected range with its start. Click a keyword for its full history.</p>
</div>
