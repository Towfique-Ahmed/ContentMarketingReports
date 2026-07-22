import { getSetting } from "@/lib/settings";
import { sqlite } from "@/lib/db/client";

/*
 * Auto-discover published content from the configured WordPress site and keep
 * the content inventory current. It reads the REST API's post-type index so it
 * finds custom post types (documentation, case studies, landing pages…) — not
 * just core posts/pages — and maps each to one of our four content types.
 *
 * For every item it stores title, url, author and publish date. It also makes
 * a best effort to read the SEO focus keyword and a view count when the site
 * exposes them in REST (Yoast / Rank Math / a post-views plugin). If a manual
 * value is already present it is not overwritten by an empty synced one.
 *
 * Falls back to the XML sitemap only when the REST API can't be reached.
 */

type OurType = "blog" | "documentation" | "landing_page" | "case_study";

/** Optional explicit map: one `postTypeSlug=ourType` per line (Settings). */
function typeMap(): Record<string, OurType> {
  const raw = getSetting("content_type_map") ?? "";
  const out: Record<string, OurType> = {};
  for (const line of raw.split("\n")) {
    const [slug, target] = line.split("=").map((s) => s.trim());
    if (slug && isOurType(target)) out[slug.toLowerCase()] = target as OurType;
  }
  return out;
}
function isOurType(v: string | undefined): v is OurType {
  return v === "blog" || v === "documentation" || v === "landing_page" || v === "case_study";
}

/** Heuristic fallback when a post type isn't in the explicit map. */
function guessType(slug: string, restBase: string): OurType | null {
  const s = `${slug} ${restBase}`.toLowerCase();
  if (slug === "post" || restBase === "posts") return "blog";
  if (/\b(doc|docs|documentation|knowledge|kb|help)\b/.test(s) || s.includes("doc")) return "documentation";
  if (/case[\s_-]?stud/.test(s) || s.includes("case")) return "case_study";
  if (s.includes("landing") || slug === "page" || restBase === "pages") return "landing_page";
  if (s.includes("blog") || s.includes("article") || s.includes("news")) return "blog";
  return null;
}

/** Legacy URL-path rules still win when present (one `type=path` per line). */
type Rule = { type: string; path: string };
function pathRules(): Rule[] {
  const raw = getSetting("content_path_rules") ?? "";
  return raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const [type, path] = l.split("=");
      return { type: (type ?? "").trim(), path: (path ?? "").trim() };
    })
    .filter((r) => r.type && r.path);
}
function classifyByPath(url: string, rules: Rule[]): OurType | null {
  for (const r of rules) if (url.includes(r.path) && isOurType(r.type)) return r.type;
  return null;
}

function excluded(url: string, type: string): boolean {
  const raw = getSetting(`content_exclude_${type}`) ?? "";
  const patterns = raw.split("\n").map((l) => l.trim()).filter(Boolean);
  for (const p of patterns) {
    const rx = new RegExp(p.split("*").map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join(".*"));
    if (rx.test(url)) return true;
  }
  return false;
}

const upsert = sqlite.prepare(
  `INSERT INTO content_items (type, title, url, author, published_at, target_keyword, views)
   VALUES (@type, @title, @url, @author, @published_at, @target_keyword, @views)
   ON CONFLICT(type, url) DO UPDATE SET
     title=excluded.title,
     author=COALESCE(excluded.author, content_items.author),
     published_at=COALESCE(excluded.published_at, content_items.published_at),
     target_keyword=CASE WHEN excluded.target_keyword IS NOT NULL AND excluded.target_keyword <> ''
                         THEN excluded.target_keyword ELSE content_items.target_keyword END,
     views=CASE WHEN excluded.views > 0 THEN excluded.views ELSE content_items.views END`,
);

function authHeader(): Record<string, string> {
  const user = getSetting("wp_username");
  const pass = getSetting("wp_app_password");
  if (user && pass) {
    return { Authorization: "Basic " + Buffer.from(`${user}:${pass.replace(/\s+/g, "")}`).toString("base64") };
  }
  return {};
}

type WpMeta = Record<string, unknown>;
type WpItem = {
  link: string;
  title?: { rendered?: string };
  date?: string;
  meta?: WpMeta;
  _embedded?: { author?: { name?: string }[] };
} & WpMeta;

/** Pull the first non-empty value found under any of the candidate keys. */
function pick(obj: WpMeta | undefined, keys: string[]): string | null {
  if (!obj) return null;
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number" && v > 0) return String(v);
    if (Array.isArray(v) && v.length && typeof v[0] === "string" && v[0].trim()) return v[0].trim();
  }
  return null;
}

