import { getD1 } from "@/db";
import { authorizeClinicRequest } from "@/lib/clinic-auth";

export async function DELETE(_request: Request, context: { params: Promise<{ id: string; updateId: string }> }) {
  const auth = await authorizeClinicRequest(); if (!auth.ok) return Response.json({ error: auth.message }, { status: auth.status });
  try {
    const { id, updateId } = await context.params;
    const result = await getD1().prepare("DELETE FROM boarding_updates WHERE id = ? AND stay_id = ?").bind(updateId, id).run();
    if (!result.meta.changes) return Response.json({ error: "المتابعة غير موجودة أو محذوفة مسبقاً." }, { status: 404 });
    return Response.json({ ok: true, message: "تم حذف متابعة المبيت." });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "تعذّر حذف المتابعة." }, { status: 500 });
  }
}
