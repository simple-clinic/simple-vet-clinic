import { env } from "cloudflare:workers";
import { getD1 } from "@/db";
import { authorizeClinicRequest } from "@/lib/clinic-auth";
import { PET_PHOTO_TYPES, petPhotoObjectKey, petPhotoUrl } from "@/lib/pet-photo";

export const dynamic = "force-dynamic";

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await authorizeClinicRequest();
  if (!auth.ok) return Response.json({ error: auth.message }, { status: auth.status });
  const { id } = await context.params;
  const file = (await request.formData()).get("photo");
  if (!(file instanceof File) || !PET_PHOTO_TYPES.includes(file.type as (typeof PET_PHOTO_TYPES)[number])) return Response.json({ error: "اختر صورة JPG أو PNG أو WEBP." }, { status: 400 });
  const db = getD1(); const patient = await db.prepare("SELECT photo_key FROM patients WHERE id = ? LIMIT 1").bind(id).first<{ photo_key: string | null }>();
  if (!patient) return Response.json({ error: "ملف الحيوان غير موجود." }, { status: 404 });
  const token = crypto.randomUUID(); await env.BUCKET.put(petPhotoObjectKey(token), file.stream(), { httpMetadata: { contentType: file.type } });
  await db.prepare("UPDATE patients SET photo_key = ?, photo_content_type = ? WHERE id = ?").bind(token, file.type, id).run();
  if (patient.photo_key) await env.BUCKET.delete(petPhotoObjectKey(patient.photo_key));
  return Response.json({ ok: true, photoUrl: petPhotoUrl(token) });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await authorizeClinicRequest();
  if (!auth.ok) return Response.json({ error: auth.message }, { status: auth.status });
  const { id } = await context.params; const db = getD1(); const patient = await db.prepare("SELECT photo_key FROM patients WHERE id = ? LIMIT 1").bind(id).first<{ photo_key: string | null }>();
  if (!patient) return Response.json({ error: "ملف الحيوان غير موجود." }, { status: 404 });
  await db.prepare("UPDATE patients SET photo_key = NULL, photo_content_type = NULL WHERE id = ?").bind(id).run();
  if (patient.photo_key) await env.BUCKET.delete(petPhotoObjectKey(patient.photo_key));
  return Response.json({ ok: true, message: "حُذفت صورة الحيوان." });
}
