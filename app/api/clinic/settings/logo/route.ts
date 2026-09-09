import { env } from "cloudflare:workers";
import { authorizeClinicRequest } from "@/lib/clinic-auth";
import { readClinicSettings, writeClinicSettings } from "@/lib/clinic-settings";

const types = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];
const objectKey = (target: string, token: string) =>
  `branding/${target}/${token}`;

export async function PUT(request: Request) {
  const auth = await authorizeClinicRequest();
  if (!auth.ok)
    return Response.json({ error: auth.message }, { status: auth.status });
  const form = await request.formData();
  const rawTarget = form.get("target");
  const target =
    rawTarget === "admin" || rawTarget === "banner" ? rawTarget : "portal";
  const file = form.get("logo");
  if (
    !(file instanceof File) ||
    !types.includes(file.type) ||
    file.size > 5 * 1024 * 1024
  )
    return Response.json(
      { error: "اختر صورة JPG أو PNG أو WEBP أو SVG بحجم أقل من 5MB." },
      { status: 400 },
    );
  const settings = await readClinicSettings();
  const token = crypto.randomUUID();
  await env.BUCKET.put(objectKey(target, token), file.stream(), {
    httpMetadata: { contentType: file.type },
  });
  let previous = "";
  if (target === "banner") {
    const existing = settings.portalBannerImageKeys.length
      ? settings.portalBannerImageKeys
      : settings.portalBannerImageKey
        ? [settings.portalBannerImageKey]
        : [];
    if (existing.length >= 10) {
      await env.BUCKET.delete(objectKey(target, token));
      return Response.json(
        { error: "الحد الأعلى 10 صور للبنر." },
        { status: 400 },
      );
    }
    settings.portalBannerImageKeys = [...existing, token];
    settings.portalBannerImageKey = "";
  } else {
    const property = target === "admin" ? "adminLogoKey" : "portalLogoKey";
    previous = settings[property];
    settings[property] = token;
  }
  await writeClinicSettings(settings);
  if (previous) await env.BUCKET.delete(objectKey(target, previous));
  return Response.json({
    ok: true,
    key: token,
    keys: settings.portalBannerImageKeys,
    url: `/api/branding/${target}?key=${token}`,
  });
}

export async function DELETE(request: Request) {
  const auth = await authorizeClinicRequest();
  if (!auth.ok)
    return Response.json({ error: auth.message }, { status: auth.status });
  const rawTarget = new URL(request.url).searchParams.get("target");
  const target =
    rawTarget === "admin" || rawTarget === "banner" ? rawTarget : "portal";
  const settings = await readClinicSettings();
  let previous = "";
  if (target === "banner") {
    const requested = new URL(request.url).searchParams.get("key") || "";
    const existing = settings.portalBannerImageKeys.length
      ? settings.portalBannerImageKeys
      : settings.portalBannerImageKey
        ? [settings.portalBannerImageKey]
        : [];
    previous =
      requested && existing.includes(requested)
        ? requested
        : existing[existing.length - 1] || "";
    settings.portalBannerImageKeys = existing.filter((key) => key !== previous);
    settings.portalBannerImageKey = "";
  } else {
    const property = target === "admin" ? "adminLogoKey" : "portalLogoKey";
    previous = settings[property];
    settings[property] = "";
  }
  await writeClinicSettings(settings);
  if (previous) await env.BUCKET.delete(objectKey(target, previous));
  return Response.json({ ok: true });
}
