ALTER TABLE external_services ADD COLUMN service_date TEXT;
UPDATE external_services SET service_date = substr(created_at, 1, 10) WHERE service_date IS NULL;
