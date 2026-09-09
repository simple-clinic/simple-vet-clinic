CREATE TABLE IF NOT EXISTS external_services (
  id TEXT PRIMARY KEY NOT NULL,
  service_type TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  amount_iqd INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS external_services_date_idx ON external_services(created_at);
