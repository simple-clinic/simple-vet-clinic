import { z } from "zod";

const optionalNumber = z.union([z.number(), z.null()]).optional();

const medicalHistoryDefaults = {
  symptomOnset: "",
  appetite: "غير مسجل",
  waterIntake: "غير مسجل",
  foodDetails: "",
  vomiting: "غير مسجل",
  urination: "غير مسجل",
  defecation: "غير مسجل",
  salivation: "غير مسجل",
  previousDiseases: "",
  medicationsGiven: "",
  generalCondition: "غير مسجل",
  bodyCondition: "غير مسجل",
  dehydration: "غير مسجل",
};

const medicalHistorySchema = z.object({
  symptomOnset: z.string().trim().max(300).default(""),
  appetite: z.string().trim().max(100).default("غير مسجل"),
  waterIntake: z.string().trim().max(100).default("غير مسجل"),
  foodDetails: z.string().trim().max(500).default(""),
  vomiting: z.string().trim().max(150).default("غير مسجل"),
  urination: z.string().trim().max(150).default("غير مسجل"),
  defecation: z.string().trim().max(150).default("غير مسجل"),
  salivation: z.string().trim().max(100).default("غير مسجل"),
  previousDiseases: z.string().trim().max(1500).default(""),
  medicationsGiven: z.string().trim().max(1500).default(""),
  generalCondition: z.string().trim().max(100).default("غير مسجل"),
  bodyCondition: z.string().trim().max(100).default("غير مسجل"),
  dehydration: z.string().trim().max(100).default("غير مسجل"),
});

const groomingDefaults = {
  services: [] as string[],
  sedation: "بدون تخدير",
  sedationDetails: "",
  notes: "",
};

const groomingSchema = z.object({
  services: z.array(z.string().trim().min(1).max(120)).max(12).default([]),
  sedation: z.string().trim().max(100).default("بدون تخدير"),
  sedationDetails: z.string().trim().max(1000).default(""),
  notes: z.string().trim().max(1500).default(""),
});

export const visitCoreSchema = z.object({
  visitType: z
    .enum(["sick_visit", "routine", "preventive", "surgery", "dental", "diagnostics", "emergency", "grooming"])
    .default("sick_visit"),
  chiefComplaint: z.string().trim().max(2000).default(""),
  history: z.string().trim().max(4000).default(""),
  medicalHistory: medicalHistorySchema.default(medicalHistoryDefaults),
  grooming: groomingSchema.default(groomingDefaults),
  temperatureC: optionalNumber,
  heartRate: z.number().int().min(0).max(1000).nullable().optional(),
  respiratoryRate: z.number().int().min(0).max(1000).nullable().optional(),
  weightKg: optionalNumber,
  diagnosis: z.string().trim().max(2000).default(""),
  differentials: z.string().trim().max(3000).default(""),
  treatmentPlan: z.string().trim().max(4000).default(""),
  internalNotes: z.string().trim().max(4000).default(""),
  followupDate: z.string().trim().max(20).nullable().optional(),
  costIqd: z.number().int().min(0).max(2_000_000_000).default(0),
});

export const systemFindingSchema = z.object({
  systemKey: z.string().trim().min(1).max(60),
  systemLabel: z.string().trim().min(1).max(100),
  selectedSigns: z.array(z.string().trim().max(120)).max(30),
  notes: z.string().trim().max(1500).default(""),
});

export const medicationSchema = z.object({
  name: z.string().trim().min(1).max(180),
  dose: z.string().trim().max(120).default(""),
  route: z.string().trim().max(120).default(""),
  frequency: z.string().trim().max(120).default(""),
  duration: z.string().trim().max(120).default(""),
  instructions: z.string().trim().max(1000).default(""),
  ownerVisible: z.boolean().default(false),
});

export const preventiveSchema = z.object({
  kind: z.enum([
    "core_vaccine",
    "vaccine",
    "rabies",
    "fungal_vaccine",
    "deworming",
    "ectoparasite",
    "treatment",
    "followup",
  ]),
  title: z.string().trim().min(1).max(180),
  currentStatus: z.enum(["yes", "no", "unknown"]).default("unknown"),
  givenDate: z.string().trim().max(20).nullable().optional(),
  dueDate: z.string().trim().max(20).nullable().optional(),
  product: z.string().trim().max(180).default(""),
  batchNumber: z.string().trim().max(120).default(""),
  notes: z.string().trim().max(1000).default(""),
  ownerVisible: z.boolean().default(true),
  inventoryItemId: z.string().uuid().nullable().optional(),
  inventoryQuantity: z.number().int().min(1).max(1000).default(1),
});

export const procedureSchema = z.object({
  category: z.string().trim().min(1).max(100),
  procedureType: z.string().trim().min(1).max(240),
  procedureDate: z.string().trim().max(20).nullable().optional(),
  anesthesia: z.string().trim().max(500).default(""),
  details: z.string().trim().max(4000).default(""),
  costIqd: z.number().int().min(0).max(2_000_000_000).default(0),
  notes: z.string().trim().max(2000).default(""),
});

