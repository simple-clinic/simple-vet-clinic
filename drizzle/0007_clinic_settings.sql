CREATE TABLE IF NOT EXISTS `clinic_settings` (
  `key` text PRIMARY KEY NOT NULL,
  `value` text NOT NULL DEFAULT '',
  `updated_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP
);
