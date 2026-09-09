import { z } from "zod";
import { getD1 } from "@/db";
import { authorizeClinicRequest } from "@/lib/clinic-auth";
import { BOARDING_CAGE_COUNT } from "@/lib/boarding-config";
import { patientProfileSchema } from "@/lib/patient-payload";
import { normalizeIraqiPhone } from "@/lib/phone";

export const dynamic = "force-dynamic";

const staySchema = z.object({
  cageNumber: z.number().int().min(1).max(BOARDING_CAGE_COUNT),
  stayType: z.enum(["medical", "hotel"]),
  patientId: z.string().trim().min(1).max(100).nullable().optional(),
  profile: patientProfileSchema.nullable().optional(),
  checkInDate: z.string().trim().min(8).max(20),
  expectedCheckoutDate: z.string().trim().max(20).nullable().optional(),
  numberOfDays: z.number().int().min(1).max(365),
  dailyRateIqd: z.number().int().min(0).max(2_000_000_000),
  totalIqd: z.number().int().min(0).max(2_000_000_000).optional(),
  paidIqd: z.number().int().min(0).max(2_000_000_000).default(0),
  medicalSigns: z.string().trim().max(4000).default(""),
  diagnosis: z.string().trim().max(3000).default(""),
  treatmentPlan: z.string().trim().max(5000).default(""),
  careInstructions: z.string().trim().max(5000).default(""),
  notes: z.string().trim().max(3000).default(""),
});

export async function GET(request: Request) {
  const auth = await authorizeClinicRequest();
  if (!auth.ok) return Response.json({ error: auth.message }, { status: auth.status });
  try {
    const month = new URL(request.url).searchParams.get("month") || new Date().toISOString().slice(0, 7);
    const db = getD1();
    const [active, updates, payments, recent, stats] = await Promise.all([
      db.prepare(
        `SELECT bs.*, p.name AS patient_name, p.species, p.breed, p.sex, p.color,
          o.name AS owner_name, o.phone, o.governorate, o.area
         FROM boarding_stays bs JOIN patients p ON p.id = bs.patient_id
         JOIN owners o ON o.id = p.owner_id
         WHERE bs.status = 'active' ORDER BY bs.cage_number`,
      ).all<Record<string, unknown>>(),
      db.prepare(
        `SELECT bu.* FROM boarding_updates bu JOIN boarding_stays bs ON bs.id = bu.stay_id
         WHERE bs.status = 'active' ORDER BY bu.update_date DESC, bu.created_at DESC`,
      ).all<Record<string, unknown>>(),
      db.prepare(
        `SELECT bp.* FROM boarding_payments bp JOIN boarding_stays bs ON bs.id = bp.stay_id
         WHERE bs.status = 'active' ORDER BY bp.paid_at DESC`,
      ).all<Record<string, unknown>>(),
      db.prepare(
        `SELECT bs.*, p.name AS patient_name, o.name AS owner_name
         FROM boarding_stays bs JOIN patients p ON p.id = bs.patient_id JOIN owners o ON o.id = p.owner_id
         ORDER BY bs.created_at DESC LIMIT 50`,
      ).all<Record<string, unknown>>(),
      db.prepare(
        `SELECT
          (SELECT COUNT(*) FROM boarding_stays WHERE status = 'active') AS occupied_count,
          (SELECT COUNT(*) FROM boarding_stays WHERE status = 'active' AND stay_type = 'medical') AS medical_count,
          (SELECT COUNT(*) FROM boarding_stays WHERE status = 'active' AND stay_type = 'hotel') AS hotel_count,
          COALESCE((SELECT SUM(total_iqd - paid_iqd) FROM boarding_stays WHERE status = 'active'), 0) AS outstanding,
          COALESCE((SELECT SUM(amount_iqd) FROM boarding_payments WHERE substr(paid_at, 1, 7) = ?), 0) AS month_payments`,
      ).bind(month).first<Record<string, number>>(),
    ]);
    return Response.json({ month, activeStays: active.results ?? [], updates: updates.results ?? [], payments: payments.results ?? [], recentStays: recent.results ?? [], stats: stats ?? {} });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "تعذّر تحميل المبيت." }, { status: 500 }); }
}

