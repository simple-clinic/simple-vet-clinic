import { z } from "zod";
import { getD1 } from "@/db";
import { authorizeClinicRequest } from "@/lib/clinic-auth";
import { patientProfileSchema } from "@/lib/patient-payload";
import { normalizeIraqiPhone } from "@/lib/phone";
import { preventiveSchema } from "@/lib/visit-payload";

const schema = patientProfileSchema.extend({
  preventiveRecords: z.array(preventiveSchema).max(30).default([]),
});

export async function POST(request: Request) {
  const auth = await authorizeClinicRequest();
  if (!auth.ok) return Response.json({ error: auth.message }, { status: auth.status });

  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      return Response.json({ error: "أكمل بيانات المربي والحيوان والدفتر." }, { status: 400 });
    }

    const data = parsed.data;
    const db = getD1();
    const phone = normalizeIraqiPhone(data.owner.phone);
    if (phone.length < 10) {
      return Response.json({ error: "رقم الهاتف غير مكتمل." }, { status: 400 });
    }

    const oldOwner = await db.prepare(
      "SELECT id FROM owners WHERE phone_normalized = ? AND lower(trim(name)) = lower(trim(?)) LIMIT 1",
    ).bind(phone, data.owner.name).first<{ id: string }>();
    const ownerId = oldOwner?.id ?? crypto.randomUUID();

    const oldPatient = oldOwner
      ? await db.prepare(
          "SELECT id FROM patients WHERE owner_id = ? AND lower(trim(name)) = lower(trim(?)) LIMIT 1",
        ).bind(ownerId, data.patient.name).first<{ id: string }>()
      : null;
    const patientId = oldPatient?.id ?? crypto.randomUUID();

    const statements = [
      db.prepare(
        `INSERT INTO owners (id,name,phone,phone_normalized,email,governorate,area)
         VALUES (?,?,?,?,?,?,?)
         ON CONFLICT(id) DO UPDATE SET
           name=excluded.name, phone=excluded.phone, phone_normalized=excluded.phone_normalized,
           email=excluded.email, governorate=excluded.governorate, area=excluded.area`,
      ).bind(
        ownerId, data.owner.name, data.owner.phone, phone, data.owner.email,
        data.owner.governorate, data.owner.area,
      ),
      db.prepare(
        `INSERT INTO patients (
          id,owner_id,record_number,name,species,breed,sex,age_value,age_unit,birth_date,
          color,weight_kg,microchip,reproductive_status,drug_allergies,sensitivity_notes
        ) VALUES (?, ?, (SELECT COALESCE(MAX(record_number),0)+1 FROM patients), ?,?,?,?,?,?,?,?,?,?,?,?,?)
        ON CONFLICT(id) DO UPDATE SET
          name=excluded.name, species=excluded.species, breed=excluded.breed,
          sex=excluded.sex, age_value=excluded.age_value, age_unit=excluded.age_unit,
          birth_date=excluded.birth_date, color=excluded.color, weight_kg=excluded.weight_kg,
          microchip=excluded.microchip, reproductive_status=excluded.reproductive_status,
          drug_allergies=excluded.drug_allergies, sensitivity_notes=excluded.sensitivity_notes,
          active=1, record_status='active', archived_at=NULL`,
      ).bind(
        patientId, ownerId, data.patient.name, data.patient.species, data.patient.breed,
        data.patient.sex, data.patient.ageValue ?? null, data.patient.ageUnit,
        data.patient.birthDate || null, data.patient.color, data.patient.weightKg ?? null,
        data.patient.microchip, data.patient.reproductiveStatus,
        data.patient.drugAllergies, data.patient.sensitivityNotes,
      ),
      ...data.preventiveRecords
        .filter((row) => row.givenDate)
        .map((row) => db.prepare(
          `INSERT INTO preventive_records (
            id,patient_id,visit_id,kind,title,current_status,given_date,due_date,
            product,batch_number,notes,status,owner_visible
          ) VALUES (?, ?, NULL, ?, ?, 'yes', ?, ?, ?, ?, ?, 'pending', ?)`,
        ).bind(
          crypto.randomUUID(), patientId, row.kind, row.title, row.givenDate,
          row.dueDate || null, row.product, row.batchNumber, row.notes,
          row.ownerVisible ? 1 : 0,
        )),
    ];

    await db.batch(statements);
    return Response.json({
      patientId,
      merged: Boolean(oldPatient),
      message: oldPatient
        ? "تمت إضافة دفتر اللقاحات إلى ملف الحيوان الموجود نفسه."
        : "تم تسجيل الحيوان السابق ودفتر لقاحاته من دون إنشاء زيارة.",
    }, { status: 201 });
  } catch (error) {
    return Response.json({
      error: error instanceof Error ? error.message : "تعذّر حفظ الدفتر القديم.",
    }, { status: 500 });
  }
}
