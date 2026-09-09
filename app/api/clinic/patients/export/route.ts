import { getD1 } from "@/db";
import { authorizeClinicRequest } from "@/lib/clinic-auth";

export const dynamic = "force-dynamic";

type PatientExportRow = {
  id: string;
  owner_name: string;
  patient_name: string;
  weight_kg: number | null;
  phone: string;
};

export async function GET() {
  const auth = await authorizeClinicRequest();
  if (!auth.ok) {
    return Response.json({ error: auth.message }, { status: auth.status });
  }

  try {
    const result = await getD1()
      .prepare(
        `SELECT
          p.id,
          o.name AS owner_name,
          p.name AS patient_name,
          COALESCE(
            (
              SELECT v.weight_kg
              FROM visits v
              WHERE v.patient_id = p.id AND v.weight_kg IS NOT NULL
              ORDER BY v.created_at DESC, v.id DESC
              LIMIT 1
            ),
            p.weight_kg
          ) AS weight_kg,
          o.phone
        FROM patients p
        JOIN owners o ON o.id = p.owner_id
        WHERE p.active = 1
        ORDER BY COALESCE(p.record_number, 2147483647) ASC, p.created_at ASC`,
      )
      .all<PatientExportRow>();

    return Response.json({ patients: result.results ?? [] });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "تعذّر تحضير قائمة الحالات.";
    return Response.json({ error: message }, { status: 500 });
  }
}