export async function POST(request: Request) {
  const auth = await authorizeClinicRequest();
  if (!auth.ok) return Response.json({ error: auth.message }, { status: auth.status });
  try {
    const parsed = staySchema.safeParse(await request.json());
    if (!parsed.success) return Response.json({ error: "تحقق من بيانات القفص والمربي والحيوان والمبالغ." }, { status: 400 });
    const data = parsed.data; const db = getD1();
    const occupied = await db.prepare("SELECT id FROM boarding_stays WHERE cage_number = ? AND status = 'active' LIMIT 1").bind(data.cageNumber).first();
    if (occupied) return Response.json({ error: `القفص رقم ${data.cageNumber} مشغول حالياً.` }, { status: 409 });

    let patientId = data.patientId || "";
    const profileStatements = [];
    if (patientId) {
      const patient = await db.prepare("SELECT id FROM patients WHERE id = ? AND active = 1 LIMIT 1").bind(patientId).first();
      if (!patient) return Response.json({ error: "ملف الحيوان غير موجود." }, { status: 404 });
    } else {
      if (!data.profile) return Response.json({ error: "أدخل بيانات المربي والحيوان للفندقة الجديدة." }, { status: 400 });
      const normalized = normalizeIraqiPhone(data.profile.owner.phone);
      if (normalized.length < 10) return Response.json({ error: "رقم الهاتف غير مكتمل." }, { status: 400 });
      const owner = await db.prepare("SELECT id FROM owners WHERE phone_normalized = ? LIMIT 1").bind(normalized).first<{ id: string }>();
      const ownerId = owner?.id ?? crypto.randomUUID();
      const patient = owner ? await db.prepare("SELECT id FROM patients WHERE owner_id = ? AND lower(trim(name)) = lower(trim(?)) LIMIT 1").bind(ownerId, data.profile.patient.name).first<{ id: string }>() : null;
      patientId = patient?.id ?? crypto.randomUUID();
      profileStatements.push(
        db.prepare(
          `INSERT INTO owners (id, name, phone, phone_normalized, email, governorate, area) VALUES (?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET name = excluded.name, phone = excluded.phone, phone_normalized = excluded.phone_normalized,
             email = excluded.email, governorate = excluded.governorate, area = excluded.area`,
        ).bind(ownerId, data.profile.owner.name, data.profile.owner.phone, normalized, data.profile.owner.email, data.profile.owner.governorate, data.profile.owner.area),
        db.prepare(
          `INSERT INTO patients (id, owner_id, name, species, breed, sex, age_value, age_unit, birth_date, color, weight_kg, microchip, reproductive_status, drug_allergies, sensitivity_notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET name = excluded.name, species = excluded.species, breed = excluded.breed, sex = excluded.sex,
             age_value = excluded.age_value, age_unit = excluded.age_unit, color = excluded.color, weight_kg = excluded.weight_kg, active = 1, record_status = 'active', archived_at = NULL`,
        ).bind(patientId, ownerId, data.profile.patient.name, data.profile.patient.species, data.profile.patient.breed, data.profile.patient.sex, data.profile.patient.ageValue ?? null, data.profile.patient.ageUnit, data.profile.patient.birthDate || null, data.profile.patient.color, data.profile.patient.weightKg ?? null, data.profile.patient.microchip, data.profile.patient.reproductiveStatus, data.profile.patient.drugAllergies, data.profile.patient.sensitivityNotes),
      );
    }

    const stayId = crypto.randomUUID();
    const total = data.totalIqd ?? data.dailyRateIqd * data.numberOfDays;
    const paid = Math.min(data.paidIqd, total);
    const statements = [
      ...profileStatements,
      db.prepare(
        `INSERT INTO boarding_stays (
          id, cage_number, patient_id, stay_type, check_in_date, expected_checkout_date,
          number_of_days, daily_rate_iqd, total_iqd, paid_iqd, medical_signs,
          diagnosis, treatment_plan, care_instructions, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(stayId, data.cageNumber, patientId, data.stayType, data.checkInDate, data.expectedCheckoutDate || null, data.numberOfDays, data.dailyRateIqd, total, paid, data.medicalSigns, data.diagnosis, data.treatmentPlan, data.careInstructions, data.notes),
    ];
    if (paid > 0) statements.push(db.prepare("INSERT INTO boarding_payments (id, stay_id, amount_iqd, notes) VALUES (?, ?, ?, 'دفعة أولية')").bind(crypto.randomUUID(), stayId, paid));
    await db.batch(statements);
    return Response.json({ stayId, patientId, message: `تم حجز القفص رقم ${data.cageNumber}.` }, { status: 201 });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "تعذّر تسجيل المبيت." }, { status: 500 }); }
}
