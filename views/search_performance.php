<h2 style="font-size:15px; margin:4px 0 10px; color:var(--text-secondary)">Google Search Console</h2>
<div class="grid grid-4">
  <div class="card stat">
    <div class="stat-label">Search Clicks</div>
    <div class="stat-value"><?= fmt_num($gsc['clicks']) ?></div>
    <?= delta_badge((float) $gsc['clicks'], (float) $gscPrev['clicks']) ?>
  </div>
  <div class="card stat">
    <div class="stat-label">Impressions</div>
    <div class="stat-value"><?= fmt_num($gsc['impressions']) ?></div>
    <?= delta_badge((float) $gsc['impressions'], (float) $gscPrev['impressions']) ?>
  </div>
  <div class="card stat">
    <div class="stat-label">Average CTR</div>
    <div class="stat-value"><?= fmt_pct($gsc['ctr']) ?></div>
    <?= delta_badge((float) $gsc['ctr'], (float) $gscPrev['ctr']) ?>
  </div>
  <div class="card stat">
    <div class="stat-label">Average Position</div>
    <div class="stat-value"><?= number_format((float) $gsc['position'], 1) ?></div>
    <?= delta_badge((float) $gsc['position'], (float) $gscPrev['position'], lowerIsBetter: true) ?>
  </div>
</div>

<h2 style="font-size:15px; margin:4px 0 10px; color:var(--text-secondary)">Google Analytics (GA4)</h2>
<div class="grid grid-4">
  <div class="card stat">
    <div class="stat-label">Sessions</div>
    <div class="stat-value"><?= fmt_num($ga['sessions']) ?></div>
    <?= delta_badge((float) $ga['sessions'], (float) $gaPrev['sessions']) ?>
  </div>
  <div class="card stat">
    <div class="stat-label">Users</div>
    <div class="stat-value"><?= fmt_num($ga['users']) ?></div>
    <?= delta_badge((float) $ga['users'], (float) $gaPrev['users']) ?>
  </div>
  <div class="card stat">
    <div class="stat-label">New Users</div>
    <div class="stat-value"><?= fmt_num($ga['new_users']) ?></div>
    <?= delta_badge((float) $ga['new_users'], (float) $gaPrev['new_users']) ?>
  </div>
  <div class="card stat">
    <div class="stat-label">Conversions</div>
    <div class="stat-value"><?= fmt_num($ga['conversions']) ?></div>
    <?= delta_badge((float) $ga['conversions'], (float) $gaPrev['conversions']) ?>
  </div>
</div>
<div class="grid grid-4">
  <div class="card stat">
    <div class="stat-label">Engagement Rate</div>
    <div class="stat-value"><?= fmt_pct($ga['engagement_rate'] ?? 0) ?></div>
    <?= delta_badge((float) ($ga['engagement_rate'] ?? 0), (float) ($gaPrev['engagement_rate'] ?? 0)) ?>
  </div>
  <div class="card stat">
    <div class="stat-label">Avg Session Duration</div>
    <div class="stat-value"><?= fmt_duration($ga['avg_duration'] ?? 0) ?></div>
    <?= delta_badge((float) ($ga['avg_duration'] ?? 0), (float) ($gaPrev['avg_duration'] ?? 0)) ?>
  </div>
  <div class="card stat">
    <div class="stat-label">Bounce Rate</div>
    <div class="stat-value"><?= fmt_pct($ga['bounce_rate'] ?? 0) ?></div>
    <?= delta_badge((float) ($ga['bounce_rate'] ?? 0), (float) ($gaPrev['bounce_rate'] ?? 0), lowerIsBetter: true) ?>
  </div>
  <div class="card stat">
    <div class="stat-label">Pageviews</div>
    <div class="stat-value"><?= fmt_num($ga['pageviews'] ?? 0) ?></div>
    <?= delta_badge((float) ($ga['pageviews'] ?? 0), (float) ($gaPrev['pageviews'] ?? 0)) ?>
  </div>
</div>

<div class="grid grid-2">
  <div class="card">
    <h2>Search — clicks &amp; impressions</h2>
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
  <div class="card">
    <h2>Average position <span class="sub" style="display:inline">(lower is better)</span></h2>
    <div class="chart-box">
      <canvas class="chart" data-chart="<?= chart_json([
          'type' => 'line',
          'inverted' => true,
          'labels' => array_column($gscSeries, 'date'),
          'datasets' => [
              ['label' => 'Avg position', 'data' => array_map('floatval', array_column($gscSeries, 'position')), 'color' => '#4a3aa7'],
          ],
      ]) ?>"></canvas>
    </div>
  </div>
</div>

