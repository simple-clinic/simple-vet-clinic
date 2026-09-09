"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, PawPrint, Printer } from "lucide-react";
import type { PatientDetail } from "@/app/clinic/types";
import { Button } from "@/components/ui/button";
import { petPhotoUrl } from "@/lib/pet-photo";
import { speciesLabel } from "@/lib/vet-data";

const text = (value: unknown, fallback = "—") => value === null || value === undefined || value === "" ? fallback : String(value);
const date = (value: unknown) => { if (!value) return "—"; const [year, month, day] = String(value).slice(0, 10).split("-").map(Number); return year && month && day ? `${day}-${month}-${year}` : "—"; };
const visitTypeLabels: Record<string, string> = { sick_visit: "حالة مرضية", emergency: "طوارئ", surgery: "عمليات جراحية وتنظيف الأسنان", dental: "عمليات جراحية وتنظيف الأسنان", routine: "فحص روتيني", preventive: "لقاح ووقاية", diagnostics: "تحاليل / أشعة / سونار", grooming: "حلاقة وغسل" };

function parsed(value: unknown) {
  try { const result = JSON.parse(String(value ?? "[]")); return Array.isArray(result) ? result : []; } catch { return []; }
}

function parsedObject(value: unknown) {
  try { const result = JSON.parse(String(value ?? "{}")); return result && typeof result === "object" && !Array.isArray(result) ? result as Record<string, unknown> : {}; } catch { return {}; }
}

