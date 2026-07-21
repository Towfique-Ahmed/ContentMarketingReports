import { getSetting } from "@/lib/settings";
import { sqlite } from "@/lib/db/client";

/*
 * Auto-discover published content from the configured website and keep the
 * content inventory current. Prefers the WordPress REST API (works with an
 * application password); falls back to XML sitemaps. URLs are classified by
 * the content_path_rules and filtered by the per-type exclusion lists.
 * Ported from the PHP ContentSync.
 */

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

function classify(url: string, rules: Rule[]): string | null {
  for (const r of rules) if (url.includes(r.path)) return r.type;
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
  `INSERT INTO content_items (type, title, url, author, published_at, views)
   VALUES (@type, @title, @url, @author, @published_at, @views)
   ON CONFLICT(type, url) DO UPDATE SET title=excluded.title, author=excluded.author,
     published_at=excluded.published_at, views=CASE WHEN excluded.views > 0 THEN excluded.views ELSE content_items.views END`,
);

function authHeader(): Record<string, string> {
  const user = getSetting("wp_username");
  const pass = getSetting("wp_app_password");
  if (user && pass) return { Authorization: "Basic " + Buffer.from(`${user}:${pass.replace(/\s+/g, "")}`).toString("base64") };
  return {};
}

type WpItem = { link: string; title?: { rendered?: string }; date?: string; _embedded?: { author?: { name?: string }[] } };

async function fromWordpress(base: string, rules: Rule[]): Promise<number> {
  let count = 0;
  for (const kind of ["posts", "pages"]) {
    for (let page = 1; page <= 10; page++) {
      const res = await fetch(`${base}/wp-json/wp/v2/${kind}?per_page=100&page=${page}&_embed=author`, { headers: authHeader() });
      if (!res.ok) break;
      const items = (await res.json()) as WpItem[];
      if (!Array.isArray(items) || items.length === 0) break;
      for (const it of items) {
        const type = classify(it.link, rules);
        if (!type || excluded(it.link, type)) continue;
        upsert.run({
          type,
          title: it.title?.rendered?.replace(/<[^>]+>/g, "") ?? it.link,
          url: it.link,
          author: it._embedded?.author?.[0]?.name ?? null,
          published_at: it.date ? it.date.slice(0, 10) : null,
          views: 0,
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
    const type = classify(url, rules);
    if (!type || excluded(url, type)) continue;
    upsert.run({ type, title: url, url, author: null, published_at: null, views: 0 });
    count++;
  }
  return count;
}

export async function syncContent(): Promise<string> {
  const base = (getSetting("site_base_url") ?? "").replace(/\/+$/, "");
  if (!base) throw new Error("skipped: website URL not configured");
  const rules = pathRules();
  if (!rules.length) throw new Error("skipped: no content URL rules configured (Settings → content_path_rules)");
  try {
    const n = await fromWordpress(base, rules);
    if (n > 0) return `discovered ${n} content items (WordPress)`;
  } catch {
    /* fall through to sitemap */
  }
  const n = await fromSitemap(base, rules);
  return `discovered ${n} content items (sitemap)`;
}
