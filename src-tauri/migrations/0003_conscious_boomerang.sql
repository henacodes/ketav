CREATE TABLE `daily_reading_progress` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`goal_id` integer,
	`date` text NOT NULL,
	`minutes_read` integer NOT NULL,
	FOREIGN KEY (`goal_id`) REFERENCES `daily_reading_goal`(`id`) ON UPDATE no action ON DELETE cascade
);
