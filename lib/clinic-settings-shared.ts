export const CLINIC_SECTIONS = [
  "overview",
  "records",
  "archive",
  "reminders",
  "inventory",
  "boarding",
  "finance",
  "settings",
] as const;
export type ClinicSection = (typeof CLINIC_SECTIONS)[number];

export type ClinicSettings = {
  clinicName: string;
  portalEyebrow: string;
  portalTitle: string;
  portalDescription: string;
  portalPrimary: string;
  portalAccent: string;
  portalBackground: string;
  portalBannerEnabled: boolean;
  portalBannerTitle: string;
  portalBannerBody: string;
  portalBannerImageKey: string;
  portalBannerImageKeys: string[];
  portalShowVisits: boolean;
  portalShowComplaint: boolean;
  portalShowHistory: boolean;
  portalShowFindings: boolean;
  portalShowDiagnosis: boolean;
  portalShowTreatment: boolean;
  portalShowMedications: boolean;
  portalShowProcedures: boolean;
  portalShowDiagnostics: boolean;
  portalShowGrooming: boolean;
  portalShowFollowup: boolean;
  portalFooterText: string;
  clinicPhone: string;
  clinicAddress: string;
  clinicMapsUrl: string;
  clinicInstagramUrl: string;
  clinicFacebookUrl: string;
  clinicTikTokUrl: string;
  ambientEffect: string;
  ambientPortalEnabled: boolean;
  ambientAdminEnabled: boolean;
  ambientDensity: number;
  ambientSpeed: number;
  ambientOpacity: number;
  portalLogoKey: string;
  adminLogoKey: string;
  adminPrimary: string;
  adminSidebar: string;
  adminAccent: string;
  adminAnimations: boolean;
  sectionLabels: Record<ClinicSection, string>;
  sectionVisibility: Record<ClinicSection, boolean>;
  customSections: Array<{ id: string; title: string; content: string }>;
};

export const defaultClinicSettings: ClinicSettings = {
  clinicName: "Simple Vet Clinic",
  portalEyebrow: "بوابة المربي",
  portalTitle: "افتح بطاقة حيوانك",
  portalDescription: "أدخل رقم الهاتف واسم الحيوان كما سجّلتهما العيادة.",
  portalPrimary: "#5b4bdb",
  portalAccent: "#55d6be",
  portalBackground: "#f5f7ff",
  portalBannerEnabled: false,
  portalBannerTitle: "",
  portalBannerBody: "",
  portalBannerImageKey: "",
  portalBannerImageKeys: [],
  portalShowVisits: false,
  portalShowComplaint: false,
  portalShowHistory: false,
  portalShowFindings: false,
  portalShowDiagnosis: false,
  portalShowTreatment: false,
  portalShowMedications: false,
  portalShowProcedures: false,
  portalShowDiagnostics: false,
  portalShowGrooming: false,
  portalShowFollowup: false,
  portalFooterText: "الحقوق محفوظة لـ Simple Vet Clinic 2026",
  clinicPhone: "",
  clinicAddress: "",
  clinicMapsUrl: "",
  clinicInstagramUrl: "",
  clinicFacebookUrl: "",
  clinicTikTokUrl: "",
  ambientEffect: "none",
  ambientPortalEnabled: false,
  ambientAdminEnabled: false,
  ambientDensity: 18,
  ambientSpeed: 12,
  ambientOpacity: 0.45,
  portalLogoKey: "",
  adminLogoKey: "",
  adminPrimary: "#2563eb",
  adminSidebar: "#111b3a",
  adminAccent: "#56d6c9",
  adminAnimations: true,
  sectionLabels: {
    overview: "نظرة عامة",
    records: "سجلات الحيوانات",
    archive: "أرشيف الحالات",
    reminders: "التذكيرات",
    inventory: "المخزن والمبيعات",
    boarding: "المبيت والأقفاص",
    finance: "الوارد الشهري",
    settings: "الإعدادات",
  },
  sectionVisibility: {
    overview: true,
    records: true,
    archive: true,
    reminders: true,
    inventory: true,
    boarding: true,
    finance: true,
    settings: true,
  },
  customSections: [],
};
