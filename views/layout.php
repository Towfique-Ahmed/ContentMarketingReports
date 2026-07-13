<?php use App\Core\Settings; ?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title><?= h($title ?? 'Reports') ?> · <?= h(Settings::get('site_name', 'Analytio')) ?></title>
<link rel="stylesheet" href="/assets/css/app.css">
<script src="/assets/js/chart.umd.min.js"></script>
</head>
<body>
<div class="app">
  <aside class="sidebar">
    <div class="brand">
      <span class="brand-mark">📊</span>
      <span class="brand-name"><?= h(Settings::get('site_name', 'Analytio')) ?></span>
    </div>
    <nav>
      <?php
      $nav = [
          ['dashboard',      'Overview',            '?page=dashboard'],
          ['_head_content',  'Content',             null],
          ['content',        'Blog',                '?page=content&type=blog',          'blog'],
          ['content',        'Documentation',       '?page=content&type=documentation', 'documentation'],
          ['content',        'Landing Pages',       '?page=content&type=landing_page',  'landing_page'],
          ['content',        'Case Studies',        '?page=content&type=case_study',    'case_study'],
          ['_head_acq',      'Acquisition',         null],
          ['search-console', 'Google Search',       '?page=search-console'],
          ['analytics',      'Google Analytics',    '?page=analytics'],
          ['keywords',       'Keywords',            '?page=keywords'],
          ['email',          'Email Marketing',     '?page=email'],
          ['_head_social',   'Social Media',        null],
          ['social',         'All Platforms',       '?page=social',                     ''],
          ['social',         'Facebook',            '?page=social&platform=facebook',   'facebook'],
          ['social',         'LinkedIn',            '?page=social&platform=linkedin',   'linkedin'],
          ['social',         'X / Twitter',         '?page=social&platform=twitter',    'twitter'],
          ['social',         'YouTube',             '?page=social&platform=youtube',    'youtube'],
          ['_head_more',     'Reporting',           null],
          ['campaigns',      'Campaigns',           '?page=campaigns'],
          ['compare',        'Compare',             '?page=compare'],
          ['reports',        'Monthly & Yearly',    '?page=reports'],
          ['data',           'Data Manager',        '?page=data'],
          ['settings',       'Settings & Sync',     '?page=settings'],
      ];
      $curSub = $_GET['type'] ?? $_GET['platform'] ?? null;
      foreach ($nav as $item):
          if ($item[2] === null): ?>
            <div class="nav-head"><?= h($item[1]) ?></div>
          <?php else:
              $active = ($page === $item[0]) && (!isset($item[3]) || (string) $curSub === $item[3]);
          ?>
            <a class="nav-link<?= $active ? ' active' : '' ?>" href="<?= h($item[2]) ?>"><?= h($item[1]) ?></a>
          <?php endif;
      endforeach; ?>
    </nav>
    <?php if (Settings::get('demo_mode') === '1'): ?>
      <div class="demo-badge">Demo data — connect your accounts in Settings</div>
    <?php endif; ?>
  </aside>

  <main class="main">
    <header class="topbar">
      <h1><?= h($title ?? '') ?></h1>
      <?php if (!in_array($page, ['settings', 'compare', 'reports', 'sync-now', 'data'], true)): ?>
      <div class="range-picker">
        <?php foreach (['7d' => '7D', '30d' => '30D', '90d' => '90D', '12m' => '12M'] as $key => $label): ?>
          <a class="range-btn<?= ($_GET['range'] ?? '30d') === $key ? ' active' : '' ?>"
             href="<?= h(url_with(['range' => $key, 'from' => null, 'to' => null])) ?>"><?= $label ?></a>
        <?php endforeach; ?>
        <form method="get" class="range-custom">
          <?php foreach ($_GET as $k => $v): if (!in_array($k, ['range', 'from', 'to'], true)): ?>
            <input type="hidden" name="<?= h($k) ?>" value="<?= h($v) ?>">
          <?php endif; endforeach; ?>
          <input type="hidden" name="range" value="custom">
          <input type="date" name="from" value="<?= h($_GET['from'] ?? '') ?>" required>
          <span>→</span>
          <input type="date" name="to" value="<?= h($_GET['to'] ?? '') ?>" required>
          <button type="submit">Go</button>
        </form>
      </div>
      <?php endif; ?>
    </header>
    <div class="range-label"><?= h($rangeLabel ?? '') ?><?= isset($prevStart) ? ' · compared with previous period' : '' ?></div>

    <?= $content ?>
  </main>
</div>
<script src="/assets/js/app.js"></script>
</body>
</html>
