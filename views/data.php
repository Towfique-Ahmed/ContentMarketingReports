<?php use App\Core\DataSets; ?>

<?php if ($flash): ?>
<div class="notice"><?= h($flash) ?></div>
<?php endif; ?>
<?php foreach ($importErrors as $err): ?>
<div class="notice" style="border-color: var(--bad)"><?= h($err) ?></div>
<?php endforeach; ?>

<div class="card" style="margin-bottom:16px">
  <h2>Choose a dataset</h2>
  <p class="hint" style="margin-bottom:10px">
    Every dataset can be filled three ways: <strong>automatically</strong> (daily API sync — configure in
    <a href="?page=settings">Settings</a>), <strong>manually</strong> (the form below), or by
    <strong>CSV import</strong> (upload below; download the template to see the expected columns).
  </p>
  <div style="display:flex; flex-wrap:wrap; gap:6px">
    <?php foreach ($sets as $key => $def): ?>
      <a class="range-btn<?= $key === $setKey ? ' active' : '' ?>" href="?page=data&set=<?= h($key) ?>"><?= h($def['label']) ?></a>
    <?php endforeach; ?>
  </div>
</div>

<?php $isMatrix = isset($set['matrix']); ?>

<div class="grid grid-2">
  <?php if (!$isMatrix): ?>
  <div class="card">
    <h2>Add / update manually</h2>
    <?php if (!empty($set['help'])): ?><p class="hint" style="margin-bottom:10px"><?= h($set['help']) ?></p><?php endif; ?>
    <form method="post">
      <input type="hidden" name="action" value="add">
      <?php foreach ($set['fields'] as $name => $spec):
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

  <div class="card">
    <h2>Import from CSV</h2>
    <?php if (!empty($set['help'])): ?><p class="hint" style="margin-bottom:10px"><?= h($set['help']) ?></p><?php endif; ?>
    <form method="post" enctype="multipart/form-data">
      <input type="hidden" name="action" value="import">
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
      <a class="btn btn-secondary" style="margin-left:8px" href="?page=data&set=<?= h($setKey) ?>&template=1">Download CSV template</a>
    </form>
    <p class="hint" style="margin-top:10px">
      The importer is tolerant: it skips blank rows, accepts "1,234", "45.0%", and "–", finds the header row even
      after title rows, and matches columns by name (several aliases accepted — e.g. “Campaign” for name).
      Existing rows with the same key are updated, so re-importing the same file is safe.
      Monthly figures ("Jan'25" columns or a YYYY-MM date) are stored on the 1st of the month.
    </p>
  </div>
</div>

<?php if (!$isMatrix && $recent): ?>
<div class="card" style="margin-top:16px">
  <h2>Latest entries in <?= h($set['label']) ?></h2>
  <div class="table-wrap">
    <table class="data">
      <tr>
        <?php foreach (array_keys($recent[0]) as $col): if ($col === '_rowid') continue; ?>
        <th><?= h($col) ?></th>
        <?php endforeach; ?>
        <th></th>
      </tr>
      <?php foreach ($recent as $row): ?>
      <tr>
        <?php foreach ($row as $col => $val): if ($col === '_rowid') continue; ?>
        <td><span class="truncate" style="max-width:220px"><?= h((string) $val) ?></span></td>
        <?php endforeach; ?>
        <td class="num">
          <form method="post" onsubmit="return confirm('Delete this row?')" style="display:inline">
            <input type="hidden" name="action" value="delete">
            <input type="hidden" name="rowid" value="<?= (int) $row['_rowid'] ?>">
            <button class="btn btn-secondary" type="submit">Delete</button>
          </form>
        </td>
      </tr>
      <?php endforeach; ?>
    </table>
  </div>
</div>
<?php endif; ?>
