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
    /** Sources that can be synced individually, in run order. */
    public const SOURCES = ['content', 'search_console', 'analytics', 'social'];

    public static function runAll(): array
    {
        $results = [];
        foreach (self::SOURCES as $source) {
            $results += self::runOne($source);
        }
        Settings::set('last_sync_at', date('Y-m-d H:i:s'));
        return $results;
    }

    /**
     * Run a single data source and log the outcome. 'social' fans out to every
     * platform. Returns [source|platform => [status, message], …].
     */
    public static function runOne(string $source): array
    {
        $results = [];
        if ($source === 'social') {
            foreach (SocialSync::runAll() as $platform => [$status, $message]) {
                $results[$platform] = [$status, $message];
                self::log($platform, $status, $message);
            }
            self::log('social', ...self::rollup($results));
            self::stamp('social');
            return $results;
        }

        $runner = [
            'content'        => fn () => ContentSync::run(),
            'search_console' => fn () => SearchConsoleSync::run(),
            'analytics'      => fn () => AnalyticsSync::run(),
        ][$source] ?? null;
        if (!$runner) {
            return [$source => ['error', "unknown sync source: {$source}"]];
        }
        $results[$source] = self::guard($runner);
        self::log($source, ...$results[$source]);
        self::stamp($source);
        return $results;
    }

    /** Collapse several platform results into one [status, message] summary. */
    private static function rollup(array $results): array
    {
        $ok = $err = 0;
        foreach ($results as [$status]) {
            $status === 'error' ? $err++ : ($status === 'ok' ? $ok++ : null);
        }
        $status = $err > 0 ? ($ok > 0 ? 'ok' : 'error') : 'ok';
        return [$status, sprintf('%d platform(s) synced, %d error(s)', $ok, $err)];
    }

    /** Record when a source last completed, for the per-page sync panels. */
    private static function stamp(string $source): void
    {
        Settings::set('last_sync_' . $source, date('Y-m-d H:i:s'));
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
