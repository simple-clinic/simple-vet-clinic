"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Activity, AlertTriangle, Beaker, BedDouble, ClipboardCopy, ClipboardList, FileDown, FileHeart,
  Loader2, MapPin, MessageCircle, PencilLine, Phone, Plus, Scissors, Send,
  Stethoscope, Syringe, Trash2, UserRound,
} from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { PREVENTIVE_TYPES } from "@/lib/clinical-data";
import { OWNER_PORTAL_URL, WHATSAPP_SOCIAL_LINKS } from "@/lib/clinic-links";
import { petPhotoUrl } from "@/lib/pet-photo";
import { whatsappNumber } from "@/lib/phone";
import { REMINDER_KIND_LABELS, speciesLabel } from "@/lib/vet-data";
import { cleanOwnerMessage } from "@/lib/message-format";
import type { PatientDetail } from "./types";
import type { VisitBundleClient } from "./visit-editor";
import type { VisitTarget } from "./visit-sheet";

type RecordDeleteTarget = { kind: "visit" | "medication" | "preventive" | "procedure" | "diagnostic"; id: string; label: string };
type ReportOptions = { complaint: boolean; diagnosis: boolean; treatment: boolean; medications: boolean; procedures: boolean; diagnostics: boolean; prevention: boolean; followup: boolean };
const defaultReportOptions: ReportOptions = { complaint: true, diagnosis: true, treatment: true, medications: true, procedures: true, diagnostics: true, prevention: true, followup: true };

const value = (input: unknown, fallback = "—") => input === null || input === undefined || input === "" ? fallback : String(input);
const yesNoLabel: Record<string, string> = { yes: "مأخوذة", no: "لم تؤخذ", unknown: "غير معلوم" };
const visitTypeLabel: Record<string, string> = {
  sick_visit: "حالة مرضية",
  emergency: "طوارئ",
  surgery: "عملية",
  dental: "تنظيف وقلع أسنان",
  routine: "فحص روتيني",
  preventive: "لقاح ووقاية",
  diagnostics: "تحاليل / أشعة / سونار",
  grooming: "حلاقة وغسل",
};

function formatDate(input: unknown, includeTime = false) {
  if (!input) return "—";
  const raw = String(input);
  const date = raw.includes("T") || raw.includes(" ") ? new Date(raw.replace(" ", "T") + (raw.endsWith("Z") ? "" : "Z")) : new Date(`${raw}T12:00:00`);
  if (Number.isNaN(date.getTime())) return raw;
  const numeric = `${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}`;
  if (!includeTime) return numeric;
  return `${numeric} ${date.toLocaleTimeString("ar-IQ", { hour: "numeric", minute: "2-digit" })}`;
}

