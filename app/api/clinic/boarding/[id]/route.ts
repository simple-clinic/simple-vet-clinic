import { z } from "zod";
import { getD1 } from "@/db";
import { authorizeClinicRequest } from "@/lib/clinic-auth";

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("checkout") }),
  z.object({ action: z.literal("update_details"), medicalSigns: z.string().trim().max(4000), diagnosis: z.string().trim().max(3000), treatmentPlan: z.string().trim().max(5000), careInstructions: z.string().trim().max(5000), notes: z.string().trim().max(3000) }),
]);

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await authorizeClinicRequest(); if (!auth.ok) return Response.json({ error: auth.message }, { status: auth.status });
  try {
    const parsed = schema.safeParse(await request.json()); if (!parsed.success) return Response.json({ error: "إجراء غير صالح." }, { status: 400 });
    const { id } = await context.params; const db = getD1();
    const result = parsed.data.action === "checkout"
      ? await db.prepare("UPDATE boarding_stays SET status = 'completed', checked_out_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'active'").bind(id).run()
      : await db.prepare("UPDATE boarding_stays SET medical_signs = ?, diagnosis = ?, treatment_plan = ?, care_instructions = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'active'").bind(parsed.data.medicalSigns, parsed.data.diagnosis, parsed.data.treatmentPlan, parsed.data.careInstructions, parsed.data.notes, id).run();
    if (!result.meta.changes) return Response.json({ error: "سجل المبيت غير موجود أو مغلق." }, { status: 404 });
    return Response.json({ ok: true, message: parsed.data.action === "checkout" ? "تم تسجيل خروج الحيوان وتفريغ القفص." : "تم تحديث تفاصيل المبيت." });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "تعذّر تحديث المبيت." }, { status: 500 }); }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await authorizeClinicRequest(); if (!auth.ok) return Response.json({ error: auth.message }, { status: auth.status });
  try {
    const { id } = await context.params;
    const result = await getD1().prepare("DELETE FROM boarding_stays WHERE id = ?").bind(id).run();
    if (!result.meta.changes) return Response.json({ error: "سجل المبيت غير موجود أو محذوف مسبقاً." }, { status: 404 });
    return Response.json({ ok: true, message: "تم حذف سجل المبيت وكل متابعاته ودفعاته وتفريغ القفص." });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "تعذّر حذف سجل المبيت." }, { status: 500 });
  }
}
