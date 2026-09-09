CREATE TABLE `diagnostic_images` (
	`id` text PRIMARY KEY NOT NULL,
	`diagnostic_id` text NOT NULL,
	`object_key` text NOT NULL,
	`content_type` text NOT NULL,
	`file_name` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`diagnostic_id`) REFERENCES `diagnostics`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `diagnostic_images_diagnostic_idx` ON `diagnostic_images` (`diagnostic_id`);--> statement-breakpoint
ALTER TABLE `inventory_items` ADD `photo_key` text;--> statement-breakpoint
ALTER TABLE `inventory_items` ADD `photo_content_type` text;--> statement-breakpoint
UPDATE `inventory_items` SET `low_stock_threshold` = 1;--> statement-breakpoint
ALTER TABLE `patients` ADD `record_number` integer;--> statement-breakpoint
UPDATE `patients`
SET `record_number` = (
  SELECT COUNT(*)
  FROM `patients` AS older
  WHERE older.`created_at` < `patients`.`created_at`
     OR (older.`created_at` = `patients`.`created_at` AND older.`id` <= `patients`.`id`)
);--> statement-breakpoint
CREATE UNIQUE INDEX `patients_record_number_idx` ON `patients` (`record_number`);
