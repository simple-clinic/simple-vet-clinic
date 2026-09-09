import { z } from "zod";
import {
  authorizeClinicRequest,
  changeClinicPassword,
} from "@/lib/clinic-auth";
import {
  CLINIC_SECTIONS,
  defaultClinicSettings,
  readClinicSettings,
  writeClinicSettings,
} from "@/lib/clinic-settings";

export const dynamic = "force-dynamic";

const color = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const settingsSchema = z.object({
  clinicName: z.string().trim().min(1).max(80),
  portalEyebrow: z.string().trim().max(80),
  portalTitle: z.string().trim().min(1).max(120),
  portalDescription: z.string().trim().max(300),
  portalPrimary: color,
  portalAccent: color,
  portalBackground: color,
  portalBannerEnabled: z.boolean(),
  portalBannerTitle: z.string().trim().max(120),
  portalBannerBody: z.string().trim().max(500),
  portalBannerImageKey: z.string().max(200),
  portalBannerImageKeys: z.array(z.string().max(200)).max(12),
  portalShowVisits: z.boolean(),
  portalShowComplaint: z.boolean(),
  portalShowHistory: z.boolean(),
  portalShowFindings: z.boolean(),
  portalShowDiagnosis: z.boolean(),
  portalShowTreatment: z.boolean(),
  portalShowMedications: z.boolean(),
  portalShowProcedures: z.boolean(),
  portalShowDiagnostics: z.boolean(),
  portalShowGrooming: z.boolean(),
  portalShowFollowup: z.boolean(),
  portalFooterText: z.string().trim().max(200),
  clinicPhone: z.string().trim().max(30),
  clinicAddress: z.string().trim().max(200),
  clinicMapsUrl: z.string().trim().max(500),
  clinicInstagramUrl: z.string().trim().max(500),
  clinicFacebookUrl: z.string().trim().max(500),
  clinicTikTokUrl: z.string().trim().max(500),
  ambientEffect: z.enum([
    "none",
    "snow",
    "rain",
    "autumn",
    "spring",
    "ramadan",
    "christmas",
  ]),
  ambientPortalEnabled: z.boolean(),
  ambientAdminEnabled: z.boolean(),
  ambientDensity: z.number().int().min(4).max(60),
  ambientSpeed: z.number().min(4).max(30),
  ambientOpacity: z.number().min(0.1).max(1),
  portalLogoKey: z.string().max(200),
  adminLogoKey: z.string().max(200),
  adminPrimary: color,
  adminSidebar: color,
  adminAccent: color,
  adminAnimations: z.boolean(),
  sectionLabels: z.record(z.string(), z.string().trim().min(1).max(60)),
  sectionVisibility: z.record(z.string(), z.boolean()),
  customSections: z
    .array(
      z.object({
        id: z.string().min(1).max(80),
        title: z.string().trim().min(1).max(60),
        content: z.string().trim().max(1000),
      }),
    )
    .max(12),
});

export async function GET() {
  const auth = await authorizeClinicRequest();
  if (!auth.ok)
    return Response.json({ error: auth.message }, { status: auth.status });
  return Response.json(await readClinicSettings());
}

export async function PATCH(request: Request) {
  const auth = await authorizeClinicRequest();
  if (!auth.ok)
    return Response.json({ error: auth.message }, { status: auth.status });
  try {
    const body = await request.json();
    const parsed = settingsSchema.safeParse(body.settings);
    if (!parsed.success)
      return Response.json(
        { error: "تحقق من قيم الإعدادات." },
        { status: 400 },
      );
    const settings = { ...defaultClinicSettings, ...parsed.data };
    settings.sectionLabels = {
      ...defaultClinicSettings.sectionLabels,
      ...parsed.data.sectionLabels,
    };
    settings.sectionVisibility = {
      ...defaultClinicSettings.sectionVisibility,
      ...parsed.data.sectionVisibility,
      settings: true,
    };
    for (const id of CLINIC_SECTIONS)
      if (!settings.sectionLabels[id])
        settings.sectionLabels[id] = defaultClinicSettings.sectionLabels[id];
    await writeClinicSettings(settings);
    if (body.currentPassword || body.newPassword) {
      if (
        typeof body.currentPassword !== "string" ||
        typeof body.newPassword !== "string" ||
        body.newPassword.length < 6
      ) {
        return Response.json(
          { error: "كلمة السر الجديدة يجب أن تكون 6 أحرف على الأقل." },
          { status: 400 },
        );
      }
      await changeClinicPassword(body.currentPassword, body.newPassword);
    }
    return Response.json({ ok: true, settings, message: "تم حفظ الإعدادات." });
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "تعذّر حفظ الإعدادات.",
      },
      { status: 500 },
    );
  }
}
