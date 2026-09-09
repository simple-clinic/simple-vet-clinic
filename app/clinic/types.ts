export type PatientSummary = {
  id: string;
  record_number: number | null;
  patient_name: string;
  species: string;
  breed: string;
  sex: string;
  age_value: number | null;
  age_unit: string;
  color: string;
  weight_kg: number | null;
  drug_allergies: string;
  photo_key: string | null;
  owner_name: string;
  phone: string;
  governorate: string;
  area: string;
  chief_complaint: string | null;
  last_visit_at: string;
  visit_count: number;
};

export type ArchivedPatientSummary = PatientSummary & {
  record_status: "archived" | "deceased" | string;
  archived_at: string | null;
};

export type Reminder = {
  id: string;
  patient_id: string;
  kind: string;
  title: string;
  due_date: string | null;
  status: string;
  owner_visible: number;
  sent_at: string | null;
  patient_name: string;
  owner_name: string;
  phone: string;
};

export type InventoryAlert = {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  low_stock_threshold: number;
  expiry_date: string | null;
};

export type DashboardData = {
  user: { displayName: string; email: string };
  patients: PatientSummary[];
  archivedPatients: ArchivedPatientSummary[];
  reminders: Reminder[];
  inventoryAlerts: InventoryAlert[];
  stats: {
    patient_count: number;
    owner_count: number;
    today_visits: number;
    due_count: number;
  };
};

export type PatientDetail = {
  patient: Record<string, unknown>;
  visits: Array<Record<string, unknown>>;
  systemFindings: Array<Record<string, unknown>>;
  medications: Array<Record<string, unknown>>;
  preventiveRecords: Array<Record<string, unknown>>;
  procedures: Array<Record<string, unknown>>;
  diagnostics: Array<Record<string, unknown>>;
  diagnosticImages?: Array<Record<string, unknown>>;
};

export type FinanceData = {
  month: string;
  summary: {
    visitRevenue: number;
    procedureRevenue: number;
    diagnosticRevenue: number;
    storeRevenue: number;
    boardingRevenue: number;
    totalRevenue: number;
    visitCount: number;
    procedureCount: number;
    saleCount: number;
  };
  rows: Array<{
    id: string;
    service_date: string;
    source: "visit" | "procedure" | "diagnostic" | "store" | "boarding";
    category: string;
    service: string;
    amount: number;
    patient_name: string;
    owner_name: string;
  }>;
};
