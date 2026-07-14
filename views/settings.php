<?php use App\Core\Settings; $s = fn (string $k) => h(Settings::get($k) ?? ''); ?>

<?php if ($saved): ?>
<div class="notice">✓ Settings saved.</div>
<?php endif; ?>
<?php if (!empty($flash)): ?>
<div class="notice"><?= h($flash) ?></div>
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
    <div class="field">
      <label>MCP token</label>
      <input name="mcp_token" value="<?= $s('mcp_token') ?>">
      <div class="hint">Authenticates the Claude MCP connector (see the card below).</div>
    </div>
  </div>

  <div class="card">
    <h2>Website — automatic content discovery</h2>
    <div class="field">
      <label>Website URL</label>
      <input name="site_base_url" value="<?= $s('site_base_url') ?>" placeholder="https://xcloud.host">
      <div class="hint">The daily sync auto-discovers published blogs, docs, case studies and landing pages
        from this site (WordPress REST API, or XML sitemaps as fallback) and keeps the content inventory updated.</div>
    </div>
    <div class="field">
      <label>WordPress username (optional)</label>
      <input name="wp_username" value="<?= $s('wp_username') ?>" placeholder="your-wp-admin-user">
    </div>
    <div class="field">
      <label>WordPress application password (optional)</label>
      <input name="wp_app_password" value="<?= $s('wp_app_password') ?>" placeholder="xxxx xxxx xxxx xxxx xxxx xxxx">
      <div class="hint">
        <strong>How to create:</strong> WP Admin → Users → Profile → scroll to
        <em>Application Passwords</em> → name it "Analytio" → Add → copy the generated password here.
        With credentials, the sync authenticates to the WordPress REST API — it works even when the
        site restricts anonymous API access, and it also collects <strong>blog view counts</strong>
        when a view-counter plugin (Post Views Counter, WP-PostViews, …) exposes them.
        Never use your login password — application passwords can be revoked anytime.
      </div>
    </div>
    <div class="field">
      <label>Content URL rules (type=path, one per line)</label>
      <textarea name="content_path_rules" style="min-height:80px" placeholder="blog=/blog/
documentation=/docs/
case_study=/case-study/
landing_page=/features/"><?= $s('content_path_rules') ?></textarea>
      <div class="hint">Used to classify pages by URL. Types: <code class="inline">blog</code>,
        <code class="inline">documentation</code>, <code class="inline">case_study</code>,
        <code class="inline">landing_page</code>.</div>
    </div>
  </div>

  <div class="card">
    <h2>Content exclusions — per type</h2>
    <p class="hint" style="margin-bottom:10px">
      URLs matching these patterns are never added by the auto-discovery, and already-tracked
      items that match are removed on the next sync. One pattern per line — plain text matches
      anywhere in the URL, and <code class="inline">*</code> works as a wildcard
      (e.g. <code class="inline">/tag/</code>, <code class="inline">*-old-*</code>).
    </p>
    <?php foreach (['blog' => 'Blog', 'documentation' => 'Documentation',
                    'landing_page' => 'Landing Pages', 'case_study' => 'Case Studies'] as $ct => $ctLabel): ?>
    <div class="field">
      <label>Exclude from <?= h($ctLabel) ?></label>
      <textarea name="content_exclude_<?= h($ct) ?>" style="min-height:52px"
                placeholder="/tag/&#10;/author/"><?= $s('content_exclude_' . $ct) ?></textarea>
    </div>
    <?php endforeach; ?>
  </div>

  <div class="card">
    <h2>Branding</h2>
    <div class="field">
      <label>Logo (emoji or short text)</label>
      <input name="brand_logo" value="<?= $s('brand_logo') ?>" placeholder="📊" maxlength="8">
    </div>
    <div class="field">
      <label>Logo image URL (optional — overrides the emoji)</label>
      <input name="brand_logo_url" value="<?= $s('brand_logo_url') ?>" placeholder="https://your-site.com/logo.png">
      <div class="hint">Use a small square image (~44×44px works best).</div>
    </div>
    <div class="field">
      <label>Accent color</label>
      <input type="color" name="accent_color" value="<?= $s('accent_color') ?: '#2a78d6' ?>" style="height:38px; padding:2px; width:80px">
      <div class="hint">Used for buttons, active nav, links and the primary chart series. Default is <code class="inline">#2a78d6</code>.</div>
    </div>
  </div>

  <div class="card">
    <h2>Sidebar — show / hide sections</h2>
    <p class="hint" style="margin-bottom:10px">Untick anything your team doesn't use. Settings can't be hidden.</p>
    <input type="hidden" name="nav_form" value="1">
    <?php $hiddenNav = nav_hidden(); ?>
    <?php foreach (nav_structure() as $section => $items): ?>
      <?php if ($section !== ''): ?><div class="nav-head" style="padding-left:0"><?= h($section) ?></div><?php endif; ?>
      <?php foreach ($items as $key => [$label]): ?>
        <label style="display:inline-flex; align-items:center; gap:6px; margin:2px 14px 2px 0; font-size:13px">
          <input type="checkbox" name="nav_visible[]" value="<?= h($key) ?>"
                 <?= in_array($key, $hiddenNav, true) ? '' : 'checked' ?>
                 <?= $key === 'settings' ? 'disabled checked' : '' ?>>
          <?= h($label) ?>
        </label>
      <?php endforeach; ?>
    <?php endforeach; ?>
    <input type="hidden" name="nav_visible[]" value="settings">
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

<div class="card" style="margin-bottom:16px">
  <h2>Claude MCP connector</h2>
  <p class="hint" style="margin-bottom:10px">
    Manage this dashboard from Claude chat: read reports, add/update/delete data, and trigger syncs.
    Add it as a <strong>custom connector</strong> in Claude (Settings → Connectors → Add custom connector)
    using this URL:
  </p>
  <pre class="block">https://<?= h($_SERVER['HTTP_HOST'] ?? 'your-domain') ?>/?page=mcp&amp;token=<?= h(App\Core\Settings::get('mcp_token') ?? '') ?></pre>
  <p class="hint">
    Available tools: overview report, metric time series, list/add/delete rows in any dataset, run sync.
    The token doubles as the password — regenerate it by editing the “MCP token” value in the General card
    (field name <code class="inline">mcp_token</code>) if it ever leaks.
  </p>
</div>

<div class="card" style="margin-bottom:16px">
  <h2>Report data</h2>
  <p class="hint" style="margin-bottom:10px">
    The app starts empty — every report shows 0 until your real sources are connected,
    you import CSVs, or you add rows manually. Use the button below to wipe all report
    data and start over at any time. Your settings and API credentials are kept.
  </p>
  <form method="post" onsubmit="return confirm('Delete ALL report data? Settings and credentials are kept. This cannot be undone.')">
    <input type="hidden" name="action" value="clear_data">
    <button class="btn" type="submit" style="background: var(--bad)">Delete all report data</button>
  </form>
</div>

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
