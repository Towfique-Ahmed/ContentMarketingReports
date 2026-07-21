CREATE TABLE `campaign_metrics` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`campaign_id` integer NOT NULL,
	`date` text NOT NULL,
	`impressions` integer DEFAULT 0,
	`clicks` integer DEFAULT 0,
	`conversions` integer DEFAULT 0,
	`cost` real DEFAULT 0,
	`revenue` real DEFAULT 0,
	FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `campaign_metrics_campaign_id_date_unique` ON `campaign_metrics` (`campaign_id`,`date`);--> statement-breakpoint
CREATE TABLE `campaigns` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`channel` text NOT NULL,
	`status` text DEFAULT 'active',
	`start_date` text,
	`end_date` text,
	`budget` real DEFAULT 0
);
--> statement-breakpoint
CREATE UNIQUE INDEX `campaigns_name_channel_unique` ON `campaigns` (`name`,`channel`);--> statement-breakpoint
CREATE TABLE `content_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`url` text NOT NULL,
	`author` text,
	`published_at` text,
	`funnel_stage` text,
	`reviewer` text,
	`publisher` text,
	`target_keyword` text,
	`keyword_position` text,
	`search_volume` integer DEFAULT 0,
	`ai_presence` text,
	`views` integer DEFAULT 0
);
--> statement-breakpoint
CREATE UNIQUE INDEX `content_items_type_url_unique` ON `content_items` (`type`,`url`);--> statement-breakpoint
CREATE TABLE `content_metrics` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`content_id` integer NOT NULL,
	`date` text NOT NULL,
	`pageviews` integer DEFAULT 0,
	`visitors` integer DEFAULT 0,
	`avg_time` real DEFAULT 0,
	`bounce_rate` real DEFAULT 0,
	`conversions` integer DEFAULT 0,
	FOREIGN KEY (`content_id`) REFERENCES `content_items`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `content_metrics_content_id_date_unique` ON `content_metrics` (`content_id`,`date`);--> statement-breakpoint
CREATE TABLE `email_campaigns` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` text NOT NULL,
	`name` text NOT NULL,
	`type` text,
	`sent` integer DEFAULT 0,
	`delivered` integer DEFAULT 0,
	`opens` integer DEFAULT 0,
	`clicks` integer DEFAULT 0,
	`unsubscribes` integer DEFAULT 0,
	`list_name` text,
	`segment` text,
	`subject` text,
	`author` text,
	`notes` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `email_campaigns_date_name_unique` ON `email_campaigns` (`date`,`name`);--> statement-breakpoint
CREATE TABLE `ga_channels` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` text NOT NULL,
	`channel` text NOT NULL,
	`sessions` integer DEFAULT 0,
	`users` integer DEFAULT 0,
	`new_users` integer DEFAULT 0,
	`conversions` integer DEFAULT 0
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ga_channels_date_channel_unique` ON `ga_channels` (`date`,`channel`);--> statement-breakpoint
CREATE TABLE `ga_daily` (
	`date` text PRIMARY KEY NOT NULL,
	`sessions` integer DEFAULT 0,
	`users` integer DEFAULT 0,
	`new_users` integer DEFAULT 0,
	`pageviews` integer DEFAULT 0,
	`engagement_rate` real DEFAULT 0,
	`avg_duration` real DEFAULT 0,
	`conversions` integer DEFAULT 0,
	`bounce_rate` real DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE `ga_pages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` text NOT NULL,
	`page` text NOT NULL,
	`pageviews` integer DEFAULT 0,
	`users` integer DEFAULT 0
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ga_pages_date_page_unique` ON `ga_pages` (`date`,`page`);--> statement-breakpoint
CREATE TABLE `gsc_daily` (
	`date` text PRIMARY KEY NOT NULL,
	`clicks` integer DEFAULT 0,
	`impressions` integer DEFAULT 0,
	`ctr` real DEFAULT 0,
	`position` real DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE `gsc_pages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` text NOT NULL,
	`page` text NOT NULL,
	`clicks` integer DEFAULT 0,
	`impressions` integer DEFAULT 0,
	`ctr` real DEFAULT 0,
	`position` real DEFAULT 0
);
--> statement-breakpoint
CREATE UNIQUE INDEX `gsc_pages_date_page_unique` ON `gsc_pages` (`date`,`page`);--> statement-breakpoint
CREATE TABLE `gsc_queries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` text NOT NULL,
	`query` text NOT NULL,
	`clicks` integer DEFAULT 0,
	`impressions` integer DEFAULT 0,
	`ctr` real DEFAULT 0,
	`position` real DEFAULT 0
);
--> statement-breakpoint
CREATE UNIQUE INDEX `gsc_queries_date_query_unique` ON `gsc_queries` (`date`,`query`);--> statement-breakpoint
CREATE TABLE `keyword_rankings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`keyword_id` integer NOT NULL,
	`date` text NOT NULL,
	`position` real DEFAULT 0,
	`clicks` integer DEFAULT 0,
	`impressions` integer DEFAULT 0,
	`ctr` real DEFAULT 0,
	FOREIGN KEY (`keyword_id`) REFERENCES `keywords`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `keyword_rankings_keyword_id_date_unique` ON `keyword_rankings` (`keyword_id`,`date`);--> statement-breakpoint
CREATE TABLE `keywords` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`keyword` text NOT NULL,
	`target_url` text,
	`search_volume` integer DEFAULT 0,
	`difficulty` integer DEFAULT 0
);
--> statement-breakpoint
CREATE UNIQUE INDEX `keywords_keyword_unique` ON `keywords` (`keyword`);--> statement-breakpoint
CREATE TABLE `monthly_notes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`month` text NOT NULL,
	`category` text,
	`note` text
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text
);
--> statement-breakpoint
CREATE TABLE `social_daily` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` text NOT NULL,
	`platform` text NOT NULL,
	`followers` integer DEFAULT 0,
	`impressions` integer DEFAULT 0,
	`engagements` integer DEFAULT 0,
	`clicks` integer DEFAULT 0,
	`posts` integer DEFAULT 0,
	`video_views` integer DEFAULT 0
);
--> statement-breakpoint
CREATE UNIQUE INDEX `social_daily_date_platform_unique` ON `social_daily` (`date`,`platform`);--> statement-breakpoint
CREATE TABLE `social_posts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`platform` text NOT NULL,
	`posted_at` text NOT NULL,
	`title` text NOT NULL,
	`url` text NOT NULL,
	`impressions` integer DEFAULT 0,
	`engagements` integer DEFAULT 0,
	`clicks` integer DEFAULT 0,
	`video_views` integer DEFAULT 0
);
--> statement-breakpoint
CREATE UNIQUE INDEX `social_posts_platform_url_unique` ON `social_posts` (`platform`,`url`);--> statement-breakpoint
CREATE TABLE `sync_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`source` text NOT NULL,
	`ran_at` text DEFAULT CURRENT_TIMESTAMP,
	`status` text,
	`message` text
);
