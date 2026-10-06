CREATE TABLE `health_pictures` (`id` text PRIMARY KEY NOT NULL,`member_id` text NOT NULL,`review_id` text NOT NULL,`version` integer NOT NULL,`status` text NOT NULL,`summary` text NOT NULL,`approved_by` text NOT NULL,`approved_at` integer NOT NULL,`published_at` integer,`created_at` integer NOT NULL,FOREIGN KEY (`member_id`) REFERENCES `members`(`id`),FOREIGN KEY (`review_id`) REFERENCES `clinical_reviews`(`id`));
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_health_picture_member_version` ON `health_pictures` (`member_id`,`version`);
--> statement-breakpoint
CREATE INDEX `idx_health_picture_status` ON `health_pictures` (`status`);
