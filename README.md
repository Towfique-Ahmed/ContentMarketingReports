# Content Marketing Reports

A modern, self-hosted dashboard that gives a marketing team every report it
needs in one place — traffic, search, content, keywords, social, email, and
campaigns — with an accessible, responsive UI and light/dark themes.

| Area | Reports |
|---|---|
| **Overview** | Executive KPIs (sessions, users, clicks, impressions, conversions, engagement) with period-over-period deltas, trend charts, and channel breakdown |
| **Content** | Blog, Documentation, Landing Pages, Case Studies — pageviews, visitors, time on page, bounce, conversions, target keyword/position/volume per item |
| **Search & Traffic** | Search Console (clicks, impressions, CTR, position, top queries/pages) **and** GA4 (sessions, users, engagement, duration, bounce, channels, top pages) |
| **Keywords** | Tracked keyword rankings, position change, volume, difficulty, click/impression history |
| **Social** | Overview + per-platform (Facebook, LinkedIn, X/Twitter, YouTube) — followers, impressions, engagements, clicks, video views, posts |
| **Email** | Campaign sends with open/click/unsubscribe rates and monthly trends |
| **Campaigns** | Budget, spend, clicks, conversions, CPA, revenue, ROAS per campaign |
| **Reporting** | Month-by-month, year-over-year rollups, and a Compare tool (any metric, any two ranges) |

Every table sorts and paginates (20 / 25 / 50 / 100 / 150 / 200 rows), every
chart has a keyboard-accessible “view as table” fallback, and the whole app
targets WCAG 2.2 AA (semantic landmarks, visible focus, no color-only signals,
`prefers-reduced-motion`).

## Tech stack

- **Next.js (App Router) + React + TypeScript** — server components for fast
  reads, server actions for mutations
- **Tailwind CSS** design system with light/dark tokens
- **SQLite** via **better-sqlite3** + **Drizzle ORM** — a single data file, no
  external database server
- **Recharts** for accessible, theme-aware charts

## Quick start

```bash
npm install
npm run dev            # http://localhost:3000
```

The first boot creates an **empty** database (`./data/app.sqlite`) and migrates
it automatically. To explore with realistic sample data:

```bash
npm run seed:sample    # loads the bundled xCloud GA4 + GSC exports
```

Set the date range to **All** to see everything. Wipe data anytime from
**Settings → Report data**.

## Getting data in

Every report page has a **“Manage … data & settings”** panel (expand it at the
bottom) scoped to that page’s datasets. Three ways to fill any dataset:

1. **CSV import** — upload in the panel; download the per-dataset template for
   the exact columns. The importer is tolerant of spreadsheet exports (skips
   blank rows, accepts `1,234` / `45.0%` / `–`, finds the header row after title
   rows, matches columns by name/alias, upserts by key). Two matrix importers
   read wide month-column sheets (Search Console monthly; GA channels monthly),
   and GA4 channel exports route their monthly `Total` rows into site totals
   automatically.
2. **Manual entry** — the add/update form in the same panel.
3. **Automatic sync** — connect your accounts in **Settings**, then use the
   per-source **Sync now** button or the daily cron.

## Connecting real sources (Settings)

- **Google Search Console + GA4** — one service-account JSON key (paste it),
  the Search Console property URL, and the GA4 numeric property ID.
- **Social** — per-platform tokens/IDs (Facebook, LinkedIn, X/Twitter, YouTube).
- **Website content** — your site URL (+ optional WordPress application
  password) for automatic content discovery via the WP REST API or sitemaps.

### Scheduled sync

Point any scheduler at the cron endpoint (fires when the configured daily time
has passed and it hasn’t run yet today):

```
GET https://your-domain/api/cron?token=<cron_token>
```

## Claude MCP connector

The app exposes a Model Context Protocol server so Claude can read reports and
manage data from chat. In **Settings → Claude MCP connector** copy:

```
https://your-domain/api/mcp?token=<mcp_token>
```

Add it as a custom connector in Claude (requires the app to be on public HTTPS).

## Deployment

The app needs a Node host. Build a self-contained image:

```bash
docker build -t marketing-reports .
docker run -p 3000:3000 -v $PWD/data:/data marketing-reports
```

The SQLite file lives in the mounted `/data` volume. Or run on any Node 22 host:

```bash
npm run build && npm start
```

Prefer Postgres for serverless? The Drizzle schema swaps with minimal change.

## Project layout

```
app/(dashboard)/   report pages (Overview, Content, Search, Keywords, Social,
                   Email, Campaigns, Reporting) + Settings
app/api/           mcp, cron, template route handlers
components/        ui/, charts/, reports/, manage/, layout/
lib/db/            Drizzle schema + client (migrate-on-boot)
lib/reports/       query layer
lib/datasets/      dataset config + tolerant CSV importer
lib/sync/          GA4 / Search Console / social / content providers + runner
drizzle/           generated migrations
test/              Vitest (importer) + Playwright (e2e)
```

## Scripts

| command | what |
|---|---|
| `npm run dev` | dev server |
| `npm run build` / `npm start` | production build / serve |
| `npm run typecheck` | TypeScript check |
| `npm test` | Vitest unit tests |
| `npm run seed:sample` | load bundled sample data |
| `npm run db:generate` | regenerate migrations after a schema change |
