import { getD1 } from "@/db";
import { authorizeClinicRequest } from "@/lib/clinic-auth";
import { inventoryRestorationStatements, type StoredInventoryUsage } from "@/lib/vaccine-inventory";

const labels: Record<string, string> = {
  medication: "الدواء",
  preventive: "سجل الوقاية",
  procedure: "العملية",
  diagnostic: "التحليل أو التصوير",
};

export async function DELETE(_request: Request, context: { params: Promise<{ kind: string; id: string }> }) {
  const auth = await authorizeClinicRequest();
  if (!auth.ok) return Response.json({ error: auth.message }, { status: auth.status });
  try {
    const { kind, id } = await context.params;
    const db = getD1();
    if (kind === "preventive") {
      const record = await db.prepare(
        "SELECT inventory_item_id, inventory_quantity FROM preventive_records WHERE id = ? LIMIT 1",
      ).bind(id).first<StoredInventoryUsage>();
      if (!record) return Response.json({ error: "السجل غير موجود أو محذوف مسبقاً." }, { status: 404 });
      await db.batch([
        ...inventoryRestorationStatements(db, [record]),
        db.prepare("DELETE FROM preventive_records WHERE id = ?").bind(id),
      ]);
      return Response.json({ ok: true, message: `تم حذف ${labels[kind]}.` });
    }
    const statement = kind === "medication"
      ? db.prepare("DELETE FROM medications WHERE id = ?").bind(id)
      : kind === "procedure"
          ? db.prepare("DELETE FROM procedures WHERE id = ?").bind(id)
          : kind === "diagnostic"
            ? db.prepare("DELETE FROM diagnostics WHERE id = ?").bind(id)
            : null;
    if (!statement) return Response.json({ error: "نوع السجل غير صالح." }, { status: 400 });
    const result = await statement.run();
    if (!result.meta.changes) return Response.json({ error: "السجل غير موجود أو محذوف مسبقاً." }, { status: 404 });
    return Response.json({ ok: true, message: `تم حذف ${labels[kind]}.` });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "تعذّر حذف السجل." }, { status: 500 });
  }
}
