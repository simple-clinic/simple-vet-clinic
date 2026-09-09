ALTER TABLE `patients` ADD `photo_key` text;--> statement-breakpoint
ALTER TABLE `patients` ADD `photo_content_type` text;--> statement-breakpoint
ALTER TABLE `visits` ADD `history_details_json` text DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE `visits` ADD `grooming_details_json` text DEFAULT '{}' NOT NULL;