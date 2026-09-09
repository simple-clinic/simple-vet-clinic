import { env } from "cloudflare:workers";
import { getD1 } from "@/db";
import { authorizeClinicRequest } from "@/lib/clinic-auth";
import { inventoryPhotoObjectKey, inventoryPhotoUrl, PET_PHOTO_TYPES } from "@/lib/pet-photo";

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await authorizeClinicRequest(); if (!auth.ok) return Response.json({ error: auth.message }, { status: auth.status });
  const { id } = await context.params; const file = (await request.formData()).get("photo");
  if (!(file instanceof File) || !PET_PHOTO_TYPES.includes(file.type as (typeof PET_PHOTO_TYPES)[number])) return Response.json({ error: "اختر صورة JPG أو PNG أو WEBP." }, { status: 400 });
  const db = getD1(); const item = await db.prepare("SELECT photo_key FROM inventory_items WHERE id=? LIMIT 1").bind(id).first<{ photo_key: string | null }>();
  if (!item) return Response.json({ error: "المنتج غير موجود." }, { status: 404 });
  const token = crypto.randomUUID(); await env.BUCKET.put(inventoryPhotoObjectKey(token), file.stream(), { httpMetadata: { contentType: file.type } });
  await db.prepare("UPDATE inventory_items SET photo_key=?, photo_content_type=?, updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(token, file.type, id).run();
  if (item.photo_key) await env.BUCKET.delete(inventoryPhotoObjectKey(item.photo_key));
  return Response.json({ ok: true, photoUrl: inventoryPhotoUrl(token) });
}
export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await authorizeClinicRequest(); if (!auth.ok) return Response.json({ error: auth.message }, { status: auth.status });
  const { id } = await context.params; const db = getD1(); const item = await db.prepare("SELECT photo_key FROM inventory_items WHERE id=? LIMIT 1").bind(id).first<{ photo_key: string | null }>();
  if (!item) return Response.json({ error: "المنتج غير موجود." }, { status: 404 });
  await db.prepare("UPDATE inventory_items SET photo_key=NULL, photo_content_type=NULL, updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(id).run();
  if (item.photo_key) await env.BUCKET.delete(inventoryPhotoObjectKey(item.photo_key)); return Response.json({ ok: true, message: "حُذفت صورة المنتج." });
}
