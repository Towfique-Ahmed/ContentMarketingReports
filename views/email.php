<?php
// Rates use delivered when available, otherwise sent (some trackers omit delivered)
$den       = ($totals['delivered'] ?? 0) ?: ($totals['sent'] ?? 0);
$prevDen   = ($prev['delivered'] ?? 0) ?: ($prev['sent'] ?? 0);
$openRate  = $den > 0 ? $totals['opens'] / $den * 100 : 0;
$clickRate = $den > 0 ? $totals['clicks'] / $den * 100 : 0;
$prevOpen  = $prevDen > 0 ? $prev['opens'] / $prevDen * 100 : 0;
$prevClick = $prevDen > 0 ? $prev['clicks'] / $prevDen * 100 : 0;
?>
<div class="grid grid-4">
  <div class="card stat">
    <div class="stat-label">Campaigns Sent</div>
    <div class="stat-value"><?= (int) ($totals['campaigns'] ?? 0) ?></div>
  </div>
  <div class="card stat">
    <div class="stat-label">Emails Sent</div>
    <div class="stat-value"><?= fmt_num($totals['sent'] ?? 0) ?></div>
    <?= delta_badge((float) ($totals['sent'] ?? 0), (float) ($prev['sent'] ?? 0)) ?>
  </div>
  <div class="card stat">
    <div class="stat-label">Open Rate</div>
    <div class="stat-value"><?= fmt_pct($openRate) ?></div>
    <?= delta_badge($openRate, $prevOpen) ?>
  </div>
  <div class="card stat">
    <div class="stat-label">Click Rate</div>
    <div class="stat-value"><?= fmt_pct($clickRate) ?></div>
    <?= delta_badge($clickRate, $prevClick) ?>
  </div>
</div>

<div class="card">
  <h2>Sent, opens &amp; clicks by month</h2>
  <div class="chart-box">
    <canvas class="chart" data-chart="<?= chart_json([
        'type' => 'bar',
        'labels' => array_column($monthly, 'ym'),
        'datasets' => [
            ['label' => 'Sent',   'data' => array_map('intval', array_column($monthly, 'sent'))],
            ['label' => 'Opens',  'data' => array_map('intval', array_column($monthly, 'opens'))],
            ['label' => 'Clicks', 'data' => array_map('intval', array_column($monthly, 'clicks'))],
        ],
    ]) ?>"></canvas>
  </div>
</div>

<div class="card" style="margin-top:16px">
  <h2>All campaigns</h2>
  <?php ['rows' => $emRows, 'state' => $emState] = paginate_rows($rows, ['date', 'name', 'type', 'list_name', 'sent', 'delivered', 'opens', 'clicks', 'unsubscribes'], 'date', 'desc'); ?>
  <div class="table-wrap">
    <table class="data">
      <tr>
        <?= sortable_th('date', 'Date', $emState) ?>
        <?= sortable_th('name', 'Campaign', $emState) ?>
        <?= sortable_th('type', 'Type', $emState) ?>
        <?= sortable_th('list_name', 'List', $emState) ?>
        <?= sortable_th('sent', 'Sent', $emState, 'num') ?>
        <?= sortable_th('delivered', 'Delivered', $emState, 'num') ?>
        <?= sortable_th('opens', 'Opens', $emState, 'num') ?>
        <th class="num">Open rate</th>
        <?= sortable_th('clicks', 'Clicks', $emState, 'num') ?>
        <th class="num">Click rate</th>
        <?= sortable_th('unsubscribes', 'Unsubs', $emState, 'num') ?>
        <th></th>
      </tr>
      <?php foreach ($emRows as $r):
          $rowDen = $r['delivered'] ?: $r['sent'];
          $or = $rowDen > 0 ? $r['opens'] / $rowDen * 100 : 0;
          $cr = $rowDen > 0 ? $r['clicks'] / $rowDen * 100 : 0; ?>
      <tr>
        <td style="white-space:nowrap"><?= h($r['date']) ?></td>
        <td><span class="truncate" title="<?= h((string) $r['subject']) ?>"><?= h($r['name']) ?></span></td>
        <td><?= h((string) $r['type']) ?></td>
        <td><?= h((string) $r['list_name']) ?></td>
        <td class="num"><?= fmt_num($r['sent']) ?></td>
        <td class="num"><?= fmt_num($r['delivered']) ?></td>
        <td class="num"><?= fmt_num($r['opens']) ?></td>
        <td class="num"><?= fmt_pct($or) ?></td>
        <td class="num"><?= fmt_num($r['clicks']) ?></td>
        <td class="num"><?= fmt_pct($cr) ?></td>
        <td class="num"><?= fmt_num($r['unsubscribes']) ?></td>
        <td class="num"><?= delete_button('email_campaigns', (int) $r['id']) ?></td>
      </tr>
      <?php endforeach; if (!$rows): ?>
      <tr><td colspan="12">No email campaigns in this range — add them with the manage-data panel below (manual entry or CSV import).</td></tr>
      <?php endif; ?>
    </table>
  </div>
  <?= pagination_bar($emState) ?>
</div>
