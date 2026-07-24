CREATE TABLE `custom_pages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`slug` text NOT NULL,
	`section` text,
	`icon` text DEFAULT 'file-text',
	`kind` text DEFAULT 'notes',
	`url` text,
	`content` text,
	`position` integer DEFAULT 0
);
--> statement-breakpoint
CREATE UNIQUE INDEX `custom_pages_slug_unique` ON `custom_pages` (`slug`);