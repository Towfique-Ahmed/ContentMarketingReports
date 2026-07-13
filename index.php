<?php

/**
 * You are seeing this page because the web server's document root points at
 * the repository root instead of the public/ folder.
 *
 * The app intentionally lives in public/ so that storage/ (the SQLite
 * database, which holds your API credentials) is never web-accessible.
 * This page explains the one-line fix instead of serving the app insecurely.
 */

http_response_code(200);
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Almost there — set the web root</title>
<style>
  body { font-family: system-ui, -apple-system, "Segoe UI", sans-serif; background: #f9f9f7; color: #0b0b0b;
         display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 24px; }
  .card { background: #fcfcfb; border: 1px solid rgba(11,11,11,.1); border-radius: 12px; padding: 32px; max-width: 640px; }
  h1 { font-size: 20px; margin: 0 0 12px; }
  p, li { font-size: 14px; line-height: 1.6; color: #52514e; }
  code { background: #f0efec; border-radius: 4px; padding: 2px 6px; font-size: 13px; }
  ol { padding-left: 20px; }
  @media (prefers-color-scheme: dark) {
    body { background: #0d0d0d; color: #fff; }
    .card { background: #1a1a19; border-color: rgba(255,255,255,.1); }
    p, li { color: #c3c2b7; }
    code { background: #2c2c2a; }
  }
</style>
</head>
<body>
<div class="card">
  <h1>⚙️ One more step: point the web root at <code>public/</code></h1>
  <p>The dashboard is installed, but your web server is serving the repository root.
     The app's entry point is <code>public/index.php</code>, and keeping it there protects
     <code>storage/</code> (your database and API credentials) from being downloadable.</p>
  <ol>
    <li><strong>xCloud:</strong> Site Settings → <em>Web Root Settings</em> → set the folder to <code>public</code> → save.</li>
    <li><strong>cPanel / generic nginx / Apache:</strong> set the site's document root to
        <code>&lt;install-path&gt;/public</code>.</li>
  </ol>
  <p>Reload the site afterwards and the dashboard will appear. Full instructions are in the README.</p>
</div>
</body>
</html>
