"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, PencilLine, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { ageFromBirthDate } from "@/lib/age-from-birth-date";
import { BREEDS, IRAQ_GOVERNORATES, SPECIES } from "@/lib/vet-data";
import type { PatientDetail } from "./types";
import { PetPhotoPicker } from "./pet-photo-picker";
import { petPhotoUrl } from "@/lib/pet-photo";

type Draft = {
  ownerName: string; phone: string; email: string; governorate: string; area: string;
  petName: string; species: string; breed: string; sex: string; ageValue: string; ageUnit: string;
  birthDate: string; color: string; weightKg: string; microchip: string; reproductiveStatus: string;
  drugAllergies: string; sensitivityNotes: string;
};

const empty: Draft = {
  ownerName: "", phone: "", email: "", governorate: "بغداد", area: "", petName: "", species: "cat",
  breed: "محلي / هجين", sex: "غير محدد", ageValue: "", ageUnit: "سنة", birthDate: "", color: "",
  weightKg: "", microchip: "", reproductiveStatus: "غير محدد", drugAllergies: "لا توجد حساسية معروفة", sensitivityNotes: "",
};

const value = (input: unknown) => input === null || input === undefined ? "" : String(input);
const numberOrNull = (input: string) => input.trim() && Number.isFinite(Number(input)) ? Number(input) : null;

