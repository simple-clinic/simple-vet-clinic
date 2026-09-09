import { sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const owners = sqliteTable(
  "owners",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    phone: text("phone").notNull(),
    phoneNormalized: text("phone_normalized").notNull(),
    email: text("email").notNull().default(""),
    governorate: text("governorate").notNull().default(""),
    area: text("area").notNull().default(""),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("owners_phone_idx").on(table.phoneNormalized)],
);

export const patients = sqliteTable(
  "patients",
  {
    id: text("id").primaryKey(),
    recordNumber: integer("record_number"),
    ownerId: text("owner_id")
      .notNull()
      .references(() => owners.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    species: text("species").notNull(),
    breed: text("breed").notNull().default(""),
    sex: text("sex").notNull().default("غير محدد"),
    ageValue: integer("age_value"),
    ageUnit: text("age_unit").notNull().default("سنة"),
    birthDate: text("birth_date"),
    color: text("color").notNull().default(""),
    weightKg: real("weight_kg"),
    microchip: text("microchip").notNull().default(""),
    reproductiveStatus: text("reproductive_status").notNull().default("غير محدد"),
    drugAllergies: text("drug_allergies").notNull().default("لا توجد حساسية معروفة"),
    sensitivityNotes: text("sensitivity_notes").notNull().default(""),
    photoKey: text("photo_key"),
    photoContentType: text("photo_content_type"),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    recordStatus: text("record_status").notNull().default("active"),
    archivedAt: text("archived_at"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("patients_owner_idx").on(table.ownerId),
    index("patients_name_idx").on(table.name),
    index("patients_species_idx").on(table.species),
  ],
);

export const visits = sqliteTable(
  "visits",
  {
    id: text("id").primaryKey(),
    patientId: text("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    visitType: text("visit_type").notNull().default("sick_visit"),
    chiefComplaint: text("chief_complaint").notNull(),
    history: text("history").notNull().default(""),
    historyDetailsJson: text("history_details_json").notNull().default("{}"),
    groomingDetailsJson: text("grooming_details_json").notNull().default("{}"),
    temperatureC: real("temperature_c"),
    heartRate: integer("heart_rate"),
    respiratoryRate: integer("respiratory_rate"),
    weightKg: real("weight_kg"),
    diagnosis: text("diagnosis").notNull().default(""),
    differentials: text("differentials").notNull().default(""),
    treatmentPlan: text("treatment_plan").notNull().default(""),
    internalNotes: text("internal_notes").notNull().default(""),
    followupDate: text("followup_date"),
    costIqd: integer("cost_iqd").notNull().default(0),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("visits_patient_idx").on(table.patientId)],
);

export const systemFindings = sqliteTable(
  "system_findings",
  {
    id: text("id").primaryKey(),
    visitId: text("visit_id")
      .notNull()
      .references(() => visits.id, { onDelete: "cascade" }),
    systemKey: text("system_key").notNull(),
    systemLabel: text("system_label").notNull(),
    selectedSigns: text("selected_signs").notNull().default("[]"),
    notes: text("notes").notNull().default(""),
  },
  (table) => [index("system_findings_visit_idx").on(table.visitId)],
);

export const medications = sqliteTable(
  "medications",
  {
    id: text("id").primaryKey(),
    visitId: text("visit_id")
      .notNull()
      .references(() => visits.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    dose: text("dose").notNull().default(""),
    route: text("route").notNull().default(""),
    frequency: text("frequency").notNull().default(""),
    duration: text("duration").notNull().default(""),
    instructions: text("instructions").notNull().default(""),
    ownerVisible: integer("owner_visible", { mode: "boolean" }).notNull().default(false),
  },
  (table) => [index("medications_visit_idx").on(table.visitId)],
);

export const preventiveRecords = sqliteTable(
  "preventive_records",
  {
    id: text("id").primaryKey(),
    patientId: text("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    visitId: text("visit_id").references(() => visits.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    title: text("title").notNull(),
    currentStatus: text("current_status").notNull().default("unknown"),
    givenDate: text("given_date"),
    dueDate: text("due_date"),
    product: text("product").notNull().default(""),
    batchNumber: text("batch_number").notNull().default(""),
    notes: text("notes").notNull().default(""),
    status: text("status").notNull().default("pending"),
    ownerVisible: integer("owner_visible", { mode: "boolean" }).notNull().default(true),
    inventoryItemId: text("inventory_item_id"),
    inventoryQuantity: integer("inventory_quantity").notNull().default(1),
    sentAt: text("sent_at"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("preventive_patient_idx").on(table.patientId),
    index("preventive_visit_idx").on(table.visitId),
    index("preventive_due_idx").on(table.dueDate),
  ],
);

export const procedures = sqliteTable(
  "procedures",
  {
    id: text("id").primaryKey(),
    visitId: text("visit_id")
      .notNull()
      .references(() => visits.id, { onDelete: "cascade" }),
    category: text("category").notNull(),
    procedureType: text("procedure_type").notNull(),
    procedureDate: text("procedure_date"),
    anesthesia: text("anesthesia").notNull().default(""),
    details: text("details").notNull().default(""),
    costIqd: integer("cost_iqd").notNull().default(0),
    notes: text("notes").notNull().default(""),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("procedures_visit_idx").on(table.visitId)],
);

export const diagnostics = sqliteTable(
  "diagnostics",
  {
    id: text("id").primaryKey(),
    visitId: text("visit_id")
      .notNull()
      .references(() => visits.id, { onDelete: "cascade" }),
    category: text("category").notNull(),
    title: text("title").notNull(),
    resultsJson: text("results_json").notNull().default("[]"),
    interpretation: text("interpretation").notNull().default(""),
    notes: text("notes").notNull().default(""),
    costIqd: integer("cost_iqd").notNull().default(0),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("diagnostics_visit_idx").on(table.visitId)],
);

export const diagnosticImages = sqliteTable(
  "diagnostic_images",
  {
    id: text("id").primaryKey(),
    diagnosticId: text("diagnostic_id")
      .notNull()
      .references(() => diagnostics.id, { onDelete: "cascade" }),
    objectKey: text("object_key").notNull(),
    contentType: text("content_type").notNull(),
    fileName: text("file_name").notNull().default(""),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("diagnostic_images_diagnostic_idx").on(table.diagnosticId)],
);

export const inventoryItems = sqliteTable(
  "inventory_items",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    category: text("category").notNull(),
    unit: text("unit").notNull().default("قطعة"),
    sku: text("sku").notNull().default(""),
    quantity: integer("quantity").notNull().default(0),
    lowStockThreshold: integer("low_stock_threshold").notNull().default(1),
    wholesalePriceIqd: integer("wholesale_price_iqd").notNull().default(0),
    retailPriceIqd: integer("retail_price_iqd").notNull().default(0),
    expiryDate: text("expiry_date"),
    notes: text("notes").notNull().default(""),
    photoKey: text("photo_key"),
    photoContentType: text("photo_content_type"),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("inventory_category_idx").on(table.category),
    index("inventory_name_idx").on(table.name),
  ],
);

export const inventoryMovements = sqliteTable(
  "inventory_movements",
  {
    id: text("id").primaryKey(),
    itemId: text("item_id")
      .notNull()
      .references(() => inventoryItems.id, { onDelete: "cascade" }),
    movementType: text("movement_type").notNull(),
    quantityDelta: integer("quantity_delta").notNull(),
    unitCostIqd: integer("unit_cost_iqd").notNull().default(0),
    notes: text("notes").notNull().default(""),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("inventory_movements_item_idx").on(table.itemId)],
);

export const inventorySales = sqliteTable(
  "inventory_sales",
  {
    id: text("id").primaryKey(),
    itemId: text("item_id")
      .notNull()
      .references(() => inventoryItems.id, { onDelete: "restrict" }),
    patientId: text("patient_id").references(() => patients.id, { onDelete: "set null" }),
    quantity: integer("quantity").notNull(),
    unitWholesaleIqd: integer("unit_wholesale_iqd").notNull().default(0),
    unitPriceIqd: integer("unit_price_iqd").notNull(),
    totalIqd: integer("total_iqd").notNull(),
    costTotalIqd: integer("cost_total_iqd").notNull().default(0),
    buyerName: text("buyer_name").notNull().default(""),
    notes: text("notes").notNull().default(""),
    soldAt: text("sold_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("inventory_sales_item_idx").on(table.itemId),
    index("inventory_sales_date_idx").on(table.soldAt),
  ],
);

export const boardingStays = sqliteTable(
  "boarding_stays",
  {
    id: text("id").primaryKey(),
    cageNumber: integer("cage_number").notNull(),
    patientId: text("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    stayType: text("stay_type").notNull(),
    checkInDate: text("check_in_date").notNull(),
    expectedCheckoutDate: text("expected_checkout_date"),
    numberOfDays: integer("number_of_days").notNull().default(1),
    dailyRateIqd: integer("daily_rate_iqd").notNull().default(0),
    totalIqd: integer("total_iqd").notNull().default(0),
    paidIqd: integer("paid_iqd").notNull().default(0),
    status: text("status").notNull().default("active"),
    medicalSigns: text("medical_signs").notNull().default(""),
    diagnosis: text("diagnosis").notNull().default(""),
    treatmentPlan: text("treatment_plan").notNull().default(""),
    careInstructions: text("care_instructions").notNull().default(""),
    notes: text("notes").notNull().default(""),
    checkedOutAt: text("checked_out_at"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("boarding_cage_idx").on(table.cageNumber),
    index("boarding_patient_idx").on(table.patientId),
    index("boarding_status_idx").on(table.status),
  ],
);

export const boardingUpdates = sqliteTable(
  "boarding_updates",
  {
    id: text("id").primaryKey(),
    stayId: text("stay_id")
      .notNull()
      .references(() => boardingStays.id, { onDelete: "cascade" }),
    updateDate: text("update_date").notNull(),
    temperatureC: real("temperature_c"),
    appetite: text("appetite").notNull().default(""),
    urination: text("urination").notNull().default(""),
    defecation: text("defecation").notNull().default(""),
    medications: text("medications").notNull().default(""),
    notes: text("notes").notNull().default(""),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("boarding_updates_stay_idx").on(table.stayId)],
);

export const boardingPayments = sqliteTable(
  "boarding_payments",
  {
    id: text("id").primaryKey(),
    stayId: text("stay_id")
      .notNull()
      .references(() => boardingStays.id, { onDelete: "cascade" }),
    amountIqd: integer("amount_iqd").notNull(),
    notes: text("notes").notNull().default(""),
    paidAt: text("paid_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("boarding_payments_stay_idx").on(table.stayId)],
);

export const externalServices = sqliteTable("external_services", {
  id: text("id").primaryKey(),
  serviceType: text("service_type").notNull(),
  description: text("description").notNull().default(""),
  amountIqd: integer("amount_iqd").notNull().default(0),
  serviceDate: text("service_date").notNull().default(sql`(date('now'))`),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const clinicSettings = sqliteTable("clinic_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull().default(""),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
