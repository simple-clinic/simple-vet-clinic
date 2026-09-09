import { readClinicSettings } from "@/lib/clinic-settings";

export const dynamic = "force-dynamic";

export async function GET() {
  const settings = await readClinicSettings();
  return Response.json({
    clinicName: settings.clinicName,
    portalEyebrow: settings.portalEyebrow,
    portalTitle: settings.portalTitle,
    portalDescription: settings.portalDescription,
    portalPrimary: settings.portalPrimary,
    portalAccent: settings.portalAccent,
    portalBackground: settings.portalBackground,
    portalBannerEnabled: settings.portalBannerEnabled,
    portalBannerTitle: settings.portalBannerTitle,
    portalBannerBody: settings.portalBannerBody,
    portalBannerImageKey: settings.portalBannerImageKey,
    portalBannerImageKeys: settings.portalBannerImageKeys,
    portalShowVisits: settings.portalShowVisits,
    portalShowComplaint: settings.portalShowComplaint,
    portalShowHistory: settings.portalShowHistory,
    portalShowFindings: settings.portalShowFindings,
    portalShowDiagnosis: settings.portalShowDiagnosis,
    portalShowTreatment: settings.portalShowTreatment,
    portalShowMedications: settings.portalShowMedications,
    portalShowProcedures: settings.portalShowProcedures,
    portalShowDiagnostics: settings.portalShowDiagnostics,
    portalShowGrooming: settings.portalShowGrooming,
    portalShowFollowup: settings.portalShowFollowup,
    portalFooterText: settings.portalFooterText,
    clinicPhone: settings.clinicPhone,
    clinicAddress: settings.clinicAddress,
    clinicMapsUrl: settings.clinicMapsUrl,
    clinicInstagramUrl: settings.clinicInstagramUrl,
    clinicFacebookUrl: settings.clinicFacebookUrl,
    clinicTikTokUrl: settings.clinicTikTokUrl,
    ambientEffect: settings.ambientEffect,
    ambientPortalEnabled: settings.ambientPortalEnabled,
    ambientDensity: settings.ambientDensity,
    ambientSpeed: settings.ambientSpeed,
    ambientOpacity: settings.ambientOpacity,
    portalLogoKey: settings.portalLogoKey,
  });
}
