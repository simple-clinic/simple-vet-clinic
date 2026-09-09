import { env } from "cloudflare:workers";
import { getD1 } from "@/db";
import { authorizeClinicRequest } from "@/lib/clinic-auth";
import { diagnosticImageObjectKey, diagnosticImageUrl, PET_PHOTO_TYPES } from "@/lib/pet-photo";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await authorizeClinicRequest(); if (!auth.ok) return Response.json({ error: auth.message }, { status: auth.status });
  const { id } = await context.params; const db = getD1();
  const diagnostic = await db.prepare("SELECT id FROM diagnostics WHERE id=? LIMIT 1").bind(id).first();
  if (!diagnostic) return Response.json({ error: "الفحص غير موجود." }, { status: 404 });
  const form = await request.formData(); const files = form.getAll("images").filter((item): item is File => item instanceof File && item.size > 0);
  if (!files.length) return Response.json({ error: "اختر صورة واحدة على الأقل." }, { status: 400 });
  const images = [];
  for (const file of files) {
    if (!PET_PHOTO_TYPES.includes(file.type as (typeof PET_PHOTO_TYPES)[number])) continue;
    const token = crypto.randomUUID(); const rowId = crypto.randomUUID();
    await env.BUCKET.put(diagnosticImageObjectKey(token), file.stream(), { httpMetadata: { contentType: file.type } });
    await db.prepare("INSERT INTO diagnostic_images (id, diagnostic_id, object_key, content_type, file_name) VALUES (?, ?, ?, ?, ?)").bind(rowId, id, token, file.type, file.name).run();
    images.push({ id: rowId, url: diagnosticImageUrl(token), fileName: file.name });
  }
  return Response.json({ ok: true, images }, { status: 201 });
}
