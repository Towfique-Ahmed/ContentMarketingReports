<?php if (!empty($flash)): ?>
<div class="notice"><?= h($flash) ?></div>
<?php endif; ?>

<?php if ($month === null): ?>
<!-- ==================== ALL MONTHS OVERVIEW ==================== -->
<div class="card">
  <h2>All months at a glance <span class="sub" style="display:inline">— click a month for its full report</span></h2>
  <div class="table-wrap">
    <table class="data">
      <tr>
        <th>Month</th>
        <th class="num">Sessions</th><th class="num">Users</th>
        <th class="num">Search clicks</th><th class="num">Impressions</th><th class="num">Avg pos</th>
        <th class="num">Content published</th>
        <th class="num">Emails sent</th><th class="num">Open rate</th>
        <th class="num">Social engagements</th>
        <th class="num">Campaign spend</th><th class="num">MoM sessions</th>
      </tr>
      <?php
      $prevRow = null;
      foreach (array_reverse($summaries) as $s) {
          $rows[] = $s; // chronological for MoM, displayed newest-first below
      }
      $withMom = [];
      $prev = null;
      foreach ($rows ?? [] as $s) {
          $s['_prev_sessions'] = $prev['sessions'] ?? null;
          $withMom[] = $s;
          $prev = $s;
      }
      foreach (array_reverse($withMom) as $s):
          $emailDen = $s['email_sent']; ?>
      <tr>
        <td style="white-space:nowrap"><a href="?page=monthly&month=<?= h($s['month']) ?>"><strong><?= h(date('F Y', strtotime($s['month'] . '-01'))) ?></strong></a></td>
        <td class="num"><?= fmt_num($s['sessions']) ?></td>
        <td class="num"><?= fmt_num($s['users']) ?></td>
        <td class="num"><?= fmt_num($s['gsc_clicks']) ?></td>
        <td class="num"><?= fmt_num($s['gsc_impressions']) ?></td>
        <td class="num"><?= $s['gsc_position'] ? number_format($s['gsc_position'], 1) : '—' ?></td>
        <td class="num"><?= $s['content_published'] ?: '—' ?></td>
        <td class="num"><?= fmt_num($s['email_sent']) ?></td>
        <td class="num"><?= $emailDen > 0 ? fmt_pct($s['email_opens'] / $emailDen * 100) : '—' ?></td>
        <td class="num"><?= fmt_num($s['social_engagements']) ?></td>
        <td class="num"><?= $s['campaign_cost'] ? fmt_money($s['campaign_cost']) : '—' ?></td>
        <td class="num"><?= $s['_prev_sessions'] !== null ? delta_badge((float) $s['sessions'], (float) $s['_prev_sessions']) : '—' ?></td>
      </tr>
      <?php endforeach; if (!$summaries): ?>
      <tr><td colspan="12">No monthly data yet — sync, import CSVs, or add data in the Data Manager.</td></tr>
      <?php endif; ?>
    </table>
  </div>
</div>

<div class="card" style="margin-top:16px">
  <h2>Sessions &amp; search clicks by month</h2>
  <div class="chart-box tall">
    <?php $chrono = array_reverse($summaries); ?>
    <canvas class="chart" data-chart="<?= chart_json([
        'type' => 'bar',
        'labels' => array_column($chrono, 'month'),
        'datasets' => [
            ['label' => 'Sessions',      'data' => array_map('intval', array_column($chrono, 'sessions'))],
            ['label' => 'Search clicks', 'data' => array_map('intval', array_column($chrono, 'gsc_clicks'))],
        ],
    ]) ?>"></canvas>
  </div>
</div>

<?php else: ?>
<!-- ==================== SINGLE MONTH REPORT ==================== -->
<div class="card" style="margin-bottom:16px">
  <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px">
    <div>
      <?php if ($prevMonth): ?><a class="btn btn-secondary" href="?page=monthly&month=<?= h($prevMonth) ?>">← <?= h(date('M Y', strtotime($prevMonth . '-01'))) ?></a><?php endif; ?>
      <?php if ($nextMonth): ?><a class="btn btn-secondary" href="?page=monthly&month=<?= h($nextMonth) ?>"><?= h(date('M Y', strtotime($nextMonth . '-01'))) ?> →</a><?php endif; ?>
    </div>
    <form method="get" style="display:flex; gap:6px; align-items:center">
      <input type="hidden" name="page" value="monthly">
      <select name="month" onchange="this.form.submit()">
        <?php foreach ($months as $m): ?>
        <option value="<?= h($m) ?>"<?= $m === $month ? ' selected' : '' ?>><?= h(date('F Y', strtotime($m . '-01'))) ?></option>
        <?php endforeach; ?>
      </select>
      <a class="btn btn-secondary" href="?page=monthly">All months</a>
      <a class="btn" href="?page=monthly&month=<?= h($month) ?>&export=1">Export CSV</a>
    </form>
  </div>
