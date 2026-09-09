import { env } from "cloudflare:workers";
import { diagnosticImageObjectKey } from "@/lib/pet-photo";

export async function GET(_request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const object = await env.BUCKET.get(diagnosticImageObjectKey(token));
  if (!object) return new Response("Not found", { status: 404 });
  const headers = new Headers(); object.writeHttpMetadata(headers); headers.set("etag", object.httpEtag); headers.set("cache-control", "public, max-age=3600");
  return new Response(object.body, { headers });
}
