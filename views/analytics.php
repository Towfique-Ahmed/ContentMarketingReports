<div class="grid grid-4">
  <div class="card stat">
    <div class="stat-label">Sessions</div>
    <div class="stat-value"><?= fmt_num($totals['sessions']) ?></div>
    <?= delta_badge((float) $totals['sessions'], (float) $prev['sessions']) ?>
  </div>
  <div class="card stat">
    <div class="stat-label">Users</div>
    <div class="stat-value"><?= fmt_num($totals['users']) ?></div>
    <?= delta_badge((float) $totals['users'], (float) $prev['users']) ?>
  </div>
  <div class="card stat">
    <div class="stat-label">New Users</div>
    <div class="stat-value"><?= fmt_num($totals['new_users']) ?></div>
    <?= delta_badge((float) $totals['new_users'], (float) $prev['new_users']) ?>
  </div>
  <div class="card stat">
    <div class="stat-label">Pageviews</div>
    <div class="stat-value"><?= fmt_num($totals['pageviews']) ?></div>
    <?= delta_badge((float) $totals['pageviews'], (float) $prev['pageviews']) ?>
  </div>
</div>
<div class="grid grid-4">
  <div class="card stat">
    <div class="stat-label">Engagement Rate</div>
    <div class="stat-value"><?= fmt_pct($totals['engagement_rate']) ?></div>
    <?= delta_badge((float) $totals['engagement_rate'], (float) $prev['engagement_rate']) ?>
  </div>
  <div class="card stat">
    <div class="stat-label">Avg Session Duration</div>
    <div class="stat-value"><?= fmt_duration($totals['avg_duration']) ?></div>
    <?= delta_badge((float) $totals['avg_duration'], (float) $prev['avg_duration']) ?>
  </div>
  <div class="card stat">
    <div class="stat-label">Conversions</div>
    <div class="stat-value"><?= fmt_num($totals['conversions']) ?></div>
    <?= delta_badge((float) $totals['conversions'], (float) $prev['conversions']) ?>
  </div>
  <div class="card stat">
    <div class="stat-label">Bounce Rate</div>
    <div class="stat-value"><?= fmt_pct($totals['bounce_rate']) ?></div>
    <?= delta_badge((float) $totals['bounce_rate'], (float) $prev['bounce_rate'], lowerIsBetter: true) ?>
  </div>
</div>

<div class="card">
  <h2>Sessions, users &amp; conversions over time</h2>
  <div class="chart-box tall">
    <canvas class="chart" data-chart="<?= chart_json([
        'type' => 'line',
        'labels' => array_column($series, 'date'),
        'datasets' => [
            ['label' => 'Sessions',    'data' => array_map('intval', array_column($series, 'sessions')), 'fill' => true],
            ['label' => 'Users',       'data' => array_map('intval', array_column($series, 'users'))],
            ['label' => 'Conversions × 10', 'data' => array_map(fn ($v) => (int) $v * 10, array_column($series, 'conversions')), 'dashed' => true],
        ],
    ]) ?>"></canvas>
  </div>
</div>

<div class="grid grid-2" style="margin-top:16px">
  <div class="card">
    <h2>Acquisition channels</h2>
    <div class="table-wrap">
      <table class="data">
        <tr><th>Channel</th><th class="num">Sessions</th><th class="num">Users</th><th class="num">Conversions</th><th class="num">Conv. rate</th></tr>
        <?php foreach ($channels as $i => $ch): ?>
        <tr>
          <td><span class="swatch" style="background:var(--series-<?= ($i % 8) + 1 ?>)"></span><?= h($ch['channel']) ?></td>
          <td class="num"><?= fmt_num($ch['sessions']) ?></td>
          <td class="num"><?= fmt_num($ch['users']) ?></td>
          <td class="num"><?= fmt_num($ch['conversions']) ?></td>
          <td class="num"><?= $ch['sessions'] > 0 ? fmt_pct($ch['conversions'] / $ch['sessions'] * 100) : '—' ?></td>
        </tr>
        <?php endforeach; ?>
      </table>
    </div>
  </div>
  <div class="card">
    <h2>Top pages</h2>
    <?php ['rows' => $apRows, 'state' => $apState] = paginate_rows($pages, ['page', 'pageviews', 'users'], 'pageviews', 'desc', 'ap'); ?>
    <div class="table-wrap">
      <table class="data">
        <tr>
          <?= sortable_th('page', 'Page', $apState) ?>
          <?= sortable_th('pageviews', 'Pageviews', $apState, 'num') ?>
          <?= sortable_th('users', 'Users', $apState, 'num') ?>
        </tr>
        <?php foreach ($apRows as $p): ?>
        <tr>
          <td><span class="truncate"><?= h($p['page']) ?></span></td>
          <td class="num"><?= fmt_num($p['pageviews']) ?></td>
          <td class="num"><?= fmt_num($p['users']) ?></td>
        </tr>
        <?php endforeach; if (!$pages): ?>
        <tr><td colspan="3">No page data for this range yet.</td></tr>
        <?php endif; ?>
      </table>
    </div>
    <?= pagination_bar($apState) ?>
  </div>
</div>
