import { z } from "zod";
import { getD1 } from "@/db";
import { authorizeClinicRequest } from "@/lib/clinic-auth";

const schema = z.object({ quantity: z.number().int().min(1).max(1_000_000), unitCostIqd: z.number().int().min(0).max(2_000_000_000).default(0), notes: z.string().trim().max(1000).default("") });

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await authorizeClinicRequest(); if (!auth.ok) return Response.json({ error: auth.message }, { status: auth.status });
  try {
    const parsed = schema.safeParse(await request.json()); if (!parsed.success) return Response.json({ error: "أدخل عدد الإضافة بصورة صحيحة." }, { status: 400 });
    const { id } = await context.params; const db = getD1();
    const item = await db.prepare("SELECT id FROM inventory_items WHERE id = ? AND active = 1").bind(id).first();
    if (!item) return Response.json({ error: "المادة غير موجودة." }, { status: 404 });
    await db.batch([
      db.prepare("UPDATE inventory_items SET quantity = quantity + ?, wholesale_price_iqd = CASE WHEN ? > 0 THEN ? ELSE wholesale_price_iqd END, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(parsed.data.quantity, parsed.data.unitCostIqd, parsed.data.unitCostIqd, id),
      db.prepare("INSERT INTO inventory_movements (id, item_id, movement_type, quantity_delta, unit_cost_iqd, notes) VALUES (?, ?, 'restock', ?, ?, ?)").bind(crypto.randomUUID(), id, parsed.data.quantity, parsed.data.unitCostIqd, parsed.data.notes),
    ]);
    return Response.json({ ok: true, message: "تمت إضافة الكمية إلى الرصيد." });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "تعذّر تحديث الرصيد." }, { status: 500 }); }
}
