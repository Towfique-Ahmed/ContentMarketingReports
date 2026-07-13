<?php
$openRate  = ($totals['delivered'] ?? 0) > 0 ? $totals['opens'] / $totals['delivered'] * 100 : 0;
$clickRate = ($totals['delivered'] ?? 0) > 0 ? $totals['clicks'] / $totals['delivered'] * 100 : 0;
$prevOpen  = ($prev['delivered'] ?? 0) > 0 ? $prev['opens'] / $prev['delivered'] * 100 : 0;
$prevClick = ($prev['delivered'] ?? 0) > 0 ? $prev['clicks'] / $prev['delivered'] * 100 : 0;
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
  <div class="table-wrap">
    <table class="data">
      <tr>
        <th>Date</th><th>Campaign</th><th>Type</th>
        <th class="num">Sent</th><th class="num">Delivered</th><th class="num">Opens</th>
        <th class="num">Open rate</th><th class="num">Clicks</th><th class="num">Click rate</th>
        <th class="num">Unsubs</th>
      </tr>
      <?php foreach ($rows as $r):
          $or = $r['delivered'] > 0 ? $r['opens'] / $r['delivered'] * 100 : 0;
          $cr = $r['delivered'] > 0 ? $r['clicks'] / $r['delivered'] * 100 : 0; ?>
      <tr>
        <td style="white-space:nowrap"><?= h($r['date']) ?></td>
        <td><span class="truncate"><?= h($r['name']) ?></span></td>
        <td><?= h((string) $r['type']) ?></td>
        <td class="num"><?= fmt_num($r['sent']) ?></td>
        <td class="num"><?= fmt_num($r['delivered']) ?></td>
        <td class="num"><?= fmt_num($r['opens']) ?></td>
        <td class="num"><?= fmt_pct($or) ?></td>
        <td class="num"><?= fmt_num($r['clicks']) ?></td>
        <td class="num"><?= fmt_pct($cr) ?></td>
        <td class="num"><?= fmt_num($r['unsubscribes']) ?></td>
      </tr>
      <?php endforeach; if (!$rows): ?>
      <tr><td colspan="10">No email campaigns in this range — add them in the <a href="?page=data&set=email_campaigns">Data Manager</a> (manual entry or CSV import).</td></tr>
      <?php endif; ?>
    </table>
  </div>
</div>
