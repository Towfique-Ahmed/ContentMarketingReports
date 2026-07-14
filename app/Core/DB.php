<?php

namespace App\Core;

use PDO;

class DB
{
    private static ?PDO $pdo = null;

    public static function conn(): PDO
    {
        if (self::$pdo === null) {
            $path = dirname(__DIR__, 2) . '/storage/app.sqlite';
            $fresh = !file_exists($path);
            self::$pdo = new PDO('sqlite:' . $path, null, null, [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            ]);
            self::$pdo->exec('PRAGMA foreign_keys = ON');
            self::$pdo->exec('PRAGMA journal_mode = WAL');
            self::migrate();
            if ($fresh) {
                // Bootstrap default settings only — reports start at 0 until the
                // API sync, CSV imports, or manual entries provide real data.
                // Demo data is opt-in: php bin/seed.php --fresh
                self::$pdo->exec("INSERT OR IGNORE INTO settings (key, value) VALUES
                    ('site_name', 'Analytio'),
                    ('sync_time', '06:00'),
                    ('timezone', 'UTC'),
                    ('cron_token', '" . bin2hex(random_bytes(16)) . "'),
                    ('mcp_token', '" . bin2hex(random_bytes(16)) . "')");
            }
        }
        return self::$pdo;
    }

    private static function migrate(): void
    {
        $schema = file_get_contents(dirname(__DIR__, 2) . '/database/schema.sql');
        self::$pdo->exec($schema);

        // Additive column migrations for databases created by older versions.
        self::ensureColumns('content_items', [
            'funnel_stage'     => 'TEXT',
            'reviewer'         => 'TEXT',
            'publisher'        => 'TEXT',
            'target_keyword'   => 'TEXT',
            'keyword_position' => 'TEXT',
            'search_volume'    => 'INTEGER DEFAULT 0',
            'ai_presence'      => 'TEXT',
            'views'            => 'INTEGER DEFAULT 0',
        ]);
        self::ensureColumns('email_campaigns', [
            'list_name' => 'TEXT',
            'segment'   => 'TEXT',
            'subject'   => 'TEXT',
            'author'    => 'TEXT',
        ]);
        self::ensureColumns('ga_channels', [
            'new_users' => 'INTEGER DEFAULT 0',
        ]);
    }

    private static function ensureColumns(string $table, array $columns): void
    {
        $existing = [];
        foreach (self::$pdo->query("PRAGMA table_info({$table})") as $col) {
            $existing[$col['name']] = true;
        }
        foreach ($columns as $name => $definition) {
            if (!isset($existing[$name])) {
                self::$pdo->exec("ALTER TABLE {$table} ADD COLUMN {$name} {$definition}");
            }
        }
    }

    /** @return array<int, array<string, mixed>> */
    public static function all(string $sql, array $params = []): array
    {
        $st = self::conn()->prepare($sql);
        $st->execute($params);
        return $st->fetchAll();
    }

    /** @return array<string, mixed>|null */
    public static function one(string $sql, array $params = []): ?array
    {
        $st = self::conn()->prepare($sql);
        $st->execute($params);
        $row = $st->fetch();
        return $row === false ? null : $row;
    }

    public static function value(string $sql, array $params = []): mixed
    {
        $st = self::conn()->prepare($sql);
        $st->execute($params);
        return $st->fetchColumn();
    }

    public static function run(string $sql, array $params = []): void
    {
        $st = self::conn()->prepare($sql);
        $st->execute($params);
    }
}
