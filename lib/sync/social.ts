import { getSetting } from "@/lib/settings";
import { sqlite } from "@/lib/db/client";

/*
 * Social platform syncs (Facebook, LinkedIn, X/Twitter, YouTube). Each records
 * a daily snapshot into social_daily. Platforms without credentials are
 * skipped. Ported from the PHP SocialSync. Free API tiers vary in what they
 * expose, so unavailable metrics are stored as 0.
 */

function today() {
  return new Date().toISOString().slice(0, 10);
}

const upsert = sqlite.prepare(
  `INSERT INTO social_daily (date, platform, followers, impressions, engagements, clicks, posts, video_views)
   VALUES (@date, @platform, @followers, @impressions, @engagements, @clicks, @posts, @video_views)
   ON CONFLICT(date, platform) DO UPDATE SET followers=excluded.followers, impressions=excluded.impressions,
     engagements=excluded.engagements, clicks=excluded.clicks, posts=excluded.posts, video_views=excluded.video_views`,
);

type Snapshot = { followers: number; impressions: number; engagements: number; clicks: number; posts: number; video_views: number };

function record(platform: string, s: Partial<Snapshot>) {
  upsert.run({
    date: today(),
    platform,
    followers: s.followers ?? 0,
    impressions: s.impressions ?? 0,
    engagements: s.engagements ?? 0,
    clicks: s.clicks ?? 0,
    posts: s.posts ?? 0,
    video_views: s.video_views ?? 0,
  });
}

async function facebook(): Promise<boolean> {
  const token = getSetting("facebook_page_token");
  const pageId = getSetting("facebook_page_id");
  if (!token || !pageId) return false;
  const res = await fetch(`https://graph.facebook.com/v19.0/${pageId}?fields=followers_count,fan_count&access_token=${token}`);
  const data = (await res.json()) as { followers_count?: number; fan_count?: number };
  record("facebook", { followers: data.followers_count ?? data.fan_count ?? 0 });
  return true;
}

async function linkedin(): Promise<boolean> {
  const token = getSetting("linkedin_access_token");
  const urn = getSetting("linkedin_org_urn");
  if (!token || !urn) return false;
  const res = await fetch(
    `https://api.linkedin.com/v2/networkSizes/${encodeURIComponent(urn)}?edgeType=CompanyFollowedByMember`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const data = (await res.json()) as { firstDegreeSize?: number };
  record("linkedin", { followers: data.firstDegreeSize ?? 0 });
  return true;
}

async function twitter(): Promise<boolean> {
  const token = getSetting("twitter_bearer_token");
  const userId = getSetting("twitter_user_id");
  if (!token || !userId) return false;
  const res = await fetch(`https://api.twitter.com/2/users/${userId}?user.fields=public_metrics`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = (await res.json()) as { data?: { public_metrics?: { followers_count?: number; tweet_count?: number } } };
  const m = data.data?.public_metrics;
  record("twitter", { followers: m?.followers_count ?? 0, posts: m?.tweet_count ?? 0 });
  return true;
}

async function youtube(): Promise<boolean> {
  const key = getSetting("youtube_api_key");
  const channelId = getSetting("youtube_channel_id");
  if (!key || !channelId) return false;
  const res = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${channelId}&key=${key}`);
  const data = (await res.json()) as { items?: { statistics?: { subscriberCount?: string; viewCount?: string; videoCount?: string } }[] };
  const s = data.items?.[0]?.statistics;
  record("youtube", {
    followers: Number(s?.subscriberCount ?? 0),
    video_views: Number(s?.viewCount ?? 0),
    posts: Number(s?.videoCount ?? 0),
  });
  return true;
}

export async function syncSocial(): Promise<string> {
  const platforms: [string, () => Promise<boolean>][] = [
    ["facebook", facebook],
    ["linkedin", linkedin],
    ["twitter", twitter],
    ["youtube", youtube],
  ];
  const done: string[] = [];
  const errors: string[] = [];
  for (const [name, run] of platforms) {
    try {
      if (await run()) done.push(name);
    } catch (e) {
      errors.push(`${name}: ${(e as Error).message}`);
    }
  }
  if (!done.length && !errors.length) throw new Error("skipped: no social credentials configured");
  const msg = `synced ${done.length ? done.join(", ") : "none"}`;
  return errors.length ? `${msg}; errors: ${errors.join(" · ")}` : msg;
}
