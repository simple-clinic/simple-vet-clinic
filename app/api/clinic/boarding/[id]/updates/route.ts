import { z } from "zod";
import { getD1 } from "@/db";
import { authorizeClinicRequest } from "@/lib/clinic-auth";

const schema = z.object({ updateDate: z.string().trim().min(8).max(20), temperatureC: z.number().min(0).max(50).nullable().optional(), appetite: z.string().trim().max(500).default(""), urination: z.string().trim().max(500).default(""), defecation: z.string().trim().max(500).default(""), medications: z.string().trim().max(2000).default(""), notes: z.string().trim().max(3000).default("") });

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await authorizeClinicRequest(); if (!auth.ok) return Response.json({ error: auth.message }, { status: auth.status });
  try {
    const parsed = schema.safeParse(await request.json()); if (!parsed.success) return Response.json({ error: "تحقق من تفاصيل المتابعة." }, { status: 400 });
    const { id } = await context.params; const db = getD1();
    const stay = await db.prepare("SELECT id FROM boarding_stays WHERE id = ? AND status = 'active'").bind(id).first();
    if (!stay) return Response.json({ error: "سجل المبيت غير موجود أو مغلق." }, { status: 404 });
    await db.prepare("INSERT INTO boarding_updates (id, stay_id, update_date, temperature_c, appetite, urination, defecation, medications, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(crypto.randomUUID(), id, parsed.data.updateDate, parsed.data.temperatureC ?? null, parsed.data.appetite, parsed.data.urination, parsed.data.defecation, parsed.data.medications, parsed.data.notes).run();
    return Response.json({ ok: true, message: "تمت إضافة متابعة جديدة." }, { status: 201 });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "تعذّر حفظ المتابعة." }, { status: 500 }); }
}
