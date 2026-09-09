import { z } from "zod";
import { getD1 } from "@/db";
import { authorizeClinicRequest } from "@/lib/clinic-auth";

export const dynamic = "force-dynamic";

function monthBounds(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const next = monthNumber === 12 ? `${year + 1}-01-01` : `${year}-${String(monthNumber + 1).padStart(2, "0")}-01`;
  return { start: `${month}-01`, next };
}

const itemSchema = z.object({
  name: z.string().trim().min(1).max(180),
  category: z.string().trim().min(1).max(80),
  unit: z.string().trim().min(1).max(40).default("قطعة"),
  sku: z.string().trim().max(100).default(""),
  quantity: z.number().int().min(0).max(1_000_000).default(0),
  lowStockThreshold: z.number().int().min(0).max(1_000_000).default(1),
  wholesalePriceIqd: z.number().int().min(0).max(2_000_000_000).default(0),
  retailPriceIqd: z.number().int().min(0).max(2_000_000_000).default(0),
  expiryDate: z.string().trim().max(20).nullable().optional(),
  notes: z.string().trim().max(2000).default(""),
});

export async function GET(request: Request) {
  const auth = await authorizeClinicRequest();
  if (!auth.ok) return Response.json({ error: auth.message }, { status: auth.status });
  try {
    const params = new URL(request.url).searchParams;
    const fallbackMonth = new Date().toISOString().slice(0, 7);
    let fromMonth = params.get("from") || params.get("month") || fallbackMonth;
    let toMonth = params.get("to") || fromMonth;
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(fromMonth) || !/^\d{4}-(0[1-9]|1[0-2])$/.test(toMonth)) {
      return Response.json({ error: "صيغة الشهر غير صحيحة." }, { status: 400 });
    }
    if (fromMonth > toMonth) [fromMonth, toMonth] = [toMonth, fromMonth];
    const { start } = monthBounds(fromMonth);
    const { next } = monthBounds(toMonth);
    const db = getD1();
    const [items, sales, stats] = await Promise.all([
      db.prepare(
        `SELECT *,
          CASE WHEN quantity = 0 THEN 'out' WHEN quantity <= low_stock_threshold THEN 'low' ELSE 'ok' END AS stock_status
         FROM inventory_items WHERE active = 1 ORDER BY category, name`,
      ).all<Record<string, unknown>>(),
      db.prepare(
        `SELECT s.*, i.name AS item_name, i.category, p.name AS patient_name
         FROM inventory_sales s JOIN inventory_items i ON i.id = s.item_id
         LEFT JOIN patients p ON p.id = s.patient_id
         WHERE date(s.sold_at) >= date(?) AND date(s.sold_at) < date(?)
         ORDER BY s.sold_at DESC LIMIT 300`,
      ).bind(start, next).all<Record<string, unknown>>(),
      db.prepare(
        `SELECT
          (SELECT COUNT(*) FROM inventory_items WHERE active = 1) AS item_count,
          (SELECT COUNT(*) FROM inventory_items WHERE active = 1 AND quantity = 0) AS out_count,
          (SELECT COUNT(*) FROM inventory_items WHERE active = 1 AND quantity > 0 AND quantity <= low_stock_threshold) AS low_count,
          COALESCE((SELECT SUM(quantity * wholesale_price_iqd) FROM inventory_items WHERE active = 1), 0) AS stock_cost_value,
          COALESCE((SELECT SUM(quantity * retail_price_iqd) FROM inventory_items WHERE active = 1), 0) AS stock_retail_value,
          COALESCE((SELECT SUM(total_iqd) FROM inventory_sales WHERE date(sold_at) >= date(?) AND date(sold_at) < date(?)), 0) AS month_sales,
          COALESCE((SELECT SUM(total_iqd - cost_total_iqd) FROM inventory_sales WHERE date(sold_at) >= date(?) AND date(sold_at) < date(?)), 0) AS month_profit`,
      ).bind(start, next, start, next).first<Record<string, number>>(),
    ]);
    return Response.json({ month: fromMonth, from: fromMonth, to: toMonth, items: items.results ?? [], sales: sales.results ?? [], stats: stats ?? {} });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "تعذّر تحميل المخزن." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await authorizeClinicRequest();
  if (!auth.ok) return Response.json({ error: auth.message }, { status: auth.status });
  try {
    const parsed = itemSchema.safeParse(await request.json());
    if (!parsed.success) return Response.json({ error: "تحقق من بيانات المادة والأسعار والعدد." }, { status: 400 });
    const data = parsed.data;
    const db = getD1();
    const id = crypto.randomUUID();
    const statements = [
      db.prepare(
        `INSERT INTO inventory_items (
          id, name, category, unit, sku, quantity, low_stock_threshold,
          wholesale_price_iqd, retail_price_iqd, expiry_date, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(id, data.name, data.category, data.unit, data.sku, data.quantity, data.lowStockThreshold, data.wholesalePriceIqd, data.retailPriceIqd, data.expiryDate || null, data.notes),
    ];
    if (data.quantity > 0) statements.push(db.prepare(
      `INSERT INTO inventory_movements (id, item_id, movement_type, quantity_delta, unit_cost_iqd, notes)
       VALUES (?, ?, 'initial', ?, ?, 'رصيد افتتاحي')`,
    ).bind(crypto.randomUUID(), id, data.quantity, data.wholesalePriceIqd));
    await db.batch(statements);
    return Response.json({ id, message: "تمت إضافة المادة إلى المخزن." }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "تعذّر إضافة المادة." }, { status: 500 });
  }
}
