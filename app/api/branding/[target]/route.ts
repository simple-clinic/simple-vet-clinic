import { env } from "cloudflare:workers";
import { readClinicSettings } from "@/lib/clinic-settings";

export async function GET(
  _request: Request,
  context: { params: Promise<{ target: string }> },
) {
  const { target } = await context.params;
  if (target !== "portal" && target !== "admin" && target !== "banner")
    return new Response("Not found", { status: 404 });
  const settings = await readClinicSettings();
  const requested = new URL(_request.url).searchParams.get("key");
  const allowedBanners = settings.portalBannerImageKeys.length
    ? settings.portalBannerImageKeys
    : settings.portalBannerImageKey
      ? [settings.portalBannerImageKey]
      : [];
  const key =
    target === "admin"
      ? settings.adminLogoKey
      : target === "banner"
        ? requested && allowedBanners.includes(requested)
          ? requested
          : allowedBanners[0]
        : settings.portalLogoKey;
  if (!key) return new Response("Not found", { status: 404 });
  const object = await env.BUCKET.get(`branding/${target}/${key}`);
  if (!object) return new Response("Not found", { status: 404 });
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("cache-control", "public, max-age=300");
  return new Response(object.body, { headers });
}
