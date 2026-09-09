import { cookies } from "next/headers";
import { CLINIC_SESSION_COOKIE, clinicSessionCookieOptions } from "@/lib/clinic-auth";

export async function GET(request: Request) {
  (await cookies()).set(CLINIC_SESSION_COOKIE, "", { ...clinicSessionCookieOptions, maxAge: 0 });
  return Response.redirect(new URL("/clinic/login", request.url), 303);
}
