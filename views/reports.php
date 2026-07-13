<div class="card">
  <h2>Yearly summary <span class="sub" style="display:inline">(all sources, year over year)</span></h2>
  <div class="table-wrap">
    <table class="data">
      <tr>
        <th>Year</th><th class="num">Sessions</th><th class="num">Users</th><th class="num">Pageviews</th>
        <th class="num">Conversions</th><th class="num">Search clicks</th><th class="num">Social engagements</th>
        <th class="num">YoY sessions</th>
      </tr>
      <?php $prevRow = null; foreach ($yearly as $y): ?>
      <tr>
        <td><a href="<?= h(url_with(['year' => $y['y']])) ?>"><?= h($y['y']) ?></a></td>
        <td class="num"><?= fmt_num($y['sessions']) ?></td>
        <td class="num"><?= fmt_num($y['users']) ?></td>
        <td class="num"><?= fmt_num($y['pageviews']) ?></td>
        <td class="num"><?= fmt_num($y['conversions']) ?></td>
        <td class="num"><?= fmt_num($y['gsc_clicks']) ?></td>
        <td class="num"><?= fmt_num($y['social_engagements']) ?></td>
        <td class="num"><?= $prevRow ? delta_badge((float) $y['sessions'], (float) $prevRow['sessions']) : '—' ?></td>
      </tr>
      <?php $prevRow = $y; endforeach; ?>
    </table>
  </div>
</div>

<div class="card" style="margin-top:16px">
  <h2>
    Monthly report — <?= (int) $year ?>
    <span style="float:right; font-weight:400; font-size:13px">
      <?php foreach ($years as $y): ?>
        <a class="range-btn<?= $y === $year ? ' active' : '' ?>" href="<?= h(url_with(['year' => $y])) ?>"><?= $y ?></a>
      <?php endforeach; ?>
    </span>
  </h2>
  <div class="chart-box tall">
    <canvas class="chart" data-chart="<?= chart_json([
        'type' => 'bar',
        'labels' => array_column($monthly, 'ym'),
        'datasets' => [
            ['label' => 'Sessions',      'data' => array_map('intval', array_column($monthly, 'sessions'))],
            ['label' => 'Search clicks', 'data' => array_map('intval', array_column($monthly, 'gsc_clicks'))],
        ],
    ]) ?>"></canvas>
  </div>
</div>

<div class="card" style="margin-top:16px">
  <h2>Monthly breakdown — <?= (int) $year ?></h2>
  <div class="table-wrap">
    <table class="data">
      <tr>
        <th>Month</th><th class="num">Sessions</th><th class="num">Users</th><th class="num">Pageviews</th>
        <th class="num">Conversions</th><th class="num">Search clicks</th><th class="num">Search impressions</th>
        <th class="num">Social engagements</th><th class="num">MoM sessions</th>
      </tr>
      <?php $prevRow = null; foreach ($monthly as $m): ?>
      <tr>
        <td><?= h(date('F', mktime(0, 0, 0, (int) substr($m['ym'], 5, 2), 1))) ?></td>
        <td class="num"><?= fmt_num($m['sessions']) ?></td>
        <td class="num"><?= fmt_num($m['users']) ?></td>
        <td class="num"><?= fmt_num($m['pageviews']) ?></td>
        <td class="num"><?= fmt_num($m['conversions']) ?></td>
        <td class="num"><?= fmt_num($m['gsc_clicks']) ?></td>
        <td class="num"><?= fmt_num($m['gsc_impressions']) ?></td>
        <td class="num"><?= fmt_num($m['social_engagements']) ?></td>
        <td class="num"><?= $prevRow ? delta_badge((float) $m['sessions'], (float) $prevRow['sessions']) : '—' ?></td>
      </tr>
      <?php $prevRow = $m; endforeach; if (!$monthly): ?>
      <tr><td colspan="9">No data recorded for <?= (int) $year ?>.</td></tr>
      <?php endif; ?>
    </table>
  </div>
</div>
