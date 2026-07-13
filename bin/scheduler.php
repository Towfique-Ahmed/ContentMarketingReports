#!/usr/bin/env php
<?php

// Time-aware scheduler: run this every 5 minutes via cron and it fires the
// full sync once per day at the time configured in Settings → "Daily sync time".
//
//   */5 * * * * php /path/to/bin/scheduler.php

require dirname(__DIR__) . '/app/bootstrap.php';

use App\Core\DB;
use App\Services\SyncRunner;

DB::conn();
$results = SyncRunner::runIfDue();
if ($results === null) {
    echo '[' . date('Y-m-d H:i:s') . "] Not due yet — nothing to do.\n";
    exit;
}
echo '[' . date('Y-m-d H:i:s') . "] Daily sync fired:\n";
foreach ($results as $source => [$status, $message]) {
    printf("  %-16s %-8s %s\n", $source, $status, $message);
}
