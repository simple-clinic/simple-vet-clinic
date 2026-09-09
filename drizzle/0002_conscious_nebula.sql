CREATE TABLE `boarding_payments` (
	`id` text PRIMARY KEY NOT NULL,
	`stay_id` text NOT NULL,
	`amount_iqd` integer NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`paid_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`stay_id`) REFERENCES `boarding_stays`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `boarding_payments_stay_idx` ON `boarding_payments` (`stay_id`);--> statement-breakpoint
CREATE TABLE `boarding_stays` (
	`id` text PRIMARY KEY NOT NULL,
	`cage_number` integer NOT NULL,
	`patient_id` text NOT NULL,
	`stay_type` text NOT NULL,
	`check_in_date` text NOT NULL,
	`expected_checkout_date` text,
	`number_of_days` integer DEFAULT 1 NOT NULL,
	`daily_rate_iqd` integer DEFAULT 0 NOT NULL,
	`total_iqd` integer DEFAULT 0 NOT NULL,
	`paid_iqd` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`medical_signs` text DEFAULT '' NOT NULL,
	`diagnosis` text DEFAULT '' NOT NULL,
	`treatment_plan` text DEFAULT '' NOT NULL,
	`care_instructions` text DEFAULT '' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`checked_out_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `boarding_cage_idx` ON `boarding_stays` (`cage_number`);--> statement-breakpoint
CREATE INDEX `boarding_patient_idx` ON `boarding_stays` (`patient_id`);--> statement-breakpoint
CREATE INDEX `boarding_status_idx` ON `boarding_stays` (`status`);--> statement-breakpoint
CREATE TABLE `boarding_updates` (
	`id` text PRIMARY KEY NOT NULL,
	`stay_id` text NOT NULL,
	`update_date` text NOT NULL,
	`temperature_c` real,
	`appetite` text DEFAULT '' NOT NULL,
	`urination` text DEFAULT '' NOT NULL,
	`defecation` text DEFAULT '' NOT NULL,
	`medications` text DEFAULT '' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`stay_id`) REFERENCES `boarding_stays`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `boarding_updates_stay_idx` ON `boarding_updates` (`stay_id`);--> statement-breakpoint
CREATE TABLE `inventory_items` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`unit` text DEFAULT 'قطعة' NOT NULL,
	`sku` text DEFAULT '' NOT NULL,
	`quantity` integer DEFAULT 0 NOT NULL,
	`low_stock_threshold` integer DEFAULT 3 NOT NULL,
	`wholesale_price_iqd` integer DEFAULT 0 NOT NULL,
	`retail_price_iqd` integer DEFAULT 0 NOT NULL,
	`expiry_date` text,
	`notes` text DEFAULT '' NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `inventory_category_idx` ON `inventory_items` (`category`);--> statement-breakpoint
CREATE INDEX `inventory_name_idx` ON `inventory_items` (`name`);--> statement-breakpoint
CREATE TABLE `inventory_movements` (
	`id` text PRIMARY KEY NOT NULL,
	`item_id` text NOT NULL,
	`movement_type` text NOT NULL,
	`quantity_delta` integer NOT NULL,
	`unit_cost_iqd` integer DEFAULT 0 NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`item_id`) REFERENCES `inventory_items`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `inventory_movements_item_idx` ON `inventory_movements` (`item_id`);--> statement-breakpoint
CREATE TABLE `inventory_sales` (
	`id` text PRIMARY KEY NOT NULL,
	`item_id` text NOT NULL,
	`patient_id` text,
	`quantity` integer NOT NULL,
	`unit_wholesale_iqd` integer DEFAULT 0 NOT NULL,
	`unit_price_iqd` integer NOT NULL,
	`total_iqd` integer NOT NULL,
	`cost_total_iqd` integer DEFAULT 0 NOT NULL,
	`buyer_name` text DEFAULT '' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`sold_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`item_id`) REFERENCES `inventory_items`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `inventory_sales_item_idx` ON `inventory_sales` (`item_id`);--> statement-breakpoint
CREATE INDEX `inventory_sales_date_idx` ON `inventory_sales` (`sold_at`);--> statement-breakpoint
ALTER TABLE `patients` ADD `record_status` text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE `patients` ADD `archived_at` text;