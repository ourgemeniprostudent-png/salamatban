CREATE TABLE `pilot_task_actions` (
	`task_id` text PRIMARY KEY NOT NULL,
	`plan_id` text NOT NULL,
	`action_id` text NOT NULL,
	FOREIGN KEY (`task_id`) REFERENCES `pilot_tasks`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`plan_id`) REFERENCES `pilot_plans`(`id`) ON UPDATE no action ON DELETE no action
);
