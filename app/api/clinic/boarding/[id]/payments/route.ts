import { z } from "zod";
import { getD1 } from "@/db";
import { authorizeClinicRequest } from "@/lib/clinic-auth";

const schema = z.object({ amountIqd: z.number().int().min(1).max(2_000_000_000), notes: z.string().trim().max(1000).default("") });

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await authorizeClinicRequest(); if (!auth.ok) return Response.json({ error: auth.message }, { status: auth.status });
  try {
    const parsed = schema.safeParse(await request.json()); if (!parsed.success) return Response.json({ error: "أدخل مبلغ الدفعة بصورة صحيحة." }, { status: 400 });
    const { id } = await context.params; const db = getD1();
    const stay = await db.prepare("SELECT total_iqd, paid_iqd FROM boarding_stays WHERE id = ? AND status = 'active'").bind(id).first<{ total_iqd: number; paid_iqd: number }>();
    if (!stay) return Response.json({ error: "سجل المبيت غير موجود أو مغلق." }, { status: 404 });
    const remaining = Math.max(0, stay.total_iqd - stay.paid_iqd);
    const amount = Math.min(parsed.data.amountIqd, remaining);
    if (amount <= 0) return Response.json({ error: "الحساب مدفوع بالكامل." }, { status: 409 });
    await db.batch([
      db.prepare("UPDATE boarding_stays SET paid_iqd = paid_iqd + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(amount, id),
      db.prepare("INSERT INTO boarding_payments (id, stay_id, amount_iqd, notes) VALUES (?, ?, ?, ?)").bind(crypto.randomUUID(), id, amount, parsed.data.notes),
    ]);
    return Response.json({ ok: true, amountIqd: amount, message: "تم تسجيل الدفعة." }, { status: 201 });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "تعذّر تسجيل الدفعة." }, { status: 500 }); }
}
