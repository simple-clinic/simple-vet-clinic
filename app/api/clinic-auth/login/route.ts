import { z } from "zod";
import { cookies } from "next/headers";
import {
  CLINIC_SESSION_COOKIE,
  clinicSessionCookieOptions,
  createClinicSessionToken,
  verifyClinicPassword,
} from "@/lib/clinic-auth";

const schema = z.object({ password: z.string().min(1).max(200) });

export async function POST(request: Request) {
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success || !(await verifyClinicPassword(parsed.data.password))) {
      return Response.json({ error: "كلمة السر غير صحيحة." }, { status: 401 });
    }
    const token = await createClinicSessionToken();
    (await cookies()).set(CLINIC_SESSION_COOKIE, token, clinicSessionCookieOptions);
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "تعذّر تسجيل الدخول." }, { status: 500 });
  }
}
