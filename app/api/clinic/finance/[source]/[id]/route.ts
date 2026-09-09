import { getD1 } from "@/db";
import { authorizeClinicRequest } from "@/lib/clinic-auth";

const allowedSources = new Set(["visit", "procedure", "diagnostic", "store", "boarding"]);

export async function DELETE(_request: Request, context: { params: Promise<{ source: string; id: string }> }) {
  const auth = await authorizeClinicRequest();
  if (!auth.ok) return Response.json({ error: auth.message }, { status: auth.status });
  try {
    const { source, id } = await context.params;
    if (!allowedSources.has(source)) return Response.json({ error: "نوع القيد غير صالح." }, { status: 400 });
    const db = getD1();

    if (source === "visit") {
      const result = await db.prepare("UPDATE visits SET cost_iqd = 0 WHERE id = ? AND cost_iqd > 0").bind(id).run();
      if (!result.meta.changes) return Response.json({ error: "قيد الكشف غير موجود." }, { status: 404 });
      return Response.json({ ok: true, message: "تم حذف مبلغ الكشف من الوارد مع إبقاء الزيارة الطبية." });
    }
    if (source === "procedure") {
      const result = await db.prepare("UPDATE procedures SET cost_iqd = 0 WHERE id = ? AND cost_iqd > 0").bind(id).run();
      if (!result.meta.changes) return Response.json({ error: "قيد العملية غير موجود." }, { status: 404 });
      return Response.json({ ok: true, message: "تم حذف مبلغ العملية من الوارد مع إبقاء تفاصيلها الطبية." });
    }
    if (source === "diagnostic") {
      const result = await db.prepare("UPDATE diagnostics SET cost_iqd = 0 WHERE id = ? AND cost_iqd > 0").bind(id).run();
      if (!result.meta.changes) return Response.json({ error: "قيد التحليل غير موجود." }, { status: 404 });
      return Response.json({ ok: true, message: "تم حذف مبلغ التحليل من الوارد مع إبقاء نتائجه." });
    }
    if (source === "store") {
      const sale = await db.prepare(
        "SELECT item_id, quantity, unit_wholesale_iqd FROM inventory_sales WHERE id = ? LIMIT 1",
      ).bind(id).first<{ item_id: string; quantity: number; unit_wholesale_iqd: number }>();
      if (!sale) return Response.json({ error: "مبيعة المخزن غير موجودة." }, { status: 404 });
      await db.batch([
        db.prepare("UPDATE inventory_items SET quantity = quantity + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(sale.quantity, sale.item_id),
        db.prepare(
          "INSERT INTO inventory_movements (id, item_id, movement_type, quantity_delta, unit_cost_iqd, notes) VALUES (?, ?, 'sale_reversal', ?, ?, 'حذف مبيعة مسجلة بالخطأ')",
        ).bind(crypto.randomUUID(), sale.item_id, sale.quantity, sale.unit_wholesale_iqd),
        db.prepare("DELETE FROM inventory_sales WHERE id = ?").bind(id),
      ]);
      return Response.json({ ok: true, message: "تم حذف المبيعة من الوارد وإرجاع الكمية إلى المخزن." });
    }

    const payment = await db.prepare(
      "SELECT stay_id, amount_iqd FROM boarding_payments WHERE id = ? LIMIT 1",
    ).bind(id).first<{ stay_id: string; amount_iqd: number }>();
    if (!payment) return Response.json({ error: "دفعة المبيت غير موجودة." }, { status: 404 });
    await db.batch([
      db.prepare("UPDATE boarding_stays SET paid_iqd = MAX(0, paid_iqd - ?), updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(payment.amount_iqd, payment.stay_id),
      db.prepare("DELETE FROM boarding_payments WHERE id = ?").bind(id),
    ]);
    return Response.json({ ok: true, message: "تم حذف دفعة المبيت من الوارد وإعادتها إلى المبلغ المتبقي." });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "تعذّر حذف قيد الوارد." }, { status: 500 });
  }
}
