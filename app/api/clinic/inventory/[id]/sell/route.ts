import { z } from "zod";
import { getD1 } from "@/db";
import { authorizeClinicRequest } from "@/lib/clinic-auth";

const schema = z.object({ quantity: z.number().int().min(1).max(1_000_000), unitPriceIqd: z.number().int().min(0).max(2_000_000_000).optional(), patientId: z.string().trim().max(100).nullable().optional(), buyerName: z.string().trim().max(180).default(""), notes: z.string().trim().max(1000).default("") });

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await authorizeClinicRequest(); if (!auth.ok) return Response.json({ error: auth.message }, { status: auth.status });
  try {
    const parsed = schema.safeParse(await request.json()); if (!parsed.success) return Response.json({ error: "تحقق من عدد وسعر البيع." }, { status: 400 });
    const { id } = await context.params; const db = getD1();
    const item = await db.prepare("SELECT quantity, wholesale_price_iqd, retail_price_iqd FROM inventory_items WHERE id = ? AND active = 1").bind(id).first<{ quantity: number; wholesale_price_iqd: number; retail_price_iqd: number }>();
    if (!item) return Response.json({ error: "المادة غير موجودة." }, { status: 404 });
    if (item.quantity < parsed.data.quantity) return Response.json({ error: `العدد المتوفر فقط ${item.quantity}.` }, { status: 409 });
    const unitPrice = parsed.data.unitPriceIqd ?? item.retail_price_iqd;
    const total = unitPrice * parsed.data.quantity;
    const costTotal = item.wholesale_price_iqd * parsed.data.quantity;
    const saleId = crypto.randomUUID();
    await db.batch([
      db.prepare("UPDATE inventory_items SET quantity = quantity - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND quantity >= ?").bind(parsed.data.quantity, id, parsed.data.quantity),
      db.prepare("INSERT INTO inventory_sales (id, item_id, patient_id, quantity, unit_wholesale_iqd, unit_price_iqd, total_iqd, cost_total_iqd, buyer_name, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(saleId, id, parsed.data.patientId || null, parsed.data.quantity, item.wholesale_price_iqd, unitPrice, total, costTotal, parsed.data.buyerName, parsed.data.notes),
      db.prepare("INSERT INTO inventory_movements (id, item_id, movement_type, quantity_delta, unit_cost_iqd, notes) VALUES (?, ?, 'sale', ?, ?, ?)").bind(crypto.randomUUID(), id, -parsed.data.quantity, item.wholesale_price_iqd, parsed.data.notes),
    ]);
    return Response.json({ saleId, totalIqd: total, message: "تم تسجيل البيع وخصم الكمية من المخزن." }, { status: 201 });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "تعذّر تسجيل البيع." }, { status: 500 }); }
}
