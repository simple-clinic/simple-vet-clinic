import { env } from "cloudflare:workers";
import { getD1 } from "@/db";
import { authorizeClinicRequest } from "@/lib/clinic-auth";
import { diagnosticImageObjectKey } from "@/lib/pet-photo";

export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await authorizeClinicRequest(); if (!auth.ok) return Response.json({ error: auth.message }, { status: auth.status });
  const { id } = await context.params; const db = getD1();
  const row = await db.prepare("SELECT object_key FROM diagnostic_images WHERE id=? LIMIT 1").bind(id).first<{ object_key: string }>();
  if (!row) return Response.json({ error: "الصورة غير موجودة." }, { status: 404 });
  await db.prepare("DELETE FROM diagnostic_images WHERE id=?").bind(id).run();
  await env.BUCKET.delete(diagnosticImageObjectKey(row.object_key));
  return Response.json({ ok: true, message: "حُذفت الصورة." });
}
