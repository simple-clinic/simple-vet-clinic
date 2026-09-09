import { z } from "zod";
import { getD1 } from "@/db";
import { authorizeClinicRequest } from "@/lib/clinic-auth";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  name: z.string().trim().min(1).max(180), category: z.string().trim().min(1).max(80),
  unit: z.string().trim().min(1).max(40), sku: z.string().trim().max(100).default(""),
  lowStockThreshold: z.number().int().min(0).max(1_000_000),
  wholesalePriceIqd: z.number().int().min(0).max(2_000_000_000),
  retailPriceIqd: z.number().int().min(0).max(2_000_000_000),
  expiryDate: z.string().trim().max(20).nullable().optional(), notes: z.string().trim().max(2000).default(""),
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await authorizeClinicRequest();
  if (!auth.ok) return Response.json({ error: auth.message }, { status: auth.status });
  try {
    const parsed = updateSchema.safeParse(await request.json());
    if (!parsed.success) return Response.json({ error: "تحقق من بيانات المادة." }, { status: 400 });
    const { id } = await context.params;
    const data = parsed.data;
    const result = await getD1().prepare(
      `UPDATE inventory_items SET name = ?, category = ?, unit = ?, sku = ?, low_stock_threshold = ?,
       wholesale_price_iqd = ?, retail_price_iqd = ?, expiry_date = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND active = 1`,
    ).bind(data.name, data.category, data.unit, data.sku, data.lowStockThreshold, data.wholesalePriceIqd, data.retailPriceIqd, data.expiryDate || null, data.notes, id).run();
    if (!result.meta.changes) return Response.json({ error: "المادة غير موجودة." }, { status: 404 });
    return Response.json({ ok: true, message: "تم تعديل المادة." });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "تعذّر تعديل المادة." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await authorizeClinicRequest();
  if (!auth.ok) return Response.json({ error: auth.message }, { status: auth.status });
  try {
    const { id } = await context.params;
    const db = getD1();
    const item = await db.prepare(
      `SELECT i.name, i.active,
         (SELECT COUNT(*) FROM inventory_sales s WHERE s.item_id = i.id) AS sale_count,
         (SELECT COUNT(*) FROM preventive_records p WHERE p.inventory_item_id = i.id) AS vaccine_use_count
       FROM inventory_items i WHERE i.id = ? LIMIT 1`,
    ).bind(id).first<{ name: string; active: number; sale_count: number; vaccine_use_count: number }>();
    if (!item || !item.active) return Response.json({ error: "المادة غير موجودة أو محذوفة مسبقاً." }, { status: 404 });

    if (Number(item.sale_count) > 0 || Number(item.vaccine_use_count) > 0) {
      await db.prepare("UPDATE inventory_items SET active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(id).run();
      return Response.json({ ok: true, message: `تم حذف ${item.name} من قائمة المخزن مع حفظ مبيعاتها السابقة.` });
    }

    await db.prepare("DELETE FROM inventory_items WHERE id = ?").bind(id).run();
    return Response.json({ ok: true, message: `تم حذف ${item.name} من المخزن.` });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "تعذّر حذف المادة." }, { status: 500 });
  }
}
