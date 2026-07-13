<?php use App\Core\Settings; $s = fn (string $k) => h(Settings::get($k) ?? ''); ?>

<?php if ($saved): ?>
<div class="notice">✓ Settings saved.</div>
<?php endif; ?>

<form method="post">
<div class="form-grid">
  <div class="card">
    <h2>General</h2>
    <div class="field">
      <label>Site / team name</label>
      <input name="site_name" value="<?= $s('site_name') ?>">
    </div>
    <div class="field">
      <label>Timezone</label>
      <input name="timezone" value="<?= $s('timezone') ?>" placeholder="UTC, Asia/Dhaka, America/New_York…">
    </div>
    <div class="field">
      <label>Daily sync time (24h, HH:MM)</label>
      <input name="sync_time" value="<?= $s('sync_time') ?>" pattern="[0-2][0-9]:[0-5][0-9]" placeholder="06:00">
      <div class="hint">All connected sources refresh automatically at this time each day (see cron setup below).</div>
    </div>
    <div class="field">
      <label>Web-cron token</label>
      <input name="cron_token" value="<?= $s('cron_token') ?>">
      <div class="hint">Used by the <code class="inline">?page=cron&amp;token=…</code> endpoint for shared hosting.</div>
    </div>
  </div>

  <div class="card">
    <h2>Google (Search Console + GA4)</h2>
    <div class="field">
      <label>Service account JSON key</label>
      <textarea name="google_service_account_json" placeholder='{"type":"service_account", …}'><?= $s('google_service_account_json') ?></textarea>
      <div class="hint">Google Cloud → IAM → Service Accounts → create key (JSON). Enable the “Google Search Console API” and “Google Analytics Data API”, then add the service-account email as a user in Search Console and as a Viewer on the GA4 property.</div>
    </div>
    <div class="field">
      <label>Search Console property URL</label>
      <input name="gsc_site_url" value="<?= $s('gsc_site_url') ?>" placeholder="sc-domain:example.com or https://example.com/">
    </div>
    <div class="field">
      <label>GA4 property ID</label>
      <input name="ga4_property_id" value="<?= $s('ga4_property_id') ?>" placeholder="123456789">
    </div>
  </div>

  <div class="card">
    <h2>Facebook &amp; LinkedIn</h2>
    <div class="field">
      <label>Facebook page access token</label>
      <input name="facebook_page_token" value="<?= $s('facebook_page_token') ?>">
    </div>
    <div class="field">
      <label>Facebook page ID</label>
      <input name="facebook_page_id" value="<?= $s('facebook_page_id') ?>">
    </div>
    <div class="field">
      <label>LinkedIn access token</label>
      <input name="linkedin_access_token" value="<?= $s('linkedin_access_token') ?>">
      <div class="hint">Needs the <code class="inline">r_organization_social</code> scope.</div>
    </div>
    <div class="field">
      <label>LinkedIn organization URN</label>
      <input name="linkedin_org_urn" value="<?= $s('linkedin_org_urn') ?>" placeholder="urn:li:organization:12345">
    </div>
  </div>

  <div class="card">
    <h2>X / Twitter &amp; YouTube</h2>
    <div class="field">
      <label>X (Twitter) API v2 bearer token</label>
      <input name="twitter_bearer_token" value="<?= $s('twitter_bearer_token') ?>">
    </div>
    <div class="field">
      <label>X user ID (numeric)</label>
      <input name="twitter_user_id" value="<?= $s('twitter_user_id') ?>">
    </div>
    <div class="field">
      <label>YouTube Data API key</label>
      <input name="youtube_api_key" value="<?= $s('youtube_api_key') ?>">
    </div>
    <div class="field">
      <label>YouTube channel ID</label>
      <input name="youtube_channel_id" value="<?= $s('youtube_channel_id') ?>" placeholder="UC…">
    </div>
  </div>
</div>
<p style="margin:16px 0">
  <button class="btn" type="submit">Save settings</button>
  <a class="btn btn-secondary" href="?page=sync-now" style="margin-left:8px">Run sync now</a>
</p>
</form>

<div class="card">
  <h2>Automatic daily sync — cron setup</h2>
  <p>Option 1 (recommended, exact time honoured automatically):</p>
  <pre class="block">*/5 * * * * php <?= h(BASE_PATH) ?>/bin/scheduler.php</pre>
  <p>Option 2 (fixed time in crontab itself):</p>
  <pre class="block">0 6 * * * php <?= h(BASE_PATH) ?>/bin/sync.php</pre>
  <p>Option 3 (shared hosting web cron — cron-job.org, cPanel cron with curl, …):</p>
  <pre class="block">*/5 * * * * curl -s "https://your-domain.example/?page=cron&amp;token=<?= $s('cron_token') ?>"</pre>
  <p class="hint">Options 1 and 3 check every few minutes and fire once per day at the “Daily sync time” configured above.</p>
</div>

<div class="card" style="margin-top:16px">
  <h2>Sync history</h2>
  <div class="table-wrap">
    <table class="data">
      <tr><th>When</th><th>Source</th><th>Status</th><th>Message</th></tr>
      <?php foreach ($log as $row): ?>
      <tr>
        <td style="white-space:nowrap"><?= h($row['ran_at']) ?></td>
        <td><?= h($row['source']) ?></td>
        <td><span class="status-<?= h($row['status']) ?>"><?= h($row['status']) ?></span></td>
        <td><?= h($row['message']) ?></td>
      </tr>
      <?php endforeach; if (!$log): ?>
      <tr><td colspan="4">No syncs recorded yet.</td></tr>
      <?php endif; ?>
    </table>
  </div>
</div>
