CREATE TABLE `books` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`book_id` text NOT NULL,
	`title` text NOT NULL,
	`author` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `books_book_id_unique` ON `books` (`book_id`);--> statement-breakpoint
CREATE TABLE `daily_book_stats` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`day` text NOT NULL,
	`book_id` text NOT NULL,
	`minutes_read` integer DEFAULT 0 NOT NULL,
	`last_active` integer,
	FOREIGN KEY (`book_id`) REFERENCES `books`(`book_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `daily_user_stats` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`day` text NOT NULL,
	`minutes_read` integer DEFAULT 0 NOT NULL,
	`sessions_count` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `daily_reading_goal` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`minutes_to_read` integer NOT NULL,
	`associated_book` text,
	`start_date` text NOT NULL,
	`end_date` text,
	FOREIGN KEY (`associated_book`) REFERENCES `books`(`book_id`) ON UPDATE no action ON DELETE cascade
);
