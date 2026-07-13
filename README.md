# Content Marketing Reports

A self-hosted, zero-dependency PHP dashboard that gives a marketing team every
report it needs in one place:

| Area | Reports |
|---|---|
| **Content** | Blog, Documentation, Landing Pages, Case Studies — pageviews, visitors, time on page, bounce, conversions per item |
| **Google Search** | Dedicated page: clicks, impressions, CTR, average position, top queries, top pages (Search Console API) |
| **Google Analytics** | Dedicated page: sessions, users, new users, pageviews, engagement, duration, conversions, bounce, channels, top pages (GA4 Data API) |
| **Keywords** | Tracked keyword rankings, position change, volume, difficulty, click/impression history |
| **Social media** | Overview + per-platform pages for Facebook, LinkedIn, X/Twitter, YouTube — followers, impressions, engagements, clicks, video views, top posts |
| **Email marketing** | Campaign sends with open/click/unsubscribe rates, monthly trends |
| **Campaigns** | Budget, spend, impressions, clicks, CTR, conversions, CPA, revenue, ROAS per campaign with daily trends |
| **Monthly & yearly** | Month-by-month and year-over-year rollups across all sources |
| **Compare** | Any metric, any two date ranges, day-by-day overlay + all-metric delta table |

Data refreshes **automatically once a day at a time you choose** (Settings →
Daily sync time), and every page supports 7/30/90-day, 12-month, and custom
date ranges with previous-period deltas.

## Requirements

- PHP 8.1+ with `pdo_sqlite`, `curl`, `openssl` (standard on almost every host)
- No Composer packages, no Node build, no external database — storage is a
  single SQLite file in `storage/`

## Quick start

```bash
git clone <this repo>
cd ContentMarketingReports
php -S localhost:8000 -t public
```

Open http://localhost:8000 — the first boot creates the database and fills it
with **two years of demo data** so you can explore every report immediately.

When you're ready for real data, wipe the demo set:

```bash
php bin/seed.php --fresh    # or just delete storage/app.sqlite
```

…then connect your accounts in **Settings** (the demo banner disappears once
`demo_mode` is cleared — save any settings form to keep your values).

## Connecting real data sources

### Google Search Console + Google Analytics 4 (one service account for both)

1. In [Google Cloud Console](https://console.cloud.google.com/) create a
   project, enable **Google Search Console API** and **Google Analytics Data API**.
2. Create a **service account** and download a JSON key.
3. Paste the JSON into *Settings → Google → Service account JSON key*.
4. **Search Console**: add the service-account email as a user of your property
   (Settings → Users and permissions). Enter the property URL
   (`sc-domain:example.com` or `https://example.com/`).
5. **GA4**: add the service-account email as *Viewer* on the GA4 property
   (Admin → Property access management). Enter the numeric property ID.

### Social platforms (each optional)

- **Facebook**: a Page access token with `read_insights` + the page ID
  ([Graph API docs](https://developers.facebook.com/docs/graph-api/))
- **LinkedIn**: an OAuth token with `r_organization_social` + the organization
  URN (`urn:li:organization:12345`)
- **X / Twitter**: an API v2 bearer token + your numeric user ID
  (follower counts on the free tier; impressions need a paid tier)
- **YouTube**: a Data API key + channel ID

## Three ways to get data in

Every dataset supports all three input methods:

1. **Automated** — the daily API sync (Search Console, GA4, social platforms;
   see below).
2. **In-app manual entry** — *Data Manager* in the sidebar has an add/update
   form for every dataset (GA totals, channels, Search Console, content,
   social, campaigns, keywords, email campaigns). Saving with the same key
   updates the row.
3. **CSV import** — upload a file on the same Data Manager page. Download the
   per-dataset template for the expected columns. The importer is tolerant of
   spreadsheet exports: it skips blank/padded rows, accepts `1,234`, `45.0%`
   and `–`, finds the header row after title rows, and matches columns by
   name with aliases (e.g. `Campaign` → name). Re-importing the same file is
   safe (rows upsert by key).

   Two special importers understand wide **month-matrix sheet exports**
   (rows × `Jan'25, Feb'25, …` columns):
   - *Search Console — monthly matrix*: reads the Clicks / Impressions /
     CTR / Avg. position rows (other rows are ignored, so a whole report
     export works).
   - *GA channels — monthly matrix*: reads channel rows; you choose whether
     the numbers are sessions, users, or conversions. Total rows are skipped.

   Monthly figures are stored on the 1st of the month so the monthly and
   yearly rollups aggregate them correctly.

## Automatic daily updates

Set the time in *Settings → Daily sync time*, then add **one** of these:

```cron
# 1. Recommended — honours the time configured in Settings:
*/5 * * * * php /path/to/ContentMarketingReports/bin/scheduler.php

# 2. Fixed time in crontab:
0 6 * * * php /path/to/ContentMarketingReports/bin/sync.php

# 3. Shared hosting / web cron (cron-job.org, cPanel curl):
*/5 * * * * curl -s "https://your-domain/?page=cron&token=YOUR_CRON_TOKEN"
```

Every run is recorded in *Settings → Sync history*. You can also trigger a
manual sync anytime with *Settings → Run sync now*.

## Production deployment

Point your web server's document root at `public/`. For Apache add:

```apache
<VirtualHost *:80>
    DocumentRoot /path/to/ContentMarketingReports/public
</VirtualHost>
```

For nginx:

```nginx
root /path/to/ContentMarketingReports/public;
index index.php;
location / { try_files $uri /index.php?$args; }
location ~ \.php$ { include fastcgi_params; fastcgi_pass unix:/run/php/php-fpm.sock;
                    fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name; }
```

Make sure `storage/` is writable by the web server **and** the cron user.
Keep `storage/` outside the document root (it already is) so the SQLite file
is never web-accessible.

## Project layout

```
public/          front controller + assets (document root)
app/Core/        DB, Settings, Reports (query layer)
app/Services/    GoogleClient (JWT auth), SearchConsoleSync, AnalyticsSync,
                 SocialSync, SyncRunner
views/           page templates
database/        schema.sql + demo seeder
bin/             sync.php, scheduler.php, seed.php (CLI)
storage/         SQLite database + WAL files (gitignored)
```
