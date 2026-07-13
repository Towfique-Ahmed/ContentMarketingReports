<?php

namespace App\Services;

use App\Core\DB;
use App\Core\Settings;
use RuntimeException;

/**
 * Pulls daily account-level metrics from the social platforms.
 * Each platform is optional — configure only the ones you use in Settings.
 *
 *  - Facebook : Graph API page insights (page access token + page ID)
 *  - LinkedIn : organizationalEntityShareStatistics + followers (OAuth token + org URN)
 *  - Twitter/X: API v2 users/:id (bearer token + user ID) — follower count;
 *               impressions require a paid tier, so they stay 0 unless imported.
 *  - YouTube  : Data API channels.statistics + Analytics API (API key / token + channel ID)
 */
class SocialSync
{
    public static function runAll(): array
    {
        $results = [];
        foreach (['facebook', 'linkedin', 'twitter', 'youtube'] as $platform) {
            try {
                $results[$platform] = ['ok', self::{$platform}()];
            } catch (RuntimeException $e) {
                $results[$platform] = [str_starts_with($e->getMessage(), 'skipped') ? 'skipped' : 'error', $e->getMessage()];
            }
        }
        return $results;
    }

    private static function facebook(): string
    {
        $token  = Settings::get('facebook_page_token');
        $pageId = Settings::get('facebook_page_id');
        if (!$token || !$pageId) {
            throw new RuntimeException('skipped: Facebook page token / page ID not configured');
        }

        $base = "https://graph.facebook.com/v21.0/{$pageId}";
        $page = GoogleClient::http('GET', "$base?fields=followers_count&access_token=" . urlencode($token), null, []);

        $since = strtotime('-7 days');
        $insights = GoogleClient::http('GET',
            "$base/insights?metric=page_impressions,page_post_engagements&period=day"
            . "&since={$since}&until=" . time() . '&access_token=' . urlencode($token), null, []);

        $daily = [];
        foreach ($insights['data'] ?? [] as $metric) {
            foreach ($metric['values'] ?? [] as $v) {
                $date = substr($v['end_time'], 0, 10);
                $key  = $metric['name'] === 'page_impressions' ? 'impressions' : 'engagements';
                $daily[$date][$key] = (int) $v['value'];
            }
        }
        foreach ($daily as $date => $m) {
            self::upsertDaily($date, 'facebook', [
                'followers'   => (int) ($page['followers_count'] ?? 0),
                'impressions' => $m['impressions'] ?? 0,
                'engagements' => $m['engagements'] ?? 0,
            ]);
        }
        return 'synced ' . count($daily) . ' days';
    }

    private static function linkedin(): string
    {
        $token = Settings::get('linkedin_access_token');
        $org   = Settings::get('linkedin_org_urn'); // e.g. urn:li:organization:12345
        if (!$token || !$org) {
            throw new RuntimeException('skipped: LinkedIn token / organization URN not configured');
        }

        $headers = ['Authorization: Bearer ' . $token, 'LinkedIn-Version: 202411', 'X-Restli-Protocol-Version: 2.0.0'];
        $stats = GoogleClient::http('GET',
            'https://api.linkedin.com/rest/organizationalEntityShareStatistics?q=organizationalEntity&organizationalEntity='
            . urlencode($org), null, $headers);

        $followers = GoogleClient::http('GET',
            'https://api.linkedin.com/rest/networkSizes/' . urlencode($org) . '?edgeType=COMPANY_FOLLOWED_BY_MEMBER',
            null, $headers);

        $s = $stats['elements'][0]['totalShareStatistics'] ?? [];
        self::upsertDaily(date('Y-m-d', strtotime('-1 day')), 'linkedin', [
            'followers'   => (int) ($followers['firstDegreeSize'] ?? 0),
            'impressions' => (int) ($s['impressionCount'] ?? 0),
            'engagements' => (int) (($s['likeCount'] ?? 0) + ($s['commentCount'] ?? 0) + ($s['shareCount'] ?? 0)),
            'clicks'      => (int) ($s['clickCount'] ?? 0),
        ]);
        return 'synced lifetime share statistics snapshot';
    }

    private static function twitter(): string
    {
        $token  = Settings::get('twitter_bearer_token');
        $userId = Settings::get('twitter_user_id');
        if (!$token || !$userId) {
            throw new RuntimeException('skipped: X/Twitter bearer token / user ID not configured');
        }

        $res = GoogleClient::http('GET',
            "https://api.twitter.com/2/users/{$userId}?user.fields=public_metrics",
            null, ['Authorization: Bearer ' . $token]);

        $m = $res['data']['public_metrics'] ?? [];
        self::upsertDaily(date('Y-m-d', strtotime('-1 day')), 'twitter', [
            'followers' => (int) ($m['followers_count'] ?? 0),
            'posts'     => (int) ($m['tweet_count'] ?? 0),
        ]);
        return 'synced follower snapshot';
    }

    private static function youtube(): string
    {
        $key       = Settings::get('youtube_api_key');
        $channelId = Settings::get('youtube_channel_id');
        if (!$key || !$channelId) {
            throw new RuntimeException('skipped: YouTube API key / channel ID not configured');
        }

        $res = GoogleClient::http('GET',
            "https://www.googleapis.com/youtube/v3/channels?part=statistics&id={$channelId}&key=" . urlencode($key),
            null, []);

        $s = $res['items'][0]['statistics'] ?? [];
        self::upsertDaily(date('Y-m-d', strtotime('-1 day')), 'youtube', [
            'followers'   => (int) ($s['subscriberCount'] ?? 0),
            'video_views' => (int) ($s['viewCount'] ?? 0),
            'posts'       => (int) ($s['videoCount'] ?? 0),
        ]);
        return 'synced channel statistics snapshot';
    }

    private static function upsertDaily(string $date, string $platform, array $metrics): void
    {
        $defaults = ['followers' => 0, 'impressions' => 0, 'engagements' => 0,
                     'clicks' => 0, 'posts' => 0, 'video_views' => 0];
        $m = array_merge($defaults, $metrics);
        DB::run(
            'INSERT INTO social_daily (date, platform, followers, impressions, engagements, clicks, posts, video_views)
             VALUES (:d, :p, :f, :i, :e, :c, :po, :vv)
             ON CONFLICT(date, platform) DO UPDATE SET
               followers = excluded.followers,
               impressions = MAX(social_daily.impressions, excluded.impressions),
               engagements = MAX(social_daily.engagements, excluded.engagements),
               clicks = MAX(social_daily.clicks, excluded.clicks),
               posts = excluded.posts,
               video_views = MAX(social_daily.video_views, excluded.video_views)',
            [':d' => $date, ':p' => $platform, ':f' => $m['followers'], ':i' => $m['impressions'],
             ':e' => $m['engagements'], ':c' => $m['clicks'], ':po' => $m['posts'], ':vv' => $m['video_views']]
        );
    }
}
