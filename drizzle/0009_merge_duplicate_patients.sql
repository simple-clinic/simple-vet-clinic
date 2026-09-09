CREATE TABLE patient_merge_map AS
SELECT p.id AS duplicate_id,
  (
    SELECT p2.id
    FROM patients p2
    JOIN owners o2 ON o2.id = p2.owner_id
    WHERE o2.phone_normalized = o.phone_normalized
      AND lower(trim(o2.name)) = lower(trim(o.name))
      AND lower(trim(p2.name)) = lower(trim(p.name))
    ORDER BY p2.created_at ASC, p2.id ASC
    LIMIT 1
  ) AS keep_id
FROM patients p
JOIN owners o ON o.id = p.owner_id;

DELETE FROM patient_merge_map WHERE duplicate_id = keep_id;

UPDATE visits
SET patient_id = (SELECT keep_id FROM patient_merge_map WHERE duplicate_id = visits.patient_id)
WHERE patient_id IN (SELECT duplicate_id FROM patient_merge_map);

UPDATE preventive_records
SET patient_id = (SELECT keep_id FROM patient_merge_map WHERE duplicate_id = preventive_records.patient_id)
WHERE patient_id IN (SELECT duplicate_id FROM patient_merge_map);

UPDATE inventory_sales
SET patient_id = (SELECT keep_id FROM patient_merge_map WHERE duplicate_id = inventory_sales.patient_id)
WHERE patient_id IN (SELECT duplicate_id FROM patient_merge_map);

UPDATE boarding_stays
SET patient_id = (SELECT keep_id FROM patient_merge_map WHERE duplicate_id = boarding_stays.patient_id)
WHERE patient_id IN (SELECT duplicate_id FROM patient_merge_map);

UPDATE patients
SET photo_key = COALESCE(
      photo_key,
      (SELECT d.photo_key FROM patients d
       JOIN patient_merge_map m ON m.duplicate_id = d.id
       WHERE m.keep_id = patients.id AND d.photo_key IS NOT NULL
       ORDER BY d.created_at DESC LIMIT 1)
    ),
    photo_content_type = COALESCE(
      photo_content_type,
      (SELECT d.photo_content_type FROM patients d
       JOIN patient_merge_map m ON m.duplicate_id = d.id
       WHERE m.keep_id = patients.id AND d.photo_content_type IS NOT NULL
       ORDER BY d.created_at DESC LIMIT 1)
    )
WHERE id IN (SELECT keep_id FROM patient_merge_map);

DELETE FROM patients WHERE id IN (SELECT duplicate_id FROM patient_merge_map);
DROP TABLE patient_merge_map;

CREATE INDEX IF NOT EXISTS owners_identity_idx
  ON owners (phone_normalized, name);
CREATE INDEX IF NOT EXISTS patients_owner_name_idx
  ON patients (owner_id, name);
