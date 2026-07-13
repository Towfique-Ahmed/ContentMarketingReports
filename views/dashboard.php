<div class="grid grid-4">
  <div class="card stat">
    <div class="stat-label">Sessions</div>
    <div class="stat-value"><?= fmt_num($ga['sessions'] ?? 0) ?></div>
    <?= delta_badge((float) ($ga['sessions'] ?? 0), (float) ($gaPrev['sessions'] ?? 0)) ?>
  </div>
  <div class="card stat">
    <div class="stat-label">Users</div>
    <div class="stat-value"><?= fmt_num($ga['users'] ?? 0) ?></div>
    <?= delta_badge((float) ($ga['users'] ?? 0), (float) ($gaPrev['users'] ?? 0)) ?>
  </div>
  <div class="card stat">
    <div class="stat-label">Conversions</div>
    <div class="stat-value"><?= fmt_num($ga['conversions'] ?? 0) ?></div>
    <?= delta_badge((float) ($ga['conversions'] ?? 0), (float) ($gaPrev['conversions'] ?? 0)) ?>
  </div>
  <div class="card stat">
    <div class="stat-label">Search Clicks</div>
    <div class="stat-value"><?= fmt_num($gsc['clicks'] ?? 0) ?></div>
    <?= delta_badge((float) ($gsc['clicks'] ?? 0), (float) ($gscPrev['clicks'] ?? 0)) ?>
  </div>
</div>

<div class="grid grid-2">
  <div class="card">
    <h2>Traffic — sessions &amp; users</h2>
    <div class="chart-box">
      <canvas class="chart" data-chart="<?= chart_json([
          'type' => 'line',
          'labels' => array_column($gaSeries, 'date'),
          'datasets' => [
              ['label' => 'Sessions', 'data' => array_map('intval', array_column($gaSeries, 'sessions')), 'fill' => true],
              ['label' => 'Users',    'data' => array_map('intval', array_column($gaSeries, 'users'))],
          ],
      ]) ?>"></canvas>
    </div>
  </div>
  <div class="card">
    <h2>Organic search — clicks &amp; impressions</h2>
    <div class="chart-box">
      <canvas class="chart" data-chart="<?= chart_json([
          'type' => 'line',
          'labels' => array_column($gscSeries, 'date'),
          'datasets' => [
              ['label' => 'Clicks', 'data' => array_map('intval', array_column($gscSeries, 'clicks')), 'fill' => true],
              ['label' => 'Impressions ÷ 100', 'data' => array_map(fn ($v) => (int) round($v / 100), array_column($gscSeries, 'impressions')), 'dashed' => true],
          ],
      ]) ?>"></canvas>
    </div>
  </div>
</div>

<div class="grid grid-2">
  <div class="card">
    <h2>Sessions by channel</h2>
    <div class="chart-box short">
      <canvas class="chart" data-chart="<?= chart_json([
          'type' => 'doughnut',
          'labels' => array_column($channels, 'channel'),
          'data' => array_map('intval', array_column($channels, 'sessions')),
      ]) ?>"></canvas>
    </div>
  </div>
  <div class="card">
    <h2>Content performance</h2>
    <div class="table-wrap">
      <table class="data">
        <tr><th>Type</th><th class="num">Items</th><th class="num">Pageviews</th><th class="num">Visitors</th><th class="num">Conversions</th></tr>
        <?php $labels = ['blog' => 'Blog', 'documentation' => 'Documentation', 'landing_page' => 'Landing Pages', 'case_study' => 'Case Studies'];
        foreach ($content as $row): ?>
        <tr>
          <td><a href="?page=content&type=<?= h($row['type']) ?>"><?= h($labels[$row['type']] ?? $row['type']) ?></a></td>
          <td class="num"><?= (int) $row['items'] ?></td>
          <td class="num"><?= fmt_num($row['pageviews']) ?></td>
          <td class="num"><?= fmt_num($row['visitors']) ?></td>
          <td class="num"><?= fmt_num($row['conversions']) ?></td>
        </tr>
        <?php endforeach; ?>
      </table>
    </div>
  </div>
</div>

<div class="grid grid-2">
  <div class="card">
    <h2>Social media snapshot</h2>
    <div class="table-wrap">
      <table class="data">
        <tr><th>Platform</th><th class="num">Followers</th><th class="num">Impressions</th><th class="num">Engagements</th></tr>
        <?php $pl = ['facebook' => 'Facebook', 'linkedin' => 'LinkedIn', 'twitter' => 'X / Twitter', 'youtube' => 'YouTube'];
        foreach ($social as $row): ?>
        <tr>
          <td><a href="?page=social&platform=<?= h($row['platform']) ?>"><?= h($pl[$row['platform']] ?? $row['platform']) ?></a></td>
          <td class="num"><?= fmt_num($row['followers']) ?></td>
          <td class="num"><?= fmt_num($row['impressions']) ?></td>
          <td class="num"><?= fmt_num($row['engagements']) ?></td>
        </tr>
        <?php endforeach; ?>
      </table>
    </div>
  </div>
  <div class="card">
    <h2>Top campaigns <span class="sub" style="display:inline">(by revenue)</span></h2>
    <div class="table-wrap">
      <table class="data">
        <tr><th>Campaign</th><th class="num">Spend</th><th class="num">Revenue</th><th class="num">ROAS</th></tr>
        <?php foreach ($campaigns as $c): ?>
        <tr>
          <td><a href="?page=campaigns&id=<?= (int) $c['id'] ?>"><span class="truncate"><?= h($c['name']) ?></span></a></td>
          <td class="num"><?= fmt_money($c['cost']) ?></td>
          <td class="num"><?= fmt_money($c['revenue']) ?></td>
          <td class="num"><?= $c['cost'] > 0 ? number_format($c['revenue'] / $c['cost'], 1) . 'x' : '—' ?></td>
        </tr>
        <?php endforeach; ?>
      </table>
    </div>
  </div>
</div>

<?php if ($lastSync): ?>
<p class="range-label">Last data sync: <?= h($lastSync) ?> · <a href="?page=settings">sync settings</a></p>
<?php endif; ?>
