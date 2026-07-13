#!/usr/bin/env php
<?php

/**
 * Run all data-source syncs immediately.
 * Cron example (daily at 06:00):  0 6 * * * php /path/to/bin/sync.php
 */

require dirname(__DIR__) . '/app/bootstrap.php';

use App\Core\DB;
use App\Services\SyncRunner;

DB::conn();
echo '[' . date('Y-m-d H:i:s') . "] Starting full sync…\n";
foreach (SyncRunner::runAll() as $source => [$status, $message]) {
    printf("  %-16s %-8s %s\n", $source, $status, $message);
}
echo "Done.\n";
