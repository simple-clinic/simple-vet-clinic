import { getD1 } from "@/db";
import { authorizeClinicRequest } from "@/lib/clinic-auth";

export const dynamic = "force-dynamic";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await authorizeClinicRequest();
  if (!auth.ok) return Response.json({ error: auth.message }, { status: auth.status });

  try {
    const { id } = await context.params;
    const result = await getD1()
      .prepare(
        `UPDATE patients
         SET active = 1, record_status = 'active', archived_at = NULL
         WHERE id = ? AND active = 0`,
      )
      .bind(id)
      .run();

    if (!result.meta.changes) {
      return Response.json({ error: "الحالة غير موجودة في الأرشيف أو تمت استعادتها مسبقاً." }, { status: 404 });
    }

    return Response.json({ ok: true, message: "تمت استعادة الحالة إلى السجل النشط." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "تعذّرت استعادة الحالة.";
    return Response.json({ error: message }, { status: 500 });
  }
}