export function PrintRecord({ patientId }: { patientId: string }) {
  const [detail, setDetail] = useState<PatientDetail | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    void fetch(`/api/clinic/patients/${patientId}`, { cache: "no-store" }).then(async (response) => {
      const payload = (await response.json()) as PatientDetail & { error?: string };
      if (!response.ok) throw new Error(payload.error || "تعذّر تحميل الملف.");
      setDetail(payload);
    }).catch((loadError) => setError(loadError instanceof Error ? loadError.message : "تعذّر تحميل الملف."));
  }, [patientId]);

  const groups = useMemo(() => {
    const group = (rows: Array<Record<string, unknown>>) => {
      const map = new Map<string, Array<Record<string, unknown>>>();
      rows.forEach((row) => { const id = text(row.visit_id, ""); map.set(id, [...(map.get(id) ?? []), row]); });
      return map;
    };
    return detail ? { findings: group(detail.systemFindings), meds: group(detail.medications), procedures: group(detail.procedures), diagnostics: group(detail.diagnostics) } : null;
  }, [detail]);

  if (error) return <main className="grid min-h-screen place-items-center p-8 text-red-700">{error}</main>;
  if (!detail || !groups) return <main className="grid min-h-screen place-items-center"><Loader2 className="size-7 animate-spin text-[#0b766f]" /></main>;
  const p = detail.patient;

  return (
    <main className="print-record mx-auto min-h-screen max-w-5xl bg-white p-6 text-[#102331] sm:p-10">
      <div className="no-print mb-6 flex justify-end"><Button type="button" className="bg-[#0b766f]" onClick={() => window.print()}><Printer className="size-4" />طباعة / حفظ بصيغة PDF</Button></div>
      <header className="flex items-center justify-between border-b-4 border-[#0b766f] pb-5">
        <div className="flex items-center gap-3"><span className="grid size-12 place-items-center rounded-xl bg-[#111b3a] text-[#56d6c9]"><PawPrint className="size-7" /></span><div><h1 className="text-2xl font-black">Simple Vet Clinic</h1><p className="text-sm text-muted-foreground">السجل الطبي البيطري الكامل</p></div></div>
        <div className="text-left text-sm"><p>تاريخ الطباعة</p><strong>{date(new Date().toISOString())}</strong></div>
      </header>

      <section className="mt-6 rounded-2xl border p-5">
        <div className="flex items-center gap-4">{p.photo_key ? <img src={petPhotoUrl(text(p.photo_key, "")) ?? undefined} alt={`صورة ${text(p.name, "الحيوان")}`} className="size-24 rounded-2xl object-cover" /> : null}<h2 className="text-2xl font-black">{text(p.name)}</h2></div>
        <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3"><Cell label="النوع" value={`${speciesLabel(text(p.species))} / ${text(p.breed)}`} /><Cell label="العمر والجنس" value={`${text(p.age_value)} ${text(p.age_unit)} / ${text(p.sex)}`} /><Cell label="اللون والوزن" value={`${text(p.color)} / ${text(p.weight_kg)} كغم`} /><Cell label="المربي" value={text(p.owner_name)} /><Cell label="الهاتف" value={text(p.phone)} /><Cell label="العنوان" value={`${text(p.governorate)} - ${text(p.area)}`} /><Cell label="البريد" value={text(p.email)} /><Cell label="الحالة التناسلية" value={text(p.reproductive_status)} /><Cell label="الشريحة / الحلقة" value={text(p.microchip)} /></div>
        <div className="mt-4 rounded-xl bg-amber-50 p-3 text-sm"><strong>حساسية الأدوية:</strong> {text(p.drug_allergies)}<br /><strong>ملاحظات الحساسية:</strong> {text(p.sensitivity_notes)}</div>
      </section>

      <section className="mt-7"><h2 className="border-b-2 pb-2 text-xl font-black">اللقاحات والوقاية</h2><div className="mt-4 overflow-x-auto"><table className="w-full border-collapse text-sm"><thead><tr><Th>النوع</Th><Th>الحالة</Th><Th>السابق</Th><Th>القادم</Th><Th>المنتج</Th></tr></thead><tbody>{detail.preventiveRecords.map((row, index) => <tr key={text(row.id, String(index))}><Td>{text(row.title)}</Td><Td>{text(row.current_status)}</Td><Td>{date(row.given_date)}</Td><Td>{date(row.due_date)}</Td><Td>{text(row.product)}</Td></tr>)}</tbody></table></div></section>

      <section className="mt-8"><h2 className="border-b-2 pb-2 text-xl font-black">الزيارات الطبية والخدمية</h2><div className="mt-4 space-y-6">{detail.visits.map((visit, index) => {
        const id = text(visit.id, "");
        const findings = groups.findings.get(id) ?? [];
        const meds = groups.meds.get(id) ?? [];
        const procedures = groups.procedures.get(id) ?? [];
        const diagnostics = groups.diagnostics.get(id) ?? [];
        const medicalHistory = parsedObject(visit.history_details_json);
        const grooming = parsedObject(visit.grooming_details_json);
        return <article key={id || index} className="break-inside-avoid rounded-2xl border p-5">
          <div className="flex justify-between border-b pb-3"><strong>زيارة {detail.visits.length - index} · {visitTypeLabels[text(visit.visit_type, "")] ?? text(visit.visit_type)}</strong><span>{date(visit.created_at)} · {Number(visit.cost_iqd ?? 0).toLocaleString("ar-IQ")} د.ع</span></div>
          <Block label="سبب الزيارة" value={visit.chief_complaint} /><Block label="ملاحظات التاريخ المرضي" value={visit.history} />
          <MedicalHistory details={medicalHistory} /><Grooming details={grooming} />
          {findings.length > 0 && <div className="mt-3"><strong className="text-sm">فحص أجهزة الجسم</strong>{findings.map((row, rowIndex) => <div key={text(row.id, String(rowIndex))} className="mt-2 rounded-lg bg-slate-50 p-3 text-sm"><strong>{text(row.system_label)}:</strong> {parsed(row.selected_signs).map(String).join("، ")} {row.notes ? `— ${text(row.notes)}` : ""}</div>)}</div>}
          <Block label="التشخيص" value={visit.diagnosis} /><Block label="التشخيصات التفريقية" value={visit.differentials} /><Block label="خطة العلاج" value={visit.treatment_plan} /><Block label="ملاحظات الطبيب" value={visit.internal_notes} />
          {meds.length > 0 && <div className="mt-3"><strong className="text-sm">الأدوية</strong><ul className="mt-2 list-inside list-disc text-sm">{meds.map((row, rowIndex) => <li key={text(row.id, String(rowIndex))}>{text(row.name)} — {[row.dose, row.route, row.frequency, row.duration].filter(Boolean).map(String).join(" / ")}</li>)}</ul></div>}
          {diagnostics.map((row, rowIndex) => <div key={text(row.id, String(rowIndex))} className="mt-4 rounded-xl border p-3"><strong>تحليل / تصوير: {text(row.title)}</strong><Results rows={parsed(row.results_json)} /><Block label="الخلاصة" value={row.interpretation} /><p className="mt-2 text-sm">التكلفة: {Number(row.cost_iqd ?? 0).toLocaleString("ar-IQ")} د.ع</p></div>)}
          {procedures.map((row, rowIndex) => <div key={text(row.id, String(rowIndex))} className="mt-4 rounded-xl border p-3 text-sm"><strong>عملية / إجراء: {text(row.procedure_type)}</strong><p className="mt-2">التاريخ: {date(row.procedure_date)} · التخدير: {text(row.anesthesia)} · التكلفة: {Number(row.cost_iqd ?? 0).toLocaleString("ar-IQ")} د.ع</p><Block label="التفاصيل" value={row.details} /></div>)}
        </article>;
      })}</div></section>
    </main>
  );
}

