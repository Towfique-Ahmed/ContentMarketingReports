#!/usr/bin/env php
<?php

/**
 * Re-seed the demo database.
 *   php bin/seed.php --fresh   deletes the database and rebuilds it with demo data
 */

if (!in_array('--fresh', $argv, true)) {
    echo "Usage: php bin/seed.php --fresh\n";
    echo "Deletes storage/app.sqlite and rebuilds it with two years of DEMO data.\n";
    echo "(A normal first boot creates an EMPTY database — demo data is opt-in.)\n";
    exit(1);
}

$db = dirname(__DIR__) . '/storage/app.sqlite';
foreach ([$db, "$db-wal", "$db-shm"] as $f) {
    if (file_exists($f)) {
        unlink($f);
    }
}

require dirname(__DIR__) . '/app/bootstrap.php';
$pdo = \App\Core\DB::conn(); // recreates schema + default settings
require dirname(__DIR__) . '/database/seed_demo.php';
seed_demo($pdo);
echo "Fresh DEMO database created at storage/app.sqlite\n";
