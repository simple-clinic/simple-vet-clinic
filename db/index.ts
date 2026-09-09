import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

export function getD1() {
  if (!env.DB) {
    throw new Error(
      "Cloudflare D1 binding `DB` is unavailable. Bind the simple-vet-db database as `DB` in wrangler.jsonc before using the application."
    );
  }

  return env.DB;
}

export function getDb() {
  return drizzle(getD1(), { schema });
}