<div class="grid grid-2">
  <div class="card">
    <h2>Analytics — sessions &amp; users</h2>
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
    <h2>Acquisition channels</h2>
    <div class="table-wrap">
      <table class="data">
        <tr><th>Channel</th><th class="num">Sessions</th><th class="num">Users</th><th class="num">Conversions</th></tr>
        <?php foreach (array_slice($channels, 0, 10) as $i => $ch): ?>
        <tr>
          <td><span class="swatch" style="background:var(--series-<?= ($i % 8) + 1 ?>)"></span><?= h($ch['channel']) ?></td>
          <td class="num"><?= fmt_num($ch['sessions']) ?></td>
          <td class="num"><?= fmt_num($ch['users']) ?></td>
          <td class="num"><?= fmt_num($ch['conversions']) ?></td>
        </tr>
        <?php endforeach; if (!$channels): ?>
        <tr><td colspan="4">No channel data for this range yet.</td></tr>
        <?php endif; ?>
      </table>
    </div>
  </div>
</div>

<div class="grid grid-2">
  <div class="card">
    <h2>Top search queries</h2>
    <?php ['rows' => $qRows, 'state' => $qState] = paginate_rows($queries, ['query', 'clicks', 'impressions', 'ctr', 'position'], 'clicks', 'desc', 'q'); ?>
    <div class="table-wrap">
      <table class="data">
        <tr>
          <?= sortable_th('query', 'Query', $qState) ?>
          <?= sortable_th('clicks', 'Clicks', $qState, 'num') ?>
          <?= sortable_th('impressions', 'Impressions', $qState, 'num') ?>
          <?= sortable_th('ctr', 'CTR', $qState, 'num') ?>
          <?= sortable_th('position', 'Position', $qState, 'num') ?>
          <th></th>
        </tr>
        <?php foreach ($qRows as $q): ?>
        <tr>
          <td><span class="truncate"><?= h($q['query']) ?></span></td>
          <td class="num"><?= fmt_num($q['clicks']) ?></td>
          <td class="num"><?= fmt_num($q['impressions']) ?></td>
          <td class="num"><?= fmt_pct($q['ctr']) ?></td>
          <td class="num"><?= number_format((float) $q['position'], 1) ?></td>
          <td class="num"><?= delete_button('gsc_queries', (int) $q['id']) ?></td>
        </tr>
        <?php endforeach; if (!$queries): ?>
        <tr><td colspan="6">No query data yet — run a sync from Settings.</td></tr>
        <?php endif; ?>
      </table>
    </div>
    <?= pagination_bar($qState) ?>
  </div>
  <div class="card">
    <h2>Top pages in search</h2>
    <?php ['rows' => $pRows, 'state' => $pState] = paginate_rows($pages, ['page', 'clicks', 'impressions', 'ctr', 'position'], 'clicks', 'desc', 'p'); ?>
    <div class="table-wrap">
      <table class="data">
        <tr>
          <?= sortable_th('page', 'Page', $pState) ?>
          <?= sortable_th('clicks', 'Clicks', $pState, 'num') ?>
          <?= sortable_th('impressions', 'Impressions', $pState, 'num') ?>
          <?= sortable_th('ctr', 'CTR', $pState, 'num') ?>
          <?= sortable_th('position', 'Position', $pState, 'num') ?>
          <th></th>
        </tr>
        <?php foreach ($pRows as $p): ?>
        <tr>
          <td><a href="<?= h($p['page']) ?>" target="_blank" rel="noopener"><span class="truncate"><?= h(parse_url($p['page'], PHP_URL_PATH) ?: $p['page']) ?></span></a></td>
          <td class="num"><?= fmt_num($p['clicks']) ?></td>
          <td class="num"><?= fmt_num($p['impressions']) ?></td>
          <td class="num"><?= fmt_pct($p['ctr']) ?></td>
          <td class="num"><?= number_format((float) $p['position'], 1) ?></td>
          <td class="num"><?= delete_button('gsc_pages', (int) $p['id']) ?></td>
        </tr>
        <?php endforeach; if (!$pages): ?>
        <tr><td colspan="6">No page data yet — run a sync from Settings.</td></tr>
        <?php endif; ?>
      </table>
    </div>
    <?= pagination_bar($pState) ?>
  </div>
</div>

<div class="card">
  <h2>Top pages by traffic (GA4)</h2>
  <?php ['rows' => $gpRows, 'state' => $gpState] = paginate_rows($gaPages, ['page', 'pageviews', 'users'], 'pageviews', 'desc', 'gp'); ?>
  <div class="table-wrap">
    <table class="data">
      <tr>
        <?= sortable_th('page', 'Page', $gpState) ?>
        <?= sortable_th('pageviews', 'Pageviews', $gpState, 'num') ?>
        <?= sortable_th('users', 'Users', $gpState, 'num') ?>
      </tr>
      <?php foreach ($gpRows as $p): ?>
      <tr>
        <td><span class="truncate"><?= h($p['page']) ?></span></td>
        <td class="num"><?= fmt_num($p['pageviews']) ?></td>
        <td class="num"><?= fmt_num($p['users']) ?></td>
      </tr>
      <?php endforeach; if (!$gaPages): ?>
      <tr><td colspan="3">No GA page data for this range yet.</td></tr>
      <?php endif; ?>
    </table>
  </div>
  <?= pagination_bar($gpState) ?>
</div>
