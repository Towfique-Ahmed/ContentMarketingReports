<?php

namespace App\Services;

use App\Core\DB;
use App\Core\Settings;
use RuntimeException;

/**
 * Auto-discovers published content (blog posts, documentation, case studies,
 * landing pages) from the tracked website and keeps the content inventory
 * up to date. Runs as part of the daily sync.
 *
 * Strategy, in order:
 *   1. WordPress REST API   — /wp-json/wp/v2/types to find post types, then
 *      paginated per-type fetches (title, url, publish date). Post types are
 *      matched by keyword: post→blog, doc→documentation, case→case_study,
 *      landing→landing_page.
 *   2. XML sitemaps         — sitemap_index.xml / wp-sitemap.xml; URLs are
 *      classified with the path rules and titles derived from the slug.
 *   3. Path rules           — Settings → "Content URL rules" decides which
 *      URL prefix maps to which content type (used by the sitemap fallback
 *      and to classify WP "pages" as landing pages).
 *
 * Config (Settings): site_base_url, content_path_rules.
 */
class ContentSync
{
    public static function run(): string
    {
        $base = rtrim((string) Settings::get('site_base_url'), '/');
        if (!$base) {
            throw new RuntimeException('skipped: website URL not configured (Settings → Website)');
        }

        $found = self::viaWordPressRest($base);
        $method = 'WordPress REST API';
        if ($found === 0) {
            $found = self::viaSitemaps($base);
            $method = 'XML sitemaps';
        }
        if ($found === 0) {
            throw new RuntimeException('no content discovered — the site exposes neither the WordPress REST API nor a sitemap, or the URL rules match nothing');
        }
        return "discovered/updated {$found} content items via {$method}";
    }

    /** @return array<string, string> path prefix → content type, from Settings */
    private static function pathRules(): array
    {
        $raw = (string) Settings::get('content_path_rules',
            "blog=/blog/\ndocumentation=/docs/\ncase_study=/case-study/\ncase_study=/case-studies/");
        $rules = [];
        foreach (preg_split('/\r?\n/', $raw) as $line) {
            if (preg_match('/^\s*(blog|documentation|landing_page|case_study)\s*=\s*(\/\S*)\s*$/', $line, $m)) {
                $rules[$m[2]] = $m[1];
            }
        }
        return $rules;
    }

    private static function classify(string $url): ?string
    {
        $path = (string) (parse_url($url, PHP_URL_PATH) ?? '/');
        foreach (self::pathRules() as $prefix => $type) {
            if (str_starts_with($path, rtrim($prefix, '/') . '/') || rtrim($path, '/') === rtrim($prefix, '/')) {
                return $type;
            }
        }
        return null;
    }

    /* ---------------- WordPress REST API ---------------- */

    private static function viaWordPressRest(string $base): int
    {
        $types = self::fetchJson("$base/wp-json/wp/v2/types");
        if (!is_array($types) || !$types) {
            return 0;
        }

        // Map discovered post types to our content types by keyword.
        $map = []; // rest_base => our type
        foreach ($types as $slug => $def) {
            $restBase = $def['rest_base'] ?? $slug;
            $haystack = strtolower($slug . ' ' . ($def['name'] ?? '') . ' ' . $restBase);
            if ($slug === 'post') {
                $map[$restBase] = 'blog';
            } elseif (str_contains($haystack, 'doc')) {
                $map[$restBase] = 'documentation';
            } elseif (str_contains($haystack, 'case')) {
                $map[$restBase] = 'case_study';
            } elseif (str_contains($haystack, 'landing')) {
                $map[$restBase] = 'landing_page';
            }
        }
        // WP "pages" become landing pages only when a path rule matches them.
        $pagesRest = $types['page']['rest_base'] ?? 'pages';

        $count = 0;
        foreach ($map as $restBase => $type) {
            $count += self::fetchRestItems($base, $restBase, fn () => $type);
        }
        $count += self::fetchRestItems($base, $pagesRest, fn (string $url) => self::classify($url));
        return $count;
    }

    /** @param callable(string): ?string $typeFor returns content type or null to skip */
    private static function fetchRestItems(string $base, string $restBase, callable $typeFor): int
    {
        $count = 0;
        for ($page = 1; $page <= 10; $page++) {
            $items = self::fetchJson(
                "$base/wp-json/wp/v2/{$restBase}?per_page=100&page={$page}&status=publish&_fields=link,title,date"
            );
            if (!is_array($items) || !array_is_list($items) || !$items) {
                break;
            }
            foreach ($items as $item) {
                $url  = $item['link'] ?? null;
                $type = $url ? $typeFor($url) : null;
                if (!$url || !$type) {
                    continue;
                }
                self::upsertItem($type, html_entity_decode($item['title']['rendered'] ?? '', ENT_QUOTES),
                                  $url, substr((string) ($item['date'] ?? ''), 0, 10));
                $count++;
            }
            if (count($items) < 100) {
                break;
            }
        }
        return $count;
    }

    /* ---------------- Sitemap fallback ---------------- */

    private static function viaSitemaps(string $base): int
    {
        $urls = [];
        foreach (["$base/sitemap_index.xml", "$base/wp-sitemap.xml", "$base/sitemap.xml"] as $indexUrl) {
            $xml = self::fetchRaw($indexUrl);
            if (!$xml) {
                continue;
            }
            $subMaps = self::extractLocs($xml);
            if (!$subMaps) {
                continue;
            }
            foreach ($subMaps as $loc) {
                if (str_ends_with($loc, '.xml')) {
                    $sub = self::fetchRaw($loc);
                    if ($sub) {
                        $urls = array_merge($urls, self::extractLocs($sub));
                    }
                } else {
                    $urls[] = $loc;
                }
            }
            break;
        }

        $count = 0;
        foreach (array_unique($urls) as $url) {
            $type = self::classify($url);
            if (!$type) {
                continue;
            }
            $slug  = trim(basename((string) parse_url($url, PHP_URL_PATH)), '/');
            $title = $slug ? ucwords(str_replace(['-', '_'], ' ', $slug)) : $url;
            self::upsertItem($type, $title, $url, null);
            $count++;
        }
        return $count;
    }

    /** @return string[] contents of <loc> tags */
    private static function extractLocs(string $xml): array
    {
        preg_match_all('/<loc>\s*([^<\s]+)\s*<\/loc>/i', $xml, $m);
        return $m[1] ?? [];
    }

    /* ---------------- Shared helpers ---------------- */

    private static function upsertItem(string $type, string $title, string $url, ?string $publishedAt): void
    {
        DB::run(
            'INSERT INTO content_items (type, title, url, author, published_at)
             VALUES (:t, :ti, :u, NULL, :p)
             ON CONFLICT(type, url) DO UPDATE SET
               title = excluded.title,
               published_at = COALESCE(excluded.published_at, content_items.published_at)',
            [':t' => $type, ':ti' => $title ?: $url, ':u' => $url, ':p' => $publishedAt ?: null]
        );
    }

    private static function fetchRaw(string $url): ?string
    {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_MAXREDIRS      => 5,
            CURLOPT_TIMEOUT        => 30,
            CURLOPT_USERAGENT      => 'Mozilla/5.0 (compatible; AnalytioContentSync/1.0)',
        ]);
        $body = curl_exec($ch);
        $status = curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        curl_close($ch);
        return ($body !== false && $status < 400) ? $body : null;
    }

    private static function fetchJson(string $url): mixed
    {
        $raw = self::fetchRaw($url);
        return $raw === null ? null : json_decode($raw, true);
    }
}