function MedicalHistory({ details }: { details: Record<string, unknown> }) {
  const rows = [["وقت ظهور الأعراض", details.symptomOnset], ["الشهية", details.appetite], ["شرب الماء", details.waterIntake], ["الأكل", details.foodDetails], ["التقيؤ", details.vomiting], ["التبول", details.urination], ["التبرز", details.defecation], ["إفراز اللعاب", details.salivation], ["أمراض سابقة", details.previousDiseases], ["أدوية سابقة", details.medicationsGiven], ["الحالة العامة", details.generalCondition], ["بنية الجسم", details.bodyCondition], ["الجفاف", details.dehydration]].filter(([, value]) => value && value !== "غير مسجل");
  if (!rows.length) return null;
  return <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm"><strong>التاريخ المرضي والمعلومات العامة</strong><div className="mt-2 grid gap-2 sm:grid-cols-3">{rows.map(([label, value]) => <p key={String(label)}><strong>{String(label)}:</strong> {String(value)}</p>)}</div></div>;
}

function Grooming({ details }: { details: Record<string, unknown> }) {
  const services = Array.isArray(details.services) ? details.services.map(String) : [];
  if (!services.length && !Boolean(details.notes) && !Boolean(details.sedation)) return null;
  return <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm"><strong>الحلاقة والغسل</strong>{services.length > 0 && <p className="mt-2"><strong>الخدمات:</strong> {services.join("، ")}</p>}<p className="mt-1"><strong>التخدير / التهدئة:</strong> {text(details.sedation, "بدون تخدير")} {details.sedationDetails ? `— ${String(details.sedationDetails)}` : ""}</p>{Boolean(details.notes) && <p className="mt-1"><strong>ملاحظات:</strong> {String(details.notes)}</p>}</div>;
}

function Cell({ label, value }: { label: string; value: string }) { return <div><span className="block text-xs text-muted-foreground">{label}</span><strong>{value}</strong></div>; }
function Block({ label, value }: { label: string; value: unknown }) { return value ? <div className="mt-3 text-sm"><strong>{label}:</strong><p className="mt-1 whitespace-pre-wrap leading-6">{text(value)}</p></div> : null; }
function Th({ children }: { children: React.ReactNode }) { return <th className="border bg-slate-100 p-2 text-right">{children}</th>; }
function Td({ children }: { children: React.ReactNode }) { return <td className="border p-2">{children}</td>; }
function Results({ rows }: { rows: unknown[] }) { if (!rows.length) return null; return <table className="mt-3 w-full border-collapse text-xs"><thead><tr><Th>الفحص</Th><Th>النتيجة</Th><Th>الوحدة</Th><Th>المرجع</Th></tr></thead><tbody>{rows.map((item, index) => { const row = item as Record<string, unknown>; return <tr key={index}><Td>{text(row.name)}</Td><Td>{text(row.result)}</Td><Td>{text(row.unit)}</Td><Td>{text(row.referenceRange)}</Td></tr>; })}</tbody></table>; }