</div>

<?php $s = $summary; $p = $prevSummary; ?>
<div class="grid grid-4">
  <div class="card stat">
    <div class="stat-label">Sessions</div>
    <div class="stat-value"><?= fmt_num($s['sessions']) ?></div>
    <?= delta_badge((float) $s['sessions'], (float) $p['sessions']) ?>
  </div>
  <div class="card stat">
    <div class="stat-label">Users</div>
    <div class="stat-value"><?= fmt_num($s['users']) ?></div>
    <?= delta_badge((float) $s['users'], (float) $p['users']) ?>
  </div>
  <div class="card stat">
    <div class="stat-label">Search Clicks</div>
    <div class="stat-value"><?= fmt_num($s['gsc_clicks']) ?></div>
    <?= delta_badge((float) $s['gsc_clicks'], (float) $p['gsc_clicks']) ?>
  </div>
  <div class="card stat">
    <div class="stat-label">Search Impressions</div>
    <div class="stat-value"><?= fmt_num($s['gsc_impressions']) ?></div>
    <?= delta_badge((float) $s['gsc_impressions'], (float) $p['gsc_impressions']) ?>
  </div>
</div>
<div class="grid grid-4">
  <div class="card stat">
    <div class="stat-label">Avg Position</div>
    <div class="stat-value"><?= $s['gsc_position'] ? number_format($s['gsc_position'], 1) : '—' ?></div>
    <?= delta_badge((float) $s['gsc_position'], (float) $p['gsc_position'], lowerIsBetter: true) ?>
  </div>
  <div class="card stat">
    <div class="stat-label">Content Published</div>
    <div class="stat-value"><?= $s['content_published'] ?></div>
    <?= delta_badge((float) $s['content_published'], (float) $p['content_published']) ?>
  </div>
  <div class="card stat">
    <div class="stat-label">Emails Sent</div>
    <div class="stat-value"><?= fmt_num($s['email_sent']) ?></div>
    <?= delta_badge((float) $s['email_sent'], (float) $p['email_sent']) ?>
  </div>
  <div class="card stat">
    <div class="stat-label">Social Engagements</div>
    <div class="stat-value"><?= fmt_num($s['social_engagements']) ?></div>
    <?= delta_badge((float) $s['social_engagements'], (float) $p['social_engagements']) ?>
  </div>
</div>

<div class="grid grid-2">
  <div class="card">
    <h2><?= h(date('F', strtotime($month . '-01'))) ?> highlights &amp; notes</h2>
    <?php if ($notes): ?>
    <div class="table-wrap" style="margin-bottom:10px">
      <table class="data">
        <?php foreach ($notes as $n): ?>
        <tr>
          <td style="width:90px"><span class="badge"><?= h($n['category']) ?></span></td>
          <td><?= h($n['note']) ?></td>
          <td class="num" style="width:40px"><?= delete_button('monthly_notes', (int) $n['id']) ?></td>
        </tr>
        <?php endforeach; ?>
      </table>
    </div>
    <?php else: ?>
    <p class="hint" style="margin-bottom:10px">Capture what happened this month — releases, wins, campaigns, anything worth remembering.</p>
    <?php endif; ?>
    <form method="post" style="display:flex; gap:6px; flex-wrap:wrap">
      <input type="hidden" name="action" value="add_note">
      <select name="category" style="width:130px">
        <?php foreach (['highlight', 'release', 'content', 'social', 'email', 'other'] as $c): ?>
        <option value="<?= $c ?>"><?= ucfirst($c) ?></option>
        <?php endforeach; ?>
      </select>
      <input name="note" placeholder="e.g. Shipped v2.5 — Free Mailbox launch" required
             style="flex:1; min-width:220px; background:var(--page); color:var(--text-primary); border:1px solid var(--border); border-radius:8px; padding:8px 10px; font-size:13px">
      <button class="btn" type="submit">Add</button>
    </form>
  </div>

  <div class="card">
    <h2>Acquisition channels this month</h2>
    <div class="table-wrap">
      <table class="data">
        <tr><th>Channel</th><th class="num">Sessions</th><th class="num">Users</th><th class="num">Conversions</th></tr>
        <?php foreach (array_slice($channels, 0, 8) as $i => $ch): ?>
        <tr>
          <td><span class="swatch" style="background:var(--series-<?= ($i % 8) + 1 ?>)"></span><?= h($ch['channel']) ?></td>
          <td class="num"><?= fmt_num($ch['sessions']) ?></td>
          <td class="num"><?= fmt_num($ch['users']) ?></td>
          <td class="num"><?= fmt_num($ch['conversions']) ?></td>
        </tr>
        <?php endforeach; if (!$channels): ?>
        <tr><td colspan="4">No channel data for this month.</td></tr>
        <?php endif; ?>
      </table>
    </div>
  </div>