function parsedArray(input: unknown) {
  try { const parsed = JSON.parse(String(input ?? "[]")); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
}

function parsedObject(input: unknown) {
  try { const parsed = JSON.parse(String(input ?? "{}")); return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {}; } catch { return {}; }
}

function byVisit(rows: Array<Record<string, unknown>>) {
  const map = new Map<string, Array<Record<string, unknown>>>();
  for (const row of rows) {
    const visitId = value(row.visit_id, "");
    map.set(visitId, [...(map.get(visitId) ?? []), row]);
  }
  return map;
}

function visitBundle(detail: PatientDetail, visit: Record<string, unknown>): VisitBundleClient {
  const visitId = value(visit.id, "");
  const num = (input: unknown) => input === null || input === undefined || input === "" ? null : Number(input);
  const medicalHistory = parsedObject(visit.history_details_json);
  const grooming = parsedObject(visit.grooming_details_json);
  return {
    visit: {
      visitType: (value(visit.visit_type, "sick_visit") as VisitBundleClient["visit"]["visitType"]),
      chiefComplaint: value(visit.chief_complaint, ""), history: value(visit.history, ""),
      medicalHistory: {
        symptomOnset: value(medicalHistory.symptomOnset, ""), appetite: value(medicalHistory.appetite, "غير مسجل"),
        waterIntake: value(medicalHistory.waterIntake, "غير مسجل"), foodDetails: value(medicalHistory.foodDetails, ""),
        vomiting: value(medicalHistory.vomiting, "غير مسجل"), urination: value(medicalHistory.urination, "غير مسجل"),
        defecation: value(medicalHistory.defecation, "غير مسجل"), salivation: value(medicalHistory.salivation, "غير مسجل"),
        previousDiseases: value(medicalHistory.previousDiseases, ""), medicationsGiven: value(medicalHistory.medicationsGiven, ""),
        generalCondition: value(medicalHistory.generalCondition, "غير مسجل"), bodyCondition: value(medicalHistory.bodyCondition, "غير مسجل"),
        dehydration: value(medicalHistory.dehydration, "غير مسجل"),
      },
      grooming: {
        services: Array.isArray(grooming.services) ? grooming.services.map(String) : [],
        sedation: value(grooming.sedation, "بدون تخدير"), sedationDetails: value(grooming.sedationDetails, ""), notes: value(grooming.notes, ""),
      },
      temperatureC: num(visit.temperature_c), heartRate: num(visit.heart_rate), respiratoryRate: num(visit.respiratory_rate), weightKg: num(visit.weight_kg),
      diagnosis: value(visit.diagnosis, ""), differentials: value(visit.differentials, ""), treatmentPlan: value(visit.treatment_plan, ""), internalNotes: value(visit.internal_notes, ""),
      followupDate: value(visit.followup_date, "") || null, costIqd: Number(visit.cost_iqd ?? 0),
    },
    systemFindings: detail.systemFindings.filter((row) => value(row.visit_id, "") === visitId).map((row) => ({ systemKey: value(row.system_key, ""), systemLabel: value(row.system_label, ""), selectedSigns: parsedArray(row.selected_signs).map(String), notes: value(row.notes, "") })),
    medications: detail.medications.filter((row) => value(row.visit_id, "") === visitId).map((row) => ({ name: value(row.name, ""), dose: value(row.dose, ""), route: value(row.route, ""), frequency: value(row.frequency, ""), duration: value(row.duration, ""), instructions: value(row.instructions, ""), ownerVisible: Boolean(row.owner_visible) })),
    preventiveRecords: detail.preventiveRecords.filter((row) => value(row.visit_id, "") === visitId).map((row) => ({ kind: value(row.kind, "core_vaccine") as VisitBundleClient["preventiveRecords"][number]["kind"], title: value(row.title, ""), currentStatus: value(row.current_status, "unknown") as "yes" | "no" | "unknown", givenDate: value(row.given_date, "") || null, dueDate: value(row.due_date, "") || null, product: value(row.product, ""), batchNumber: value(row.batch_number, ""), notes: value(row.notes, ""), ownerVisible: Boolean(row.owner_visible), inventoryItemId: value(row.inventory_item_id, "") || null, inventoryQuantity: Number(row.inventory_quantity || 1) })),
    procedures: detail.procedures.filter((row) => value(row.visit_id, "") === visitId).map((row) => ({ category: value(row.category, ""), procedureType: value(row.procedure_type, ""), procedureDate: value(row.procedure_date, "") || null, anesthesia: value(row.anesthesia, ""), details: value(row.details, ""), costIqd: Number(row.cost_iqd ?? 0), notes: value(row.notes, "") })),
    diagnostics: detail.diagnostics.filter((row) => value(row.visit_id, "") === visitId).map((row) => ({ id: value(row.id, ""), category: value(row.category, ""), title: value(row.title, ""), results: parsedArray(row.results_json) as VisitBundleClient["diagnostics"][number]["results"], interpretation: value(row.interpretation, ""), notes: value(row.notes, ""), costIqd: Number(row.cost_iqd ?? 0) })),
  };
}

export function PatientDetailSheet({
  patientId, refreshToken, onOpenChange, onAddVisit, onEditVisit, onEditPatient, onBoarding, onDeleted, onChanged,
}: {
  patientId: string | null;
  refreshToken: number;
  onOpenChange: (open: boolean) => void;
  onAddVisit: (target: VisitTarget) => void;
  onEditVisit: (target: VisitTarget) => void;
  onEditPatient: (patientId: string) => void;
  onBoarding: (target: { patientId: string; petName: string; species: string }) => void;
  onDeleted: () => void;
  onChanged: () => void;
}) {
  const [detail, setDetail] = useState<PatientDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteReason, setDeleteReason] = useState<"archived" | "deceased">("archived");
  const [deleting, setDeleting] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<RecordDeleteTarget | null>(null);
  const [deletingRecord, setDeletingRecord] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportVisitId, setReportVisitId] = useState("");
  const [reportOptions, setReportOptions] = useState<ReportOptions>(defaultReportOptions);
  const [reportNote, setReportNote] = useState("");

  async function archivePatient() {
    if (!patientId) return;
    setDeleting(true);
    try {
      const response = await fetch(`/api/clinic/patients/${patientId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: deleteReason }),
      });
      const result = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) throw new Error(result.error || "تعذّرت أرشفة الحالة.");
      toast.success(result.message || "تم حذف الحالة من السجل النشط.");
      setDeleteOpen(false);
      onDeleted();
    } catch (archiveError) {
      toast.error(archiveError instanceof Error ? archiveError.message : "تعذّرت أرشفة الحالة.");
    } finally {
      setDeleting(false);
    }
  }

  async function deleteRecord() {
    if (!recordToDelete) return;
    setDeletingRecord(true);
    try {
      const endpoint = recordToDelete.kind === "visit"
        ? `/api/clinic/visits/${recordToDelete.id}`
        : `/api/clinic/records/${recordToDelete.kind}/${recordToDelete.id}`;
      const response = await fetch(endpoint, { method: "DELETE" });
      const result = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) throw new Error(result.error || "تعذّر حذف السجل.");
      toast.success(result.message);
      setRecordToDelete(null);
      onChanged();
    } catch (deleteError) {
      toast.error(deleteError instanceof Error ? deleteError.message : "تعذّر حذف السجل.");
    } finally {
      setDeletingRecord(false);
    }
  }

  useEffect(() => {
    if (!patientId) return;
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (cancelled) return undefined;
      setLoading(true); setError("");
      return fetch(`/api/clinic/patients/${patientId}`, { cache: "no-store" });
    }).then(async (response) => {
      if (!response) return;
      const payload = (await response.json()) as PatientDetail & { error?: string };
      if (!response.ok) throw new Error(payload.error || "تعذّر تحميل الملف.");
      if (!cancelled) setDetail(payload);
    }).catch((loadError) => { if (!cancelled) setError(loadError instanceof Error ? loadError.message : "تعذّر تحميل الملف."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [patientId, refreshToken]);

  const groups = useMemo<{
    findings: Map<string, Array<Record<string, unknown>>>;
    meds: Map<string, Array<Record<string, unknown>>>;
    procedures: Map<string, Array<Record<string, unknown>>>;
    diagnostics: Map<string, Array<Record<string, unknown>>>;
  }>(() => detail ? {
    findings: byVisit(detail.systemFindings), meds: byVisit(detail.medications), procedures: byVisit(detail.procedures), diagnostics: byVisit(detail.diagnostics),
  } : {
    findings: new Map<string, Array<Record<string, unknown>>>(),
    meds: new Map<string, Array<Record<string, unknown>>>(),
    procedures: new Map<string, Array<Record<string, unknown>>>(),
    diagnostics: new Map<string, Array<Record<string, unknown>>>(),
  }, [detail]);

  const prevention = useMemo(() => {
    if (!detail) return [];
    const today = new Date().toISOString().slice(0, 10);
    return PREVENTIVE_TYPES.map((type) => {
      const matching = detail.preventiveRecords.filter((row) => {
        const kind = value(row.kind, "") === "vaccine" ? "core_vaccine" : value(row.kind, "");
        return kind === type.kind;
      });
      matching.sort((a, b) => {
        const aUpcoming = value(a.due_date, "") >= today ? 0 : 1;
        const bUpcoming = value(b.due_date, "") >= today ? 0 : 1;
        return aUpcoming - bUpcoming || value(a.due_date, "9999").localeCompare(value(b.due_date, "9999")) || value(b.created_at, "").localeCompare(value(a.created_at, ""));
      });
      return { type, record: matching[0] };
    });
  }, [detail]);

  const patient = detail?.patient;
  const isActive = Boolean(patient && (patient.active === true || Number(patient.active) === 1));
  const baseTarget = patientId && patient ? { patientId, petName: value(patient.name, ""), species: value(patient.species, "cat") } : null;
  const registrationMessage = patient ? cleanOwnerMessage(`مرحباً ${value(patient.owner_name, "")} 🌿\nتم تسجيل زيارة وتحديث ملف الحيوان ${value(patient.name, "")} لدى Simple Vet Clinic.\n\nيمكنكم فتح الملف وكتابة رقم الهاتف واسم الحيوان لمشاهدة بياناته ومواعيد الوقاية من هنا:\n${OWNER_PORTAL_URL}\n\n${WHATSAPP_SOCIAL_LINKS}\n\nمع تمنياتنا له بالصحة والعافية.`) : "";
  const selectedReportVisit = detail?.visits.find((visit) => value(visit.id, "") === reportVisitId) ?? detail?.visits[0];
  const reportText = detail && patient && selectedReportVisit ? buildOwnerReport(detail, patient, selectedReportVisit, reportOptions, reportNote) : "";

  return (
    <Sheet open={Boolean(patientId)} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-full overflow-y-auto border-0 p-0 sm:max-w-4xl">
        {loading ? <div className="grid min-h-full place-items-center"><div className="flex items-center gap-2 font-bold text-[#2563eb]"><Loader2 className="size-5 animate-spin" />جارٍ تحميل السجل...</div></div>
          : error ? <div className="grid min-h-full place-items-center p-8 text-center"><div><AlertTriangle className="mx-auto size-9 text-red-500" /><p className="mt-4 font-bold text-red-700">{error}</p></div></div>
          : patient && detail && baseTarget ? (
          <>
            <SheetHeader className="border-b bg-[#111b3a] px-6 py-6 text-white sm:px-8">
              <div className="flex flex-wrap items-start justify-between gap-4 pl-8">
                <div className="flex items-center gap-4">{patient.photo_key ? <img src={petPhotoUrl(value(patient.photo_key, "")) ?? undefined} alt={`صورة ${value(patient.name, "الحيوان")}`} className="size-16 rounded-2xl border-2 border-white/20 object-cover" /> : <span className="grid size-14 place-items-center rounded-2xl bg-[#56d6c9] text-[#17203b]"><FileHeart className="size-7" /></span>}<div><p className="text-xs font-bold text-[#9fd3cc]">الملف الطبي</p><SheetTitle className="mt-1 text-2xl font-black text-white">{value(patient.name)}</SheetTitle><SheetDescription className="mt-1 text-[#cbd5f1]">{speciesLabel(value(patient.species))} · {value(patient.breed)} · {value(patient.sex)}</SheetDescription></div></div>
                <div className="flex flex-wrap gap-2"><Badge className="bg-white/10 text-white hover:bg-white/10">{detail.visits.length} زيارة</Badge>{!isActive && <Badge className="bg-[#56d6c9] text-[#17203b] hover:bg-[#56d6c9]">{value(patient.record_status, "archived") === "deceased" ? "حالة وفاة · للقراءة فقط" : "مؤرشف · للقراءة فقط"}</Badge>}</div>
              </div>
              <div className="mt-5 grid gap-3 rounded-2xl bg-white/8 p-4 text-sm sm:grid-cols-3"><span className="flex items-center gap-2"><UserRound className="size-4 text-[#56d6c9]" />{value(patient.owner_name)}</span><a dir="ltr" href={`tel:${value(patient.phone, "")}`} className="flex items-center justify-end gap-2 sm:justify-start"><Phone className="size-4 text-[#56d6c9]" />{value(patient.phone)}</a><span className="flex items-center gap-2"><MapPin className="size-4 text-[#56d6c9]" />{value(patient.governorate)} {value(patient.area, "")}</span></div>
              <div className="mt-4 flex flex-wrap gap-2">
                {isActive && <><Button type="button" className="bg-[#56d6c9] text-[#17203b] hover:bg-[#3fc8bb]" onClick={() => onAddVisit(baseTarget)}><Plus className="size-4" />إضافة زيارة أخرى</Button>
                <Button type="button" variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white" onClick={() => onBoarding(baseTarget)}><BedDouble className="size-4" />إضافة إلى المبيت</Button>
                <Button asChild type="button" variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white"><a target="_blank" rel="noreferrer" href={`https://wa.me/${whatsappNumber(value(patient.phone, ""))}?text=${encodeURIComponent(registrationMessage)}`}><MessageCircle className="size-4" />إرسال إشعار واتساب</a></Button>
                <Button type="button" variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white" disabled={!detail.visits.length} onClick={() => { setReportVisitId(value(detail.visits[0]?.id, "")); setReportOpen(true); }}><Send className="size-4" />تقرير للمربي</Button>
                <Button type="button" variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white" onClick={() => onEditPatient(patientId!)}><PencilLine className="size-4" />تعديل التسجيل</Button></>}
                <Button asChild variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white"><Link target="_blank" href={`/clinic/patients/${patientId}/print`}><FileDown className="size-4" />طباعة / حفظ PDF</Link></Button>
                {isActive && <Button type="button" variant="outline" className="border-red-300/50 bg-red-500/10 text-red-100 hover:bg-red-500/25 hover:text-white" onClick={() => setDeleteOpen(true)}><Trash2 className="size-4" />حذف الحالة</Button>}
              </div>
            </SheetHeader>

            <div className="p-5 sm:p-7">
              <section className="mb-6">
                <div className="mb-3"><h2 className="font-black">المواعيد القادمة</h2><p className="mt-1 text-xs text-muted-foreground">أرسل تذكيراً جاهزاً عبر واتساب إلى رقم المربي المسجل.</p></div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {prevention.map(({ type, record }) => {
                    const due = record ? value(record.due_date, "") : "";
                    const message = cleanOwnerMessage(`مرحباً ${value(patient.owner_name, "")} 🌿\nنود تذكيركم بأن موعد ${type.label} للحيوان العزيز ${value(patient.name, "")} هو ${due ? formatDate(due) : "قريباً"}.\n\nيمكنكم فتح ملفه وكتابة رقم الهاتف واسم الحيوان لمشاهدة بياناته ومواعيده من هنا:\n${OWNER_PORTAL_URL}\n\n${WHATSAPP_SOCIAL_LINKS}\n\nيسعدنا استقبالكم في Simple Vet Clinic، مع تمنياتنا له بدوام الصحة والعافية.`);
                    return <article key={type.kind} className={`rounded-2xl border p-4 ${due ? "border-[#bcdad4] bg-[#f5fbf9]" : "bg-[#fafcfc]"}`}><div className="flex items-start justify-between gap-2"><div><h3 className="text-sm font-black text-[#2563eb]">{type.label}</h3><p className="mt-2 text-xs text-muted-foreground">السابق: {record ? formatDate(record.given_date) : "—"}</p><p className="mt-1 text-sm font-bold">القادم: {due ? formatDate(due) : "غير محدد"}</p></div><Syringe className="size-5 text-[#2563eb]" /></div>{isActive && due && <Button asChild size="sm" className="mt-4 w-full bg-[#1d9d64]"><a target="_blank" rel="noreferrer" href={`https://wa.me/${whatsappNumber(value(patient.phone, ""))}?text=${encodeURIComponent(message)}`}><MessageCircle className="size-4" />إرسال واتساب</a></Button>}</article>;
                  })}
                </div>
              </section>

              <Tabs defaultValue="summary" dir="rtl" className="gap-5">
                <TabsList className="grid h-auto w-full grid-cols-4 rounded-xl bg-[#edf3f1] p-1"><TabsTrigger value="summary" className="py-2.5"><ClipboardList className="size-4" />الخلاصة</TabsTrigger><TabsTrigger value="visits" className="py-2.5"><Stethoscope className="size-4" />الزيارات</TabsTrigger><TabsTrigger value="preventive" className="py-2.5"><Syringe className="size-4" />الوقاية</TabsTrigger><TabsTrigger value="tests" className="py-2.5"><Beaker className="size-4" />تحاليل وعمليات</TabsTrigger></TabsList>

                <TabsContent value="summary" className="space-y-5">
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><SummaryCell label="العمر" value={patient.age_value === null ? "غير محدد" : `${value(patient.age_value)} ${value(patient.age_unit)}`} /><SummaryCell label="اللون" value={value(patient.color)} /><SummaryCell label="الوزن" value={patient.weight_kg ? `${value(patient.weight_kg)} كغم` : "—"} /><SummaryCell label="الحالة التناسلية" value={value(patient.reproductive_status)} /></div>
                  <article className="rounded-2xl border border-amber-200 bg-amber-50 p-4"><div className="flex items-center gap-2 font-black text-amber-900"><AlertTriangle className="size-5" />الحساسية والتنبيهات</div><p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-amber-950">{value(patient.drug_allergies, "لا توجد حساسية معروفة")}</p>{Boolean(patient.sensitivity_notes) && <p className="mt-2 border-t border-amber-200 pt-2 text-sm text-amber-900">{value(patient.sensitivity_notes)}</p>}</article>
                </TabsContent>

                <TabsContent value="visits" className="space-y-4">
                  {detail.visits.length ? detail.visits.map((visit, visitIndex) => {
                    const visitId = value(visit.id, ""); const findings = groups.findings.get(visitId) ?? []; const meds = groups.meds.get(visitId) ?? []; const operations = groups.procedures.get(visitId) ?? []; const tests = groups.diagnostics.get(visitId) ?? [];
                    const medicalHistory = parsedObject(visit.history_details_json); const grooming = parsedObject(visit.grooming_details_json);
                    return <article key={visitId || visitIndex} className="rounded-2xl border bg-white p-5 shadow-sm"><div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b pb-4"><div><p className="text-xs font-bold text-[#2563eb]">زيارة {detail.visits.length - visitIndex}</p><time className="mt-1 block font-black">{formatDate(visit.created_at, true)}</time></div><div className="flex flex-wrap gap-2"><Badge variant="outline">{visitTypeLabel[value(visit.visit_type, "")] ?? "زيارة"}</Badge>{Number(visit.cost_iqd) > 0 && <Badge variant="secondary">{Number(visit.cost_iqd).toLocaleString("ar-IQ")} د.ع</Badge>}{isActive && <><Button type="button" size="sm" variant="outline" onClick={() => onEditVisit({ ...baseTarget, visitId, initialValue: visitBundle(detail, visit) })}><PencilLine className="size-3.5" />تعديل</Button><Button type="button" size="sm" variant="outline" className="text-red-600" onClick={() => setRecordToDelete({ kind: "visit", id: visitId, label: `الزيارة رقم ${detail.visits.length - visitIndex}` })}><Trash2 className="size-3.5" />حذف</Button></>}</div></div>
                      <DetailBlock label="سبب الزيارة" value={visit.chief_complaint} /><DetailBlock label="التاريخ المرضي" value={visit.history} />
                      <MedicalHistorySummary details={medicalHistory} />
                      <GroomingSummary details={grooming} />
                      {findings.length > 0 && <div className="mt-4 rounded-xl bg-[#f7faf9] p-4"><p className="mb-3 text-xs font-black text-[#2563eb]">العلامات وفحص الأجهزة</p><div className="space-y-3">{findings.map((finding, index) => <div key={value(finding.id, String(index))} className="text-sm"><strong>{value(finding.system_label)}</strong><div className="mt-2 flex flex-wrap gap-1.5">{parsedArray(finding.selected_signs).map(String).map((sign) => <Badge key={sign} variant="secondary">{sign}</Badge>)}</div>{Boolean(finding.notes) && <p className="mt-2 text-muted-foreground">{value(finding.notes)}</p>}</div>)}</div></div>}
                      <DetailBlock label="التشخيص" value={visit.diagnosis} accent /><DetailBlock label="التشخيصات التفريقية" value={visit.differentials} /><DetailBlock label="خطة العلاج" value={visit.treatment_plan} accent />
                      {meds.length > 0 && <div className="mt-4"><p className="mb-2 text-xs font-black text-[#2563eb]">الأدوية</p><div className="grid gap-2 sm:grid-cols-2">{meds.map((med, index) => <div key={value(med.id, String(index))} className="rounded-xl border p-3 text-sm"><div className="flex items-start justify-between gap-2"><strong>{value(med.name)}</strong>{isActive && <Button type="button" size="icon-sm" variant="ghost" className="text-red-600" onClick={() => setRecordToDelete({ kind: "medication", id: value(med.id, ""), label: value(med.name, "الدواء") })}><Trash2 className="size-3.5" /></Button>}</div><p className="mt-1 text-xs text-muted-foreground">{[med.dose, med.route, med.frequency, med.duration].filter(Boolean).map(String).join(" · ")}</p></div>)}</div></div>}
                      {(operations.length > 0 || tests.length > 0) && <div className="mt-4 grid gap-3 sm:grid-cols-2">{operations.map((row, index) => <div key={value(row.id, String(index))} className="rounded-xl border p-3 text-sm"><div className="flex items-start justify-between gap-2"><strong className="flex items-center gap-2"><Scissors className="size-4 text-[#2563eb]" />{value(row.procedure_type)}</strong>{isActive && <Button type="button" size="icon-sm" variant="ghost" className="text-red-600" onClick={() => setRecordToDelete({ kind: "procedure", id: value(row.id, ""), label: value(row.procedure_type, "العملية") })}><Trash2 className="size-3.5" /></Button>}</div><p className="mt-2 text-xs text-muted-foreground">{value(row.details)}</p>{Number(row.cost_iqd) > 0 && <p className="mt-2 font-bold">{Number(row.cost_iqd).toLocaleString("ar-IQ")} د.ع</p>}</div>)}{tests.map((row, index) => <div key={value(row.id, String(index))} className="rounded-xl border p-3 text-sm"><div className="flex items-start justify-between gap-2"><strong className="flex items-center gap-2"><Beaker className="size-4 text-[#2563eb]" />{value(row.title)}</strong>{isActive && <Button type="button" size="icon-sm" variant="ghost" className="text-red-600" onClick={() => setRecordToDelete({ kind: "diagnostic", id: value(row.id, ""), label: value(row.title, "التحليل") })}><Trash2 className="size-3.5" /></Button>}</div><p className="mt-2 text-xs text-muted-foreground">{value(row.interpretation)}</p>{Number(row.cost_iqd) > 0 && <p className="mt-2 font-bold">{Number(row.cost_iqd).toLocaleString("ar-IQ")} د.ع</p>}</div>)}</div>}
                    </article>;
                  }) : <Empty text="لا توجد زيارات محفوظة." />}
                </TabsContent>

                <TabsContent value="preventive" className="space-y-3">{detail.preventiveRecords.length ? detail.preventiveRecords.map((record, index) => <article key={value(record.id, String(index))} className="rounded-2xl border p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-black">{value(record.title)}</h3><p className="mt-1 text-xs text-muted-foreground">{REMINDER_KIND_LABELS[value(record.kind, "")] ?? value(record.kind)}</p></div><div className="flex items-center gap-2"><Badge variant="outline">{yesNoLabel[value(record.current_status, "unknown")] ?? "غير معلوم"}</Badge>{isActive && <Button type="button" size="icon-sm" variant="ghost" className="text-red-600" onClick={() => setRecordToDelete({ kind: "preventive", id: value(record.id, ""), label: value(record.title, "سجل الوقاية") })}><Trash2 className="size-4" /></Button>}</div></div><div className="mt-4 grid gap-2 text-sm sm:grid-cols-3"><span>السابق: <strong>{formatDate(record.given_date)}</strong></span><span>القادم: <strong>{formatDate(record.due_date)}</strong></span><span>المنتج: <strong>{value(record.product)}</strong></span></div></article>) : <Empty text="لا توجد سجلات وقاية." />}</TabsContent>

                <TabsContent value="tests" className="space-y-4"><div className="grid gap-4 sm:grid-cols-2"><InfoList icon={Beaker} title="التحاليل والتصوير" rows={detail.diagnostics} labelKey="title" kind="diagnostic" allowDelete={isActive} onDelete={setRecordToDelete} /><InfoList icon={Scissors} title="العمليات والإجراءات" rows={detail.procedures} labelKey="procedure_type" kind="procedure" allowDelete={isActive} onDelete={setRecordToDelete} /></div></TabsContent>
              </Tabs>
            </div>
          </>
        ) : null}
        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <AlertDialogContent dir="rtl">
            <AlertDialogHeader>
              <AlertDialogTitle>حذف {patient ? value(patient.name) : "الحالة"} من السجل النشط؟</AlertDialogTitle>
              <AlertDialogDescription className="leading-7">
                ستختفي الحالة من القوائم والبحث، لكن نبقي سجلها الطبي والمالي محفوظاً للأمان. لا يمكن حذف حالة موجودة حالياً في المبيت.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-2 py-2">
              <Label>سبب الإزالة</Label>
              <Select value={deleteReason} onValueChange={(value) => setDeleteReason(value as "archived" | "deceased")}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="archived">تسجيل خاطئ / أرشفة</SelectItem>
                  <SelectItem value="deceased">الحيوان متوفى</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>تراجع</AlertDialogCancel>
              <AlertDialogAction disabled={deleting} onClick={(event) => { event.preventDefault(); void archivePatient(); }} className="bg-red-600 hover:bg-red-700">
                {deleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                تأكيد الحذف
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <AlertDialog open={Boolean(recordToDelete)} onOpenChange={(open) => !open && setRecordToDelete(null)}>
          <AlertDialogContent dir="rtl"><AlertDialogHeader><AlertDialogTitle>حذف {recordToDelete?.label}؟</AlertDialogTitle><AlertDialogDescription className="leading-7">{recordToDelete?.kind === "visit" ? "سيتم حذف الزيارة وكل العلامات والأدوية والعمليات والتحاليل والوقاية المرتبطة بها. استخدم هذا الحذف فقط للتسجيل الخاطئ." : "سيتم حذف هذا العنصر من الملف الطبي والوارد المرتبط به إن وجد."}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={deletingRecord}>تراجع</AlertDialogCancel><AlertDialogAction className="bg-red-600 hover:bg-red-700" disabled={deletingRecord} onClick={(event) => { event.preventDefault(); void deleteRecord(); }}>{deletingRecord ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}تأكيد الحذف</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
        </AlertDialog>
        <Dialog open={reportOpen} onOpenChange={setReportOpen}>
          <DialogContent dir="rtl" className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader><DialogTitle>إرسال تقرير حالة للمربي</DialogTitle><DialogDescription>اختر الزيارة وحدد المعلومات التي تريد إرسالها. الأسعار والملاحظات الداخلية لا تدخل بالتقرير.</DialogDescription></DialogHeader>
            <div className="space-y-5">
              <div className="space-y-2"><Label>الزيارة</Label><Select value={reportVisitId || value(detail?.visits[0]?.id, "")} onValueChange={setReportVisitId}><SelectTrigger className="w-full"><SelectValue placeholder="اختر الزيارة" /></SelectTrigger><SelectContent>{detail?.visits.map((visit, index) => <SelectItem key={value(visit.id, String(index))} value={value(visit.id, "")}>زيارة {detail.visits.length - index} · {formatDate(visit.created_at)} · {visitTypeLabel[value(visit.visit_type, "")] ?? "زيارة"}</SelectItem>)}</SelectContent></Select></div>
              <div><Label className="mb-2 block">المعلومات التي ستصل للمربي</Label><div className="grid gap-2 sm:grid-cols-2">{([
                ["complaint", "سبب الزيارة / ما تم عمله"], ["diagnosis", "التشخيص"], ["treatment", "خطة العلاج"], ["medications", "الأدوية والجرعات"], ["procedures", "العمليات والإجراءات"], ["diagnostics", "التحاليل والأشعة"], ["prevention", "اللقاحات والجرع"], ["followup", "موعد المراجعة"],
              ] as Array<[keyof ReportOptions, string]>).map(([key, label]) => <label key={key} className="flex cursor-pointer items-center gap-3 rounded-xl border bg-[#fafcfc] p-3 text-sm font-bold"><Checkbox checked={reportOptions[key]} onCheckedChange={(checked) => setReportOptions((current) => ({ ...current, [key]: checked === true }))} />{label}</label>)}</div></div>
              <div className="space-y-2"><Label htmlFor="owner-report-note">ملاحظة إضافية للمربي (اختياري)</Label><Input id="owner-report-note" value={reportNote} onChange={(event) => setReportNote(event.target.value)} placeholder="مثال: راقب الشهية وأعد الفحص بعد يومين" /></div>
              <div className="space-y-2"><Label>معاينة الرسالة</Label><Textarea readOnly value={reportText} rows={12} className="leading-7" /></div>
            </div>
            <DialogFooter className="gap-2"><Button type="button" variant="outline" onClick={() => void navigator.clipboard.writeText(reportText).then(() => toast.success("تم نسخ التقرير."))}><ClipboardCopy className="size-4" />نسخ التقرير</Button><Button asChild type="button" className="bg-[#1d9d64]" disabled={!reportText}><a target="_blank" rel="noreferrer" href={`https://wa.me/${whatsappNumber(value(patient?.phone, ""))}?text=${encodeURIComponent(reportText)}`}><MessageCircle className="size-4" />إرسال عبر واتساب</a></Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </SheetContent>
    </Sheet>
  );
}

function buildOwnerReport(detail: PatientDetail, patient: Record<string, unknown>, visit: Record<string, unknown>, options: ReportOptions, note: string) {
  const visitId = value(visit.id, "");
  const lines = [`مرحباً ${value(patient.owner_name, "")}،`, `تقرير الحيوان: ${value(patient.name, "")}`, `تاريخ الزيارة: ${formatDate(visit.created_at)}`, `نوع الزيارة: ${visitTypeLabel[value(visit.visit_type, "")] ?? "زيارة"}`];
  if (options.complaint && visit.chief_complaint) lines.push(`ما تم تسجيله: ${value(visit.chief_complaint)}`);
  if (options.diagnosis && visit.diagnosis) lines.push(`التشخيص: ${value(visit.diagnosis)}`);
  if (options.treatment && visit.treatment_plan) lines.push(`خطة العلاج: ${value(visit.treatment_plan)}`);
  const medications = detail.medications.filter((row) => value(row.visit_id, "") === visitId);
  if (options.medications && medications.length) lines.push(`الأدوية:\n${medications.map((row) => `- ${value(row.name)}${[row.dose, row.route, row.frequency, row.duration, row.instructions].filter(Boolean).length ? `: ${[row.dose, row.route, row.frequency, row.duration, row.instructions].filter(Boolean).map(String).join(" · ")}` : ""}`).join("\n")}`);
  const procedures = detail.procedures.filter((row) => value(row.visit_id, "") === visitId);
  if (options.procedures && procedures.length) lines.push(`العمليات والإجراءات:\n${procedures.map((row) => `- ${value(row.procedure_type)}${row.details ? `: ${value(row.details)}` : ""}`).join("\n")}`);
  const diagnostics = detail.diagnostics.filter((row) => value(row.visit_id, "") === visitId);
  if (options.diagnostics && diagnostics.length) lines.push(`التحاليل والتصوير:\n${diagnostics.map((row) => `- ${value(row.title)}${row.interpretation ? `: ${value(row.interpretation)}` : ""}`).join("\n")}`);
  const prevention = detail.preventiveRecords.filter((row) => value(row.visit_id, "") === visitId);
  if (options.prevention && prevention.length) lines.push(`اللقاحات والجرع:\n${prevention.map((row) => `- ${value(row.title)}${row.given_date ? ` بتاريخ ${formatDate(row.given_date)}` : ""}${row.due_date ? `، القادم ${formatDate(row.due_date)}` : ""}`).join("\n")}`);
  if (options.followup && visit.followup_date) lines.push(`موعد المراجعة: ${formatDate(visit.followup_date)}`);
  if (note.trim()) lines.push(`ملاحظة العيادة: ${note.trim()}`);
  lines.push("مع تمنيات Simple Vet Clinic بالشفاء والصحة.");
  return cleanOwnerMessage(lines.join("\n\n"));
}

function SummaryCell({ label, value: display }: { label: string; value: string }) { return <div className="rounded-xl border bg-[#fafcfc] p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 font-bold">{display}</p></div>; }
function DetailBlock({ label, value: content, accent = false }: { label: string; value: unknown; accent?: boolean }) { if (!content) return null; return <div className={`mt-4 rounded-xl p-4 ${accent ? "bg-[#eef2ff]" : "bg-[#fafcfc]"}`}><p className="mb-2 text-xs font-black text-[#2563eb]">{label}</p><p className="whitespace-pre-wrap text-sm leading-7">{value(content)}</p></div>; }
function MedicalHistorySummary({ details }: { details: Record<string, unknown> }) {
  const rows = [
    ["وقت ظهور الأعراض", details.symptomOnset], ["الشهية", details.appetite], ["شرب الماء", details.waterIntake],
    ["الأكل ونوع الغذاء", details.foodDetails], ["التقيؤ", details.vomiting], ["التبول", details.urination],
    ["التبرز", details.defecation], ["إفراز اللعاب", details.salivation], ["أمراض سابقة", details.previousDiseases],
    ["أدوية أُعطيت سابقاً", details.medicationsGiven], ["الحالة العامة", details.generalCondition],
    ["بنية الجسم", details.bodyCondition], ["الجفاف", details.dehydration],
  ].filter(([, content]) => content && content !== "غير مسجل");
  if (!rows.length) return null;
  return <div className="mt-4 rounded-xl border border-[#d8e8e4] bg-[#f7faf9] p-4"><p className="mb-3 text-xs font-black text-[#2563eb]">التاريخ المرضي والمعلومات العامة</p><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{rows.map(([label, content]) => <div key={String(label)}><span className="block text-[11px] font-bold text-muted-foreground">{String(label)}</span><p className="mt-1 whitespace-pre-wrap text-sm font-semibold">{String(content)}</p></div>)}</div></div>;
}
function GroomingSummary({ details }: { details: Record<string, unknown> }) {
  const services = Array.isArray(details.services) ? details.services.map(String) : [];
  if (!services.length && !Boolean(details.notes) && !Boolean(details.sedation)) return null;
  return <div className="mt-4 rounded-xl border border-[#d8e8e4] bg-[#f7faf9] p-4"><p className="text-xs font-black text-[#2563eb]">تفاصيل الحلاقة والغسل</p>{services.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{services.map((service) => <Badge key={service} variant="secondary">{service}</Badge>)}</div>}<p className="mt-3 text-sm"><strong>التخدير / التهدئة:</strong> {value(details.sedation, "بدون تخدير")}{details.sedationDetails ? ` — ${String(details.sedationDetails)}` : ""}</p>{Boolean(details.notes) && <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{String(details.notes)}</p>}</div>;
}
function Empty({ text }: { text: string }) { return <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">{text}</div>; }
function InfoList({ icon: Icon, title, rows, labelKey, kind, allowDelete, onDelete }: { icon: typeof Activity; title: string; rows: Array<Record<string, unknown>>; labelKey: string; kind: "procedure" | "diagnostic"; allowDelete: boolean; onDelete: (target: RecordDeleteTarget) => void }) { return <section className="rounded-2xl border p-4"><h3 className="flex items-center gap-2 font-black"><Icon className="size-5 text-[#2563eb]" />{title}</h3><div className="mt-4 space-y-2">{rows.length ? rows.map((row, index) => <div key={value(row.id, String(index))} className="rounded-xl bg-[#fafcfc] p-3 text-sm"><div className="flex items-start justify-between gap-2"><strong>{value(row[labelKey])}</strong>{allowDelete && <Button type="button" size="icon-sm" variant="ghost" className="text-red-600" onClick={() => onDelete({ kind, id: value(row.id, ""), label: value(row[labelKey], title) })}><Trash2 className="size-3.5" /></Button>}</div><p className="mt-1 text-xs text-muted-foreground">{formatDate(row.procedure_date ?? row.created_at)} · {Number(row.cost_iqd ?? 0).toLocaleString("ar-IQ")} د.ع</p></div>) : <p className="text-sm text-muted-foreground">لا توجد بيانات.</p>}</div></section>; }
