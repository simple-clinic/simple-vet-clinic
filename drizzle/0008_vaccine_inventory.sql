ALTER TABLE preventive_records ADD COLUMN inventory_item_id TEXT;
ALTER TABLE preventive_records ADD COLUMN inventory_quantity INTEGER NOT NULL DEFAULT 1;
CREATE INDEX IF NOT EXISTS preventive_inventory_item_idx ON preventive_records (inventory_item_id);
