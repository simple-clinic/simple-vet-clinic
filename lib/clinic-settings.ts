import { getD1 } from "@/db";
import {
  defaultClinicSettings,
  type ClinicSettings,
} from "@/lib/clinic-settings-shared";
export {
  CLINIC_SECTIONS,
  defaultClinicSettings,
} from "@/lib/clinic-settings-shared";
export type {
  ClinicSection,
  ClinicSettings,
} from "@/lib/clinic-settings-shared";

const booleanKeys = new Set([
  "portalBannerEnabled",
  "portalShowVisits",
  "portalShowComplaint",
  "portalShowHistory",
  "portalShowFindings",
  "portalShowDiagnosis",
  "portalShowTreatment",
  "portalShowMedications",
  "portalShowProcedures",
  "portalShowDiagnostics",
  "portalShowGrooming",
  "portalShowFollowup",
  "adminAnimations",
  "ambientPortalEnabled",
  "ambientAdminEnabled",
]);
const numberKeys = new Set([
  "ambientDensity",
  "ambientSpeed",
  "ambientOpacity",
]);
const jsonKeys = new Set([
  "sectionLabels",
  "sectionVisibility",
  "customSections",
  "portalBannerImageKeys",
]);

export async function readClinicSettings(): Promise<ClinicSettings> {
  try {
    const rows = await getD1()
      .prepare("SELECT key, value FROM clinic_settings")
      .all<{ key: string; value: string }>();
    const settings = structuredClone(defaultClinicSettings);
    for (const row of rows.results ?? []) {
      if (!(row.key in settings)) continue;
      if (booleanKeys.has(row.key))
        (settings as unknown as Record<string, unknown>)[row.key] =
          row.value === "true";
      else if (numberKeys.has(row.key))
        (settings as unknown as Record<string, unknown>)[row.key] = Number(
          row.value,
        );
      else if (jsonKeys.has(row.key)) {
        try {
          const parsed = JSON.parse(row.value);
          (settings as unknown as Record<string, unknown>)[row.key] =
            Array.isArray(parsed)
              ? parsed
              : {
                  ...((settings as unknown as Record<string, unknown>)[
                    row.key
                  ] as object),
                  ...parsed,
                };
        } catch {
          /* keep defaults */
        }
      } else
        (settings as unknown as Record<string, unknown>)[row.key] = row.value;
    }
    settings.sectionVisibility.settings = true;
    return settings;
  } catch {
    return structuredClone(defaultClinicSettings);
  }
}

export async function writeClinicSettings(settings: ClinicSettings) {
  const db = getD1();
  const statements = Object.entries(settings).map(([key, value]) =>
    db
      .prepare(
        "INSERT INTO clinic_settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=CURRENT_TIMESTAMP",
      )
      .bind(
        key,
        typeof value === "object" ? JSON.stringify(value) : String(value),
      ),
  );
  await db.batch(statements);
}

export function publicLogoUrl(
  target: "portal" | "admin" | "banner",
  key: string,
) {
  return key ? `/api/branding/${target}` : null;
}
