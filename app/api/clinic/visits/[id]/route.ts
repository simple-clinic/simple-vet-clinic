import { getD1 } from "@/db";
import { authorizeClinicRequest } from "@/lib/clinic-auth";
import { buildVisitChildStatements, visitBundleSchema } from "@/lib/visit-payload";
import {
  inventoryDeductionStatements,
  inventoryRestorationStatements,
  validateInventoryUsage,
  visitInventoryUsage,
} from "@/lib/vaccine-inventory";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await authorizeClinicRequest();
  if (!auth.ok) return Response.json({ error: auth.message }, { status: auth.status });

  try {
    const parsed = visitBundleSchema.safeParse(await request.json());
    if (!parsed.success) return Response.json({ error: "تحقق من بيانات الزيارة." }, { status: 400 });
    const { id: visitId } = await context.params;
    const db = getD1();
    const current = await db.prepare("SELECT patient_id FROM visits WHERE id = ? LIMIT 1").bind(visitId).first<{ patient_id: string }>();
    if (!current) return Response.json({ error: "الزيارة غير موجودة." }, { status: 404 });

    const data = parsed.data;
    const oldInventoryUsage = await visitInventoryUsage(db, visitId);
    await validateInventoryUsage(db, data.preventiveRecords, oldInventoryUsage);
    const complaint = data.visit.chiefComplaint || (data.visit.visitType === "surgery"
      ? "إجراء عملية"
      : data.visit.visitType === "dental"
        ? "تنظيف وقلع أسنان"
      : data.visit.visitType === "grooming"
        ? data.visit.grooming.services.join("، ") || "حلاقة وغسل"
        : data.visit.visitType === "preventive" || data.visit.visitType === "routine" ? "فحص روتيني ووقائي" : "حالة مرضية");
    const statements = [
      ...inventoryRestorationStatements(db, oldInventoryUsage),
      db.prepare(
        `UPDATE visits SET visit_type = ?, chief_complaint = ?, history = ?, history_details_json = ?,
          grooming_details_json = ?, temperature_c = ?, heart_rate = ?, respiratory_rate = ?,
          weight_kg = ?, diagnosis = ?, differentials = ?, treatment_plan = ?, internal_notes = ?,
          followup_date = ?, cost_iqd = ? WHERE id = ?`,
      ).bind(
        data.visit.visitType, complaint, data.visit.history,
        JSON.stringify(data.visit.medicalHistory), JSON.stringify(data.visit.grooming),
        data.visit.temperatureC ?? null,
        data.visit.heartRate ?? null, data.visit.respiratoryRate ?? null,
        data.visit.weightKg ?? null, data.visit.diagnosis, data.visit.differentials,
        data.visit.treatmentPlan, data.visit.internalNotes, data.visit.followupDate || null,
        data.visit.costIqd, visitId,
      ),
      db.prepare("DELETE FROM system_findings WHERE visit_id = ?").bind(visitId),
      db.prepare("DELETE FROM medications WHERE visit_id = ?").bind(visitId),
      db.prepare("DELETE FROM preventive_records WHERE visit_id = ?").bind(visitId),
      db.prepare("DELETE FROM procedures WHERE visit_id = ?").bind(visitId),
      db.prepare("DELETE FROM diagnostics WHERE visit_id = ?").bind(visitId),
      ...buildVisitChildStatements(db, current.patient_id, visitId, data),
      ...inventoryDeductionStatements(db, data.preventiveRecords),
    ];
    await db.batch(statements);
    return Response.json({ ok: true, message: "تم تعديل الزيارة وحفظ التغييرات." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "تعذّر تعديل الزيارة.";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await authorizeClinicRequest();
  if (!auth.ok) return Response.json({ error: auth.message }, { status: auth.status });
  try {
    const { id } = await context.params;
    const db = getD1();
    const existing = await db.prepare("SELECT id FROM visits WHERE id = ? LIMIT 1").bind(id).first<{ id: string }>();
    if (!existing) return Response.json({ error: "الزيارة غير موجودة أو محذوفة مسبقاً." }, { status: 404 });
    const oldInventoryUsage = await visitInventoryUsage(db, id);
    await db.batch([
      ...inventoryRestorationStatements(db, oldInventoryUsage),
      db.prepare("DELETE FROM visits WHERE id = ?").bind(id),
    ]);
    return Response.json({ ok: true, message: "تم حذف الزيارة وكل تفاصيلها المسجلة." });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "تعذّر حذف الزيارة." }, { status: 500 });
  }
}
