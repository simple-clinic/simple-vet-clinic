import { getD1 } from "@/db";
import { authorizeClinicRequest } from "@/lib/clinic-auth";

export const dynamic = "force-dynamic";

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await authorizeClinicRequest();
  if (!auth.ok) return Response.json({ error: auth.message }, { status: auth.status });

  try {
    const { id } = await context.params;
    const db = getD1();
    const archivedPatient = await db
      .prepare("SELECT owner_id, name, photo_key FROM patients WHERE id = ? AND active = 0 LIMIT 1")
      .bind(id)
      .first<{ owner_id: string; name: string; photo_key: string | null }>();

    if (!archivedPatient) {
      return Response.json({ error: "الحالة غير موجودة في الأرشيف أو تمت استعادتها مسبقاً." }, { status: 404 });
    }

    const activeBoarding = await db
      .prepare("SELECT id FROM boarding_stays WHERE patient_id = ? AND status = 'active' LIMIT 1")
      .bind(id)
      .first();
    if (activeBoarding) {
      return Response.json({ error: "لا يمكن حذف الحالة نهائياً قبل تسجيل خروجها من المبيت." }, { status: 409 });
    }

    const results = await db.batch([
      db.prepare("DELETE FROM patients WHERE id = ? AND active = 0").bind(id),
      db
        .prepare("DELETE FROM owners WHERE id = ? AND NOT EXISTS (SELECT 1 FROM patients WHERE owner_id = ?)")
        .bind(archivedPatient.owner_id, archivedPatient.owner_id),
    ]);

    if (!results[0]?.meta.changes) {
      return Response.json({ error: "تعذّر حذف الحالة لأنها تغيّرت أثناء العملية." }, { status: 409 });
    }

    return Response.json({ ok: true, message: `تم حذف ملف ${archivedPatient.name} نهائياً من الأرشيف.` });
  } catch (error) {
    const message = error instanceof Error ? error.message : "تعذّر حذف الحالة نهائياً.";
    return Response.json({ error: message }, { status: 500 });
  }
}
