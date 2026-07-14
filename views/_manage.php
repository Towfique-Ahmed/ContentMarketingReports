<?php
/**
 * Per-page "Manage data" + "Settings & sync" panels.
 *
 * Included by layout.php beneath every report that has a page_manage_config().
 * Expects $page (report key) in scope; reads the current sub-selection
 * (content type / social platform) from the query string.
 *
 * All mutations post to the shared ?page=manage handler with a `back` URL so
 * the user returns to the same report with a flash message.
 */

use App\Core\DataSets;
use App\Core\Settings;

$sub = (string) ($_GET['type'] ?? $_GET['platform'] ?? '');
$cfg = page_manage_config($page, $sub);
if (!$cfg) {
    return;
}
$back    = $_SERVER['REQUEST_URI'] ?? ('?page=' . $page);
$allSets = DataSets::all();
?>

<details class="manage" style="margin-top:20px">
  <summary>⚙︎ Manage <?= h($cfg['label']) ?> data &amp; settings</summary>
  <div class="manage-body">

    <?php if (!empty($cfg['sync']) || !empty($cfg['settings'])): ?>
    <div class="card" style="margin-bottom:16px">
      <h2>Settings &amp; sync</h2>

      <?php if (!empty($cfg['sync'])): ?>
      <div class="sync-row">
        <?php foreach ($cfg['sync'] as $source):
            $last = Settings::get('last_sync_' . $source); ?>
        <form method="post" action="?page=sync-now" style="display:inline">
          <input type="hidden" name="source" value="<?= h($source) ?>">
          <input type="hidden" name="back" value="<?= h($back) ?>">
          <button class="btn" type="submit">Sync <?= h(sync_source_label($source)) ?> now</button>
          <?php if ($last): ?><span class="hint" style="margin-left:6px">last: <?= h($last) ?></span><?php endif; ?>
        </form>
        <?php endforeach; ?>
      </div>
      <?php endif; ?>

      <?php if (!empty($cfg['settings'])): ?>
      <form method="post" action="?page=manage" style="margin-top:14px">
        <input type="hidden" name="action" value="save_settings">
        <input type="hidden" name="back" value="<?= h($back) ?>">
        <?php foreach ($cfg['settings'] as $f):
            $val = (string) (Settings::get($f['name']) ?? ''); ?>
        <div class="field">
          <label><?= h($f['label']) ?></label>
          <?php if ($f['type'] === 'textarea' || $f['type'] === 'json'): ?>
            <textarea name="s[<?= h($f['name']) ?>]" style="min-height:<?= $f['type'] === 'json' ? 120 : 70 ?>px"
                      placeholder="<?= h($f['ph']) ?>"><?= h($val) ?></textarea>
          <?php elseif ($f['type'] === 'password'): ?>
            <input type="password" name="s[<?= h($f['name']) ?>]" value="<?= h($val) ?>" placeholder="<?= h($f['ph']) ?>" autocomplete="off">
          <?php else: ?>
            <input type="text" name="s[<?= h($f['name']) ?>]" value="<?= h($val) ?>" placeholder="<?= h($f['ph']) ?>">
          <?php endif; ?>
          <?php if (!empty($f['hint'])): ?><div class="hint"><?= h($f['hint']) ?></div><?php endif; ?>
        </div>
        <?php endforeach; ?>
        <button class="btn" type="submit">Save settings</button>
      </form>
      <?php endif; ?>
    </div>
    <?php endif; ?>

    <?php foreach ($cfg['datasets'] as $setKey):
        $set = $allSets[$setKey] ?? null;
        if (!$set) { continue; }
        $isMatrix = isset($set['matrix']); ?>
    <div class="card" style="margin-bottom:16px">
      <h2><?= h($set['label']) ?></h2>
      <?php if (!empty($set['help'])): ?><p class="hint" style="margin-bottom:10px"><?= h($set['help']) ?></p><?php endif; ?>

      <div class="grid grid-2">
        <?php if (!$isMatrix): ?>
        <div>
          <h3 class="manage-sub">Add / update manually</h3>
          <form method="post" action="?page=manage">
            <input type="hidden" name="action" value="add">
            <input type="hidden" name="set" value="<?= h($setKey) ?>">
            <input type="hidden" name="back" value="<?= h($back) ?>">
            <?php foreach ($set['fields'] as $name => $spec):
                if ($spec['totals_only'] ?? false) { continue; }
                $label = $spec['label'] ?? ucwords(str_replace('_', ' ', $name));
                $req = ($spec['required'] ?? false) ? ' required' : ''; ?>
            <div class="field">
              <label><?= h($label) ?><?= $req ? ' *' : '' ?></label>
              <?php if ($spec['type'] === 'select'): ?>
                <select name="f[<?= h($name) ?>]"<?= $req ?>>
                  <?php foreach ($spec['options'] as $opt): ?>
                    <option value="<?= h($opt) ?>"><?= h(ucwords(str_replace('_', ' ', $opt))) ?></option>
                  <?php endforeach; ?>
                </select>
              <?php elseif ($spec['type'] === 'lookup'): ?>
                <select name="f[<?= h($name) ?>]"<?= $req ?>>
                  <?php foreach (DataSets::lookupOptions($spec) as $id => $text): ?>
                    <option value="<?= (int) $id ?>"><?= h(mb_strimwidth($text, 0, 70, '…')) ?></option>
                  <?php endforeach; ?>
                </select>
              <?php elseif ($spec['type'] === 'date'): ?>
                <input type="date" name="f[<?= h($name) ?>]"<?= $req ?>>
              <?php elseif ($spec['type'] === 'int' || $spec['type'] === 'float'): ?>
                <input type="number" step="<?= $spec['type'] === 'int' ? '1' : '0.01' ?>" name="f[<?= h($name) ?>]"<?= $req ?>>
              <?php else: ?>
                <input type="text" name="f[<?= h($name) ?>]"<?= $req ?>>
              <?php endif; ?>
            </div>
            <?php endforeach; ?>
            <button class="btn" type="submit">Save entry</button>
            <p class="hint" style="margin-top:8px">Saving with the same <?= h(implode(' + ', $set['unique'])) ?> updates the existing row.</p>
          </form>
        </div>
        <?php endif; ?>

        <div<?= $isMatrix ? ' style="grid-column:1 / -1"' : '' ?>>
          <h3 class="manage-sub">Import from CSV</h3>
          <form method="post" action="?page=manage" enctype="multipart/form-data">
            <input type="hidden" name="action" value="import">
            <input type="hidden" name="set" value="<?= h($setKey) ?>">
            <input type="hidden" name="back" value="<?= h($back) ?>">
            <div class="field">
              <label>CSV file</label>
              <input type="file" name="csv" accept=".csv,text/csv" required>
            </div>
            <?php if ($setKey === 'content_items'): ?>
            <div class="field">
              <label>If the file has no "type" column, treat every row as…</label>
              <select name="default_type">
                <option value="blog">Blog</option>
                <option value="documentation">Documentation</option>
                <option value="landing_page">Landing Page</option>
                <option value="case_study">Case Study</option>
              </select>
            </div>
            <?php endif; ?>
            <?php if (($set['matrix'] ?? '') === 'channels'): ?>
            <div class="field">
              <label>The numbers in the sheet are…</label>
              <select name="measure">
                <option value="sessions">Sessions (Traffic acquisition)</option>
                <option value="users">Users (User acquisition)</option>
                <option value="conversions">Conversions</option>
              </select>
            </div>
            <?php endif; ?>
            <button class="btn" type="submit">Upload &amp; import</button>
            <a class="btn btn-secondary" style="margin-left:8px" href="?page=template&amp;set=<?= h($setKey) ?>">Download CSV template</a>
          </form>
          <p class="hint" style="margin-top:10px">
            Tolerant importer: skips blank rows, accepts "1,234", "45.0%" and "–", finds the header row after
            title rows, and matches columns by name. Re-importing the same file is safe (rows upsert by key).
          </p>
        </div>
      </div>
    </div>
    <?php endforeach; ?>

  </div>
</details>