</div>

<div class="card" style="margin-top:16px">
  <h2>Content published in <?= h(date('F Y', strtotime($month . '-01'))) ?> (<?= count($content) ?>)</h2>
  <div class="table-wrap">
    <table class="data">
      <tr><th>Date</th><th>Type</th><th>Title</th><th>Funnel</th><th>Author</th><th>Target keyword</th><th class="num">Views</th><th></th></tr>
      <?php foreach ($content as $c): ?>
      <tr>
        <td style="white-space:nowrap"><?= h($c['published_at']) ?></td>
        <td><span class="badge"><?= h(str_replace('_', ' ', $c['type'])) ?></span></td>
        <td><a href="<?= h($c['url']) ?>" target="_blank" rel="noopener"><span class="truncate"><?= h($c['title']) ?></span></a></td>
        <td><?= h((string) $c['funnel_stage']) ?></td>
        <td><?= h((string) $c['author']) ?></td>
        <td><span class="truncate" style="max-width:180px"><?= h((string) $c['target_keyword']) ?></span></td>
        <td class="num"><?= $c['views'] ? fmt_num($c['views']) : '—' ?></td>
        <td class="num"><?= delete_button('content_items', (int) $c['id']) ?></td>
      </tr>
      <?php endforeach; if (!$content): ?>
      <tr><td colspan="8">Nothing published this month.</td></tr>
      <?php endif; ?>
    </table>
  </div>
</div>

<div class="grid grid-2" style="margin-top:16px">
  <div class="card">
    <h2>Email campaigns this month (<?= count($emails) ?>)</h2>
    <div class="table-wrap">
      <table class="data">
        <tr><th>Date</th><th>Campaign</th><th class="num">Sent</th><th class="num">Opens</th><th class="num">Open rate</th><th></th></tr>
        <?php foreach ($emails as $e2):
            $den = $e2['delivered'] ?: $e2['sent']; ?>
        <tr>
          <td style="white-space:nowrap"><?= h($e2['date']) ?></td>
          <td><span class="truncate" style="max-width:220px"><?= h($e2['name']) ?></span></td>
          <td class="num"><?= fmt_num($e2['sent']) ?></td>
          <td class="num"><?= fmt_num($e2['opens']) ?></td>
          <td class="num"><?= $den > 0 ? fmt_pct($e2['opens'] / $den * 100) : '—' ?></td>
          <td class="num"><?= delete_button('email_campaigns', (int) $e2['id']) ?></td>
        </tr>
        <?php endforeach; if (!$emails): ?>
        <tr><td colspan="6">No email campaigns this month.</td></tr>
        <?php endif; ?>
      </table>
    </div>
  </div>

  <div class="card">
    <h2>Social this month</h2>
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
        <?php endforeach; if (!$social): ?>
        <tr><td colspan="4">No social data this month.</td></tr>
        <?php endif; ?>
      </table>
    </div>
  </div>
</div>

<div class="card" style="margin-top:16px">
  <h2>Danger zone — delete this month's data by source</h2>
  <p class="hint" style="margin-bottom:10px">
    Each button removes <strong>only <?= h(date('F Y', strtotime($month . '-01'))) ?></strong> rows for that source.
    Useful when an import went wrong and you want to redo one month. This cannot be undone.
  </p>
  <div style="display:flex; gap:8px; flex-wrap:wrap">
    <?php foreach (['analytics' => 'Analytics (GA4)', 'search_console' => 'Search Console', 'social' => 'Social',
                    'email' => 'Email campaigns', 'campaigns' => 'Campaign metrics',
                    'content_metrics' => 'Content metrics', 'keywords' => 'Keyword rankings'] as $key => $label): ?>
    <form method="post" onsubmit="return confirm('Delete all <?= h($label) ?> data for <?= h($month) ?>? This cannot be undone.')">
      <input type="hidden" name="action" value="delete_month_source">
      <input type="hidden" name="source" value="<?= h($key) ?>">
      <button class="btn btn-secondary" type="submit">✕ <?= h($label) ?></button>
    </form>
    <?php endforeach; ?>
  </div>
</div>
<?php endif; ?>
