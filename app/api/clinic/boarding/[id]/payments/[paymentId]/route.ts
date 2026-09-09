import { getD1 } from "@/db";
import { authorizeClinicRequest } from "@/lib/clinic-auth";

export async function DELETE(_request: Request, context: { params: Promise<{ id: string; paymentId: string }> }) {
  const auth = await authorizeClinicRequest(); if (!auth.ok) return Response.json({ error: auth.message }, { status: auth.status });
  try {
    const { id, paymentId } = await context.params;
    const db = getD1();
    const payment = await db.prepare(
      "SELECT amount_iqd FROM boarding_payments WHERE id = ? AND stay_id = ? LIMIT 1",
    ).bind(paymentId, id).first<{ amount_iqd: number }>();
    if (!payment) return Response.json({ error: "الدفعة غير موجودة أو محذوفة مسبقاً." }, { status: 404 });
    await db.batch([
      db.prepare("UPDATE boarding_stays SET paid_iqd = MAX(0, paid_iqd - ?), updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(payment.amount_iqd, id),
      db.prepare("DELETE FROM boarding_payments WHERE id = ? AND stay_id = ?").bind(paymentId, id),
    ]);
    return Response.json({ ok: true, message: "تم حذف الدفعة وإضافتها إلى المبلغ المتبقي." });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "تعذّر حذف الدفعة." }, { status: 500 });
  }
}
