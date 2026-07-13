<div class="card">
  <h2>Sync finished</h2>
  <div class="table-wrap">
    <table class="data">
      <tr><th>Source</th><th>Status</th><th>Message</th></tr>
      <?php foreach ($results as $source => [$status, $message]): ?>
      <tr>
        <td><?= h($source) ?></td>
        <td><span class="status-<?= h($status) ?>"><?= h($status) ?></span></td>
        <td><?= h($message) ?></td>
      </tr>
      <?php endforeach; ?>
    </table>
  </div>
  <p style="margin-top:12px">
    <a class="btn" href="?page=dashboard">Back to dashboard</a>
    <a class="btn btn-secondary" href="?page=settings" style="margin-left:8px">Settings</a>
  </p>
  <p class="hint">Sources marked “skipped” have no credentials configured yet — add them in Settings.</p>
</div>
