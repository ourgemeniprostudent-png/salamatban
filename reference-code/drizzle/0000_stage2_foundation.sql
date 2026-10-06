CREATE TABLE `members` (
  `id` text PRIMARY KEY NOT NULL,
  `auth_user_id` text NOT NULL,
  `email` text NOT NULL,
  `phone` text,
  `first_name` text,
  `last_name` text,
  `birth_date` text,
  `city` text,
  `onboarding_status` text DEFAULT 'started' NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_members_auth_user_id` ON `members` (`auth_user_id`);
--> statement-breakpoint
CREATE TABLE `consent_definitions` (
  `id` text PRIMARY KEY NOT NULL,
  `consent_type` text NOT NULL,
  `version` text NOT NULL,
  `title` text NOT NULL,
  `body_hash` text NOT NULL,
  `is_active` integer DEFAULT true NOT NULL,
  `created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_consent_type_version` ON `consent_definitions` (`consent_type`,`version`);
--> statement-breakpoint
CREATE TABLE `user_consents` (
  `id` text PRIMARY KEY NOT NULL,
  `member_id` text NOT NULL,
  `definition_id` text NOT NULL,
  `granted_at` integer NOT NULL,
  `revoked_at` integer,
  `source` text NOT NULL,
  FOREIGN KEY (`member_id`) REFERENCES `members`(`id`),
  FOREIGN KEY (`definition_id`) REFERENCES `consent_definitions`(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_user_consents_member` ON `user_consents` (`member_id`);
--> statement-breakpoint
CREATE TABLE `audit_events` (
  `id` text PRIMARY KEY NOT NULL,
  `actor_id` text NOT NULL,
  `subject_id` text,
  `action` text NOT NULL,
  `resource_type` text NOT NULL,
  `resource_id` text,
  `purpose` text NOT NULL,
  `outcome` text NOT NULL,
  `created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_audit_subject_created` ON `audit_events` (`subject_id`,`created_at`);
