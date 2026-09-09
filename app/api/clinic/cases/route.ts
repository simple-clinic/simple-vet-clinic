import { getD1 } from "@/db";
import { authorizeClinicRequest } from "@/lib/clinic-auth";
import { patientProfileSchema } from "@/lib/patient-payload";
import { normalizeIraqiPhone } from "@/lib/phone";
import { buildVisitStatements, visitBundleSchema } from "@/lib/visit-payload";
import { inventoryDeductionStatements, validateInventoryUsage } from "@/lib/vaccine-inventory";

export const dynamic = "force-dynamic";

const caseSchema = patientProfileSchema.extend({ visitBundle: visitBundleSchema });

type PatientListRow = {
  id: string;
  record_number: number | null;
  patient_name: string;
  species: string;
  breed: string;
  sex: string;
  age_value: number | null;
  age_unit: string;
  color: string;
  weight_kg: number | null;
  drug_allergies: string;
  photo_key: string | null;
  owner_name: string;
  phone: string;
  governorate: string;
  area: string;
  chief_complaint: string | null;
  last_visit_at: string;
  visit_count: number;
};

type ArchivedPatientListRow = PatientListRow & {
  record_status: string;
  archived_at: string | null;
};

type ReminderRow = {
  id: string;
  patient_id: string;
  kind: string;
  title: string;
  due_date: string | null;
  status: string;
  owner_visible: number;
  sent_at: string | null;
  patient_name: string;
  owner_name: string;
  phone: string;
};

type InventoryAlertRow = {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  low_stock_threshold: number;
  expiry_date: string | null;
};

