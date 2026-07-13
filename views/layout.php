<?php
use App\Core\Settings;

$siteName = Settings::get('site_name', 'Analytio');
$logo     = Settings::get('brand_logo') ?: '📊';
$logoUrl  = Settings::get('brand_logo_url');
$accent   = Settings::get('accent_color');
$accentOk = $accent && preg_match('/^#[0-9a-fA-F]{3,8}$/', $accent);
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title><?= h($title ?? 'Reports') ?> · <?= h($siteName) ?></title>
<link rel="stylesheet" href="/assets/css/app.css">
<?php if ($accentOk): ?>
<style>
:root {
  --accent: <?= h($accent) ?>;
  --accent-wash: color-mix(in srgb, <?= h($accent) ?> 12%, transparent);
  --series-1: <?= h($accent) ?>;
}
</style>
<?php endif; ?>
<script src="/assets/js/chart.umd.min.js"></script>
</head>
<body>
<div class="app">
  <aside class="sidebar">
    <div class="brand">
      <?php if ($logoUrl): ?>
        <img class="brand-mark" src="<?= h($logoUrl) ?>" alt="" style="height:22px; width:auto; border-radius:4px">
      <?php else: ?>
        <span class="brand-mark"><?= h($logo) ?></span>
      <?php endif; ?>
      <span class="brand-name"><?= h($siteName) ?></span>
    </div>
    <nav>
      <?php
      $hidden = nav_hidden();
      $curSub = (string) ($_GET['type'] ?? $_GET['platform'] ?? '');
      foreach (nav_structure() as $section => $items):
          $visible = array_diff_key($items, array_flip($hidden));
          if (!$visible) {
              continue;
          }
          if ($section !== ''): ?>
            <div class="nav-head"><?= h($section) ?></div>
          <?php endif;
          foreach ($visible as [$label, $url, $navPage, $subKey]):
              $active = ($page === $navPage) && ($subKey === null || $curSub === $subKey); ?>
            <a class="nav-link<?= $active ? ' active' : '' ?>" href="<?= h($url) ?>"><?= h($label) ?></a>
          <?php endforeach;
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
