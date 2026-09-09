"use client";
import { useMemo, useState } from "react";
import {
  Activity,
  BookOpenCheck,
  Loader2,
  Save,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { ageFromBirthDate } from "@/lib/age-from-birth-date";
import { BREEDS, IRAQ_GOVERNORATES, SPECIES } from "@/lib/vet-data";
import { PetPhotoPicker } from "./pet-photo-picker";

const rows = [
  { kind: "core_vaccine", title: "اللقاح الأساسي" },
  { kind: "rabies", title: "لقاح داء الكلب" },
  { kind: "fungal_vaccine", title: "لقاح الفطريات" },
  { kind: "deworming", title: "جرعة الديدان" },
  { kind: "ectoparasite", title: "الحشرات الخارجية" },
] as const;
type Draft = {
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
type VaccineDraft = {
  given: string;
  due: string;
  product: string;
  batchNumber: string;
  notes: string;
};
const blank: Draft = {
  ownerName: "",
  phone: "",
  email: "",
  governorate: "بغداد",
  area: "",
  petName: "",
  species: "cat",
  breed: "محلي / هجين",
  sex: "غير محدد",
  ageValue: "",
  ageUnit: "سنة",
  birthDate: "",
  color: "",
  weightKg: "",
  microchip: "",
  reproductiveStatus: "غير محدد",
  drugAllergies: "لا توجد حساسية معروفة",
  sensitivityNotes: "",
};
const blankVaccine = (): VaccineDraft => ({
  given: "",
  due: "",
  product: "",
  batchNumber: "",
  notes: "",
});

export function LegacyPatientSheet({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  onSaved: (id: string) => void;
}) {
  const [draft, setDraft] = useState<Draft>(blank);
  const [dates, setDates] = useState<Record<string, VaccineDraft>>({});
  const [photo, setPhoto] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const breeds = useMemo(() => BREEDS[draft.species] ?? [], [draft.species]);
  const field = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));
  const setBirthDate = (birthDate: string) => {
    const age = ageFromBirthDate(birthDate);
    setDraft((current) => ({
      ...current,
      birthDate,
      ...(age ? { ageValue: String(age.value), ageUnit: age.unit } : {}),
    }));
  };
  const vaccine = (kind: string, patch: Partial<VaccineDraft>) =>
    setDates((current) => ({
      ...current,
      [kind]: { ...(current[kind] ?? blankVaccine()), ...patch },
    }));
  async function save() {
    if (!draft.ownerName.trim() || !draft.phone.trim() || !draft.petName.trim())
      return toast.error("أكمل اسم المربي والهاتف واسم الحيوان.");
    setSaving(true);
    try {
      const preventiveRecords = rows
        .filter((row) => dates[row.kind]?.given)
        .map((row) => ({
          kind: row.kind,
          title: row.title,
          currentStatus: "yes",
          givenDate: dates[row.kind].given,
          dueDate: dates[row.kind].due || null,
          product: dates[row.kind].product,
          batchNumber: dates[row.kind].batchNumber,
          notes: dates[row.kind].notes,
          ownerVisible: true,
        }));
      const response = await fetch("/api/clinic/patients/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner: {
            name: draft.ownerName,
            phone: draft.phone,
            email: draft.email,
            governorate: draft.governorate,
            area: draft.area,
          },
          patient: {
            name: draft.petName,
            species: draft.species,
            breed: draft.breed,
            sex: draft.sex,
            ageValue: draft.ageValue ? Number(draft.ageValue) : null,
            ageUnit: draft.ageUnit,
            birthDate: draft.birthDate || null,
            color: draft.color,
            weightKg: draft.weightKg ? Number(draft.weightKg) : null,
            microchip: draft.microchip,
            reproductiveStatus: draft.reproductiveStatus,
            drugAllergies: draft.drugAllergies,
            sensitivityNotes: draft.sensitivityNotes,
          },
          preventiveRecords,
        }),
      });
      const result = (await response.json()) as {
        error?: string;
        message?: string;
        patientId?: string;
      };
      if (!response.ok || !result.patientId)
        throw new Error(result.error || "تعذّر الحفظ");
      if (photo) {
        const form = new FormData();
        form.append("photo", photo);
        const upload = await fetch(
          `/api/clinic/patients/${result.patientId}/photo`,
          { method: "PUT", body: form },
        );
        if (!upload.ok)
          toast.warning("تم حفظ الملف والدفتر، لكن تعذّر رفع الصورة.");
      }
      toast.success(result.message);
      onSaved(result.patientId);
      onOpenChange(false);
      setDraft(blank);
      setDates({});
      setPhoto(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذّر الحفظ");
    } finally {
      setSaving(false);
    }
  }
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        className="w-full overflow-y-auto border-0 p-0 sm:max-w-4xl"
      >
        <SheetHeader className="sticky top-0 z-20 border-b bg-white/95 px-5 py-5 backdrop-blur sm:px-7">
          <SheetTitle className="flex items-center gap-2 text-xl font-black">
            <BookOpenCheck className="size-5 text-[#2563eb]" />
            حيوان مراجع سابقاً ودفتره القديم
          </SheetTitle>
          <SheetDescription>
            نفس تفاصيل التسجيل الكامل، مع نقل جدول اللقاحات السابق من دون
            احتسابه كزيارة جديدة.
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-8 px-5 py-6 sm:px-7">
          <Section
            icon={UserRound}
            title="بيانات المربي"
            text="تُحفظ بيانات الاتصال كاملة وتُربط بملف الحيوان."
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <PetPhotoPicker onFileChange={setPhoto} />
            <F label="اسم المربي" required>
              <Input
                value={draft.ownerName}
                onChange={(e) => field("ownerName", e.target.value)}
              />
            </F>
            <F label="رقم الهاتف" required>
              <Input
                dir="ltr"
                className="text-right"
                value={draft.phone}
                onChange={(e) => field("phone", e.target.value)}
              />
            </F>
            <F label="البريد الإلكتروني">
              <Input
                dir="ltr"
                className="text-right"
                type="email"
                value={draft.email}
                onChange={(e) => field("email", e.target.value)}
              />
            </F>
            <F label="المحافظة">
              <Select
                value={draft.governorate}
                onValueChange={(v) => field("governorate", v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {IRAQ_GOVERNORATES.map((x) => (
                    <SelectItem key={x} value={x}>
                      {x}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </F>
            <F label="المنطقة / الحي" className="sm:col-span-2">
              <Input
                value={draft.area}
                onChange={(e) => field("area", e.target.value)}
              />
            </F>
          </div>
          <Section
            icon={Activity}
            title="بيانات الحيوان"
            text="أدخل كل معلومات الحيوان الموجودة في الدفتر أو السجل السابق."
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <F label="اسم الحيوان" required>
              <Input
                value={draft.petName}
                onChange={(e) => field("petName", e.target.value)}
              />
            </F>
            <F label="الفصيلة">
              <Select
                value={draft.species}
                onValueChange={(v) => {
                  field("species", v);
                  field("breed", BREEDS[v]?.[0] ?? "");
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SPECIES.map((x) => (
                    <SelectItem key={x.value} value={x.value}>
                      {x.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </F>
            <F label="السلالة / النوع">
              <Select
                value={draft.breed}
                onValueChange={(v) => field("breed", v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {breeds.map((x) => (
                    <SelectItem key={x} value={x}>
                      {x}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </F>
            <F label="الجنس">
              <Select value={draft.sex} onValueChange={(v) => field("sex", v)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ذكر">ذكر</SelectItem>
                  <SelectItem value="أنثى">أنثى</SelectItem>
                  <SelectItem value="غير محدد">غير محدد</SelectItem>
                </SelectContent>
              </Select>
            </F>
            <F label="العمر">
              <div className="grid grid-cols-[1fr_110px] gap-2">
                <Input
                  type="number"
                  min="0"
                  value={draft.ageValue}
                  onChange={(e) => field("ageValue", e.target.value)}
                />
                <Select
                  value={draft.ageUnit}
                  onValueChange={(v) => field("ageUnit", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="يوم">يوم</SelectItem>
                    <SelectItem value="أسبوع">أسبوع</SelectItem>
                    <SelectItem value="شهر">شهر</SelectItem>
                    <SelectItem value="سنة">سنة</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </F>
            <F label="تاريخ الميلاد">
              <Input
                type="date"
                value={draft.birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">يُحسب العمر تلقائياً ويمكنك تعديله.</p>
            </F>
            <F label="اللون / العلامات">
              <Input
                value={draft.color}
                onChange={(e) => field("color", e.target.value)}
              />
            </F>
            <F label="الوزن كغم">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={draft.weightKg}
                onChange={(e) => field("weightKg", e.target.value)}
              />
            </F>
            <F label="الحالة التناسلية">
              <Select
                value={draft.reproductiveStatus}
                onValueChange={(v) => field("reproductiveStatus", v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="غير محدد">غير محدد</SelectItem>
                  <SelectItem value="غير معقم">غير معقم</SelectItem>
                  <SelectItem value="معقم">معقم</SelectItem>
                  <SelectItem value="حامل">حامل</SelectItem>
                  <SelectItem value="مرضع">مرضع</SelectItem>
                </SelectContent>
              </Select>
            </F>
            <F label="رقم الشريحة / الحلقة">
              <Input
                value={draft.microchip}
                onChange={(e) => field("microchip", e.target.value)}
              />
            </F>
            <F label="الحساسية من الأدوية" className="sm:col-span-2">
              <Textarea
                value={draft.drugAllergies}
                onChange={(e) => field("drugAllergies", e.target.value)}
                rows={3}
              />
            </F>
            <F label="حساسيات أو ملاحظات أخرى" className="sm:col-span-2">
              <Textarea
                value={draft.sensitivityNotes}
                onChange={(e) => field("sensitivityNotes", e.target.value)}
                rows={3}
              />
            </F>
          </div>
          <Section
            icon={BookOpenCheck}
            title="نقل جدول دفتر اللقاحات"
            text="لا يظهر الصف للمربي إلا عند إدخال تاريخ إعطاء فعلي."
          />
          <div className="space-y-4">
            {rows.map((row) => (
              <article
                key={row.kind}
                className="rounded-2xl border bg-[#fafcfc] p-4"
              >
                <h3 className="mb-3 font-black text-[#2563eb]">{row.title}</h3>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <F label="تاريخ الإعطاء">
                    <Input
                      type="date"
                      value={dates[row.kind]?.given ?? ""}
                      onChange={(e) =>
                        vaccine(row.kind, { given: e.target.value })
                      }
                    />
                  </F>
                  <F label="الموعد القادم">
                    <Input
                      type="date"
                      value={dates[row.kind]?.due ?? ""}
                      onChange={(e) =>
                        vaccine(row.kind, { due: e.target.value })
                      }
                    />
                  </F>
                  <F label="المنتج / الشركة">
                    <Input
                      value={dates[row.kind]?.product ?? ""}
                      onChange={(e) =>
                        vaccine(row.kind, { product: e.target.value })
                      }
                    />
                  </F>
                  <F label="رقم التشغيلة">
                    <Input
                      value={dates[row.kind]?.batchNumber ?? ""}
                      onChange={(e) =>
                        vaccine(row.kind, { batchNumber: e.target.value })
                      }
                    />
                  </F>
                  <F label="ملاحظات" className="sm:col-span-2">
                    <Input
                      value={dates[row.kind]?.notes ?? ""}
                      onChange={(e) =>
                        vaccine(row.kind, { notes: e.target.value })
                      }
                    />
                  </F>
                </div>
              </article>
            ))}
          </div>
          <div className="sticky bottom-0 border-t bg-white/95 py-4 backdrop-blur">
            <Button
              className="w-full bg-[#2563eb]"
              disabled={saving}
              onClick={save}
            >
              {saving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              حفظ ملف الحيوان والدفتر القديم
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
function Section({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof Activity;
  title: string;
  text: string;
}) {
  return (
    <div className="flex items-start gap-3 border-b pb-4">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#eef2ff] text-[#2563eb]">
        <Icon className="size-5" />
      </span>
      <div>
        <h2 className="font-black">{title}</h2>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{text}</p>
      </div>
    </div>
  );
}
function F({
  label,
  children,
  required,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
  className?: string;
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      <Label>
        {label}
        {required && <span className="mr-1 text-red-500">*</span>}
      </Label>
      {children}
    </div>
  );
}
