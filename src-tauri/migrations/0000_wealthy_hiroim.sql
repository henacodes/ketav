CREATE TABLE `books` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`book_id` text NOT NULL,
	`title` text NOT NULL,
	`author` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `books_book_id_unique` ON `books` (`book_id`);--> statement-breakpoint
CREATE TABLE `daily_book_stats` (
	`user_id` text NOT NULL,
	`day` text NOT NULL,
	`book_id` integer NOT NULL,
	`minutes_read` integer DEFAULT 0 NOT NULL,
	`last_active` integer,
	FOREIGN KEY (`book_id`) REFERENCES `books`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `daily_user_stats` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`day` text NOT NULL,
	`minutes_read` integer DEFAULT 0 NOT NULL,
	`sessions_count` integer DEFAULT 0 NOT NULL
);
