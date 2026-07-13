#!/usr/bin/env php
<?php

/**
 * Re-seed the demo database.
 *   php bin/seed.php --fresh   deletes the database and rebuilds it with demo data
 */

if (!in_array('--fresh', $argv, true)) {
    echo "Usage: php bin/seed.php --fresh\n";
    echo "Deletes storage/app.sqlite and rebuilds it with two years of demo data.\n";
    exit(1);
}

$db = dirname(__DIR__) . '/storage/app.sqlite';
foreach ([$db, "$db-wal", "$db-shm"] as $f) {
    if (file_exists($f)) {
        unlink($f);
    }
}

require dirname(__DIR__) . '/app/bootstrap.php';
\App\Core\DB::conn(); // recreates schema + demo data
echo "Fresh demo database created at storage/app.sqlite\n";
