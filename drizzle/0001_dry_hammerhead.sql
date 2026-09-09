CREATE TABLE `diagnostics` (
	`id` text PRIMARY KEY NOT NULL,
	`visit_id` text NOT NULL,
	`category` text NOT NULL,
	`title` text NOT NULL,
	`results_json` text DEFAULT '[]' NOT NULL,
	`interpretation` text DEFAULT '' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`cost_iqd` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`visit_id`) REFERENCES `visits`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `diagnostics_visit_idx` ON `diagnostics` (`visit_id`);--> statement-breakpoint
CREATE TABLE `procedures` (
	`id` text PRIMARY KEY NOT NULL,
	`visit_id` text NOT NULL,
	`category` text NOT NULL,
	`procedure_type` text NOT NULL,
	`procedure_date` text,
	`anesthesia` text DEFAULT '' NOT NULL,
	`details` text DEFAULT '' NOT NULL,
	`cost_iqd` integer DEFAULT 0 NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`visit_id`) REFERENCES `visits`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `procedures_visit_idx` ON `procedures` (`visit_id`);--> statement-breakpoint
ALTER TABLE `preventive_records` ADD `visit_id` text REFERENCES visits(id);--> statement-breakpoint
ALTER TABLE `preventive_records` ADD `current_status` text DEFAULT 'unknown' NOT NULL;--> statement-breakpoint
CREATE INDEX `preventive_visit_idx` ON `preventive_records` (`visit_id`);--> statement-breakpoint
ALTER TABLE `visits` ADD `visit_type` text DEFAULT 'sick_visit' NOT NULL;--> statement-breakpoint
ALTER TABLE `visits` ADD `cost_iqd` integer DEFAULT 0 NOT NULL;