export function EditPatientSheet({ patientId, onOpenChange, onSaved }: { patientId: string | null; onOpenChange: (open: boolean) => void; onSaved: (patientId: string) => void }) {
  const [draft, setDraft] = useState<Draft>(empty);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoKey, setPhotoKey] = useState<string | null>(null);
  const [removingPhoto, setRemovingPhoto] = useState(false);
  const breeds = useMemo(() => BREEDS[draft.species] ?? [], [draft.species]);

  useEffect(() => {
    if (!patientId) return;
    let cancelled = false;
    void Promise.resolve()
      .then(() => {
        if (cancelled) return undefined;
        setLoading(true);
        return fetch(`/api/clinic/patients/${patientId}`, { cache: "no-store" });
      })
      .then(async (response) => {
        if (!response) return;
        const payload = (await response.json()) as PatientDetail & { error?: string };
        if (!response.ok) throw new Error(payload.error || "تعذّر تحميل الملف.");
        if (cancelled) return;
        const p = payload.patient;
        setPhotoKey(value(p.photo_key) || null); setPhotoFile(null);
        setDraft({
          ownerName: value(p.owner_name), phone: value(p.phone), email: value(p.email), governorate: value(p.governorate) || "بغداد", area: value(p.area),
          petName: value(p.name), species: value(p.species) || "cat", breed: value(p.breed), sex: value(p.sex) || "غير محدد",
          ageValue: value(p.age_value), ageUnit: value(p.age_unit) || "سنة", birthDate: value(p.birth_date), color: value(p.color), weightKg: value(p.weight_kg),
          microchip: value(p.microchip), reproductiveStatus: value(p.reproductive_status) || "غير محدد", drugAllergies: value(p.drug_allergies) || "لا توجد حساسية معروفة", sensitivityNotes: value(p.sensitivity_notes),
        });
      })
      .catch((error) => toast.error(error instanceof Error ? error.message : "تعذّر تحميل الملف."))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [patientId]);

  function setField<K extends keyof Draft>(key: K, next: Draft[K]) { setDraft((current) => ({ ...current, [key]: next })); }

  async function save() {
    if (!patientId) return;
    if (!draft.ownerName.trim() || !draft.phone.trim() || !draft.petName.trim()) return toast.error("أكمل الحقول الأساسية.");
    setSaving(true);
    try {
      const response = await fetch(`/api/clinic/patients/${patientId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner: { name: draft.ownerName, phone: draft.phone, email: draft.email, governorate: draft.governorate, area: draft.area },
          patient: { name: draft.petName, species: draft.species, breed: draft.breed, sex: draft.sex, ageValue: numberOrNull(draft.ageValue), ageUnit: draft.ageUnit, birthDate: draft.birthDate || null, color: draft.color, weightKg: numberOrNull(draft.weightKg), microchip: draft.microchip, reproductiveStatus: draft.reproductiveStatus, drugAllergies: draft.drugAllergies, sensitivityNotes: draft.sensitivityNotes },
        }),
      });
      const result = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) throw new Error(result.error || "تعذّر حفظ التعديل.");
      if (photoFile) {
        const form = new FormData(); form.append("photo", photoFile);
        const photoResponse = await fetch(`/api/clinic/patients/${patientId}/photo`, { method: "PUT", body: form });
        if (!photoResponse.ok) throw new Error("تم حفظ البيانات لكن تعذّر رفع الصورة.");
      }
      toast.success(result.message || "تم حفظ التعديل.");
      onSaved(patientId);
      onOpenChange(false);
    } catch (error) { toast.error(error instanceof Error ? error.message : "تعذّر حفظ التعديل."); }
    finally { setSaving(false); }
  }

  async function removePhoto() {
    if (!patientId) return; setRemovingPhoto(true);
    try { const response = await fetch(`/api/clinic/patients/${patientId}/photo`, { method: "DELETE" }); if (!response.ok) throw new Error("تعذّر حذف الصورة."); setPhotoKey(null); toast.success("حُذفت صورة الحيوان."); }
    catch (error) { toast.error(error instanceof Error ? error.message : "تعذّر حذف الصورة."); }
    finally { setRemovingPhoto(false); }
  }

  return (
    <Sheet open={Boolean(patientId)} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-full overflow-y-auto p-0 sm:max-w-3xl">
        <SheetHeader className="sticky top-0 z-10 border-b bg-white/95 px-6 py-5 backdrop-blur"><SheetTitle className="flex items-center gap-2"><PencilLine className="size-5 text-[#2563eb]" />تعديل تسجيل الحالة</SheetTitle><SheetDescription>صحح بيانات المربي أو الحيوان ثم اضغط حفظ.</SheetDescription></SheetHeader>
        {loading ? <div className="grid min-h-96 place-items-center"><Loader2 className="size-6 animate-spin text-[#2563eb]" /></div> : (
          <div className="space-y-7 p-6">
            <h3 className="font-black text-[#2563eb]">بيانات المربي</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <PetPhotoPicker currentUrl={petPhotoUrl(photoKey)} onFileChange={setPhotoFile} onRemoveCurrent={removePhoto} removing={removingPhoto} disabled={saving} />
              <Field label="اسم المربي"><Input value={draft.ownerName} onChange={(event) => setField("ownerName", event.target.value)} /></Field>
              <Field label="رقم الهاتف"><Input dir="ltr" className="text-right" value={draft.phone} onChange={(event) => setField("phone", event.target.value)} /></Field>
              <Field label="البريد"><Input dir="ltr" className="text-right" value={draft.email} onChange={(event) => setField("email", event.target.value)} /></Field>
              <Field label="المحافظة"><Select value={draft.governorate} onValueChange={(next) => setField("governorate", next)}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{IRAQ_GOVERNORATES.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></Field>
              <Field label="المنطقة" className="sm:col-span-2"><Input value={draft.area} onChange={(event) => setField("area", event.target.value)} /></Field>
            </div>
            <h3 className="border-t pt-6 font-black text-[#2563eb]">بيانات الحيوان</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="الاسم"><Input value={draft.petName} onChange={(event) => setField("petName", event.target.value)} /></Field>
              <Field label="الفصيلة"><Select value={draft.species} onValueChange={(next) => { setField("species", next); setField("breed", BREEDS[next]?.[0] ?? ""); }}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{SPECIES.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select></Field>
              <Field label="السلالة"><Select value={draft.breed} onValueChange={(next) => setField("breed", next)}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{breeds.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></Field>
              <Field label="الجنس"><Select value={draft.sex} onValueChange={(next) => setField("sex", next)}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ذكر">ذكر</SelectItem><SelectItem value="أنثى">أنثى</SelectItem><SelectItem value="غير محدد">غير محدد</SelectItem></SelectContent></Select></Field>
              <Field label="العمر"><div className="grid grid-cols-[1fr_105px] gap-2"><Input type="number" value={draft.ageValue} onChange={(event) => setField("ageValue", event.target.value)} /><Select value={draft.ageUnit} onValueChange={(next) => setField("ageUnit", next)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="يوم">يوم</SelectItem><SelectItem value="أسبوع">أسبوع</SelectItem><SelectItem value="شهر">شهر</SelectItem><SelectItem value="سنة">سنة</SelectItem></SelectContent></Select></div></Field>
              <Field label="تاريخ الميلاد"><Input type="date" value={draft.birthDate} onChange={(event) => { const birthDate = event.target.value; const age = ageFromBirthDate(birthDate); setDraft((current) => ({ ...current, birthDate, ...(age ? { ageValue: String(age.value), ageUnit: age.unit } : {}) })); }} /><p className="text-xs text-muted-foreground">يُحسب العمر تلقائياً ويمكنك تعديله.</p></Field>
              <Field label="اللون"><Input value={draft.color} onChange={(event) => setField("color", event.target.value)} /></Field>
              <Field label="الوزن"><Input type="number" step="0.01" value={draft.weightKg} onChange={(event) => setField("weightKg", event.target.value)} /></Field>
              <Field label="الحالة التناسلية"><Select value={draft.reproductiveStatus} onValueChange={(next) => setField("reproductiveStatus", next)}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="غير محدد">غير محدد</SelectItem><SelectItem value="غير معقم">غير معقم</SelectItem><SelectItem value="معقم">معقم</SelectItem><SelectItem value="حامل">حامل</SelectItem><SelectItem value="مرضع">مرضع</SelectItem></SelectContent></Select></Field>
              <Field label="الشريحة / الحلقة"><Input value={draft.microchip} onChange={(event) => setField("microchip", event.target.value)} /></Field>
              <Field label="حساسية الأدوية" className="sm:col-span-2"><Textarea value={draft.drugAllergies} onChange={(event) => setField("drugAllergies", event.target.value)} /></Field>
              <Field label="ملاحظات الحساسية" className="sm:col-span-2"><Textarea value={draft.sensitivityNotes} onChange={(event) => setField("sensitivityNotes", event.target.value)} /></Field>
            </div>
            <div className="sticky bottom-0 flex justify-end border-t bg-white/95 py-4 backdrop-blur"><Button type="button" className="bg-[#2563eb]" disabled={saving} onClick={save}>{saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}حفظ التعديل</Button></div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) { return <div className={`space-y-2 ${className}`}><Label>{label}</Label>{children}</div>; }
