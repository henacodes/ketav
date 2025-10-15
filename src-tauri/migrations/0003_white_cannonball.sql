PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_daily_book_stats` (
	`day` text NOT NULL,
	`book_id` text NOT NULL,
	`minutes_read` integer DEFAULT 0 NOT NULL,
	`last_active` integer,
	FOREIGN KEY (`book_id`) REFERENCES `books`(`book_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_daily_book_stats`("day", "book_id", "minutes_read", "last_active") SELECT "day", "book_id", "minutes_read", "last_active" FROM `daily_book_stats`;--> statement-breakpoint
DROP TABLE `daily_book_stats`;--> statement-breakpoint
ALTER TABLE `__new_daily_book_stats` RENAME TO `daily_book_stats`;--> statement-breakpoint
PRAGMA foreign_keys=ON;