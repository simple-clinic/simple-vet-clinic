import { getD1 } from "@/db";
import { authorizeClinicRequest } from "@/lib/clinic-auth";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await authorizeClinicRequest();
  if (!auth.ok) {
    return Response.json({ error: auth.message }, { status: auth.status });
  }

  try {
    const { id } = await context.params;
    const payload = (await request.json()) as { action?: string };
    if (payload.action !== "mark_sent" && payload.action !== "complete") {
      return Response.json({ error: "إجراء غير صالح." }, { status: 400 });
    }

    const db = getD1();
    if (payload.action === "mark_sent") {
      await db
        .prepare("UPDATE preventive_records SET sent_at = CURRENT_TIMESTAMP WHERE id = ?")
        .bind(id)
        .run();
    } else {
      await db
        .prepare("UPDATE preventive_records SET status = 'completed' WHERE id = ?")
        .bind(id)
        .run();
    }

    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "تعذّر تحديث التذكير.";
    return Response.json({ error: message }, { status: 500 });
  }
}

