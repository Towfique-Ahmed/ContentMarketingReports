<?php
$def    = $metrics[$metric];
$aTotal = array_sum(array_column($aSeries, 'value'));
$bTotal = array_sum(array_column($bSeries, 'value'));
if (str_starts_with($def[2], 'AVG')) {
    $aTotal = count($aSeries) ? $aTotal / count($aSeries) : 0;
    $bTotal = count($bSeries) ? $bTotal / count($bSeries) : 0;
}
// Align the two periods by day index so different-length ranges still overlay.
$len = max(count($aSeries), count($bSeries));
$labels = range(1, max(1, $len));
?>
<div class="card">
  <h2>Comparison setup</h2>
  <form method="get" class="form-grid" style="align-items:end">
    <input type="hidden" name="page" value="compare">
    <div class="field">
      <label>Metric</label>
      <select name="metric">
        <?php foreach ($metrics as $key => $m): ?>
          <option value="<?= h($key) ?>"<?= $key === $metric ? ' selected' : '' ?>><?= h($m[0]) ?></option>
        <?php endforeach; ?>
      </select>
    </div>
    <div class="field">
      <label>Period A</label>
      <div style="display:flex; gap:6px">
        <input type="date" name="a_from" value="<?= h($aStart) ?>" required>
        <input type="date" name="a_to" value="<?= h($aEnd) ?>" required>
      </div>
    </div>
    <div class="field">
      <label>Period B</label>
      <div style="display:flex; gap:6px">
        <input type="date" name="b_from" value="<?= h($bStart) ?>" required>
        <input type="date" name="b_to" value="<?= h($bEnd) ?>" required>
      </div>
    </div>
    <div class="field"><button class="btn" type="submit">Compare</button></div>
  </form>
</div>

<div class="grid grid-4" style="margin-top:16px">
  <div class="card stat">
    <div class="stat-label">Period A — <?= h($def[0]) ?></div>
    <div class="stat-value"><?= fmt_num($aTotal) ?></div>
    <div class="hint"><?= h("$aStart → $aEnd") ?></div>
  </div>
  <div class="card stat">
    <div class="stat-label">Period B — <?= h($def[0]) ?></div>
    <div class="stat-value"><?= fmt_num($bTotal) ?></div>
    <div class="hint"><?= h("$bStart → $bEnd") ?></div>
  </div>
  <div class="card stat">
    <div class="stat-label">Change (A vs B)</div>
    <div class="stat-value"><?= delta_badge((float) $aTotal, (float) $bTotal, $def[3]) ?></div>
    <div class="hint"><?= $def[3] ? 'lower is better for this metric' : 'higher is better' ?></div>
  </div>
  <div class="card stat">
    <div class="stat-label">Daily average (A)</div>
    <div class="stat-value"><?= fmt_num(count($aSeries) ? array_sum(array_column($aSeries, 'value')) / count($aSeries) : 0) ?></div>
    <div class="hint">vs <?= fmt_num(count($bSeries) ? array_sum(array_column($bSeries, 'value')) / count($bSeries) : 0) ?> in period B</div>
  </div>
</div>

<div class="card">
  <h2><?= h($def[0]) ?> — day-by-day overlay</h2>
  <div class="chart-box tall">
    <canvas class="chart" data-chart="<?= chart_json([
        'type' => 'line',
        'inverted' => $def[3] && str_contains($metric, 'position'),
        'labels' => $labels,
        'datasets' => [
            ['label' => "Period A ($aStart → $aEnd)", 'data' => array_map('floatval', array_column($aSeries, 'value')), 'fill' => true],
            ['label' => "Period B ($bStart → $bEnd)", 'data' => array_map('floatval', array_column($bSeries, 'value')), 'dashed' => true, 'color' => '#eb6834'],
        ],
    ]) ?>"></canvas>
  </div>
  <p class="hint">The x-axis is the day number within each period, so ranges of different lengths align at day 1.</p>
</div>

<div class="card" style="margin-top:16px">
  <h2>All metrics — period A vs period B</h2>
  <div class="table-wrap">
    <table class="data">
      <tr><th>Metric</th><th class="num">Period A</th><th class="num">Period B</th><th class="num">Change</th></tr>
      <?php foreach ($summary as $row): ?>
      <tr>
        <td><a href="<?= h(url_with(['metric' => $row['key']])) ?>"><?= h($row['label']) ?></a></td>
        <td class="num"><?= fmt_num($row['a']) ?></td>
        <td class="num"><?= fmt_num($row['b']) ?></td>
        <td class="num"><?= delta_badge((float) $row['a'], (float) $row['b'], $row['lower']) ?></td>
      </tr>
      <?php endforeach; ?>
    </table>
  </div>
</div>
