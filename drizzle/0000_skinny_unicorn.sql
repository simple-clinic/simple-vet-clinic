CREATE TABLE `medications` (
	`id` text PRIMARY KEY NOT NULL,
	`visit_id` text NOT NULL,
	`name` text NOT NULL,
	`dose` text DEFAULT '' NOT NULL,
	`route` text DEFAULT '' NOT NULL,
	`frequency` text DEFAULT '' NOT NULL,
	`duration` text DEFAULT '' NOT NULL,
	`instructions` text DEFAULT '' NOT NULL,
	`owner_visible` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`visit_id`) REFERENCES `visits`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `medications_visit_idx` ON `medications` (`visit_id`);--> statement-breakpoint
CREATE TABLE `owners` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`phone` text NOT NULL,
	`phone_normalized` text NOT NULL,
	`email` text DEFAULT '' NOT NULL,
	`governorate` text DEFAULT '' NOT NULL,
	`area` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `owners_phone_idx` ON `owners` (`phone_normalized`);--> statement-breakpoint
CREATE TABLE `patients` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`name` text NOT NULL,
	`species` text NOT NULL,
	`breed` text DEFAULT '' NOT NULL,
	`sex` text DEFAULT 'غير محدد' NOT NULL,
	`age_value` integer,
	`age_unit` text DEFAULT 'سنة' NOT NULL,
	`birth_date` text,
	`color` text DEFAULT '' NOT NULL,
	`weight_kg` real,
	`microchip` text DEFAULT '' NOT NULL,
	`reproductive_status` text DEFAULT 'غير محدد' NOT NULL,
	`drug_allergies` text DEFAULT 'لا توجد حساسية معروفة' NOT NULL,
	`sensitivity_notes` text DEFAULT '' NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `owners`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `patients_owner_idx` ON `patients` (`owner_id`);--> statement-breakpoint
CREATE INDEX `patients_name_idx` ON `patients` (`name`);--> statement-breakpoint
CREATE INDEX `patients_species_idx` ON `patients` (`species`);--> statement-breakpoint
CREATE TABLE `preventive_records` (
	`id` text PRIMARY KEY NOT NULL,
	`patient_id` text NOT NULL,
	`kind` text NOT NULL,
	`title` text NOT NULL,
	`given_date` text,
	`due_date` text,
	`product` text DEFAULT '' NOT NULL,
	`batch_number` text DEFAULT '' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`owner_visible` integer DEFAULT true NOT NULL,
	`sent_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `preventive_patient_idx` ON `preventive_records` (`patient_id`);--> statement-breakpoint
CREATE INDEX `preventive_due_idx` ON `preventive_records` (`due_date`);--> statement-breakpoint
CREATE TABLE `system_findings` (
	`id` text PRIMARY KEY NOT NULL,
	`visit_id` text NOT NULL,
	`system_key` text NOT NULL,
	`system_label` text NOT NULL,
	`selected_signs` text DEFAULT '[]' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	FOREIGN KEY (`visit_id`) REFERENCES `visits`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `system_findings_visit_idx` ON `system_findings` (`visit_id`);--> statement-breakpoint
CREATE TABLE `visits` (
	`id` text PRIMARY KEY NOT NULL,
	`patient_id` text NOT NULL,
	`chief_complaint` text NOT NULL,
	`history` text DEFAULT '' NOT NULL,
	`temperature_c` real,
	`heart_rate` integer,
	`respiratory_rate` integer,
	`weight_kg` real,
	`diagnosis` text DEFAULT '' NOT NULL,
	`differentials` text DEFAULT '' NOT NULL,
	`treatment_plan` text DEFAULT '' NOT NULL,
	`internal_notes` text DEFAULT '' NOT NULL,
	`followup_date` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `visits_patient_idx` ON `visits` (`patient_id`);