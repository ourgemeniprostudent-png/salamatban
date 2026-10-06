CREATE TABLE `pilot_action_updates` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`plan_id` text NOT NULL,
	`action_id` text NOT NULL,
	`done` integer NOT NULL,
	`evidence` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`plan_id`) REFERENCES `pilot_plans`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `pilot_audit` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_id` text NOT NULL,
	`subject_id` text NOT NULL,
	`action` text NOT NULL,
	`resource_id` text NOT NULL,
	`outcome` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `pilot_feedback` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`kind` text NOT NULL,
	`message` text NOT NULL,
	`page` text NOT NULL,
	`status` text NOT NULL,
	`reply` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `pilot_users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `pilot_files` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`object_key` text NOT NULL,
	`name` text NOT NULL,
	`mime` text NOT NULL,
	`size` integer NOT NULL,
	`sha256` text NOT NULL,
	`scan_status` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `pilot_users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pilot_files_owner_checksum` ON `pilot_files` (`user_id`,`sha256`);--> statement-breakpoint
CREATE TABLE `pilot_orders` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`amount_rial` integer NOT NULL,
	`pricing_version` text NOT NULL,
	`mode` text NOT NULL,
	`status` text NOT NULL,
	`authority` text,
	`reference` text,
	`idempotency_key` text NOT NULL,
	`paid_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `pilot_users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pilot_order_user_key` ON `pilot_orders` (`user_id`,`idempotency_key`);--> statement-breakpoint
CREATE UNIQUE INDEX `pilot_order_authority` ON `pilot_orders` (`authority`);--> statement-breakpoint
CREATE INDEX `pilot_order_user_status` ON `pilot_orders` (`user_id`,`status`);--> statement-breakpoint
CREATE TABLE `pilot_otp` (
	`id` text PRIMARY KEY NOT NULL,
	`phone` text NOT NULL,
	`digest` text NOT NULL,
	`expires_at` integer NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`used_at` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `pilot_otp_phone_created` ON `pilot_otp` (`phone`,`created_at`);--> statement-breakpoint
CREATE TABLE `pilot_plans` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`version` integer NOT NULL,
	`reviewer_id` text NOT NULL,
	`record_version` integer NOT NULL,
	`record_snapshot` text NOT NULL,
	`summary` text NOT NULL,
	`actions` text NOT NULL,
	`published_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `pilot_users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`reviewer_id`) REFERENCES `pilot_users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pilot_plan_version` ON `pilot_plans` (`user_id`,`version`);--> statement-breakpoint
CREATE UNIQUE INDEX `pilot_plan_record_version` ON `pilot_plans` (`user_id`,`record_version`);--> statement-breakpoint
CREATE TABLE `pilot_rate_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `pilot_records` (
	`user_id` text PRIMARY KEY NOT NULL,
	`profile` text DEFAULT '{}' NOT NULL,
	`answers` text DEFAULT '{}' NOT NULL,
	`step` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`version` integer DEFAULT 0 NOT NULL,
	`consent_version` text,
	`consent_hash` text,
	`consent_at` integer,
	`coordination_consent` integer DEFAULT 0 NOT NULL,
	`urgent` integer DEFAULT 0 NOT NULL,
	`urgent_resolved_at` integer,
	`information_request` text,
	`submitted_at` integer,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `pilot_users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `pilot_sessions` (
	`digest` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`csrf` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `pilot_users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `pilot_tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`kind` text NOT NULL,
	`status` text NOT NULL,
	`title` text NOT NULL,
	`preferred` text,
	`provider` text,
	`scheduled_at` text,
	`reference` text,
	`note` text,
	`assigned_to` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `pilot_users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `pilot_users` (
	`id` text PRIMARY KEY NOT NULL,
	`phone` text NOT NULL,
	`name` text NOT NULL,
	`role` text NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`clinician_id` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pilot_users_phone` ON `pilot_users` (`phone`);