export async function GET() {
  const auth = await authorizeClinicRequest();
  if (!auth.ok) return Response.json({ error: auth.message }, { status: auth.status });

  try {
    const db = getD1();
    const [patientResult, archivedPatientResult, reminderResult, inventoryAlertResult, statsResult] = await Promise.all([
      db
        .prepare(
          `SELECT
            p.id, p.record_number, p.name AS patient_name, p.species, p.breed, p.sex, p.age_value,
            p.age_unit, p.color, p.weight_kg, p.drug_allergies, p.photo_key,
            o.name AS owner_name, o.phone, o.governorate, o.area,
            (SELECT v.chief_complaint FROM visits v WHERE v.patient_id = p.id ORDER BY v.created_at DESC, v.id DESC LIMIT 1) AS chief_complaint,
            COALESCE((SELECT MAX(v.created_at) FROM visits v WHERE v.patient_id = p.id), p.created_at) AS last_visit_at,
            (SELECT COUNT(*) FROM visits v WHERE v.patient_id = p.id) AS visit_count
          FROM patients p
          JOIN owners o ON o.id = p.owner_id
          WHERE p.active = 1
          ORDER BY last_visit_at DESC
          LIMIT 250`,
        )
        .all<PatientListRow>(),
      db
        .prepare(
          `SELECT
            p.id, p.record_number, p.name AS patient_name, p.species, p.breed, p.sex, p.age_value,
            p.age_unit, p.color, p.weight_kg, p.drug_allergies, p.photo_key,
            p.record_status, p.archived_at,
            o.name AS owner_name, o.phone, o.governorate, o.area,
            (SELECT v.chief_complaint FROM visits v WHERE v.patient_id = p.id ORDER BY v.created_at DESC, v.id DESC LIMIT 1) AS chief_complaint,
            COALESCE((SELECT MAX(v.created_at) FROM visits v WHERE v.patient_id = p.id), p.created_at) AS last_visit_at,
            (SELECT COUNT(*) FROM visits v WHERE v.patient_id = p.id) AS visit_count
          FROM patients p
          JOIN owners o ON o.id = p.owner_id
          WHERE p.active = 0
          ORDER BY p.archived_at DESC, p.created_at DESC
          LIMIT 250`,
        )
        .all<ArchivedPatientListRow>(),
      db
        .prepare(
          `SELECT pr.id, pr.patient_id, pr.kind, pr.title, pr.due_date, pr.status,
            pr.owner_visible, pr.sent_at, p.name AS patient_name,
            o.name AS owner_name, o.phone
          FROM preventive_records pr
          JOIN patients p ON p.id = pr.patient_id
          JOIN owners o ON o.id = p.owner_id
          WHERE pr.due_date IS NOT NULL AND pr.status != 'completed' AND p.active = 1
          ORDER BY date(pr.due_date) ASC, pr.created_at DESC
          LIMIT 150`,
        )
        .all<ReminderRow>(),
      db
        .prepare(
          `SELECT id, name, quantity, unit, low_stock_threshold, expiry_date
           FROM inventory_items
           WHERE active = 1 AND (
             quantity <= low_stock_threshold
             OR (expiry_date IS NOT NULL AND date(expiry_date) <= date('now', '+1 day'))
           )
           ORDER BY
             CASE WHEN quantity = 0 THEN 0 WHEN quantity <= low_stock_threshold THEN 1 ELSE 2 END,
             date(COALESCE(expiry_date, '9999-12-31')) ASC,
             name ASC
           LIMIT 100`,
        )
        .all<InventoryAlertRow>(),
      db
        .prepare(
          `SELECT
            (SELECT COUNT(*) FROM patients WHERE active = 1) AS patient_count,
            (SELECT COUNT(DISTINCT o.id)
              FROM owners o
              JOIN patients p ON p.owner_id = o.id
              WHERE p.active = 1) AS owner_count,
            (SELECT COUNT(*)
              FROM visits v
              JOIN patients p ON p.id = v.patient_id
              WHERE p.active = 1
                AND date(v.created_at, '+3 hours') = date('now', '+3 hours')) AS today_visits,
            (SELECT COUNT(*) FROM preventive_records pr JOIN patients p ON p.id = pr.patient_id WHERE pr.status = 'pending' AND pr.due_date IS NOT NULL AND p.active = 1 AND date(pr.due_date) <= date('now', '+1 day')) AS due_count`,
        )
        .first<Record<string, number>>(),
    ]);

    return Response.json({
      user: { displayName: auth.displayName, email: auth.email },
      patients: patientResult.results ?? [],
      archivedPatients: archivedPatientResult.results ?? [],
      reminders: reminderResult.results ?? [],
      inventoryAlerts: inventoryAlertResult.results ?? [],
      stats: statsResult ?? { patient_count: 0, owner_count: 0, today_visits: 0, due_count: 0 },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "تعذّر تحميل بيانات العيادة.";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await authorizeClinicRequest();
  if (!auth.ok) return Response.json({ error: auth.message }, { status: auth.status });

  try {
    const parsed = caseSchema.safeParse(await request.json());
    if (!parsed.success) {
      return Response.json(
        { error: "يرجى إكمال بيانات المربي والحيوان والتأكد من القيم المدخلة.", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const data = parsed.data;
    const db = getD1();
    const normalizedPhone = normalizeIraqiPhone(data.owner.phone);
    if (normalizedPhone.length < 10) {
      return Response.json({ error: "رقم الهاتف غير مكتمل." }, { status: 400 });
    }

    const existingOwner = await db
      .prepare(
        "SELECT id FROM owners WHERE phone_normalized = ? AND lower(trim(name)) = lower(trim(?)) LIMIT 1",
      )
      .bind(normalizedPhone, data.owner.name)
      .first<{ id: string }>();
    const ownerId = existingOwner?.id ?? crypto.randomUUID();
    const existingPatient = existingOwner
      ? await db
          .prepare("SELECT id FROM patients WHERE owner_id = ? AND lower(trim(name)) = lower(trim(?)) LIMIT 1")
          .bind(ownerId, data.patient.name)
          .first<{ id: string }>()
      : null;
    const patientId = existingPatient?.id ?? crypto.randomUUID();

    const profileStatements = [
      db
        .prepare(
          `INSERT INTO owners (id, name, phone, phone_normalized, email, governorate, area)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET name = excluded.name, phone = excluded.phone,
             phone_normalized = excluded.phone_normalized, email = excluded.email,
             governorate = excluded.governorate, area = excluded.area`,
        )
        .bind(ownerId, data.owner.name, data.owner.phone, normalizedPhone, data.owner.email, data.owner.governorate, data.owner.area),
      db
        .prepare(
          `INSERT INTO patients (
            id, owner_id, record_number, name, species, breed, sex, age_value, age_unit, birth_date,
            color, weight_kg, microchip, reproductive_status, drug_allergies, sensitivity_notes
          ) VALUES (?, ?, (SELECT COALESCE(MAX(record_number), 0) + 1 FROM patients), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET name = excluded.name, species = excluded.species,
            breed = excluded.breed, sex = excluded.sex, age_value = excluded.age_value,
            age_unit = excluded.age_unit, birth_date = excluded.birth_date, color = excluded.color,
            weight_kg = excluded.weight_kg, microchip = excluded.microchip,
            reproductive_status = excluded.reproductive_status,
            drug_allergies = excluded.drug_allergies,
            sensitivity_notes = excluded.sensitivity_notes, active = 1,
            record_status = 'active', archived_at = NULL`,
        )
        .bind(
          patientId, ownerId, data.patient.name, data.patient.species, data.patient.breed,
          data.patient.sex, data.patient.ageValue ?? null, data.patient.ageUnit,
          data.patient.birthDate || null, data.patient.color, data.patient.weightKg ?? null,
          data.patient.microchip, data.patient.reproductiveStatus,
          data.patient.drugAllergies, data.patient.sensitivityNotes,
        ),
    ];
    await validateInventoryUsage(db, data.visitBundle.preventiveRecords);
    const { visitId, statements: visitStatements } = buildVisitStatements(db, patientId, data.visitBundle);
    await db.batch([
      ...profileStatements,
      ...visitStatements,
      ...inventoryDeductionStatements(db, data.visitBundle.preventiveRecords),
    ]);

    return Response.json(
      {
        patientId,
        visitId,
        isNewPatient: !existingPatient,
        message: existingPatient
          ? "تمت إضافة الزيارة إلى الملف الموجود. لاحقاً استخدم زر «زيارة جديدة» من ملف الحيوان."
          : "تم إنشاء ملف الحيوان وحفظ الزيارة بنجاح.",
      },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "تعذّر حفظ الحالة.";
    return Response.json({ error: message }, { status: 500 });
  }
}
