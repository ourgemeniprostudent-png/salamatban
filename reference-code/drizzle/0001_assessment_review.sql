CREATE TABLE `questionnaire_definitions` (`id` text PRIMARY KEY NOT NULL,`version` text NOT NULL,`title` text NOT NULL,`source` text NOT NULL,`approved_by` text NOT NULL,`approved_at` integer NOT NULL,`is_active` integer DEFAULT true NOT NULL);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_questionnaire_version` ON `questionnaire_definitions` (`version`);
--> statement-breakpoint
CREATE TABLE `questionnaire_responses` (`id` text PRIMARY KEY NOT NULL,`member_id` text NOT NULL,`definition_id` text NOT NULL,`status` text NOT NULL,`red_flag_count` integer DEFAULT 0 NOT NULL,`submitted_at` integer,`created_at` integer NOT NULL,`updated_at` integer NOT NULL,FOREIGN KEY (`member_id`) REFERENCES `members`(`id`),FOREIGN KEY (`definition_id`) REFERENCES `questionnaire_definitions`(`id`));
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_questionnaire_response_member_definition` ON `questionnaire_responses` (`member_id`,`definition_id`);
--> statement-breakpoint
CREATE INDEX `idx_questionnaire_response_status` ON `questionnaire_responses` (`status`);
--> statement-breakpoint
CREATE TABLE `questionnaire_answers` (`id` text PRIMARY KEY NOT NULL,`response_id` text NOT NULL,`question_id` text NOT NULL,`answer_value` text NOT NULL,`created_at` integer NOT NULL,FOREIGN KEY (`response_id`) REFERENCES `questionnaire_responses`(`id`));
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_questionnaire_answer_response_question` ON `questionnaire_answers` (`response_id`,`question_id`);
--> statement-breakpoint
CREATE TABLE `care_tasks` (`id` text PRIMARY KEY NOT NULL,`member_id` text NOT NULL,`response_id` text,`task_type` text NOT NULL,`priority` text NOT NULL,`status` text NOT NULL,`title` text NOT NULL,`due_at` integer NOT NULL,`created_at` integer NOT NULL,FOREIGN KEY (`member_id`) REFERENCES `members`(`id`),FOREIGN KEY (`response_id`) REFERENCES `questionnaire_responses`(`id`));
--> statement-breakpoint
CREATE INDEX `idx_care_tasks_status_due` ON `care_tasks` (`status`,`due_at`);
--> statement-breakpoint
CREATE TABLE `clinical_reviews` (`id` text PRIMARY KEY NOT NULL,`member_id` text NOT NULL,`response_id` text NOT NULL,`status` text NOT NULL,`priority` text NOT NULL,`assigned_to` text,`decision` text,`notes` text,`created_at` integer NOT NULL,`reviewed_at` integer,FOREIGN KEY (`member_id`) REFERENCES `members`(`id`),FOREIGN KEY (`response_id`) REFERENCES `questionnaire_responses`(`id`));
--> statement-breakpoint
CREATE INDEX `idx_clinical_reviews_status_priority` ON `clinical_reviews` (`status`,`priority`);
