<?php

namespace App\Services;

use App\Core\DB;
use App\Core\Settings;
use RuntimeException;
use Throwable;

/**
 * Orchestrates all data-source syncs and records the outcome in sync_log.
 * Invoked by bin/sync.php (cron), bin/scheduler.php, or the /cron web endpoint.
 */
class SyncRunner
{
    public static function runAll(): array
    {
        $results = [];

        $results['content']        = self::guard(fn () => ContentSync::run());
        $results['search_console'] = self::guard(fn () => SearchConsoleSync::run());
        $results['analytics']      = self::guard(fn () => AnalyticsSync::run());

        foreach (SocialSync::runAll() as $platform => [$status, $message]) {
            $results[$platform] = [$status, $message];
            self::log($platform, $status, $message);
        }

        self::log('content', ...$results['content']);
        self::log('search_console', ...$results['search_console']);
        self::log('analytics', ...$results['analytics']);

        Settings::set('last_sync_at', date('Y-m-d H:i:s'));
        return $results;
    }

    /** @return array{0: string, 1: string} [status, message] */
    private static function guard(callable $fn): array
    {
        try {
            return ['ok', $fn()];
        } catch (RuntimeException $e) {
            $skipped = str_starts_with($e->getMessage(), 'skipped');
            return [$skipped ? 'skipped' : 'error', $e->getMessage()];
        } catch (Throwable $e) {
            return ['error', $e->getMessage()];
        }
    }

    private static function log(string $source, string $status, string $message): void
    {
        DB::run(
            'INSERT INTO sync_log (source, ran_at, status, message) VALUES (:s, :t, :st, :m)',
            [':s' => $source, ':t' => date('Y-m-d H:i:s'), ':st' => $status, ':m' => $message]
        );
        // Keep the log bounded
        DB::run('DELETE FROM sync_log WHERE id NOT IN (SELECT id FROM sync_log ORDER BY id DESC LIMIT 500)');
    }

    /**
     * Fire the daily sync when the configured time has been reached and it
     * hasn't run yet today. Used by bin/scheduler.php (run it every 5 min).
     */
    public static function runIfDue(): ?array
    {
        $syncTime = Settings::get('sync_time', '06:00');
        $lastRun  = Settings::get('last_sync_at', '');
        $dueAt    = date('Y-m-d') . ' ' . $syncTime . ':00';

        if (date('Y-m-d H:i:s') >= $dueAt && substr($lastRun, 0, 10) !== date('Y-m-d')) {
            return self::runAll();
        }
        return null;
    }
}
