<?php

/**
 * Demo data seeder — fills the database with ~2 years of realistic sample
 * data so every report works before real API credentials are configured.
 * Runs automatically the first time the app boots with an empty database.
 * Re-run manually with: php bin/seed.php --fresh
 */
function seed_demo(PDO $pdo): void
{
    mt_srand(42); // deterministic demo data

    $pdo->exec("INSERT OR REPLACE INTO settings (key, value) VALUES
        ('site_name', 'Acme Marketing'),
        ('sync_time', '06:00'),
        ('timezone', 'UTC'),
        ('demo_mode', '1'),
        ('cron_token', '" . bin2hex(random_bytes(16)) . "')");

    $today   = new DateTimeImmutable('yesterday');
    $start   = $today->sub(new DateInterval('P730D')); // 2 years
    $days    = 730;

    /* ---- Content items ---- */
    $content = [
        // type, title, path, author, days-ago published
        ['blog', '10 Content Marketing Trends for 2026', '/blog/content-marketing-trends-2026', 'Sarah Kim', 40],
        ['blog', 'How We Grew Organic Traffic 300% in a Year', '/blog/organic-traffic-growth-case', 'James Lee', 120],
        ['blog', 'The Complete Guide to Email Nurture Sequences', '/blog/email-nurture-guide', 'Sarah Kim', 200],
        ['blog', 'SEO Checklist: 42 Steps Before You Publish', '/blog/seo-checklist', 'Priya Patel', 310],
        ['blog', 'B2B Social Media Strategy That Actually Works', '/blog/b2b-social-strategy', 'James Lee', 420],
        ['blog', 'What Is Marketing Attribution? A Simple Model', '/blog/marketing-attribution', 'Priya Patel', 500],
        ['documentation', 'Getting Started Guide', '/docs/getting-started', 'Docs Team', 700],
        ['documentation', 'API Reference', '/docs/api-reference', 'Docs Team', 650],
        ['documentation', 'Installation & Setup', '/docs/installation', 'Docs Team', 700],
        ['documentation', 'Troubleshooting Common Errors', '/docs/troubleshooting', 'Docs Team', 400],
        ['landing_page', 'Product Tour', '/product', 'Growth Team', 720],
        ['landing_page', 'Pricing', '/pricing', 'Growth Team', 720],
        ['landing_page', 'Free Trial Signup', '/free-trial', 'Growth Team', 600],
        ['landing_page', 'Agency Solutions', '/solutions/agencies', 'Growth Team', 350],
        ['case_study', 'How TechCorp Cut Support Tickets by 45%', '/case-studies/techcorp', 'Sarah Kim', 260],
        ['case_study', 'Scaling Content Ops at FinServe', '/case-studies/finserve', 'James Lee', 180],
        ['case_study', 'From 0 to 50K Monthly Visits: StartupXYZ', '/case-studies/startupxyz', 'Priya Patel', 90],
    ];
    $insContent = $pdo->prepare(
        'INSERT INTO content_items (type, title, url, author, published_at) VALUES (?, ?, ?, ?, ?)'
    );
    $contentIds = [];
    foreach ($content as [$type, $title, $path, $author, $ago]) {
        $insContent->execute([$type, $title, 'https://example.com' . $path, $author,
                              $today->sub(new DateInterval("P{$ago}D"))->format('Y-m-d')]);
        $contentIds[] = [(int) $pdo->lastInsertId(), $type, $ago];
    }

    /* ---- Daily loops ---- */
    $insCM  = $pdo->prepare('INSERT INTO content_metrics (content_id, date, pageviews, visitors, avg_time, bounce_rate, conversions) VALUES (?,?,?,?,?,?,?)');
    $insGSC = $pdo->prepare('INSERT INTO gsc_daily (date, clicks, impressions, ctr, position) VALUES (?,?,?,?,?)');
    $insGA  = $pdo->prepare('INSERT INTO ga_daily (date, sessions, users, new_users, pageviews, engagement_rate, avg_duration, conversions, bounce_rate) VALUES (?,?,?,?,?,?,?,?,?)');
    $insCh  = $pdo->prepare('INSERT INTO ga_channels (date, channel, sessions, users, conversions) VALUES (?,?,?,?,?)');
    $insSoc = $pdo->prepare('INSERT INTO social_daily (date, platform, followers, impressions, engagements, clicks, posts, video_views) VALUES (?,?,?,?,?,?,?,?)');

    $channels  = ['Organic Search' => 0.42, 'Direct' => 0.20, 'Referral' => 0.10,
                  'Organic Social' => 0.12, 'Email' => 0.09, 'Paid Search' => 0.07];
    $platforms = ['facebook' => 8200, 'linkedin' => 5400, 'twitter' => 12100, 'youtube' => 3600];

    $pdo->beginTransaction();
    for ($i = 0; $i < $days; $i++) {
        $d       = $start->add(new DateInterval("P{$i}D"));
        $date    = $d->format('Y-m-d');
        $growth  = 1 + ($i / $days) * 1.4;                       // steady growth over 2 years
        $weekday = (int) $d->format('N') <= 5 ? 1.0 : 0.55;      // weekend dip
        $season  = 1 + 0.15 * sin($i / 29);                      // gentle monthly wave
        $noise   = fn () => mt_rand(85, 115) / 100;

        // GA4 daily
        $sessions = (int) (1400 * $growth * $weekday * $season * $noise());
        $users    = (int) ($sessions * 0.82);
        $insGA->execute([$date, $sessions, $users, (int) ($users * 0.55),
            (int) ($sessions * mt_rand(180, 220) / 100),
            round(mt_rand(520, 640) / 10, 1), round(mt_rand(95, 175), 1),
            (int) ($sessions * mt_rand(15, 30) / 1000), round(mt_rand(380, 480) / 10, 1)]);

        foreach ($channels as $name => $share) {
            $chS = (int) ($sessions * $share * $noise());
            $insCh->execute([$date, $name, $chS, (int) ($chS * 0.82),
                             (int) ($chS * mt_rand(12, 35) / 1000)]);
        }

        // Search Console daily
        $impr   = (int) (32000 * $growth * $weekday * $season * $noise());
        $clicks = (int) ($impr * mt_rand(28, 40) / 1000);
        $insGSC->execute([$date, $clicks, $impr, round($clicks / max(1, $impr) * 100, 2),
                          round(18.5 - 6.5 * ($i / $days) + mt_rand(-10, 10) / 10, 1)]);

        // Social daily
        foreach ($platforms as $p => $base) {
            $followers = (int) ($base * (1 + ($i / $days) * 0.65) + $i * 0.4);
            $pImpr     = (int) (($p === 'youtube' ? 2600 : 4200) * $growth * $weekday * $noise());
            $insSoc->execute([$date, $p, $followers, $pImpr,
                (int) ($pImpr * mt_rand(30, 60) / 1000), (int) ($pImpr * mt_rand(8, 20) / 1000),
                (int) $d->format('N') === 2 ? 1 : (mt_rand(0, 10) > 8 ? 1 : 0),
                $p === 'youtube' ? (int) (1900 * $growth * $noise()) : 0]);
        }

        // Per-content metrics (only after publish date; newer content trends up)
        foreach ($contentIds as [$cid, $type, $ago]) {
            $publishedIndex = $days - $ago;
            if ($i < $publishedIndex) {
                continue;
            }
            $age  = $i - $publishedIndex + 1;
            $peak = match ($type) {
                'blog'          => 260, 'documentation' => 190,
                'landing_page'  => 420, 'case_study'    => 130,
            };
            // ramp up over ~3 weeks then settle with slow decay
            $curve = min(1, $age / 21) * (1 / (1 + $age / 700));
            $pv    = (int) ($peak * $curve * $weekday * $noise() * ($cid % 4 + 2) / 3);
            if ($pv < 1) {
                continue;
            }
            $insCM->execute([$cid, $date, $pv, (int) ($pv * 0.78),
                round(mt_rand(60, 260), 1), round(mt_rand(320, 560) / 10, 1),
                (int) ($pv * mt_rand(($type === 'landing_page' ? 30 : 5), ($type === 'landing_page' ? 60 : 18)) / 1000)]);
        }
    }
    $pdo->commit();

    /* ---- GSC top queries / pages (latest snapshot) ---- */
    $latest  = $today->format('Y-m-d');
    $queries = [
        ['content marketing software', 3120, 88400], ['marketing reporting tool', 2480, 61200],
        ['seo checklist', 1930, 74100], ['email nurture sequence', 1410, 38800],
        ['b2b social media strategy', 1220, 45600], ['marketing attribution model', 980, 33900],
        ['content marketing trends 2026', 940, 29800], ['acme marketing', 890, 12400],
        ['how to grow organic traffic', 760, 41200], ['marketing dashboard examples', 640, 27600],
        ['content ops', 520, 19800], ['api documentation best practices', 430, 16900],
        ['free marketing report template', 380, 22100], ['keyword tracking tool', 340, 18400],
        ['case study examples b2b', 290, 15200],
    ];
    $insQ = $pdo->prepare('INSERT INTO gsc_queries (date, query, clicks, impressions, ctr, position) VALUES (?,?,?,?,?,?)');
    foreach ($queries as $i => [$q, $c, $im]) {
        $insQ->execute([$latest, $q, $c, $im, round($c / $im * 100, 2), round(1.8 + $i * 0.9 + mt_rand(0, 15) / 10, 1)]);
    }
    $insP = $pdo->prepare('INSERT INTO gsc_pages (date, page, clicks, impressions, ctr, position) VALUES (?,?,?,?,?,?)');
    foreach ($content as $i => [$type, $title, $path]) {
        $c  = (int) (2800 / ($i + 1)) + mt_rand(50, 200);
        $im = $c * mt_rand(18, 34);
        $insP->execute([$latest, 'https://example.com' . $path, $c, $im,
                        round($c / $im * 100, 2), round(2.5 + $i * 0.8, 1)]);
    }

    /* ---- GA top pages (last 30 days) ---- */
    $insGaP = $pdo->prepare('INSERT INTO ga_pages (date, page, pageviews, users) VALUES (?,?,?,?)');
    for ($i = 0; $i < 30; $i++) {
        $date = $today->sub(new DateInterval("P{$i}D"))->format('Y-m-d');
        foreach ($content as $j => [$type, $title, $path]) {
            $pv = (int) ((3400 / ($j + 2)) * (mt_rand(80, 120) / 100));
            $insGaP->execute([$date, $path, $pv, (int) ($pv * 0.8)]);
        }
    }

    /* ---- Social posts ---- */
    $posts = [
        ['facebook', 'We just published our 2026 trends report — 10 shifts to watch', 12, 18200, 940, 310, 0],
        ['facebook', 'Behind the scenes: how our content team plans a quarter', 26, 9400, 512, 178, 0],
        ['facebook', 'Customer story: TechCorp cut support tickets by 45%', 41, 14100, 730, 402, 0],
        ['linkedin', 'The B2B playbook we used to 3x organic traffic (thread)', 8, 22400, 1840, 620, 0],
        ['linkedin', 'Hiring: Senior Content Strategist — join our team', 19, 8800, 640, 240, 0],
        ['linkedin', 'What 500 marketers told us about attribution', 33, 17600, 1290, 505, 0],
        ['twitter', 'Hot take: your blog doesn\'t need more posts, it needs fewer, better ones', 5, 31200, 2110, 480, 0],
        ['twitter', 'We analyzed 1,000 landing pages. Here\'s what converts', 15, 26800, 1750, 690, 0],
        ['twitter', 'New on the blog: the complete email nurture guide', 29, 11900, 620, 350, 0],
        ['youtube', 'Marketing Reports 101 — full walkthrough (14 min)', 10, 8400, 610, 120, 6800],
        ['youtube', 'How to set up GA4 for content teams', 24, 12700, 890, 210, 10400],
        ['youtube', 'Keyword research live session', 47, 5900, 380, 90, 4300],
    ];
    $insPost = $pdo->prepare('INSERT INTO social_posts (platform, posted_at, title, url, impressions, engagements, clicks, video_views) VALUES (?,?,?,?,?,?,?,?)');
    foreach ($posts as $i => [$p, $t, $ago, $im, $e, $c, $vv]) {
        $insPost->execute([$p, $today->sub(new DateInterval("P{$ago}D"))->format('Y-m-d'), $t,
                           "https://social.example/{$p}/post-{$i}", $im, $e, $c, $vv]);
    }

    /* ---- Email campaigns ---- */
    $emails = [
        // days-ago, name, type, sent, delivered, opens, clicks, unsubs
        [150, 'January Newsletter',          'Newsletter',           4200, 4100, 1640, 328, 12],
        [137, 'Product Update Announcement', 'Product Announcement', 4250, 4160, 1830, 540,  9],
        [122, 'February Newsletter',         'Newsletter',           4380, 4270, 1580, 300, 15],
        [100, 'Beta Invite',                 'Product Announcement', 4400, 4300, 1935, 620,  7],
        [ 80, 'March Newsletter',            'Newsletter',           4520, 4400, 1540, 280, 18],
        [ 64, 'Testimonial Request',         'Testimonial Request',  2100, 2060,  990, 210,  4],
        [ 45, 'Spring Promo',                'Promo',                4600, 4480, 1700, 510, 21],
        [ 30, 'May Newsletter',              'Newsletter',           4700, 4580, 1600, 295, 16],
        [ 12, 'Feature Deep-dive',           'Product Announcement', 4750, 4640, 1980, 585, 11],
    ];
    $insEmail = $pdo->prepare('INSERT INTO email_campaigns (date, name, type, sent, delivered, opens, clicks, unsubscribes) VALUES (?,?,?,?,?,?,?,?)');
    foreach ($emails as [$ago, $name, $type, $sent, $del, $opens, $clicks, $unsub]) {
        $insEmail->execute([$today->sub(new DateInterval("P{$ago}D"))->format('Y-m-d'),
                            $name, $type, $sent, $del, $opens, $clicks, $unsub]);
    }

    /* ---- Campaigns ---- */
    $campaigns = [
        ['Q3 Product Launch',        'Paid Search',  'active',    90, null, 24000, 0.9, 42],
        ['Summer Webinar Series',    'Email',        'active',    60, null,  6000, 2.1, 28],
        ['Always-on Retargeting',    'Paid Social',  'active',   360, null, 18000, 1.2, 30],
        ['2026 Trends Report Promo', 'Content',      'completed', 150,  60, 9000, 3.4, 20],
        ['Brand Awareness — Video',  'YouTube Ads',  'paused',   200,  95, 15000, 0.4, 55],
        ['Partner Co-marketing',     'Referral',     'completed', 300, 180,  4000, 2.8, 15],
    ];
    $insCamp = $pdo->prepare('INSERT INTO campaigns (name, channel, status, start_date, end_date, budget) VALUES (?,?,?,?,?,?)');
    $insCampM = $pdo->prepare('INSERT INTO campaign_metrics (campaign_id, date, impressions, clicks, conversions, cost, revenue) VALUES (?,?,?,?,?,?,?)');
    foreach ($campaigns as [$name, $channel, $status, $startAgo, $endAgo, $budget, $roas, $dailyImprK]) {
        $insCamp->execute([$name, $channel, $status,
            $today->sub(new DateInterval("P{$startAgo}D"))->format('Y-m-d'),
            $endAgo ? $today->sub(new DateInterval("P{$endAgo}D"))->format('Y-m-d') : null,
            $budget]);
        $cid = (int) $pdo->lastInsertId();
        $len = $startAgo - ($endAgo ?? 0);
        $dailyCost = $budget / max(1, $len) * 0.92;
        for ($i = 0; $i < $len; $i++) {
            $date = $today->sub(new DateInterval('P' . ($startAgo - $i) . 'D'))->format('Y-m-d');
            $impr = (int) ($dailyImprK * 100 * (mt_rand(80, 120) / 100));
            $clk  = (int) ($impr * mt_rand(15, 45) / 1000);
            $cost = round($dailyCost * (mt_rand(85, 115) / 100), 2);
            $insCampM->execute([$cid, $date, $impr, $clk,
                (int) ($clk * mt_rand(30, 90) / 1000), $cost,
                round($cost * $roas * (mt_rand(70, 130) / 100), 2)]);
        }
    }

    /* ---- Keywords + ranking history ---- */
    $kws = [
        ['content marketing software', '/product', 9900, 68, 4.2],
        ['marketing reporting tool', '/product', 5400, 61, 6.1],
        ['seo checklist', '/blog/seo-checklist', 8100, 54, 3.4],
        ['email nurture sequence', '/blog/email-nurture-guide', 2900, 41, 5.7],
        ['b2b social media strategy', '/blog/b2b-social-strategy', 3600, 49, 7.8],
        ['marketing attribution model', '/blog/marketing-attribution', 2400, 57, 9.3],
        ['marketing dashboard examples', '/blog/content-marketing-trends-2026', 1900, 38, 11.6],
        ['keyword tracking tool', '/product', 3100, 63, 13.2],
        ['content ops platform', '/solutions/agencies', 880, 45, 8.9],
        ['free marketing report template', '/free-trial', 4400, 35, 6.8],
    ];
    $insKw  = $pdo->prepare('INSERT INTO keywords (keyword, target_url, search_volume, difficulty) VALUES (?,?,?,?)');
    $insKwR = $pdo->prepare('INSERT INTO keyword_rankings (keyword_id, date, position, clicks, impressions, ctr) VALUES (?,?,?,?,?,?)');
    $pdo->beginTransaction();
    foreach ($kws as [$kw, $url, $vol, $diff, $finalPos]) {
        $insKw->execute([$kw, 'https://example.com' . $url, $vol, $diff]);
        $kid = (int) $pdo->lastInsertId();
        $startPos = $finalPos + mt_rand(8, 25);
        for ($i = 0; $i < 365; $i++) {
            $date = $today->sub(new DateInterval('P' . (364 - $i) . 'D'))->format('Y-m-d');
            $pos  = max(1.0, $startPos - ($startPos - $finalPos) * ($i / 364) + mt_rand(-15, 15) / 10);
            $impr = (int) ($vol / 30 * (mt_rand(70, 130) / 100));
            $ctrPct = max(0.5, 32 * exp(-0.22 * $pos));
            $insKwR->execute([$kid, $date, round($pos, 1),
                (int) ($impr * $ctrPct / 100), $impr, round($ctrPct, 2)]);
        }
    }
    $pdo->commit();
}
