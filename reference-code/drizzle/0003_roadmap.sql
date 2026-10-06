CREATE TABLE `roadmaps` (`id` text PRIMARY KEY NOT NULL,`member_id` text NOT NULL,`health_picture_id` text NOT NULL,`version` integer NOT NULL,`status` text NOT NULL,`start_date` text NOT NULL,`approved_by` text NOT NULL,`published_at` integer NOT NULL,`created_at` integer NOT NULL,FOREIGN KEY (`member_id`) REFERENCES `members`(`id`),FOREIGN KEY (`health_picture_id`) REFERENCES `health_pictures`(`id`));
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_roadmap_member_version` ON `roadmaps` (`member_id`,`version`);
--> statement-breakpoint
CREATE INDEX `idx_roadmap_status` ON `roadmaps` (`status`);
--> statement-breakpoint
CREATE TABLE `roadmap_actions` (`id` text PRIMARY KEY NOT NULL,`roadmap_id` text NOT NULL,`title` text NOT NULL,`rationale` text NOT NULL,`due_date` text NOT NULL,`priority` text NOT NULL,`owner_type` text NOT NULL,`status` text NOT NULL,`completion_rule` text NOT NULL,`created_at` integer NOT NULL,FOREIGN KEY (`roadmap_id`) REFERENCES `roadmaps`(`id`));
--> statement-breakpoint
CREATE INDEX `idx_roadmap_actions_roadmap_due` ON `roadmap_actions` (`roadmap_id`,`due_date`);
