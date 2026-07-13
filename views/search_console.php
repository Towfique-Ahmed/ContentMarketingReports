<div class="grid grid-4">
  <div class="card stat">
    <div class="stat-label">Total Clicks</div>
    <div class="stat-value"><?= fmt_num($totals['clicks']) ?></div>
    <?= delta_badge((float) $totals['clicks'], (float) $prev['clicks']) ?>
  </div>
  <div class="card stat">
    <div class="stat-label">Total Impressions</div>
    <div class="stat-value"><?= fmt_num($totals['impressions']) ?></div>
    <?= delta_badge((float) $totals['impressions'], (float) $prev['impressions']) ?>
  </div>
  <div class="card stat">
    <div class="stat-label">Average CTR</div>
    <div class="stat-value"><?= fmt_pct($totals['ctr']) ?></div>
    <?= delta_badge((float) $totals['ctr'], (float) $prev['ctr']) ?>
  </div>
  <div class="card stat">
    <div class="stat-label">Average Position</div>
    <div class="stat-value"><?= number_format((float) $totals['position'], 1) ?></div>
    <?= delta_badge((float) $totals['position'], (float) $prev['position'], lowerIsBetter: true) ?>
  </div>
</div>

<div class="grid grid-2">
  <div class="card">
    <h2>Clicks &amp; impressions over time</h2>
    <div class="chart-box tall">
      <canvas class="chart" data-chart="<?= chart_json([
          'type' => 'line',
          'labels' => array_column($series, 'date'),
          'datasets' => [
              ['label' => 'Clicks', 'data' => array_map('intval', array_column($series, 'clicks')), 'fill' => true],
              ['label' => 'Impressions ÷ 100', 'data' => array_map(fn ($v) => (int) round($v / 100), array_column($series, 'impressions')), 'dashed' => true],
          ],
      ]) ?>"></canvas>
    </div>
  </div>
  <div class="card">
    <h2>Average position over time <span class="sub" style="display:inline">(lower is better)</span></h2>
    <div class="chart-box tall">
      <canvas class="chart" data-chart="<?= chart_json([
          'type' => 'line',
          'inverted' => true,
          'labels' => array_column($series, 'date'),
          'datasets' => [
              ['label' => 'Avg position', 'data' => array_map('floatval', array_column($series, 'position')), 'color' => '#4a3aa7'],
          ],
      ]) ?>"></canvas>
    </div>
  </div>
</div>

<div class="grid grid-2">
  <div class="card">
    <h2>Top search queries</h2>
    <div class="table-wrap">
      <table class="data">
        <tr><th>Query</th><th class="num">Clicks</th><th class="num">Impressions</th><th class="num">CTR</th><th class="num">Position</th></tr>
        <?php foreach ($queries as $q): ?>
        <tr>
          <td><span class="truncate"><?= h($q['query']) ?></span></td>
          <td class="num"><?= fmt_num($q['clicks']) ?></td>
          <td class="num"><?= fmt_num($q['impressions']) ?></td>
          <td class="num"><?= fmt_pct($q['ctr']) ?></td>
          <td class="num"><?= number_format((float) $q['position'], 1) ?></td>
        </tr>
        <?php endforeach; if (!$queries): ?>
        <tr><td colspan="5">No query data yet — run a sync from Settings.</td></tr>
        <?php endif; ?>
      </table>
    </div>
  </div>
  <div class="card">
    <h2>Top pages in search</h2>
    <div class="table-wrap">
      <table class="data">
        <tr><th>Page</th><th class="num">Clicks</th><th class="num">Impressions</th><th class="num">CTR</th><th class="num">Position</th></tr>
        <?php foreach ($pages as $p): ?>
        <tr>
          <td><a href="<?= h($p['page']) ?>" target="_blank" rel="noopener"><span class="truncate"><?= h(parse_url($p['page'], PHP_URL_PATH) ?: $p['page']) ?></span></a></td>
          <td class="num"><?= fmt_num($p['clicks']) ?></td>
          <td class="num"><?= fmt_num($p['impressions']) ?></td>
          <td class="num"><?= fmt_pct($p['ctr']) ?></td>
          <td class="num"><?= number_format((float) $p['position'], 1) ?></td>
        </tr>
        <?php endforeach; if (!$pages): ?>
        <tr><td colspan="5">No page data yet — run a sync from Settings.</td></tr>
        <?php endif; ?>
      </table>
    </div>
  </div>
</div>
