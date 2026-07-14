<?php
$totCost = array_sum(array_column($rows, 'cost'));
$totRev  = array_sum(array_column($rows, 'revenue'));
$totConv = array_sum(array_column($rows, 'conversions'));
$totClk  = array_sum(array_column($rows, 'clicks'));
?>
<div class="grid grid-4">
  <div class="card stat">
    <div class="stat-label">Total Spend</div>
    <div class="stat-value"><?= fmt_money($totCost) ?></div>
  </div>
  <div class="card stat">
    <div class="stat-label">Total Revenue</div>
    <div class="stat-value"><?= fmt_money($totRev) ?></div>
  </div>
  <div class="card stat">
    <div class="stat-label">Blended ROAS</div>
    <div class="stat-value"><?= $totCost > 0 ? number_format($totRev / $totCost, 2) . 'x' : '—' ?></div>
  </div>
  <div class="card stat">
    <div class="stat-label">Cost / Conversion</div>
    <div class="stat-value"><?= $totConv > 0 ? '$' . number_format($totCost / $totConv, 2) : '—' ?></div>
  </div>
</div>

<?php if ($selected): ?>
<div class="card">
  <h2><?= h($selected['name']) ?> — daily performance <a class="btn btn-secondary" style="float:right" href="<?= h(url_with(['id' => null])) ?>">← all campaigns</a></h2>
  <div class="chart-box">
    <canvas class="chart" data-chart="<?= chart_json([
        'type' => 'line',
        'labels' => array_column($series, 'date'),
        'datasets' => [
            ['label' => 'Cost $',    'data' => array_map(fn ($v) => round((float) $v, 2), array_column($series, 'cost'))],
            ['label' => 'Revenue $', 'data' => array_map(fn ($v) => round((float) $v, 2), array_column($series, 'revenue')), 'fill' => true],
            ['label' => 'Clicks',    'data' => array_map('intval', array_column($series, 'clicks')), 'dashed' => true],
        ],
    ]) ?>"></canvas>
  </div>
</div>
<?php endif; ?>

<div class="card" style="margin-top:16px">
  <h2>All campaigns</h2>
  <?php ['rows' => $cmRows, 'state' => $cmState] = paginate_rows($rows, ['name', 'channel', 'status', 'start_date', 'budget', 'cost', 'impressions', 'clicks', 'conversions', 'revenue'], 'revenue', 'desc'); ?>
  <div class="table-wrap">
    <table class="data">
      <tr>
        <?= sortable_th('name', 'Campaign', $cmState) ?>
        <?= sortable_th('channel', 'Channel', $cmState) ?>
        <?= sortable_th('status', 'Status', $cmState) ?>
        <?= sortable_th('start_date', 'Dates', $cmState) ?>
        <?= sortable_th('budget', 'Budget', $cmState, 'num') ?>
        <?= sortable_th('cost', 'Spend', $cmState, 'num') ?>
        <?= sortable_th('impressions', 'Impressions', $cmState, 'num') ?>
        <?= sortable_th('clicks', 'Clicks', $cmState, 'num') ?>
        <th class="num">CTR</th>
        <?= sortable_th('conversions', 'Conv.', $cmState, 'num') ?>
        <th class="num">CPA</th>
        <?= sortable_th('revenue', 'Revenue', $cmState, 'num') ?>
        <th class="num">ROAS</th>
        <th></th>
      </tr>
      <?php foreach ($cmRows as $r): ?>
      <tr>
        <td><a href="<?= h(url_with(['id' => $r['id']])) ?>"><span class="truncate" style="max-width:220px"><?= h($r['name']) ?></span></a></td>
        <td><?= h($r['channel']) ?></td>
        <td><span class="badge badge-<?= h($r['status']) ?>"><?= h(ucfirst($r['status'])) ?></span></td>
        <td style="white-space:nowrap"><?= h($r['start_date']) ?><?= $r['end_date'] ? ' → ' . h($r['end_date']) : ' →' ?></td>
        <td class="num"><?= fmt_money($r['budget']) ?></td>
        <td class="num"><?= fmt_money($r['cost']) ?></td>
        <td class="num"><?= fmt_num($r['impressions']) ?></td>
        <td class="num"><?= fmt_num($r['clicks']) ?></td>
        <td class="num"><?= $r['impressions'] > 0 ? fmt_pct($r['clicks'] / $r['impressions'] * 100) : '—' ?></td>
        <td class="num"><?= fmt_num($r['conversions']) ?></td>
        <td class="num"><?= $r['conversions'] > 0 ? '$' . number_format($r['cost'] / $r['conversions'], 2) : '—' ?></td>
        <td class="num"><?= fmt_money($r['revenue']) ?></td>
        <td class="num"><?= $r['cost'] > 0 ? number_format($r['revenue'] / $r['cost'], 1) . 'x' : '—' ?></td>
        <td class="num"><?= delete_button('campaigns', (int) $r['id']) ?></td>
      </tr>
      <?php endforeach; if (!$rows): ?>
      <tr><td colspan="14">No campaigns yet — add them with the manage-data panel below.</td></tr>
      <?php endif; ?>
    </table>
  </div>
  <?= pagination_bar($cmState) ?>
  <p class="hint">Metrics reflect the selected date range. Click a campaign for its daily trend.</p>
</div>
