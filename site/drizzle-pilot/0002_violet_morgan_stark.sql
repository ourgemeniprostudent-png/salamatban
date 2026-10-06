CREATE TABLE `pilot_booking_locations` (
	`task_id` text PRIMARY KEY NOT NULL,
	`address` text NOT NULL,
	`unit` text DEFAULT '' NOT NULL,
	`entrance` text DEFAULT '' NOT NULL,
	`latitude` text,
	`longitude` text,
	`confirmed_at` integer NOT NULL,
	FOREIGN KEY (`task_id`) REFERENCES `pilot_tasks`(`id`) ON UPDATE no action ON DELETE no action
);