const KEYWORD_KEYS = [
  "rank_math_focus_keyword", "_yoast_wpseo_focuskw", "yoast_wpseo_focuskw",
  "focus_keyword", "focus_kw", "target_keyword", "seo_keyword",
];
const VIEW_KEYS = ["post_views_count", "views", "view_count", "wpp_views", "pageviews", "_views"];

function keywordOf(it: WpItem): string | null {
  const kw = pick(it.meta, KEYWORD_KEYS) ?? pick(it, KEYWORD_KEYS);
  // Rank Math stores a comma-separated list; the first term is the focus keyword.
  return kw ? kw.split(",")[0].trim() : null;
}
function viewsOf(it: WpItem): number {
  const v = pick(it.meta, VIEW_KEYS) ?? pick(it, VIEW_KEYS);
  const n = v ? parseInt(v.replace(/[^\d]/g, ""), 10) : 0;
  return Number.isFinite(n) ? n : 0;
}

type PostType = { slug: string; rest_base: string; ourType: OurType };

/** Read the REST post-type index and resolve which types we should ingest. */
async function discoverTypes(base: string): Promise<PostType[]> {
  const explicit = typeMap();
  const res = await fetch(`${base}/wp-json/wp/v2/types?context=view`, { headers: authHeader() });
  if (!res.ok) throw new Error(`types index failed (${res.status})`);
  const index = (await res.json()) as Record<string, { slug?: string; rest_base?: string; viewable?: boolean }>;
  const skip = new Set(["attachment", "wp_block", "nav_menu_item", "wp_navigation", "wp_template", "wp_template_part", "wp_font_family", "wp_font_face"]);
  const out: PostType[] = [];
  for (const [key, def] of Object.entries(index)) {
    const slug = (def.slug ?? key).toLowerCase();
    const rest_base = def.rest_base ?? key;
    if (skip.has(slug) || !rest_base) continue;
    if (def.viewable === false) continue;
    const ourType = explicit[slug] ?? explicit[rest_base.toLowerCase()] ?? guessType(slug, rest_base);
    if (ourType) out.push({ slug, rest_base, ourType });
  }
  return out;
}

async function fromWordpress(base: string, rules: Rule[]): Promise<number> {
  const types = await discoverTypes(base);
  if (types.length === 0) throw new Error("no matching post types found");
  let count = 0;
  for (const pt of types) {
    for (let page = 1; page <= 20; page++) {
      const url = `${base}/wp-json/wp/v2/${pt.rest_base}?per_page=100&page=${page}&status=publish&_embed=author`;
      const res = await fetch(url, { headers: authHeader() });
      if (!res.ok) break;
      const items = (await res.json()) as WpItem[];
      if (!Array.isArray(items) || items.length === 0) break;
      for (const it of items) {
        if (!it.link) continue;
        // Explicit URL-path rules override the post-type mapping when they match.
        const type = classifyByPath(it.link, rules) ?? pt.ourType;
        if (excluded(it.link, type)) continue;
        upsert.run({
          type,
          title: it.title?.rendered?.replace(/<[^>]+>/g, "").trim() || it.link,
          url: it.link,
          author: it._embedded?.author?.[0]?.name ?? null,
          published_at: it.date ? it.date.slice(0, 10) : null,
          target_keyword: keywordOf(it),
          views: viewsOf(it),
        });
        count++;
      }
      if (items.length < 100) break;
    }
  }
  return count;
}

async function fromSitemap(base: string, rules: Rule[]): Promise<number> {
  const res = await fetch(`${base}/sitemap.xml`);
  if (!res.ok) throw new Error(`sitemap fetch failed (${res.status})`);
  const xml = await res.text();
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  let count = 0;
  for (const url of locs) {
    const type = classifyByPath(url, rules);
    if (!type || excluded(url, type)) continue;
    upsert.run({ type, title: url, url, author: null, published_at: null, target_keyword: null, views: 0 });
    count++;
  }
  return count;
}

export async function syncContent(): Promise<string> {
  const base = (getSetting("site_base_url") ?? "").replace(/\/+$/, "");
  if (!base) throw new Error("skipped: website URL not configured (Settings → Website URL)");
  const rules = pathRules();
  try {
    const n = await fromWordpress(base, rules);
    return `discovered ${n} content items from WordPress (blogs, docs, landing pages, case studies)`;
  } catch (e) {
    // The REST API may be blocked or the type names unusual — try the sitemap,
    // but only if the user gave URL-path rules to classify by.
    if (rules.length === 0) {
      throw new Error(
        `WordPress REST sync failed (${(e as Error).message}). Check the Website URL and application password, ` +
          `or add content_path_rules to classify by URL.`,
      );
    }
    const n = await fromSitemap(base, rules);
    return `discovered ${n} content items from sitemap (REST unavailable: ${(e as Error).message})`;
  }
}
