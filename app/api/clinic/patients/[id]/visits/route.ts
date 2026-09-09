import { getD1 } from "@/db";
import { authorizeClinicRequest } from "@/lib/clinic-auth";
import { buildVisitStatements, visitBundleSchema } from "@/lib/visit-payload";
import { inventoryDeductionStatements, validateInventoryUsage } from "@/lib/vaccine-inventory";

export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await authorizeClinicRequest();
  if (!auth.ok) return Response.json({ error: auth.message }, { status: auth.status });

  try {
    const parsed = visitBundleSchema.safeParse(await request.json());
    if (!parsed.success) return Response.json({ error: "تحقق من بيانات الزيارة." }, { status: 400 });
    const { id: patientId } = await context.params;
    const db = getD1();
    const patient = await db.prepare("SELECT id FROM patients WHERE id = ? AND active = 1 LIMIT 1").bind(patientId).first<{ id: string }>();
    if (!patient) return Response.json({ error: "ملف الحيوان غير موجود." }, { status: 404 });

    await validateInventoryUsage(db, parsed.data.preventiveRecords);
    const { visitId, statements } = buildVisitStatements(db, patientId, parsed.data);
    await db.batch([
      ...statements,
      ...inventoryDeductionStatements(db, parsed.data.preventiveRecords),
    ]);
    return Response.json({ visitId, message: "تم حفظ الزيارة الجديدة داخل نفس الملف." }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "تعذّر حفظ الزيارة.";
    return Response.json({ error: message }, { status: 500 });
  }
}
