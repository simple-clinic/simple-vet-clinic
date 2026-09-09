import { getD1 } from "@/db";
import { authorizeClinicRequest } from "@/lib/clinic-auth";
import { patientProfileSchema } from "@/lib/patient-payload";
import { normalizeIraqiPhone } from "@/lib/phone";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await authorizeClinicRequest();
  if (!auth.ok) return Response.json({ error: auth.message }, { status: auth.status });

  try {
    const { id } = await context.params;
    const db = getD1();
    const patient = await db
      .prepare(
        `SELECT p.*, o.name AS owner_name, o.phone, o.email, o.governorate, o.area
         FROM patients p JOIN owners o ON o.id = p.owner_id
         WHERE p.id = ? LIMIT 1`,
      )
      .bind(id)
      .first<Record<string, unknown>>();
    if (!patient) return Response.json({ error: "لم يتم العثور على الملف." }, { status: 404 });

    const [visits, findings, medications, preventive, procedures, diagnostics, diagnosticImages] = await Promise.all([
      db.prepare("SELECT * FROM visits WHERE patient_id = ? ORDER BY created_at DESC, id DESC").bind(id).all<Record<string, unknown>>(),
      db.prepare(`SELECT sf.* FROM system_findings sf JOIN visits v ON v.id = sf.visit_id WHERE v.patient_id = ? ORDER BY v.created_at DESC, sf.system_label ASC`).bind(id).all<Record<string, unknown>>(),
      db.prepare(`SELECT m.* FROM medications m JOIN visits v ON v.id = m.visit_id WHERE v.patient_id = ? ORDER BY v.created_at DESC, m.name ASC`).bind(id).all<Record<string, unknown>>(),
      db.prepare("SELECT * FROM preventive_records WHERE patient_id = ? ORDER BY COALESCE(due_date, given_date, created_at) DESC").bind(id).all<Record<string, unknown>>(),
      db.prepare(`SELECT pr.* FROM procedures pr JOIN visits v ON v.id = pr.visit_id WHERE v.patient_id = ? ORDER BY COALESCE(pr.procedure_date, pr.created_at) DESC`).bind(id).all<Record<string, unknown>>(),
      db.prepare(`SELECT d.* FROM diagnostics d JOIN visits v ON v.id = d.visit_id WHERE v.patient_id = ? ORDER BY d.created_at DESC`).bind(id).all<Record<string, unknown>>(),
      db.prepare(`SELECT di.*, d.visit_id FROM diagnostic_images di JOIN diagnostics d ON d.id = di.diagnostic_id JOIN visits v ON v.id = d.visit_id WHERE v.patient_id = ? ORDER BY di.created_at DESC`).bind(id).all<Record<string, unknown>>(),
    ]);

    return Response.json({
      patient,
      visits: visits.results ?? [],
      systemFindings: findings.results ?? [],
      medications: medications.results ?? [],
      preventiveRecords: preventive.results ?? [],
      procedures: procedures.results ?? [],
      diagnostics: diagnostics.results ?? [],
      diagnosticImages: (diagnosticImages.results ?? []).map((row: Record<string, unknown>) => ({ ...row, url: `/api/diagnostic-image/${String(row.object_key)}` })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "تعذّر تحميل الملف الطبي.";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await authorizeClinicRequest();
  if (!auth.ok) return Response.json({ error: auth.message }, { status: auth.status });

  try {
    const parsed = patientProfileSchema.safeParse(await request.json());
    if (!parsed.success) {
      return Response.json({ error: "تحقق من بيانات المربي والحيوان." }, { status: 400 });
    }
    const { id } = await context.params;
    const db = getD1();
    const current = await db.prepare("SELECT owner_id FROM patients WHERE id = ? LIMIT 1").bind(id).first<{ owner_id: string }>();
    if (!current) return Response.json({ error: "لم يتم العثور على الملف." }, { status: 404 });

    const data = parsed.data;
    const phoneNormalized = normalizeIraqiPhone(data.owner.phone);
    if (phoneNormalized.length < 10) return Response.json({ error: "رقم الهاتف غير مكتمل." }, { status: 400 });

    await db.batch([
      db.prepare(
        `UPDATE owners SET name = ?, phone = ?, phone_normalized = ?, email = ?, governorate = ?, area = ? WHERE id = ?`,
      ).bind(data.owner.name, data.owner.phone, phoneNormalized, data.owner.email, data.owner.governorate, data.owner.area, current.owner_id),
      db.prepare(
        `UPDATE patients SET name = ?, species = ?, breed = ?, sex = ?, age_value = ?, age_unit = ?,
          birth_date = ?, color = ?, weight_kg = ?, microchip = ?, reproductive_status = ?,
          drug_allergies = ?, sensitivity_notes = ? WHERE id = ?`,
      ).bind(
        data.patient.name, data.patient.species, data.patient.breed, data.patient.sex,
        data.patient.ageValue ?? null, data.patient.ageUnit, data.patient.birthDate || null,
        data.patient.color, data.patient.weightKg ?? null, data.patient.microchip,
        data.patient.reproductiveStatus, data.patient.drugAllergies,
        data.patient.sensitivityNotes, id,
      ),
    ]);
    return Response.json({ ok: true, message: "تم تعديل بيانات الملف وحفظها." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "تعذّر تعديل الملف.";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await authorizeClinicRequest();
  if (!auth.ok) return Response.json({ error: auth.message }, { status: auth.status });
  try {
    const { id } = await context.params;
    const payload = (await request.json().catch(() => ({}))) as { reason?: string };
    const reason = payload.reason === "deceased" ? "deceased" : "archived";
    const db = getD1();
    const activeBoarding = await db.prepare("SELECT id FROM boarding_stays WHERE patient_id = ? AND status = 'active' LIMIT 1").bind(id).first();
    if (activeBoarding) return Response.json({ error: "لا يمكن حذف الحالة وهي موجودة حالياً في المبيت. سجّل خروجها أولاً." }, { status: 409 });
    const result = await db.prepare(
      "UPDATE patients SET active = 0, record_status = ?, archived_at = CURRENT_TIMESTAMP WHERE id = ? AND active = 1",
    ).bind(reason, id).run();
    if (!result.meta.changes) return Response.json({ error: "الحالة غير موجودة أو محذوفة مسبقاً." }, { status: 404 });
    return Response.json({ ok: true, message: reason === "deceased" ? "تم نقل الحالة إلى الأرشيف وتسجيل الوفاة." : "تم حذف الحالة من السجل النشط وحفظها في الأرشيف." });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "تعذّر حذف الحالة." }, { status: 500 });
  }
}
