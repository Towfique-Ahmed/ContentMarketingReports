<?php
$byPlatform = [];
foreach ($totals as $t) { $byPlatform[$t['platform']] = $t; }
$prevBy = [];
foreach ($prevTotals as $t) { $prevBy[$t['platform']] = $t; }
?>

<?php if ($platform === null): ?>
  <div class="grid grid-4">
    <?php foreach ($platforms as $key => $label):
        $t = $byPlatform[$key] ?? [];
        $p = $prevBy[$key] ?? []; ?>
    <div class="card stat">
      <div class="stat-label"><?= h($label) ?> followers</div>
      <div class="stat-value"><?= fmt_num($t['followers'] ?? 0) ?></div>
      <?= delta_badge((float) ($t['followers'] ?? 0), (float) ($p['followers'] ?? 0)) ?>
      <div class="hint"><?= fmt_num($t['engagements'] ?? 0) ?> engagements · <a href="?page=social&platform=<?= h($key) ?>">details</a></div>
    </div>
    <?php endforeach; ?>
  </div>

  <div class="card">
    <h2>Engagements by platform</h2>
    <div class="chart-box tall">
      <?php
      $labels = [];
      $datasets = [];
      $i = 0;
      foreach ($platforms as $key => $label) {
          $s = $allSeries[$key] ?? [];
          if (!$labels) { $labels = array_column($s, 'date'); }
          $datasets[] = ['label' => $label, 'data' => array_map('intval', array_column($s, 'engagements'))];
          $i++;
      }
      ?>
      <canvas class="chart" data-chart="<?= chart_json(['type' => 'line', 'labels' => $labels, 'datasets' => $datasets]) ?>"></canvas>
    </div>
  </div>

  <div class="card" style="margin-top:16px">
    <h2>Platform comparison</h2>
    <div class="table-wrap">
      <table class="data">
        <tr><th>Platform</th><th class="num">Followers</th><th class="num">Impressions</th><th class="num">Engagements</th><th class="num">Eng. rate</th><th class="num">Clicks</th><th class="num">Video views</th></tr>
        <?php foreach ($platforms as $key => $label): $t = $byPlatform[$key] ?? null; if (!$t) continue; ?>
        <tr>
          <td><a href="?page=social&platform=<?= h($key) ?>"><?= h($label) ?></a></td>
          <td class="num"><?= fmt_num($t['followers']) ?></td>
          <td class="num"><?= fmt_num($t['impressions']) ?></td>
          <td class="num"><?= fmt_num($t['engagements']) ?></td>
          <td class="num"><?= $t['impressions'] > 0 ? fmt_pct($t['engagements'] / $t['impressions'] * 100) : '—' ?></td>
          <td class="num"><?= fmt_num($t['clicks']) ?></td>
          <td class="num"><?= fmt_num($t['video_views']) ?></td>
        </tr>
        <?php endforeach; ?>
      </table>
    </div>
  </div>

<?php else:
    $t = $byPlatform[$platform] ?? [];
    $p = $prevBy[$platform] ?? []; ?>
  <div class="grid grid-4">
    <div class="card stat">
      <div class="stat-label">Followers<?= $platform === 'youtube' ? ' / Subscribers' : '' ?></div>
      <div class="stat-value"><?= fmt_num($t['followers'] ?? 0) ?></div>
      <?= delta_badge((float) ($t['followers'] ?? 0), (float) ($p['followers'] ?? 0)) ?>
    </div>
    <div class="card stat">
      <div class="stat-label">Impressions</div>
      <div class="stat-value"><?= fmt_num($t['impressions'] ?? 0) ?></div>
      <?= delta_badge((float) ($t['impressions'] ?? 0), (float) ($p['impressions'] ?? 0)) ?>
    </div>
    <div class="card stat">
      <div class="stat-label">Engagements</div>
      <div class="stat-value"><?= fmt_num($t['engagements'] ?? 0) ?></div>
      <?= delta_badge((float) ($t['engagements'] ?? 0), (float) ($p['engagements'] ?? 0)) ?>
    </div>
    <div class="card stat">
      <div class="stat-label"><?= $platform === 'youtube' ? 'Video views' : 'Link clicks' ?></div>
      <?php $key = $platform === 'youtube' ? 'video_views' : 'clicks'; ?>
      <div class="stat-value"><?= fmt_num($t[$key] ?? 0) ?></div>
      <?= delta_badge((float) ($t[$key] ?? 0), (float) ($p[$key] ?? 0)) ?>
    </div>
  </div>

  <div class="grid grid-2">
    <div class="card">
      <h2>Follower growth</h2>
      <div class="chart-box">
        <canvas class="chart" data-chart="<?= chart_json([
            'type' => 'line',
            'labels' => array_column($series, 'date'),
            'datasets' => [['label' => 'Followers', 'data' => array_map('intval', array_column($series, 'followers')), 'fill' => true]],
        ]) ?>"></canvas>
      </div>
    </div>
    <div class="card">
      <h2>Impressions &amp; engagements</h2>
      <div class="chart-box">
        <canvas class="chart" data-chart="<?= chart_json([
            'type' => 'line',
            'labels' => array_column($series, 'date'),
            'datasets' => [
                ['label' => 'Impressions', 'data' => array_map('intval', array_column($series, 'impressions'))],
                ['label' => 'Engagements', 'data' => array_map('intval', array_column($series, 'engagements'))],
            ],
        ]) ?>"></canvas>
      </div>
    </div>
  </div>

  <div class="card">
    <h2>Recent posts</h2>
    <div class="table-wrap">
      <table class="data">
        <tr><th>Date</th><th>Post</th><th class="num">Impressions</th><th class="num">Engagements</th><th class="num">Clicks</th><?= $platform === 'youtube' ? '<th class="num">Views</th>' : '' ?><th></th></tr>
        <?php foreach ($posts as $post): ?>
        <tr>
          <td><?= h($post['posted_at']) ?></td>
          <td><a href="<?= h($post['url']) ?>" target="_blank" rel="noopener"><span class="truncate"><?= h($post['title']) ?></span></a></td>
          <td class="num"><?= fmt_num($post['impressions']) ?></td>
          <td class="num"><?= fmt_num($post['engagements']) ?></td>
          <td class="num"><?= fmt_num($post['clicks']) ?></td>
          <?= $platform === 'youtube' ? '<td class="num">' . fmt_num($post['video_views']) . '</td>' : '' ?>
          <td class="num"><?= delete_button('social_posts', (int) $post['id']) ?></td>
        </tr>
        <?php endforeach; if (!$posts): ?>
        <tr><td colspan="7">No posts tracked yet for this platform.</td></tr>
        <?php endif; ?>
      </table>
    </div>
  </div>
<?php endif; ?>
