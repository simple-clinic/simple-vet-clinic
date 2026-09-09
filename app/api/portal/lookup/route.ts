import { z } from "zod";
import { getD1 } from "@/db";
import { normalizeIraqiPhone } from "@/lib/phone";
import { petPhotoUrl } from "@/lib/pet-photo";
import { readClinicSettings } from "@/lib/clinic-settings";

export const dynamic = "force-dynamic";

const lookupSchema = z.object({
  phone: z.string().trim().min(8).max(30),
  petName: z.string().trim().min(1).max(100),
});

type PortalPatient = {
  id: string;
  name: string;
  species: string;
  breed: string;
  sex: string;
  age_value: number | null;
  age_unit: string;
  color: string;
  photo_key: string | null;
  owner_name: string;
};

type PreventionRow = {
  kind: string;
  title: string;
  current_status: string;
  given_date: string | null;
  due_date: string | null;
  product: string;
  created_at: string;
};

export async function POST(request: Request) {
  try {
    const parsed = lookupSchema.safeParse(await request.json());
    if (!parsed.success) {
      return Response.json({ error: "أدخل رقم الهاتف واسم الحيوان بصورة صحيحة." }, { status: 400 });
    }

    const db = getD1();
    const phone = normalizeIraqiPhone(parsed.data.phone);
    const patient = await db
      .prepare(
        `SELECT p.id, p.name, p.species, p.breed, p.sex, p.age_value, p.age_unit, p.color, p.photo_key, o.name AS owner_name
         FROM patients p JOIN owners o ON o.id = p.owner_id
         WHERE o.phone_normalized = ? AND lower(trim(p.name)) = lower(trim(?)) AND p.active = 1
         LIMIT 1`,
      )
      .bind(phone, parsed.data.petName)
      .first<PortalPatient>();

    if (!patient) {
      return Response.json(
        { error: "لم نجد ملفاً مطابقاً. تأكد من رقم الهاتف واسم الحيوان المسجلين في العيادة." },
        { status: 404 },
      );
    }

    const [result, settings] = await Promise.all([db
      .prepare(
        `SELECT kind, title, current_status, given_date, due_date, product, created_at
         FROM preventive_records
         WHERE patient_id = ?
           AND ((given_date IS NOT NULL AND trim(given_date) != '') OR (due_date IS NOT NULL AND trim(due_date) != ''))
           AND kind IN ('core_vaccine', 'vaccine', 'rabies', 'fungal_vaccine', 'deworming', 'ectoparasite')
         ORDER BY created_at DESC, id DESC`,
      )
      .bind(patient.id)
      .all<PreventionRow>(), readClinicSettings()]);

    const latest = new Map<string, PreventionRow>();
    for (const record of result.results ?? []) {
      const kind = record.kind === "vaccine" ? "core_vaccine" : record.kind;
      if (!latest.has(kind)) latest.set(kind, { ...record, kind });
    }

    type VisitRow = { id: string; visit_type: string; chief_complaint: string; history: string; grooming_details_json: string; diagnosis: string; treatment_plan: string; followup_date: string | null; created_at: string };
    const visits: Array<Record<string, unknown>> = [];
    if (settings.portalShowVisits) {
      const rows = await db.prepare("SELECT id, visit_type, chief_complaint, history, grooming_details_json, diagnosis, treatment_plan, followup_date, created_at FROM visits WHERE patient_id = ? ORDER BY created_at DESC, id DESC LIMIT 20").bind(patient.id).all<VisitRow>();
      for (const visit of rows.results ?? []) {
        const item: Record<string, unknown> = { id: visit.id, visitType: visit.visit_type, date: visit.created_at };
        if (settings.portalShowComplaint) item.complaint = visit.chief_complaint;
        if (settings.portalShowHistory) item.history = visit.history;
        if (settings.portalShowDiagnosis) item.diagnosis = visit.diagnosis;
        if (settings.portalShowTreatment) item.treatment = visit.treatment_plan;
        if (settings.portalShowFollowup) item.followupDate = visit.followup_date;
        if (settings.portalShowGrooming) {
          try { item.grooming = JSON.parse(visit.grooming_details_json || "{}"); } catch { item.grooming = {}; }
        }
        if (settings.portalShowMedications) item.medications = (await db.prepare("SELECT name, dose, route, frequency, duration, instructions FROM medications WHERE visit_id = ? ORDER BY name").bind(visit.id).all()).results ?? [];
        if (settings.portalShowProcedures) item.procedures = (await db.prepare("SELECT category, procedure_type, procedure_date, anesthesia, details, notes FROM procedures WHERE visit_id = ? ORDER BY created_at").bind(visit.id).all()).results ?? [];
        if (settings.portalShowDiagnostics) item.diagnostics = (await db.prepare("SELECT category, title, results_json, interpretation, notes FROM diagnostics WHERE visit_id = ? ORDER BY created_at").bind(visit.id).all()).results ?? [];
        if (settings.portalShowFindings) item.findings = (await db.prepare("SELECT system_label, selected_signs, notes FROM system_findings WHERE visit_id = ? ORDER BY system_label").bind(visit.id).all()).results ?? [];
        visits.push(item);
      }
    }

    return Response.json({
      patient: {
        name: patient.name,
        species: patient.species,
        breed: patient.breed,
        sex: patient.sex,
        ageValue: patient.age_value,
        ageUnit: patient.age_unit,
        color: patient.color,
        photoUrl: petPhotoUrl(patient.photo_key),
        ownerName: patient.owner_name,
      },
      prevention: Array.from(latest.values()),
      visits,
      privacy: visits.length ? "تظهر المعلومات التي سمحت العيادة بعرضها فقط. تبقى الملاحظات الداخلية والتكاليف مخفية." : "تظهر هنا بيانات الحيوان الأساسية ومواعيد الوقاية فقط.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "تعذّر فتح ملف الحيوان الآن.";
    return Response.json({ error: message }, { status: 500 });
  }
}