export const diagnosticSchema = z.object({
  id: z.string().uuid().optional(),
  category: z.string().trim().min(1).max(100),
  title: z.string().trim().min(1).max(240),
  results: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(200),
        result: z.string().trim().max(200).default(""),
        unit: z.string().trim().max(80).default(""),
        referenceRange: z.string().trim().max(300).default(""),
        flag: z.enum(["normal", "high", "low", "unchecked"]).default("unchecked"),
      }),
    )
    .max(100)
    .default([]),
  interpretation: z.string().trim().max(5000).default(""),
  notes: z.string().trim().max(3000).default(""),
  costIqd: z.number().int().min(0).max(2_000_000_000).default(0),
});

export const visitBundleSchema = z.object({
  visit: visitCoreSchema,
  systemFindings: z.array(systemFindingSchema).max(20).default([]),
  medications: z.array(medicationSchema).max(30).default([]),
  preventiveRecords: z.array(preventiveSchema).max(30).default([]),
  procedures: z.array(procedureSchema).max(20).default([]),
  diagnostics: z.array(diagnosticSchema).max(30).default([]),
});

export type VisitBundle = z.infer<typeof visitBundleSchema>;

type D1Database = ReturnType<typeof import("@/db").getD1>;

export function buildVisitChildStatements(
  db: D1Database,
  patientId: string,
  visitId: string,
  data: VisitBundle,
) {
  const statements = [];

  for (const finding of data.systemFindings) {
    if (!finding.selectedSigns.length && !finding.notes) continue;
    statements.push(
      db
        .prepare(
          `INSERT INTO system_findings (id, visit_id, system_key, system_label, selected_signs, notes)
           VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          crypto.randomUUID(),
          visitId,
          finding.systemKey,
          finding.systemLabel,
          JSON.stringify(finding.selectedSigns),
          finding.notes,
        ),
    );
  }

  for (const medication of data.medications) {
    statements.push(
      db
        .prepare(
          `INSERT INTO medications (
            id, visit_id, name, dose, route, frequency, duration, instructions, owner_visible
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          crypto.randomUUID(),
          visitId,
          medication.name,
          medication.dose,
          medication.route,
          medication.frequency,
          medication.duration,
          medication.instructions,
          medication.ownerVisible ? 1 : 0,
        ),
    );
  }

  for (const record of data.preventiveRecords) {
    const preventiveId = crypto.randomUUID();
    statements.push(
      db
        .prepare(
          `INSERT INTO preventive_records (
            id, patient_id, visit_id, kind, title, current_status, given_date, due_date,
            product, batch_number, notes, status, owner_visible,
            inventory_item_id, inventory_quantity
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)`,
        )
        .bind(
          preventiveId,
          patientId,
          visitId,
          record.kind,
          record.title,
          record.currentStatus,
          record.givenDate || null,
          record.dueDate || null,
          record.product,
          record.batchNumber,
          record.notes,
          record.ownerVisible ? 1 : 0,
          record.inventoryItemId || null,
          record.inventoryItemId ? record.inventoryQuantity : 1,
        ),
    );
  }

  for (const procedure of data.procedures) {
    statements.push(
      db
        .prepare(
          `INSERT INTO procedures (
            id, visit_id, category, procedure_type, procedure_date, anesthesia,
            details, cost_iqd, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          crypto.randomUUID(),
          visitId,
          procedure.category,
          procedure.procedureType,
          procedure.procedureDate || null,
          procedure.anesthesia,
          procedure.details,
          procedure.costIqd,
          procedure.notes,
        ),
    );
  }

  for (const diagnostic of data.diagnostics) {
    statements.push(
      db
        .prepare(
          `INSERT INTO diagnostics (
            id, visit_id, category, title, results_json, interpretation, notes, cost_iqd
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          diagnostic.id ?? crypto.randomUUID(),
          visitId,
          diagnostic.category,
          diagnostic.title,
          JSON.stringify(diagnostic.results),
          diagnostic.interpretation,
          diagnostic.notes,
          diagnostic.costIqd,
        ),
    );
  }

  return statements;
}

export function buildVisitStatements(
  db: D1Database,
  patientId: string,
  data: VisitBundle,
  visitId = crypto.randomUUID(),
) {
  const complaint =
    data.visit.chiefComplaint ||
    (data.visit.visitType === "surgery"
      ? "إجراء عملية"
      : data.visit.visitType === "dental"
        ? "تنظيف وقلع أسنان"
      : data.visit.visitType === "grooming"
        ? data.visit.grooming.services.join("، ") || "حلاقة وغسل"
        : data.visit.visitType === "preventive" || data.visit.visitType === "routine" ? "فحص روتيني ووقائي" : "حالة مرضية");

  const statements = [
    db
      .prepare(
        `INSERT INTO visits (
          id, patient_id, visit_type, chief_complaint, history, history_details_json,
          grooming_details_json, temperature_c,
          heart_rate, respiratory_rate, weight_kg, diagnosis, differentials,
          treatment_plan, internal_notes, followup_date, cost_iqd
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        visitId,
        patientId,
        data.visit.visitType,
        complaint,
        data.visit.history,
        JSON.stringify(data.visit.medicalHistory),
        JSON.stringify(data.visit.grooming),
        data.visit.temperatureC ?? null,
        data.visit.heartRate ?? null,
        data.visit.respiratoryRate ?? null,
        data.visit.weightKg ?? null,
        data.visit.diagnosis,
        data.visit.differentials,
        data.visit.treatmentPlan,
        data.visit.internalNotes,
        data.visit.followupDate || null,
        data.visit.costIqd,
      ),
  ];

  statements.push(...buildVisitChildStatements(db, patientId, visitId, data));

  return { visitId, statements };
}
