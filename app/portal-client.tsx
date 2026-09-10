"use client";

import { FormEvent, useRef, useState } from "react";
import {
  CalendarCheck2,
  ChevronLeft,
  ChevronRight,
  Dog,
  FileCheck2,
  Loader2,
  LockKeyhole,
  Megaphone,
  PawPrint,
  Plus,
  Search,
  ShieldCheck,
  Stethoscope,
  Syringe,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { speciesLabel } from "@/lib/vet-data";
import type { ClinicSettings } from "@/lib/clinic-settings-shared";

type PortalResult = {
  patient: {
    name: string;
    ownerName: string;
    species: string;
    breed: string;
    sex: string;
    ageValue: number | null;
    ageUnit: string;
    color: string;
    photoUrl: string | null;
  };
  prevention: Array<{
    kind: string;
    title: string;
    current_status: string;
    given_date: string | null;
    due_date: string | null;
    product: string;
  }>;
  visits: PortalVisit[];
  privacy: string;
};
type PortalVisit = {
  id: string;
  visitType: string;
  date: string;
  complaint?: string;
  history?: string;
  diagnosis?: string;
  treatment?: string;
  followupDate?: string | null;
  grooming?: { services?: string[]; sedation?: string; notes?: string };
  medications?: Array<{
    name: string;
    dose: string;
    route: string;
    frequency: string;
    duration: string;
    instructions: string;
  }>;
  procedures?: Array<{
    category: string;
    procedure_type: string;
    procedure_date: string | null;
    anesthesia: string;
    details: string;
    notes: string;
  }>;
  diagnostics?: Array<{
    category: string;
    title: string;
    results_json: string;
    interpretation: string;
    notes: string;
  }>;
  findings?: Array<{
    system_label: string;
    selected_signs: string;
    notes: string;
  }>;
};

const typeLabel: Record<string, string> = {
  core_vaccine: "اللقاح الأساسي / الدوري",
  vaccine: "اللقاح الأساسي / الدوري",
  rabies: "لقاح داء الكلب",
  fungal_vaccine: "لقاح الفطريات",
  deworming: "جرعة الديدان",
  ectoparasite: "قطرات الحشرات الخارجية",
};
function formatDate(value: string | null) {
  if (!value) return "غير محدد";
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return year && month && day ? `${day}-${month}-${year}` : "غير محدد";
}

export function PortalClient({ settings }: { settings: ClinicSettings }) {
  const [phone, setPhone] = useState("");
  const [petName, setPetName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<PortalResult | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const response = await fetch("/api/portal/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, petName }),
      });
      const payload = (await response.json()) as PortalResult & {
        error?: string;
      };
      if (!response.ok) throw new Error(payload.error || "تعذّر فتح الملف.");
      setResult(payload);
    } catch (lookupError) {
      setError(
        lookupError instanceof Error ? lookupError.message : "تعذّر فتح الملف.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-[2.6rem] border border-white/80 bg-white/90 p-5 shadow-[0_35px_90px_rgba(42,46,110,0.18)] backdrop-blur-xl sm:p-8">
      {!result ? (
        <>
          <BannerCarousel settings={settings} />
          <div className="mb-7 flex items-start justify-between gap-4">
            <div>
              <p
                className="mb-2 text-xs font-bold tracking-widest"
                style={{ color: settings.portalPrimary }}
              >
                {settings.portalEyebrow}
              </p>
              <h2 className="text-2xl font-black">{settings.portalTitle}</h2>
              <p className="mt-2 text-sm leading-6 text-[#6b7b82]">
                {settings.portalDescription}
              </p>
            </div>
            <span
              className="grid size-12 shrink-0 place-items-center rounded-[1.2rem] bg-[#eeecff]"
              style={{ color: settings.portalPrimary }}
            >
              <Plus className="size-7" strokeWidth={3} />
            </span>
          </div>
          <form onSubmit={submit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="portal-phone">رقم هاتف المربي</Label>
              <Input
                id="portal-phone"
                dir="ltr"
                inputMode="tel"
                autoComplete="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="0770 000 0000"
                className="h-12 rounded-xl bg-[#f7faf9] text-right"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="portal-pet-name">اسم الحيوان</Label>
              <Input
                id="portal-pet-name"
                value={petName}
                onChange={(event) => setPetName(event.target.value)}
                placeholder="مثال: لولو"
                className="h-12 rounded-2xl bg-[#f7f8fc]"
                required
              />
            </div>
            {error && (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700"
              >
                {error}
              </div>
            )}
            <Button
              type="submit"
              style={{ backgroundColor: settings.portalPrimary }}
              className="h-12 w-full rounded-2xl text-base font-bold shadow-[0_12px_25px_rgba(91,75,219,0.22)]"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                <Search className="size-5" />
              )}
              عرض بطاقة الحيوان
            </Button>
          </form>
          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-[#e2e5f2] bg-[#f7f8fc] p-4 text-xs leading-6 text-[#66708b]">
            <LockKeyhole className="mt-0.5 size-4 shrink-0 text-[#5b4bdb]" />
            تظهر البيانات الأساسية ومواعيد الوقاية فقط؛ لا تظهر تفاصيل الحالة
            الطبية.
          </div>
        </>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-2xl bg-[#fff4cf] text-[#8a6810]">
                {result.patient.photoUrl ? (
                  <img
                    src={result.patient.photoUrl}
                    alt={`صورة ${result.patient.name}`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Dog className="size-7" />
                )}
              </span>
              <div>
                <p className="text-xs font-bold text-[#2563eb]">
                  بطاقة الحيوان
                </p>
                <h2 className="text-2xl font-black">{result.patient.name}</h2>
              </div>
            </div>
            <Badge className="bg-[#e8f5f2] text-[#2563eb] hover:bg-[#e8f5f2]">
              ملف مطابق
            </Badge>
          </div>
          <div className="grid grid-cols-2 gap-3 rounded-2xl bg-[#f7faf9] p-4 text-sm">
            <InfoRow label="اسم المربي" value={result.patient.ownerName} />
            <InfoRow
              label="النوع"
              value={speciesLabel(result.patient.species)}
            />
            <InfoRow
              label="السلالة"
              value={result.patient.breed || "غير محددة"}
            />
            <InfoRow
              label="العمر"
              value={
                result.patient.ageValue === null
                  ? "غير محدد"
                  : `${result.patient.ageValue} ${result.patient.ageUnit}`
              }
            />
            <InfoRow label="الجنس" value={result.patient.sex || "غير محدد"} />
            <InfoRow label="اللون" value={result.patient.color || "غير محدد"} />
          </div>
          <div>
            <div className="mb-3 flex items-center gap-2">
              <CalendarCheck2 className="size-5 text-[#2563eb]" />
              <h3 className="font-black">اللقاحات والوقاية المسجلة</h3>
            </div>
            <div className="space-y-3">
              {result.prevention.length ? (
                result.prevention.map((record, index) => (
                  <article
                    key={`${record.kind}-${index}`}
                    className="rounded-2xl border border-[#e1eae7] p-4"
                  >
                    <div className="flex items-center gap-3">
                      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#e8f5f2] text-[#2563eb]">
                        <Syringe className="size-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-black">
                          {typeLabel[record.kind] || record.title}
                        </p>
                        <p className="mt-1 text-xs text-[#6b7b82]">
                          {record.product || "مسجل في دفتر اللقاحات"}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 grid gap-2 rounded-xl bg-[#f7faf9] p-3 text-xs sm:grid-cols-2">
                      <span>
                        تاريخ الإعطاء:{" "}
                        <strong>{formatDate(record.given_date)}</strong>
                      </span>
                      {record.due_date && (
                        <span>
                          الموعد القادم:{" "}
                          <strong className="text-[#2563eb]">
                            {formatDate(record.due_date)}
                          </strong>
                        </span>
                      )}
                    </div>
                  </article>
                ))
              ) : (
                <p className="rounded-xl bg-[#f7faf9] p-4 text-sm text-muted-foreground">
                  لا توجد لقاحات مسجلة بتاريخ إعطاء.
                </p>
              )}
            </div>
          </div>
          {result.visits.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Stethoscope
                  className="size-5"
                  style={{ color: settings.portalPrimary }}
                />
                <h3 className="font-black">
                  الزيارات التي سمحت العيادة بعرضها
                </h3>
              </div>
              {result.visits.map((visit) => (
                <VisitCard key={visit.id} visit={visit} />
              ))}
            </div>
          )}
          <div className="flex items-start gap-2 rounded-xl bg-[#eef2ff] p-3 text-xs leading-5 text-[#3f6666]">
            <ShieldCheck className="mt-0.5 size-4 shrink-0" />
            {result.privacy}
          </div>
          <Button
            variant="outline"
            className="w-full rounded-xl"
            onClick={() => setResult(null)}
          >
            البحث عن حيوان آخر
          </Button>
        </div>
      )}
    </div>
  );
}

function BannerCarousel({ settings }: { settings: ClinicSettings }) {
  const images = settings.portalBannerImageKeys?.length
    ? settings.portalBannerImageKeys
    : settings.portalBannerImageKey
      ? [settings.portalBannerImageKey]
      : [];
  const [index, setIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const visible =
    settings.portalBannerEnabled &&
    (images.length > 0 ||
      settings.portalBannerTitle ||
      settings.portalBannerBody);

  if (!visible) return null;

  const move = (direction: number) => {
    if (images.length < 2) return;
    setIndex(
      (current) => (current + direction + images.length) % images.length,
    );
  };

  return (
    <div
      className="mb-5 overflow-hidden rounded-2xl border"
      style={{
        backgroundColor: `${settings.portalAccent}33`,
        borderColor: `${settings.portalAccent}88`,
      }}
    >
      {images.length > 0 && (
        <div
          className="relative aspect-[8/3] w-full touch-pan-y overflow-hidden bg-white"
          onTouchStart={(event) => {
            touchStartX.current = event.touches[0]?.clientX ?? null;
          }}
          onTouchEnd={(event) => {
            const start = touchStartX.current;
            const end = event.changedTouches[0]?.clientX;
            touchStartX.current = null;
            if (start == null || end == null || Math.abs(end - start) < 40)
              return;
            move(end < start ? 1 : -1);
          }}
        >
          <img
            key={images[index]}
            src={`/api/branding/banner?key=${encodeURIComponent(images[index])}`}
            alt={`إعلان العيادة ${index + 1}`}
            className="h-full w-full select-none object-cover"
            draggable={false}
          />
          {images.length > 1 && (
            <>
              <button
                type="button"
                aria-label="الصورة السابقة"
                onClick={() => move(-1)}
                className="absolute right-3 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-black/45 text-white backdrop-blur"
              >
                <ChevronRight className="size-5" />
              </button>
              <button
                type="button"
                aria-label="الصورة التالية"
                onClick={() => move(1)}
                className="absolute left-3 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-black/45 text-white backdrop-blur"
              >
                <ChevronLeft className="size-5" />
              </button>
              <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5 rounded-full bg-black/35 px-2 py-1.5">
                {images.map((key, itemIndex) => (
                  <button
                    key={key}
                    type="button"
                    aria-label={`عرض الإعلان ${itemIndex + 1}`}
                    onClick={() => setIndex(itemIndex)}
                    className={`size-2 rounded-full ${itemIndex === index ? "bg-white" : "bg-white/45"}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}
      {(settings.portalBannerTitle || settings.portalBannerBody) && (
        <div className="flex items-start gap-3 p-4">
          <Megaphone
            className="mt-0.5 size-5 shrink-0"
            style={{ color: settings.portalPrimary }}
          />
          <div>
            {settings.portalBannerTitle && (
              <p className="font-black">{settings.portalBannerTitle}</p>
            )}
            {settings.portalBannerBody && (
              <p className="mt-1 text-sm leading-6 text-[#5f7078]">
                {settings.portalBannerBody}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-[#788890]">{label}</p>
      <p className="mt-1 font-bold">{value}</p>
    </div>
  );
}
function ClinicalBlock({ title, value }: { title: string; value: string }) {
  return (
    <section className="rounded-2xl border p-4">
      <p className="text-xs font-bold text-muted-foreground">{title}</p>
      <p className="mt-2 text-sm font-bold leading-7">{value}</p>
    </section>
  );
}
function VisitCard({ visit }: { visit: PortalVisit }) {
  const rows: Array<[string, string]> = [];
  if (visit.complaint) rows.push(["الشكوى", visit.complaint]);
  if (visit.history) rows.push(["تاريخ الحالة", visit.history]);
  if (visit.diagnosis) rows.push(["التشخيص", visit.diagnosis]);
  if (visit.treatment) rows.push(["خطة العلاج", visit.treatment]);
  if (visit.followupDate)
    rows.push(["موعد المتابعة", formatDate(visit.followupDate)]);
  const grooming = visit.grooming?.services?.length
    ? [
        ...visit.grooming.services,
        visit.grooming.sedation,
        visit.grooming.notes,
      ]
        .filter(Boolean)
        .join(" · ")
    : "";
  if (grooming) rows.push(["الحلاقة والغسل", grooming]);
  return (
    <article className="rounded-2xl border border-[#dce2f1] p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 font-black">
          <FileCheck2 className="size-4" />
          {visitTypeLabel(visit.visitType)}
        </div>
        <span className="text-xs font-bold text-[#2563eb]">
          {formatDate(visit.date)}
        </span>
      </div>
      <div className="space-y-2">
        {rows.map(([label, value]) => (
          <ClinicalBlock key={label} title={label} value={value} />
        ))}
        {visit.findings?.map((finding, index) => (
          <ClinicalBlock
            key={`f-${index}`}
            title={`الفحص: ${finding.system_label}`}
            value={[parseList(finding.selected_signs).join("، "), finding.notes]
              .filter(Boolean)
              .join(" — ")}
          />
        ))}
        {visit.medications?.map((med, index) => (
          <ClinicalBlock
            key={`m-${index}`}
            title={`دواء: ${med.name}`}
            value={[
              med.dose,
              med.route,
              med.frequency,
              med.duration,
              med.instructions,
            ]
              .filter(Boolean)
              .join(" · ")}
          />
        ))}
        {visit.procedures?.map((procedure, index) => (
          <ClinicalBlock
            key={`p-${index}`}
            title="عملية / إجراء"
            value={[
              procedure.procedure_type,
              formatDate(procedure.procedure_date),
              procedure.anesthesia,
              procedure.details,
              procedure.notes,
            ]
              .filter((value) => value && value !== "غير محدد")
              .join(" · ")}
          />
        ))}
        {visit.diagnostics?.map((diagnostic, index) => (
          <ClinicalBlock
            key={`d-${index}`}
            title={`فحص: ${diagnostic.title}`}
            value={[
              diagnostic.interpretation,
              diagnostic.notes,
              ...parseDiagnosticResults(diagnostic.results_json),
            ]
              .filter(Boolean)
              .join(" · ")}
          />
        ))}
      </div>
    </article>
  );
}
function parseList(value: string) {
  try {
    const result = JSON.parse(value);
    return Array.isArray(result) ? result.map(String) : [];
  } catch {
    return [];
  }
}
function parseDiagnosticResults(value: string) {
  try {
    const result = JSON.parse(value) as Array<{
      name?: string;
      result?: string;
      unit?: string;
    }>;
    return Array.isArray(result)
      ? result
          .map((item) =>
            [item.name, item.result, item.unit].filter(Boolean).join(" "),
          )
          .filter(Boolean)
      : [];
  } catch {
    return [];
  }
}
function visitTypeLabel(value: string) {
  return (
    (
      {
        sick_visit: "حالة مرضية",
        emergency: "حالة مرضية",
        routine: "زيارة وقائية",
        preventive: "زيارة وقائية",
        surgery: "عمليات جراحية وتنظيف الأسنان",
        dental: "عمليات جراحية وتنظيف الأسنان",
        diagnostics: "تحاليل وتصوير",
        grooming: "حلاقة وغسل",
      } as Record<string, string>
    )[value] || "زيارة"
  );
}
