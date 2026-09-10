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
  clinicPhone: "07712202592",
  clinicAddress: "بغداد - الأعظمية",
  clinicMapsUrl: "https://www.google.com/maps/place//@33.3720093,44.3777352,17z/data=!4m6!1m5!3m4!2zMzPCsDIyJzE5LjIiTiA0NMKwMjInNDkuMSJF!8m2!3d33.3720093!4d44.3803101?hl=en&entry=ttu&g_ep=EgoyMDI2MDkwNi4wIKXMDSoASAFQAw%3D%3D",
  clinicInstagramUrl: "https://www.instagram.com/simple.vet.clinic",
  clinicFacebookUrl: "",
  clinicTikTokUrl: "https://www.tiktok.com/@simple.clinic",
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
