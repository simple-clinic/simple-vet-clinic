"use client";

import { useMemo, useState } from "react";
import { Activity, ArrowLeft, ClipboardPlus, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { ageFromBirthDate } from "@/lib/age-from-birth-date";
import { BREEDS, IRAQ_GOVERNORATES, SPECIES } from "@/lib/vet-data";
import { VisitEditor, type VisitBundleClient } from "./visit-editor";
import { PetPhotoPicker } from "./pet-photo-picker";

type ProfileDraft = {
  ownerName: string;
  phone: string;
  email: string;
  governorate: string;
  area: string;
  petName: string;
  species: string;
  breed: string;
  sex: string;
  ageValue: string;
  ageUnit: string;
  birthDate: string;
  color: string;
  weightKg: string;
  microchip: string;
  reproductiveStatus: string;
  drugAllergies: string;
  sensitivityNotes: string;
};

const blankProfile: ProfileDraft = {
  ownerName: "", phone: "", email: "", governorate: "بغداد", area: "", petName: "",
  species: "cat", breed: "محلي / هجين", sex: "غير محدد", ageValue: "", ageUnit: "سنة",
  birthDate: "", color: "", weightKg: "", microchip: "", reproductiveStatus: "غير محدد",
  drugAllergies: "لا توجد حساسية معروفة", sensitivityNotes: "",
};

function numberOrNull(value: string) {
  const parsed = Number(value);
  return value.trim() && Number.isFinite(parsed) ? parsed : null;
}

export function NewCaseSheet({ open, onOpenChange, onSaved }: { open: boolean; onOpenChange: (open: boolean) => void; onSaved: (patientId: string) => void }) {
  const [profile, setProfile] = useState<ProfileDraft>(blankProfile);
  const [clinicalOpen, setClinicalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editorKey, setEditorKey] = useState(0);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [customBreed, setCustomBreed] = useState(false);
  const breeds = useMemo(() => BREEDS[profile.species] ?? [], [profile.species]);

  function setField<K extends keyof ProfileDraft>(key: K, value: ProfileDraft[K]) {
    setProfile((current) => ({ ...current, [key]: value }));
  }

  function continueToVisit() {
    if (!profile.ownerName.trim() || !profile.phone.trim() || !profile.petName.trim()) {
      toast.error("أكمل اسم المربي ورقم الهاتف واسم الحيوان.");
      return;
    }
    setClinicalOpen(true);
  }

  function reset() {
    setProfile(blankProfile);
    setClinicalOpen(false);
    setEditorKey((value) => value + 1);
    setPhotoFile(null);
    setCustomBreed(false);
  }

  async function save(visitBundle: VisitBundleClient) {
    setSaving(true);
    try {
      const diagnostics = visitBundle.diagnostics.map(({ pendingImages: _pendingImages, ...item }) => item);
      const response = await fetch("/api/clinic/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner: { name: profile.ownerName, phone: profile.phone, email: profile.email, governorate: profile.governorate, area: profile.area },
          patient: {
            name: profile.petName, species: profile.species, breed: profile.breed, sex: profile.sex,
            ageValue: numberOrNull(profile.ageValue), ageUnit: profile.ageUnit, birthDate: profile.birthDate || null,
            color: profile.color, weightKg: numberOrNull(profile.weightKg), microchip: profile.microchip,
            reproductiveStatus: profile.reproductiveStatus, drugAllergies: profile.drugAllergies,
            sensitivityNotes: profile.sensitivityNotes,
          },
          visitBundle: {
            ...visitBundle,
            diagnostics,
            visit: { ...visitBundle.visit, weightKg: visitBundle.visit.weightKg ?? numberOrNull(profile.weightKg) },
          },
        }),
      });
      const result = (await response.json()) as { error?: string; message?: string; patientId?: string };
      if (!response.ok || !result.patientId) throw new Error(result.error || "تعذّر حفظ الحالة.");
      for (const diagnostic of visitBundle.diagnostics) {
        if (!diagnostic.id || !diagnostic.pendingImages?.length) continue;
        const form = new FormData(); diagnostic.pendingImages.forEach((file) => form.append("images", file));
        const upload = await fetch(`/api/clinic/diagnostics/${diagnostic.id}/images`, { method: "POST", body: form });
        if (!upload.ok) toast.warning(`تم حفظ الفحص، لكن تعذّر رفع صوره: ${diagnostic.title}`);
      }
      if (photoFile) {
        const form = new FormData(); form.append("photo", photoFile);
        const photoResponse = await fetch(`/api/clinic/patients/${result.patientId}/photo`, { method: "PUT", body: form });
        if (!photoResponse.ok) toast.warning("تم حفظ الملف، لكن تعذّر رفع الصورة.");
      }
      toast.success(result.message || "تم حفظ الحالة.");
      onSaved(result.patientId);
      onOpenChange(false);
      reset();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذّر حفظ الحالة.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={(value) => { onOpenChange(value); if (!value && !saving) setClinicalOpen(false); }}>
      <SheetContent side="left" className="w-full overflow-y-auto border-0 p-0 sm:max-w-4xl">
        <SheetHeader className="sticky top-0 z-20 border-b bg-white/95 px-5 py-5 backdrop-blur sm:px-7">
          <div className="flex items-center justify-between gap-4 pl-8">
            <div>
              <SheetTitle className="flex items-center gap-2 text-xl font-black"><ClipboardPlus className="size-5 text-[#2563eb]" />تسجيل حيوان وحالته الأولى</SheetTitle>
              <SheetDescription className="mt-1">الحفظ لا يتم إلا من زر «حفظ» في آخر خطوة.</SheetDescription>
            </div>
            {clinicalOpen && <Button type="button" variant="outline" size="sm" onClick={() => setClinicalOpen(false)}>تعديل بيانات المربي والحيوان</Button>}
          </div>
        </SheetHeader>

        {!clinicalOpen ? (
          <div className="space-y-8 px-5 py-6 sm:px-7">
            <SectionTitle icon={UserRound} title="بيانات المربي" description="رقم الهاتف يربط المربي بالحيوان ويُستخدم لتذكيرات واتساب." />
            <div className="grid gap-4 sm:grid-cols-2">
              <PetPhotoPicker onFileChange={setPhotoFile} />
              <Field label="اسم المربي" required><Input value={profile.ownerName} onChange={(event) => setField("ownerName", event.target.value)} /></Field>
              <Field label="رقم الهاتف" required><Input dir="ltr" className="text-right" inputMode="tel" value={profile.phone} onChange={(event) => setField("phone", event.target.value)} placeholder="0770 000 0000" /></Field>
              <Field label="البريد الإلكتروني"><Input dir="ltr" className="text-right" type="email" value={profile.email} onChange={(event) => setField("email", event.target.value)} /></Field>
              <Field label="المحافظة"><Select value={profile.governorate} onValueChange={(value) => setField("governorate", value)}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{IRAQ_GOVERNORATES.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></Field>
              <Field label="المنطقة / الحي" className="sm:col-span-2"><Input value={profile.area} onChange={(event) => setField("area", event.target.value)} /></Field>
            </div>

            <SectionTitle icon={Activity} title="بيانات الحيوان" description="سجل البيانات التي ستظهر للمربي: الاسم، النوع، العمر، الجنس واللون." />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="اسم الحيوان" required><Input value={profile.petName} onChange={(event) => setField("petName", event.target.value)} /></Field>
              <Field label="الفصيلة"><Select value={profile.species} onValueChange={(value) => { setField("species", value); setField("breed", BREEDS[value]?.[0] ?? ""); }}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{SPECIES.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select></Field>
              <Field label="السلالة / النوع"><Select value={customBreed ? "__custom__" : profile.breed} onValueChange={(value) => { if (value === "__custom__") { setCustomBreed(true); setField("breed", ""); } else { setCustomBreed(false); setField("breed", value); } }}><SelectTrigger className="w-full"><SelectValue placeholder="اختر السلالة" /></SelectTrigger><SelectContent>{breeds.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}<SelectItem value="__custom__">سلالة أخرى / تُكتب يدويًا</SelectItem></SelectContent></Select>{customBreed && <Input className="mt-2" value={profile.breed} onChange={(event) => setField("breed", event.target.value)} placeholder="اكتب اسم السلالة هنا" />}</Field>
              <Field label="الجنس"><Select value={profile.sex} onValueChange={(value) => setField("sex", value)}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ذكر">ذكر</SelectItem><SelectItem value="أنثى">أنثى</SelectItem><SelectItem value="غير محدد">غير محدد</SelectItem></SelectContent></Select></Field>
              <Field label="العمر"><div className="grid grid-cols-[1fr_110px] gap-2"><Input type="number" min="0" value={profile.ageValue} onChange={(event) => setField("ageValue", event.target.value)} /><Select value={profile.ageUnit} onValueChange={(value) => setField("ageUnit", value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="يوم">يوم</SelectItem><SelectItem value="أسبوع">أسبوع</SelectItem><SelectItem value="شهر">شهر</SelectItem><SelectItem value="سنة">سنة</SelectItem></SelectContent></Select></div></Field>
              <Field label="تاريخ الميلاد"><Input type="date" value={profile.birthDate} onChange={(event) => { const birthDate = event.target.value; const age = ageFromBirthDate(birthDate); setProfile((current) => ({ ...current, birthDate, ...(age ? { ageValue: String(age.value), ageUnit: age.unit } : {}) })); }} /><p className="text-xs text-muted-foreground">يُحسب العمر تلقائياً ويمكنك تعديله يدوياً.</p></Field>
              <Field label="اللون / العلامات"><Input value={profile.color} onChange={(event) => setField("color", event.target.value)} /></Field>
              <Field label="الوزن كغم"><Input type="number" min="0" step="0.01" value={profile.weightKg} onChange={(event) => setField("weightKg", event.target.value)} /></Field>
              <Field label="الحالة التناسلية"><Select value={profile.reproductiveStatus} onValueChange={(value) => setField("reproductiveStatus", value)}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="غير محدد">غير محدد</SelectItem><SelectItem value="غير معقم">غير معقم</SelectItem><SelectItem value="معقم">معقم</SelectItem><SelectItem value="حامل">حامل</SelectItem><SelectItem value="مرضع">مرضع</SelectItem></SelectContent></Select></Field>
              <Field label="رقم الشريحة / الحلقة"><Input value={profile.microchip} onChange={(event) => setField("microchip", event.target.value)} /></Field>
              <Field label="الحساسية من الأدوية" className="sm:col-span-2"><Textarea value={profile.drugAllergies} onChange={(event) => setField("drugAllergies", event.target.value)} rows={3} /></Field>
              <Field label="حساسيات أو ملاحظات أخرى" className="sm:col-span-2"><Textarea value={profile.sensitivityNotes} onChange={(event) => setField("sensitivityNotes", event.target.value)} rows={3} /></Field>
            </div>
            <div className="sticky bottom-0 flex justify-end border-t bg-white/95 py-4 backdrop-blur"><Button type="button" className="bg-[#2563eb]" onClick={continueToVisit}>الانتقال إلى الزيارة والفحص<ArrowLeft className="size-4" /></Button></div>
          </div>
        ) : (
          <VisitEditor key={editorKey} species={profile.species} saving={saving} onSave={save} submitLabel="حفظ ملف الحيوان والزيارة" />
        )}
      </SheetContent>
    </Sheet>
  );
}

function SectionTitle({ icon: Icon, title, description }: { icon: typeof Activity; title: string; description: string }) {
  return <div className="flex items-start gap-3 border-b pb-4"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#eef2ff] text-[#2563eb]"><Icon className="size-5" /></span><div><h2 className="font-black">{title}</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p></div></div>;
}

function Field({ label, children, required, className = "" }: { label: string; children: React.ReactNode; required?: boolean; className?: string }) {
  return <div className={`space-y-2 ${className}`}><Label>{label}{required && <span className="mr-1 text-red-500">*</span>}</Label>{children}</div>;
}
