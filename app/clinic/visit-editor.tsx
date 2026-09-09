"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Beaker,
  Check,
  ClipboardCheck,
  HeartPulse,
  ImagePlus,
  Loader2,
  Pill,
  Plus,
  Scissors,
  Sparkles,
  Stethoscope,
  Syringe,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  diagnosisSuggestions,
  PREVENTIVE_TYPES,
  PROCEDURE_CATEGORIES,
} from "@/lib/clinical-data";
import {
  labTemplates,
  LAB_REFERENCE_NOTE,
  type LabResultRow,
} from "@/lib/lab-reference";
import { BODY_SYSTEMS } from "@/lib/vet-data";
import {
  calculatedDose,
  drugMatches,
  drugWarnings,
  treatmentSuggestions,
  VET_DRUGS,
} from "@/lib/veterinary-drugs";

export type VisitBundleClient = {
  visit: {
    visitType:
      | "sick_visit"
      | "routine"
      | "preventive"
      | "surgery"
      | "dental"
      | "diagnostics"
      | "emergency"
      | "grooming";
    chiefComplaint: string;
    history: string;
    medicalHistory: {
      symptomOnset: string;
      appetite: string;
      waterIntake: string;
      foodDetails: string;
      vomiting: string;
      urination: string;
      defecation: string;
      salivation: string;
      previousDiseases: string;
      medicationsGiven: string;
      generalCondition: string;
      bodyCondition: string;
      dehydration: string;
    };
    grooming: {
      services: string[];
      sedation: string;
      sedationDetails: string;
      notes: string;
    };
    temperatureC: number | null;
    heartRate: number | null;
    respiratoryRate: number | null;
    weightKg: number | null;
    diagnosis: string;
    differentials: string;
    treatmentPlan: string;
    internalNotes: string;
    followupDate: string | null;
    costIqd: number;
  };
  systemFindings: Array<{
    systemKey: string;
    systemLabel: string;
    selectedSigns: string[];
    notes: string;
  }>;
  medications: Array<{
    name: string;
    dose: string;
    route: string;
    frequency: string;
    duration: string;
    instructions: string;
    ownerVisible: boolean;
  }>;
  preventiveRecords: Array<{
    kind:
      | "core_vaccine"
      | "vaccine"
      | "rabies"
      | "fungal_vaccine"
      | "deworming"
      | "ectoparasite"
      | "treatment"
      | "followup";
    title: string;
    currentStatus: "yes" | "no" | "unknown";
    givenDate: string | null;
    dueDate: string | null;
    product: string;
    batchNumber: string;
    notes: string;
    ownerVisible: boolean;
    inventoryItemId?: string | null;
    inventoryQuantity: number;
  }>;
  procedures: Array<{
    category: string;
    procedureType: string;
    procedureDate: string | null;
    anesthesia: string;
    details: string;
    costIqd: number;
    notes: string;
  }>;
  diagnostics: Array<{
    id?: string;
    category: string;
    title: string;
    results: LabResultRow[];
    interpretation: string;
    notes: string;
    costIqd: number;
    pendingImages?: File[];
  }>;
};

const blankMedication: VisitBundleClient["medications"][number] = {
  name: "",
  dose: "",
  route: "",
  frequency: "",
  duration: "",
  instructions: "",
  ownerVisible: false,
};

const blankMedicalHistory: VisitBundleClient["visit"]["medicalHistory"] = {
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

const blankGrooming: VisitBundleClient["visit"]["grooming"] = {
  services: [],
  sedation: "بدون تخدير",
  sedationDetails: "",
  notes: "",
};

const groomingServices = [
  "غسل كامل",
  "حلاقة كاملة",
  "غسل وحلاقة",
  "قص الأظافر",
  "تنظيف الأذنين",
  "إزالة العقد وتشذيب الشعر",
  "تنظيف صحي حول المناطق الحساسة",
  "تفريغ الغدد الشرجية",
];

function emptyBundle(): VisitBundleClient {
  return {
    visit: {
      visitType: "sick_visit",
      chiefComplaint: "",
      history: "",
      medicalHistory: { ...blankMedicalHistory },
      grooming: { ...blankGrooming },
      temperatureC: null,
      heartRate: null,
      respiratoryRate: null,
      weightKg: null,
      diagnosis: "",
      differentials: "",
      treatmentPlan: "",
      internalNotes: "",
      followupDate: null,
      costIqd: 0,
    },
    systemFindings: BODY_SYSTEMS.map((system) => ({
      systemKey: system.key,
      systemLabel: system.label,
      selectedSigns: [],
      notes: "",
    })),
    medications: [{ ...blankMedication }],
    preventiveRecords: PREVENTIVE_TYPES.map((item) => ({
      kind: item.kind,
      title: item.defaultTitle,
      currentStatus: "unknown" as const,
      givenDate: null,
      dueDate: null,
      product: "",
      batchNumber: "",
      notes: "",
      ownerVisible: true,
      inventoryItemId: null,
      inventoryQuantity: 1,
    })),
    procedures: [],
    diagnostics: [],
  };
}

function initialBundle(value?: VisitBundleClient): VisitBundleClient {
  const base = emptyBundle();
  if (!value) return base;
  const prevention = new Map<
    string,
    VisitBundleClient["preventiveRecords"][number]
  >(
    value.preventiveRecords.map((item) => [
      item.kind === "vaccine" ? "core_vaccine" : item.kind,
      item,
    ]),
  );
  return {
    ...value,
    visit: {
      ...base.visit,
      ...value.visit,
      visitType:
        value.visit.visitType === "dental" ? "surgery" : value.visit.visitType,
      medicalHistory: {
        ...base.visit.medicalHistory,
        ...(value.visit.medicalHistory ?? {}),
      },
      grooming: { ...base.visit.grooming, ...(value.visit.grooming ?? {}) },
    },
    systemFindings: BODY_SYSTEMS.map(
      (system) =>
        value.systemFindings.find((item) => item.systemKey === system.key) ?? {
          systemKey: system.key,
          systemLabel: system.label,
          selectedSigns: [],
          notes: "",
        },
    ),
    medications: value.medications.length
      ? value.medications
      : [{ ...blankMedication }],
    preventiveRecords: base.preventiveRecords.map((item) => ({
      ...item,
      ...(prevention.get(item.kind) ?? {}),
    })),
    procedures: value.procedures ?? [],
    diagnostics: value.diagnostics ?? [],
  };
}

type StepId =
  | "basics"
  | "signs"
  | "clinical"
  | "diagnostics"
  | "preventive"
  | "surgery"
  | "grooming"
  | "finish";

const stepDetails: Record<
  StepId,
  { id: StepId; title: string; icon: typeof Stethoscope }
> = {
  basics: { id: "basics", title: "نوع الزيارة", icon: Stethoscope },
  signs: { id: "signs", title: "العلامات", icon: HeartPulse },
  clinical: { id: "clinical", title: "التشخيص والعلاج", icon: Pill },
  diagnostics: { id: "diagnostics", title: "التحاليل والتصوير", icon: Beaker },
  preventive: { id: "preventive", title: "اللقاحات والجرع", icon: Syringe },
  surgery: { id: "surgery", title: "نوع العملية", icon: Scissors },
  grooming: { id: "grooming", title: "الحلاقة والغسل", icon: Sparkles },
  finish: { id: "finish", title: "الكلفة والحفظ", icon: ClipboardCheck },
};

function stepsFor(type: VisitBundleClient["visit"]["visitType"]) {
  const ids: StepId[] =
    type === "surgery"
      ? ["basics", "signs", "surgery", "finish"]
      : type === "grooming"
        ? ["basics", "grooming", "finish"]
        : type === "routine" || type === "preventive"
          ? ["basics", "preventive", "finish"]
          : type === "diagnostics"
            ? ["basics", "diagnostics", "finish"]
            : ["basics", "signs", "clinical", "finish"];
  return ids.map((id) => stepDetails[id]);
}

const visitTypeLabels: Record<string, string> = {
  sick_visit: "حالة مرضية",
  surgery: "عمليات جراحية وتنظيف الأسنان",
  preventive: "فحص روتيني / لقاحات / زيارة وقائية",
  diagnostics: "فحص أجهزة / تحاليل / أشعة / سونار",
  grooming: "حلاقة وغسل",
};

function numeric(value: string) {
  if (!value.trim()) return null;
  const result = Number(value);
  return Number.isFinite(result) ? result : null;
}

type InventoryVaccine = {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
};

export function VisitEditor({
  species,
  initialValue,
  saving,
  submitLabel = "حفظ الزيارة الآن",
  onSave,
}: {
  species: string;
  initialValue?: VisitBundleClient;
  saving: boolean;
  submitLabel?: string;
  onSave: (bundle: VisitBundleClient) => void;
}) {
  const [step, setStep] = useState(0);
  const [bundle, setBundle] = useState<VisitBundleClient>(() =>
    initialBundle(initialValue),
  );
  const [fluidType, setFluidType] = useState("رينجر لاكتات");
  const [dehydrationPercent, setDehydrationPercent] = useState("7");
  const [maintenanceOverride, setMaintenanceOverride] = useState("");
  const [ongoingLosses, setOngoingLosses] = useState("0");
  const [fluidHours, setFluidHours] = useState("24");
  const [inventoryVaccines, setInventoryVaccines] = useState<InventoryVaccine[]>([]);
  const templates = useMemo(() => labTemplates(species), [species]);

  useEffect(() => {
    let active = true;
    fetch("/api/clinic/inventory")
      .then(async (response) => {
        if (!response.ok) throw new Error("inventory");
        return response.json() as Promise<{ items?: InventoryVaccine[] }>;
      })
      .then((data) => {
        if (active) setInventoryVaccines(data.items ?? []);
      })
      .catch(() => {
        if (active) setInventoryVaccines([]);
      });
    return () => {
      active = false;
    };
  }, []);
  const flowSteps = useMemo(
    () => stepsFor(bundle.visit.visitType),
    [bundle.visit.visitType],
  );
  const currentStep = flowSteps[Math.min(step, flowSteps.length - 1)];
  const procedureCategories = useMemo(
    () =>
      ["bird", "rabbit", "hamster"].includes(species)
        ? PROCEDURE_CATEGORIES
        : PROCEDURE_CATEGORIES.filter((item) => item.value !== "birds_exotics"),
    [species],
  );
  const selectedSigns = useMemo(
    () => bundle.systemFindings.flatMap((item) => item.selectedSigns),
    [bundle.systemFindings],
  );
  const selectedSystems = useMemo(
    () =>
      bundle.systemFindings
        .filter((item) => item.selectedSigns.length || item.notes.trim())
        .map((item) => item.systemKey),
    [bundle.systemFindings],
  );
  const suggestions = useMemo(
    () => diagnosisSuggestions(selectedSigns, species),
    [selectedSigns, species],
  );
  const groomingVisit = bundle.visit.visitType === "grooming";
  const detailedHistoryVisit = [
    "sick_visit",
    "emergency",
    "surgery",
    "diagnostics",
  ].includes(bundle.visit.visitType);
  const fluidPlan = calculateFluidPlan({
    species,
    weightKg: Number(bundle.visit.weightKg || 0),
    dehydrationPercent: Number(dehydrationPercent || 0),
    maintenanceOverride: Number(maintenanceOverride || 0),
    ongoingLosses: Number(ongoingLosses || 0),
    hours: Number(fluidHours || 24),
  });

  function setVisit<K extends keyof VisitBundleClient["visit"]>(
    key: K,
    value: VisitBundleClient["visit"][K],
  ) {
    setBundle((current) => ({
      ...current,
      visit: { ...current.visit, [key]: value },
    }));
  }

  function updateFinding(
    systemKey: string,
    patch: Partial<VisitBundleClient["systemFindings"][number]>,
  ) {
    setBundle((current) => ({
      ...current,
      systemFindings: current.systemFindings.map((item) =>
        item.systemKey === systemKey ? { ...item, ...patch } : item,
      ),
    }));
  }

  function updateMedication(
    index: number,
    patch: Partial<VisitBundleClient["medications"][number]>,
  ) {
    setBundle((current) => ({
      ...current,
      medications: current.medications.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    }));
  }

  function updatePrevention(
    index: number,
    patch: Partial<VisitBundleClient["preventiveRecords"][number]>,
  ) {
    setBundle((current) => ({
      ...current,
      preventiveRecords: current.preventiveRecords.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    }));
  }

  function updateMedicalHistory(
    patch: Partial<VisitBundleClient["visit"]["medicalHistory"]>,
  ) {
    setBundle((current) => ({
      ...current,
      visit: {
        ...current.visit,
        medicalHistory: { ...current.visit.medicalHistory, ...patch },
      },
    }));
  }

  function updateGrooming(
    patch: Partial<VisitBundleClient["visit"]["grooming"]>,
  ) {
    setBundle((current) => ({
      ...current,
      visit: {
        ...current.visit,
        grooming: { ...current.visit.grooming, ...patch },
      },
    }));
  }

  function addDiagnostic(category: string) {
    const template = templates.find((item) => item.category === category);
    if (!template) return;
    setBundle((current) => ({
      ...current,
      diagnostics: [
        ...current.diagnostics,
        {
          id: crypto.randomUUID(),
          category: template.category,
          title: template.title,
          results: template.rows.map((row) => ({
            ...row,
            result: "",
            flag: "unchecked",
          })),
          interpretation: "",
          notes: "",
          costIqd: 0,
          pendingImages: [],
        },
      ],
    }));
  }

  function save() {
    const clinicalType =
      bundle.visit.visitType === "sick_visit" ||
      bundle.visit.visitType === "emergency";
    const surgeryType = bundle.visit.visitType === "surgery";
    const preventiveType =
      bundle.visit.visitType === "routine" ||
      bundle.visit.visitType === "preventive";
    const diagnosticType = bundle.visit.visitType === "diagnostics";
    const groomingType = bundle.visit.visitType === "grooming";
    const cleaned: VisitBundleClient = {
      ...bundle,
      visit: groomingType
        ? {
            ...bundle.visit,
            chiefComplaint: bundle.visit.grooming.services.join("، "),
            history: "",
            medicalHistory: { ...blankMedicalHistory },
            diagnosis: "",
            differentials: "",
            treatmentPlan: "",
            temperatureC: null,
            heartRate: null,
            respiratoryRate: null,
            followupDate: null,
          }
        : { ...bundle.visit, grooming: { ...blankGrooming } },
      systemFindings: clinicalType || surgeryType ? bundle.systemFindings : [],
      medications: clinicalType
        ? bundle.medications.filter((item) => item.name.trim())
        : [],
      preventiveRecords: preventiveType
        ? bundle.preventiveRecords.filter(
            (item) =>
              item.currentStatus !== "unknown" ||
              Boolean(
                item.givenDate ||
                item.dueDate ||
                item.product ||
                item.batchNumber ||
                item.notes ||
                item.inventoryItemId,
              ),
          )
        : [],
      procedures: surgeryType
        ? bundle.procedures.filter((item) => item.procedureType.trim())
        : [],
      diagnostics: diagnosticType
        ? bundle.diagnostics.filter((item) => item.title.trim())
        : [],
    };
    if (!cleaned.visit.chiefComplaint.trim() && clinicalType) {
      toast.error("اكتب سبب الزيارة أو الشكوى الرئيسية.");
      setStep(0);
      return;
    }
    if (surgeryType && !cleaned.procedures.length) {
      toast.error("اختر نوع العملية قبل الحفظ.");
      setStep(flowSteps.findIndex((item) => item.id === "surgery"));
      return;
    }
    if (preventiveType && !cleaned.preventiveRecords.length) {
      toast.error("حدد لقاحاً أو جرعة واحدة على الأقل.");
      setStep(flowSteps.findIndex((item) => item.id === "preventive"));
      return;
    }
    if (diagnosticType && !cleaned.diagnostics.length) {
      toast.error("أضف فحصاً أو تحليلاً أو صورة واحدة على الأقل.");
      setStep(flowSteps.findIndex((item) => item.id === "diagnostics"));
      return;
    }
    if (groomingType && !cleaned.visit.grooming.services.length) {
      toast.error("حدد خدمة غسل أو حلاقة واحدة على الأقل.");
      setStep(flowSteps.findIndex((item) => item.id === "grooming"));
      return;
    }
    if (
      fluidPlan &&
      cleaned.visit.treatmentPlan.includes("[خطة سوائل محسوبة]") === false
    ) {
      cleaned.visit.treatmentPlan =
        `${cleaned.visit.treatmentPlan}\n[خطة سوائل محسوبة] ${fluidType} — الوزن ${fluidPlan.weight} كغم، الجفاف ${fluidPlan.dehydration}%، العجز ${fluidPlan.deficit} مل، الصيانة ${fluidPlan.maintenance} مل/24 ساعة، الفواقد المستمرة ${fluidPlan.losses} مل، المجموع ${fluidPlan.total} مل خلال ${fluidPlan.hours} ساعة (${fluidPlan.hourly} مل/ساعة).`.trim();
    }
    onSave(cleaned);
  }

  return (
    <div
      className="flex min-h-full flex-col"
      onKeyDownCapture={(event) => {
        if (event.key === "Enter" && event.target instanceof HTMLInputElement)
          event.preventDefault();
      }}
    >
      <div className="border-b bg-white px-5 py-4 sm:px-7">
        <div
          className="grid gap-2"
          style={{
            gridTemplateColumns: `repeat(${flowSteps.length}, minmax(0, 1fr))`,
          }}
        >
          {flowSteps.map((item, index) => (
            <button
              key={item.title}
              type="button"
              onClick={() => setStep(index)}
              className="text-right"
            >
              <span
                className={`mb-2 block h-1.5 rounded-full ${index <= step ? "bg-[#2563eb]" : "bg-[#dce2f1]"}`}
              />
              <span
                className={`hidden items-center gap-1 text-[11px] font-bold sm:flex ${index === step ? "text-[#2563eb]" : "text-[#7b8a90]"}`}
              >
                <item.icon className="size-3.5" />
                {item.title}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 space-y-7 px-5 py-6 sm:px-7">
        {currentStep.id === "basics" && (
          <>
            <SectionTitle
              icon={Stethoscope}
              title={groomingVisit ? "نوع الزيارة" : "سبب الزيارة والفحص العام"}
              description={
                groomingVisit
                  ? "زيارة خدمية مختصرة؛ لن تظهر خطوات العلامات أو التشخيص أو العلاج."
                  : "التشخيص يأتي لاحقاً بعد تسجيل التاريخ المرضي وتحديد العلامات وفحص أجهزة الجسم."
              }
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="نوع الزيارة" className="sm:col-span-2">
                <Select
                  value={bundle.visit.visitType}
                  onValueChange={(value) => {
                    const visitType =
                      value as VisitBundleClient["visit"]["visitType"];
                    setVisit("visitType", visitType);
                    setStep(0);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(visitTypeLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              {!groomingVisit && (
                <>
                  <Field
                    label="الشكوى الرئيسية / سبب الزيارة"
                    className="sm:col-span-2"
                  >
                    <Textarea
                      value={bundle.visit.chiefComplaint}
                      onChange={(event) =>
                        setVisit("chiefComplaint", event.target.value)
                      }
                      rows={4}
                      placeholder={
                        bundle.visit.visitType === "dental"
                          ? "ملاحظات الأسنان أو القلع والتنظيف المطلوب"
                          : bundle.visit.visitType === "surgery"
                            ? "سبب العملية أو ملاحظات ما قبل الجراحة"
                            : bundle.visit.visitType === "diagnostics"
                              ? "سبب طلب الفحص أو المنطقة المراد تصويرها"
                              : bundle.visit.visitType === "routine" ||
                                  bundle.visit.visitType === "preventive"
                                ? "ملاحظات الفحص الروتيني (اختياري)"
                                : "ما الذي يعاني منه الحيوان؟ ومتى بدأت العلامات؟"
                      }
                    />
                  </Field>
                  {!detailedHistoryVisit && (
                    <Field
                      label="ملاحظات عامة عن التاريخ الصحي"
                      className="sm:col-span-2"
                    >
                      <Textarea
                        value={bundle.visit.history}
                        onChange={(event) =>
                          setVisit("history", event.target.value)
                        }
                        rows={4}
                      />
                    </Field>
                  )}
                </>
              )}
            </div>
            {!groomingVisit && detailedHistoryVisit && (
              <>
                <MedicalHistoryFields
                  value={bundle.visit.medicalHistory}
                  onChange={updateMedicalHistory}
                />
                <Field label="ملاحظات إضافية على التاريخ المرضي">
                  <Textarea
                    value={bundle.visit.history}
                    onChange={(event) =>
                      setVisit("history", event.target.value)
                    }
                    rows={3}
                    placeholder="أي معلومات إضافية لم تُذكر في الحقول أعلاه..."
                  />
                </Field>
              </>
            )}
            {!groomingVisit && (
              <>
                <SectionTitle
                  icon={Activity}
                  title="العلامات الحيوية"
                  description="اترك أي قياس فارغاً إذا لم يتم فحصه."
                />
                <div className="grid gap-4 sm:grid-cols-4">
                  <NumberField
                    label="الحرارة °م"
                    value={bundle.visit.temperatureC}
                    step="0.1"
                    onChange={(value) => setVisit("temperatureC", value)}
                  />
                  <NumberField
                    label="النبض / دقيقة"
                    value={bundle.visit.heartRate}
                    onChange={(value) => setVisit("heartRate", value)}
                  />
                  <NumberField
                    label="التنفس / دقيقة"
                    value={bundle.visit.respiratoryRate}
                    onChange={(value) => setVisit("respiratoryRate", value)}
                  />
                  <NumberField
                    label="الوزن كغم"
                    value={bundle.visit.weightKg}
                    step="0.01"
                    onChange={(value) => setVisit("weightKg", value)}
                  />
                </div>
              </>
            )}
          </>
        )}

        {currentStep.id === "signs" && (
          <>
            <SectionTitle
              icon={HeartPulse}
              title="العلامات حسب أجهزة الجسم"
              description="حدد الموجود فعلياً؛ تستخدم الاختيارات لإظهار اقتراحات تشخيصية في الخطوة التالية."
            />
            <Tabs
              defaultValue={BODY_SYSTEMS[0].key}
              dir="rtl"
              className="gap-5"
            >
              <TabsList
                variant="line"
                className="h-auto w-full justify-start overflow-x-auto border-b pb-2"
              >
                {BODY_SYSTEMS.map((system) => {
                  const count =
                    bundle.systemFindings.find(
                      (item) => item.systemKey === system.key,
                    )?.selectedSigns.length ?? 0;
                  return (
                    <TabsTrigger
                      key={system.key}
                      value={system.key}
                      className="shrink-0 px-3 py-2"
                    >
                      {system.shortLabel}
                      {count > 0 && <Badge className="px-1.5">{count}</Badge>}
                    </TabsTrigger>
                  );
                })}
              </TabsList>
              {BODY_SYSTEMS.map((system) => {
                const finding = bundle.systemFindings.find(
                  (item) => item.systemKey === system.key,
                )!;
                return (
                  <TabsContent
                    key={system.key}
                    value={system.key}
                    className="rounded-2xl border bg-[#fafcfc] p-5"
                  >
                    <h3 className="font-black">{system.label}</h3>
                    <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {system.signs.map((sign) => {
                        const checked = finding.selectedSigns.includes(sign);
                        return (
                          <label
                            key={sign}
                            className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm ${checked ? "border-[#2563eb] bg-[#eef2ff] text-[#0b5d58]" : "bg-white"}`}
                          >
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(value) =>
                                updateFinding(system.key, {
                                  selectedSigns:
                                    value === true
                                      ? [...finding.selectedSigns, sign]
                                      : finding.selectedSigns.filter(
                                          (item) => item !== sign,
                                        ),
                                })
                              }
                            />
                            {sign}
                          </label>
                        );
                      })}
                    </div>
                    <Field label={`ملاحظات ${system.label}`} className="mt-5">
                      <Textarea
                        value={finding.notes}
                        onChange={(event) =>
                          updateFinding(system.key, {
                            notes: event.target.value,
                          })
                        }
                        rows={3}
                        placeholder="الجس، الإصغاء، شدة العلامة أو مكانها..."
                      />
                    </Field>
                  </TabsContent>
                );
              })}
            </Tabs>
          </>
        )}

        {currentStep.id === "clinical" && (
          <>
            <SectionTitle
              icon={Sparkles}
              title="اقتراحات التشخيص"
              description="تظهر بعد العلامات كقائمة مساعدة للطبيب، ولا تُعد تشخيصاً تلقائياً."
            />
            <div className="rounded-2xl border border-[#cfe2de] bg-[#f5fbf9] p-4">
              {suggestions.length ? (
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setVisit("diagnosis", item)}
                      className="rounded-full border bg-white px-3 py-2 text-sm font-bold text-[#2563eb] hover:border-[#2563eb]"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  حدد العلامات أولاً، أو اكتب تشخيصك مباشرة أدناه.
                </p>
              )}
            </div>
            <div className="grid gap-4">
              <Field label="التشخيص الأقرب / النهائي">
                <Textarea
                  value={bundle.visit.diagnosis}
                  onChange={(event) =>
                    setVisit("diagnosis", event.target.value)
                  }
                  rows={3}
                  placeholder="اختر اقتراحاً أو اكتب التشخيص الذي توصلت إليه"
                />
              </Field>
              <Field label="التشخيصات التفريقية">
                <Textarea
                  value={bundle.visit.differentials}
                  onChange={(event) =>
                    setVisit("differentials", event.target.value)
                  }
                  rows={3}
                />
              </Field>
              <Field label="خطة العلاج">
                <Textarea
                  value={bundle.visit.treatmentPlan}
                  onChange={(event) =>
                    setVisit("treatmentPlan", event.target.value)
                  }
                  rows={4}
                />
              </Field>
              <div className="rounded-2xl border border-[#cfe2de] bg-[#f5fbf9] p-4">
                <p className="font-bold text-[#2563eb]">
                  حاسبة المغذي حسب الوزن والجفاف
                </p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  تحتسب العجز + صيانة 24 ساعة + الفواقد المستمرة. وزن الحيوان
                  مأخوذ من الفحص أعلاه.
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Field label="نوع المغذي">
                    <Select value={fluidType} onValueChange={setFluidType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="رينجر لاكتات">
                          رينجر لاكتات
                        </SelectItem>
                        <SelectItem value="نورمال سالين 0.9%">
                          نورمال سالين 0.9%
                        </SelectItem>
                        <SelectItem value="بلازما لايت">بلازما لايت</SelectItem>
                        <SelectItem value="دكستروز 5%">دكستروز 5%</SelectItem>
                        <SelectItem value="أخرى">أخرى</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="درجة الجفاف">
                    <Select
                      value={dehydrationPercent}
                      onValueChange={setDehydrationPercent}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">لا يوجد (0%)</SelectItem>
                        <SelectItem value="5">خفيف (5%)</SelectItem>
                        <SelectItem value="7">متوسط (7%)</SelectItem>
                        <SelectItem value="10">شديد (10%)</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="نسبة جفاف مخصصة %">
                    <Input
                      type="number"
                      min="0"
                      max="15"
                      step="0.5"
                      value={dehydrationPercent}
                      onChange={(event) =>
                        setDehydrationPercent(event.target.value)
                      }
                    />
                  </Field>
                  <Field label="الفواقد المستمرة (مل)">
                    <Input
                      type="number"
                      min="0"
                      value={ongoingLosses}
                      onChange={(event) => setOngoingLosses(event.target.value)}
                    />
                  </Field>
                  <Field label="معدل صيانة بديل (مل/كغم/يوم)">
                    <Input
                      type="number"
                      min="0"
                      value={maintenanceOverride}
                      onChange={(event) =>
                        setMaintenanceOverride(event.target.value)
                      }
                      placeholder="اختياري"
                    />
                  </Field>
                  <Field label="مدة الخطة بالساعات">
                    <Input
                      type="number"
                      min="1"
                      max="72"
                      value={fluidHours}
                      onChange={(event) => setFluidHours(event.target.value)}
                    />
                  </Field>
                  <div className="rounded-xl bg-white p-3 text-sm sm:col-span-2">
                    {fluidPlan ? (
                      <div className="grid grid-cols-2 gap-2">
                        <span>
                          عجز الجفاف: <strong>{fluidPlan.deficit} مل</strong>
                        </span>
                        <span>
                          الصيانة: <strong>{fluidPlan.maintenance} مل</strong>
                        </span>
                        <span>
                          المجموع: <strong>{fluidPlan.total} مل</strong>
                        </span>
                        <span>
                          المعدل: <strong>{fluidPlan.hourly} مل/ساعة</strong>
                        </span>
                      </div>
                    ) : (
                      <p>أدخل وزن الحيوان حتى تظهر النتيجة.</p>
                    )}
                  </div>
                </div>
                <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
                  حساب مساعد فقط؛ حالات الصدمة والقلب والكلى والجفاف الشديد
                  تحتاج تقييماً ومراقبة وتعديل الخطة من الطبيب.
                </p>
              </div>
              <Field label="ملاحظات الطبيب الداخلية">
                <Textarea
                  value={bundle.visit.internalNotes}
                  onChange={(event) =>
                    setVisit("internalNotes", event.target.value)
                  }
                  rows={3}
                />
              </Field>
            </div>
            <SectionTitle
              icon={Pill}
              title="الأدوية"
              description="الأدوية داخل لوحة الإدارة ولا تظهر في بوابة المربي."
            />
            {!!treatmentSuggestions(
              bundle.visit.diagnosis,
              species,
              selectedSystems,
            ).length && (
              <div className="rounded-2xl border border-[#cfe2de] bg-[#f5fbf9] p-4">
                <p className="mb-2 text-xs font-bold text-muted-foreground">
                  اقتراحات مرجعية حسب التشخيص والجهاز — القرار النهائي للطبيب:
                </p>
                <div className="flex flex-wrap gap-2">
                  {treatmentSuggestions(
                    bundle.visit.diagnosis,
                    species,
                    selectedSystems,
                  ).map((drug) => (
                    <button
                      key={drug.name}
                      type="button"
                      className="rounded-full border bg-white px-3 py-2 text-xs font-bold text-[#2563eb]"
                      onClick={() =>
                        setBundle((current) => ({
                          ...current,
                          medications: [
                            ...current.medications.filter((item) =>
                              item.name.trim(),
                            ),
                            {
                              ...blankMedication,
                              name: drug.name,
                              dose: calculatedDose(
                                drug,
                                current.visit.weightKg,
                              ),
                              route: drug.route,
                              frequency: drug.frequency,
                              instructions: `الفئة: ${drug.category}. مرجع: ${drug.source}`,
                            },
                          ],
                        }))
                      }
                    >
                      <span className="ml-1 text-[10px] text-muted-foreground">
                        {drug.category}
                      </span>
                      {drug.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="space-y-4">
              {bundle.medications.map((medication, index) => (
                <article
                  key={index}
                  className="rounded-2xl border bg-[#fafcfc] p-4"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <strong>دواء {index + 1}</strong>
                    {bundle.medications.length > 1 && (
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        className="text-red-600"
                        onClick={() =>
                          setBundle((current) => ({
                            ...current,
                            medications: current.medications.filter(
                              (_, itemIndex) => itemIndex !== index,
                            ),
                          }))
                        }
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    )}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <Field label="اسم الدواء">
                      <Input
                        list={`drug-list-${index}`}
                        value={medication.name}
                        onChange={(event) =>
                          updateMedication(index, { name: event.target.value })
                        }
                        placeholder="اكتب الاسم أو الفئة: مضاد حيوي، فطري..."
                      />
                      <datalist id={`drug-list-${index}`}>
                        {drugMatches(medication.name, species).map((drug) => (
                          <option key={drug.name} value={drug.name} />
                        ))}
                      </datalist>
                      {drugMatches(medication.name, species)
                        .slice(0, 5)
                        .map((drug) => (
                          <button
                            key={drug.name}
                            type="button"
                            className="mt-1 block text-right text-xs font-bold text-[#2563eb] hover:underline"
                            onClick={() =>
                              updateMedication(index, {
                                name: drug.name,
                                dose: calculatedDose(
                                  drug,
                                  bundle.visit.weightKg,
                                ),
                                route: drug.route,
                                frequency: drug.frequency,
                                instructions: `الفئة: ${drug.category}. مرجع بيطري: ${drug.source}`,
                              })
                            }
                          >
                            <span className="ml-1 text-[10px] text-muted-foreground">
                              {drug.category}
                            </span>
                            {drug.name}
                          </button>
                        ))}
                    </Field>
                    <Field label="الجرعة">
                      <Input
                        value={medication.dose}
                        onChange={(event) =>
                          updateMedication(index, { dose: event.target.value })
                        }
                      />
                    </Field>
                    <Field label="طريق الإعطاء">
                      <Input
                        value={medication.route}
                        onChange={(event) =>
                          updateMedication(index, { route: event.target.value })
                        }
                      />
                    </Field>
                    <Field label="التكرار">
                      <Input
                        value={medication.frequency}
                        onChange={(event) =>
                          updateMedication(index, {
                            frequency: event.target.value,
                          })
                        }
                      />
                    </Field>
                    <Field label="المدة">
                      <Input
                        value={medication.duration}
                        onChange={(event) =>
                          updateMedication(index, {
                            duration: event.target.value,
                          })
                        }
                      />
                    </Field>
                    <Field label="التعليمات">
                      <Input
                        value={medication.instructions}
                        onChange={(event) =>
                          updateMedication(index, {
                            instructions: event.target.value,
                          })
                        }
                      />
                    </Field>
                  </div>
                  <MedicationDoseCalculator
                    medicationName={medication.name}
                    species={species}
                    weightKg={Number(bundle.visit.weightKg || 0)}
                    onApply={(dose) => updateMedication(index, { dose })}
                  />
                  {(() => {
                    const drug =
                      drugMatches(medication.name, species).find(
                        (item) => item.name === medication.name,
                      ) ?? drugMatches(medication.name, species)[0];
                    const warnings = drug
                      ? drugWarnings(
                          drug,
                          `${bundle.visit.diagnosis} ${bundle.visit.medicalHistory.previousDiseases} ${bundle.visit.history}`,
                        )
                      : [];
                    return warnings.length ? (
                      <div className="mt-3 rounded-xl border-2 border-red-400 bg-red-50 p-3 text-sm font-bold text-red-700">
                        تنبيه فقط ولا يمنع الحفظ: توجد حالة مرتبطة بـ{" "}
                        {warnings.join("، ")}؛ راجع ملاءمة الدواء والجرعة.
                      </div>
                    ) : null;
                  })()}
                </article>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setBundle((current) => ({
                    ...current,
                    medications: [
                      ...current.medications,
                      { ...blankMedication },
                    ],
                  }))
                }
              >
                <Plus className="size-4" />
                إضافة دواء
              </Button>
            </div>
          </>
        )}

        {currentStep.id === "diagnostics" && (
          <>
            <SectionTitle
              icon={Beaker}
              title="التحاليل والتصوير"
              description="اختر ما تم إجراؤه، ثم عدّل النتيجة والوحدة والمدى المرجعي بحسب تقرير مختبرك."
            />
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-6 text-amber-900">
              {LAB_REFERENCE_NOTE}
            </div>
            <div className="flex flex-wrap gap-2">
              {templates.map((template) => (
                <Button
                  key={template.category}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addDiagnostic(template.category)}
                >
                  <Plus className="size-3.5" />
                  {template.title}
                </Button>
              ))}
            </div>
            {!bundle.diagnostics.length && (
              <EmptyHint text="لم تتم إضافة أي تحليل أو تصوير لهذه الزيارة." />
            )}
            <div className="space-y-5">
              {bundle.diagnostics.map((diagnostic, diagnosticIndex) => (
                <article
                  key={`${diagnostic.category}-${diagnosticIndex}`}
                  className="rounded-2xl border bg-white p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <Input
                      className="max-w-sm font-bold"
                      value={diagnostic.title}
                      onChange={(event) =>
                        setBundle((current) => ({
                          ...current,
                          diagnostics: current.diagnostics.map((item, index) =>
                            index === diagnosticIndex
                              ? { ...item, title: event.target.value }
                              : item,
                          ),
                        }))
                      }
                    />
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      className="text-red-600"
                      onClick={() =>
                        setBundle((current) => ({
                          ...current,
                          diagnostics: current.diagnostics.filter(
                            (_, index) => index !== diagnosticIndex,
                          ),
                        }))
                      }
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                  {diagnostic.results.length > 0 && (
                    <div className="mt-4 overflow-x-auto">
                      <div className="min-w-[720px] space-y-2">
                        <div className="grid grid-cols-[1.2fr_1fr_.8fr_1.2fr_.8fr] gap-2 text-xs font-bold text-muted-foreground">
                          <span>الفحص</span>
                          <span>النتيجة</span>
                          <span>الوحدة</span>
                          <span>المدى المرجعي</span>
                          <span>التقييم</span>
                        </div>
                        {diagnostic.results.map((row, rowIndex) => (
                          <div
                            key={`${row.name}-${rowIndex}`}
                            className="grid grid-cols-[1.2fr_1fr_.8fr_1.2fr_.8fr] gap-2"
                          >
                            <Input
                              value={row.name}
                              onChange={(event) =>
                                updateDiagnosticRow(
                                  setBundle,
                                  diagnosticIndex,
                                  rowIndex,
                                  { name: event.target.value },
                                )
                              }
                            />
                            <Input
                              value={row.result}
                              onChange={(event) =>
                                updateDiagnosticRow(
                                  setBundle,
                                  diagnosticIndex,
                                  rowIndex,
                                  { result: event.target.value },
                                )
                              }
                            />
                            <Input
                              value={row.unit}
                              onChange={(event) =>
                                updateDiagnosticRow(
                                  setBundle,
                                  diagnosticIndex,
                                  rowIndex,
                                  { unit: event.target.value },
                                )
                              }
                            />
                            <Input
                              value={row.referenceRange}
                              onChange={(event) =>
                                updateDiagnosticRow(
                                  setBundle,
                                  diagnosticIndex,
                                  rowIndex,
                                  { referenceRange: event.target.value },
                                )
                              }
                            />
                            <Select
                              value={row.flag}
                              onValueChange={(value) =>
                                updateDiagnosticRow(
                                  setBundle,
                                  diagnosticIndex,
                                  rowIndex,
                                  { flag: value as LabResultRow["flag"] },
                                )
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="unchecked">
                                  غير محدد
                                </SelectItem>
                                <SelectItem value="normal">طبيعي</SelectItem>
                                <SelectItem value="high">مرتفع</SelectItem>
                                <SelectItem value="low">منخفض</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="mt-4 rounded-xl border border-dashed border-[#79aaa3] bg-[#f4fbf9] p-4">
                    <label className="flex cursor-pointer items-center gap-2 font-bold text-[#2563eb]">
                      <ImagePlus className="size-5" />
                      إضافة صور التحليل أو الأشعة أو السونار
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        multiple
                        className="sr-only"
                        onChange={(event) => {
                          const files = Array.from(event.target.files ?? []);
                          setBundle((current) => ({
                            ...current,
                            diagnostics: current.diagnostics.map(
                              (item, index) =>
                                index === diagnosticIndex
                                  ? {
                                      ...item,
                                      pendingImages: [
                                        ...(item.pendingImages ?? []),
                                        ...files,
                                      ],
                                    }
                                  : item,
                            ),
                          }));
                          event.currentTarget.value = "";
                        }}
                      />
                    </label>
                    {!!diagnostic.pendingImages?.length && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        تم اختيار {diagnostic.pendingImages.length} صورة،
                        وستُرفع عند الحفظ.
                      </p>
                    )}
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <Field
                      label="الخلاصة / وصف الصورة"
                      className="sm:col-span-2"
                    >
                      <Textarea
                        value={diagnostic.interpretation}
                        onChange={(event) =>
                          setBundle((current) => ({
                            ...current,
                            diagnostics: current.diagnostics.map(
                              (item, index) =>
                                index === diagnosticIndex
                                  ? {
                                      ...item,
                                      interpretation: event.target.value,
                                    }
                                  : item,
                            ),
                          }))
                        }
                        rows={3}
                      />
                    </Field>
                    <Field label="ملاحظات">
                      <Input
                        value={diagnostic.notes}
                        onChange={(event) =>
                          setBundle((current) => ({
                            ...current,
                            diagnostics: current.diagnostics.map(
                              (item, index) =>
                                index === diagnosticIndex
                                  ? { ...item, notes: event.target.value }
                                  : item,
                            ),
                          }))
                        }
                      />
                    </Field>
                    <Field label="تكلفة التحليل / التصوير (د.ع)">
                      <Input
                        dir="ltr"
                        inputMode="numeric"
                        value={diagnostic.costIqd || ""}
                        onChange={(event) =>
                          setBundle((current) => ({
                            ...current,
                            diagnostics: current.diagnostics.map(
                              (item, index) =>
                                index === diagnosticIndex
                                  ? {
                                      ...item,
                                      costIqd: Number(event.target.value) || 0,
                                    }
                                  : item,
                            ),
                          }))
                        }
                      />
                    </Field>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}

        {currentStep.id === "preventive" && (
          <>
            <SectionTitle
              icon={Syringe}
              title="اللقاحات والوقاية"
              description="سجّل هل أُعطيت الجرعة، تاريخها السابق/الحالي، والموعد القادم. هذه الخمس فقط تظهر للمربي."
            />
            <div className="space-y-4">
              {bundle.preventiveRecords.map((record, index) => (
                <article key={record.kind} className="rounded-2xl border p-4">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <h3 className="font-black text-[#2563eb]">
                      {PREVENTIVE_TYPES.find(
                        (item) => item.kind === record.kind,
                      )?.label ?? record.title}
                    </h3>
                    <Select
                      value={record.currentStatus}
                      onValueChange={(value) =>
                        updatePrevention(index, {
                          currentStatus: value as "yes" | "no" | "unknown",
                          ...(value === "yes"
                            ? {}
                            : { inventoryItemId: null, inventoryQuantity: 1 }),
                        })
                      }
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="yes">ملقح / مأخوذة</SelectItem>
                        <SelectItem value="no">غير ملقح / لم تؤخذ</SelectItem>
                        <SelectItem value="unknown">غير معلوم</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <Field label="التاريخ السابق / الحالي">
                      <Input
                        type="date"
                        value={record.givenDate ?? ""}
                        onChange={(event) =>
                          updatePrevention(index, {
                            givenDate: event.target.value || null,
                          })
                        }
                      />
                    </Field>
                    <Field label="الموعد القادم">
                      <Input
                        type="date"
                        value={record.dueDate ?? ""}
                        onChange={(event) =>
                          updatePrevention(index, {
                            dueDate: event.target.value || null,
                          })
                        }
                      />
                    </Field>
                    <Field label="المنتج / الشركة">
                      <Input
                        value={record.product}
                        onChange={(event) =>
                          updatePrevention(index, {
                            product: event.target.value,
                          })
                        }
                      />
                    </Field>
                    <Field label="رقم التشغيلة">
                      <Input
                        value={record.batchNumber}
                        onChange={(event) =>
                          updatePrevention(index, {
                            batchNumber: event.target.value,
                          })
                        }
                      />
                    </Field>
                    <Field label="الخصم من المخزن (اختياري)">
                      <Select
                        value={record.inventoryItemId ?? "none"}
                        onValueChange={(value) => {
                          const selected = inventoryVaccines.find((item) => item.id === value);
                          updatePrevention(index, {
                            inventoryItemId: value === "none" ? null : value,
                            inventoryQuantity: 1,
                            ...(selected
                              ? { product: record.product || selected.name, currentStatus: "yes" as const }
                              : {}),
                          });
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="لا تخصم من المخزن" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">بدون خصم من المخزن</SelectItem>
                          {inventoryVaccines.map((item) => (
                            <SelectItem key={item.id} value={item.id} disabled={item.quantity <= 0}>
                              {item.name} — المتوفر {item.quantity} {item.unit}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    {record.inventoryItemId && (
                      <Field label="الكمية المستخدمة">
                        <Input
                          type="number"
                          min="1"
                          max="1000"
                          value={record.inventoryQuantity || 1}
                          onChange={(event) =>
                            updatePrevention(index, {
                              inventoryQuantity: Math.max(1, Number(event.target.value) || 1),
                            })
                          }
                        />
                      </Field>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </>
        )}

        {currentStep.id === "surgery" && (
          <>
            <SectionTitle
              icon={Scissors}
              title={
                bundle.visit.visitType === "dental"
                  ? "تنظيف وقلع الأسنان"
                  : "اختيار العملية أو الإجراء"
              }
              description={
                bundle.visit.visitType === "dental"
                  ? "سجّل تنظيف الأسنان أو إزالة الجير أو القلع مع تفاصيل التخدير والكلفة."
                  : "القائمة مرتبة حسب أجهزة الجسم ومناسبة لفصيلة الحيوان المسجلة."
              }
            />
            {!bundle.procedures.length && (
              <EmptyHint
                text={
                  bundle.visit.visitType === "dental"
                    ? "لا يوجد إجراء أسنان مضاف لهذه الزيارة."
                    : "لا توجد عملية مضافة لهذه الزيارة."
                }
              />
            )}
            <div className="space-y-4">
              {bundle.procedures.map((procedure, index) => {
                const category =
                  procedureCategories.find(
                    (item) => item.value === procedure.category,
                  ) ?? procedureCategories[0];
                return (
                  <article
                    key={index}
                    className="rounded-2xl border bg-[#fafcfc] p-4"
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <strong>إجراء {index + 1}</strong>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        className="text-red-600"
                        onClick={() =>
                          setBundle((current) => ({
                            ...current,
                            procedures: current.procedures.filter(
                              (_, itemIndex) => itemIndex !== index,
                            ),
                          }))
                        }
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="الجهاز / التصنيف">
                        <Select
                          value={procedure.category}
                          onValueChange={(value) =>
                            setBundle((current) => ({
                              ...current,
                              procedures: current.procedures.map(
                                (item, itemIndex) =>
                                  itemIndex === index
                                    ? {
                                        ...item,
                                        category: value,
                                        procedureType:
                                          procedureCategories.find(
                                            (group) => group.value === value,
                                          )?.procedures[0] ?? "",
                                      }
                                    : item,
                              ),
                            }))
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {procedureCategories.map((item) => (
                              <SelectItem key={item.value} value={item.value}>
                                {item.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>
                      <Field
                        label={
                          bundle.visit.visitType === "dental"
                            ? "نوع إجراء الأسنان"
                            : "نوع العملية"
                        }
                      >
                        <Select
                          value={procedure.procedureType}
                          onValueChange={(value) =>
                            setBundle((current) => ({
                              ...current,
                              procedures: current.procedures.map(
                                (item, itemIndex) =>
                                  itemIndex === index
                                    ? { ...item, procedureType: value }
                                    : item,
                              ),
                            }))
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {category.procedures.map((item) => (
                              <SelectItem key={item} value={item}>
                                {item}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>
                      <Field
                        label={
                          bundle.visit.visitType === "dental"
                            ? "تاريخ الإجراء"
                            : "تاريخ العملية"
                        }
                      >
                        <Input
                          type="date"
                          value={procedure.procedureDate ?? ""}
                          onChange={(event) =>
                            setBundle((current) => ({
                              ...current,
                              procedures: current.procedures.map(
                                (item, itemIndex) =>
                                  itemIndex === index
                                    ? {
                                        ...item,
                                        procedureDate:
                                          event.target.value || null,
                                      }
                                    : item,
                              ),
                            }))
                          }
                        />
                      </Field>
                      <Field
                        label={
                          bundle.visit.visitType === "dental"
                            ? "تكلفة إجراء الأسنان (د.ع)"
                            : "تكلفة العملية (د.ع)"
                        }
                      >
                        <Input
                          dir="ltr"
                          inputMode="numeric"
                          value={procedure.costIqd || ""}
                          onChange={(event) =>
                            setBundle((current) => ({
                              ...current,
                              procedures: current.procedures.map(
                                (item, itemIndex) =>
                                  itemIndex === index
                                    ? {
                                        ...item,
                                        costIqd:
                                          Number(event.target.value) || 0,
                                      }
                                    : item,
                              ),
                            }))
                          }
                        />
                      </Field>
                      <Field label="التخدير">
                        <Input
                          value={procedure.anesthesia}
                          onChange={(event) =>
                            setBundle((current) => ({
                              ...current,
                              procedures: current.procedures.map(
                                (item, itemIndex) =>
                                  itemIndex === index
                                    ? {
                                        ...item,
                                        anesthesia: event.target.value,
                                      }
                                    : item,
                              ),
                            }))
                          }
                        />
                      </Field>
                      <Field label="ملاحظات">
                        <Input
                          value={procedure.notes}
                          onChange={(event) =>
                            setBundle((current) => ({
                              ...current,
                              procedures: current.procedures.map(
                                (item, itemIndex) =>
                                  itemIndex === index
                                    ? { ...item, notes: event.target.value }
                                    : item,
                              ),
                            }))
                          }
                        />
                      </Field>
                      <Field label="تفاصيل العملية" className="sm:col-span-2">
                        <Textarea
                          value={procedure.details}
                          onChange={(event) =>
                            setBundle((current) => ({
                              ...current,
                              procedures: current.procedures.map(
                                (item, itemIndex) =>
                                  itemIndex === index
                                    ? { ...item, details: event.target.value }
                                    : item,
                              ),
                            }))
                          }
                          rows={3}
                        />
                      </Field>
                    </div>
                  </article>
                );
              })}
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setBundle((current) => ({
                    ...current,
                    procedures: [
                      ...current.procedures,
                      {
                        category: procedureCategories[0].value,
                        procedureType: procedureCategories[0].procedures[0],
                        procedureDate: new Date().toISOString().slice(0, 10),
                        anesthesia: "",
                        details: "",
                        costIqd: 0,
                        notes: "",
                      },
                    ],
                  }))
                }
              >
                <Plus className="size-4" />
                {bundle.visit.visitType === "dental"
                  ? "إضافة تنظيف أو قلع أسنان"
                  : "إضافة عملية / إجراء"}
              </Button>
            </div>
          </>
        )}

        {currentStep.id === "grooming" && (
          <>
            <SectionTitle
              icon={Sparkles}
              title="تفاصيل الحلاقة والغسل"
              description="حدد الخدمات المنفذة وحالة التخدير فقط؛ لا توجد علامات أو تشخيص أو علاج في هذا النوع من الزيارة."
            />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {groomingServices.map((service) => {
                const checked =
                  bundle.visit.grooming.services.includes(service);
                return (
                  <label
                    key={service}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 text-sm font-bold ${checked ? "border-[#2563eb] bg-[#eef2ff] text-[#0b5d58]" : "bg-white"}`}
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(value) =>
                        updateGrooming({
                          services:
                            value === true
                              ? [...bundle.visit.grooming.services, service]
                              : bundle.visit.grooming.services.filter(
                                  (item) => item !== service,
                                ),
                        })
                      }
                    />
                    {service}
                  </label>
                );
              })}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="التخدير / التهدئة">
                <Select
                  value={bundle.visit.grooming.sedation}
                  onValueChange={(value) => updateGrooming({ sedation: value })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="بدون تخدير">بدون تخدير</SelectItem>
                    <SelectItem value="تخدير / تهدئة">تخدير / تهدئة</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              {bundle.visit.grooming.sedation !== "بدون تخدير" && (
                <Field label="مادة التخدير أو تفاصيله">
                  <Input
                    value={bundle.visit.grooming.sedationDetails}
                    onChange={(event) =>
                      updateGrooming({ sedationDetails: event.target.value })
                    }
                    placeholder="اسم المادة، الجرعة أو الملاحظات"
                  />
                </Field>
              )}
              <Field label="ملاحظات الحلاقة والغسل" className="sm:col-span-2">
                <Textarea
                  value={bundle.visit.grooming.notes}
                  onChange={(event) =>
                    updateGrooming({ notes: event.target.value })
                  }
                  rows={4}
                  placeholder="حالة الفرو، وجود عقد، نوع الشامبو أو أي ملاحظة..."
                />
              </Field>
            </div>
          </>
        )}

        {currentStep.id === "finish" && (
          <>
            <SectionTitle
              icon={ClipboardCheck}
              title="الكلفة والحفظ"
              description="راجع المبلغ والموعد ثم احفظ بنفسك. لا يوجد حفظ تلقائي."
            />
            {(bundle.visit.visitType === "surgery" ||
              bundle.visit.visitType === "dental" ||
              bundle.visit.visitType === "diagnostics") && (
              <div className="rounded-2xl border bg-[#fafcfc] p-4">
                <p className="text-sm text-muted-foreground">
                  مجموع الكلف المسجلة داخل{" "}
                  {bundle.visit.visitType === "dental"
                    ? "تنظيف وقلع الأسنان"
                    : bundle.visit.visitType === "surgery"
                      ? "العمليات"
                      : "التحاليل والتصوير"}
                </p>
                <p className="mt-2 text-2xl font-black text-[#2563eb]">
                  {(bundle.visit.visitType === "surgery" ||
                  bundle.visit.visitType === "dental"
                    ? bundle.procedures.reduce(
                        (sum, item) => sum + item.costIqd,
                        0,
                      )
                    : bundle.diagnostics.reduce(
                        (sum, item) => sum + item.costIqd,
                        0,
                      )
                  ).toLocaleString("ar-IQ")}{" "}
                  د.ع
                </p>
              </div>
            )}
            <Field
              label={
                bundle.visit.visitType === "surgery" ||
                bundle.visit.visitType === "dental" ||
                bundle.visit.visitType === "diagnostics"
                  ? "تكلفة كشف أو خدمة إضافية (إن وجدت)"
                  : bundle.visit.visitType === "grooming"
                    ? "كلفة الحلاقة والغسل (د.ع)"
                    : "الكلفة الإجمالية (د.ع)"
              }
            >
              <Input
                className="max-w-sm"
                dir="ltr"
                inputMode="numeric"
                value={bundle.visit.costIqd || ""}
                onChange={(event) =>
                  setVisit("costIqd", Number(event.target.value) || 0)
                }
                placeholder="0"
              />
            </Field>
            {bundle.visit.visitType !== "grooming" && (
              <Field label="موعد المراجعة الطبية القادمة">
                <Input
                  className="max-w-sm"
                  type="date"
                  value={bundle.visit.followupDate ?? ""}
                  onChange={(event) =>
                    setVisit("followupDate", event.target.value || null)
                  }
                />
              </Field>
            )}
            <div className="rounded-2xl border-2 border-[#2563eb] bg-[#eef2ff] p-5">
              <div className="flex items-start gap-3">
                <ClipboardCheck className="mt-0.5 size-5 text-[#2563eb]" />
                <div>
                  <h3 className="font-black text-[#0b5d58]">
                    الحفظ لا يتم تلقائياً
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-[#426a66]">
                    راجع المعلومات، ثم اضغط الزر أدناه بنفسك. الانتقال لهذه
                    الصفحة أو إضافة دواء لا يحفظ أي شيء.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 border-t bg-white/95 px-5 py-4 backdrop-blur sm:px-7">
        <div>
          {step > 0 && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep((current) => current - 1)}
            >
              <ArrowRight className="size-4" />
              السابق
            </Button>
          )}
        </div>
        {step < flowSteps.length - 1 ? (
          <Button
            type="button"
            className="bg-[#2563eb]"
            onClick={() => setStep((current) => current + 1)}
          >
            التالي
            <ArrowLeft className="size-4" />
          </Button>
        ) : (
          <Button
            type="button"
            className="bg-[#2563eb]"
            disabled={saving}
            onClick={save}
          >
            {saving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Check className="size-4" />
            )}
            {submitLabel}
          </Button>
        )}
      </div>
    </div>
  );
}

function MedicationDoseCalculator({
  medicationName,
  species,
  weightKg,
  onApply,
}: {
  medicationName: string;
  species: string;
  weightKg: number;
  onApply: (dose: string) => void;
}) {
  const drug =
    VET_DRUGS.find(
      (item) => item.name === medicationName && item.species.includes(species),
    ) ?? drugMatches(medicationName, species)[0];
  const [doseMgKg, setDoseMgKg] = useState("");
  const [concentration, setConcentration] = useState("");

  useEffect(() => {
    if (!drug || drug.fixedDose || drug.doseMgKg[1] <= 0) return;
    setDoseMgKg(String((drug.doseMgKg[0] + drug.doseMgKg[1]) / 2));
  }, [drug?.name]);

  const dose = Number(doseMgKg || 0);
  const strength = Number(concentration || 0);
  const totalMg = weightKg > 0 && dose > 0 ? weightKg * dose : 0;
  const volumeMl = totalMg > 0 && strength > 0 ? totalMg / strength : 0;
  const reference = drug
    ? (drug.fixedDose ??
      `${drug.doseMgKg[0]}${drug.doseMgKg[1] !== drug.doseMgKg[0] ? `–${drug.doseMgKg[1]}` : ""} mg/kg`)
    : null;

  return (
    <div className="mt-4 rounded-xl border border-sky-200 bg-sky-50/70 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-black text-sky-900">
          حاسبة الجرعة إلى mL حسب الوزن
        </p>
        {reference && (
          <Badge variant="outline">الجرعة المرجعية: {reference}</Badge>
        )}
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="الوزن (كغم)">
          <Input value={weightKg || ""} readOnly />
        </Field>
        <Field label="الجرعة المختارة (mg/kg)">
          <Input
            type="number"
            min="0"
            step="0.01"
            value={doseMgKg}
            onChange={(event) => setDoseMgKg(event.target.value)}
          />
        </Field>
        <Field label="تركيز المستحضر (mg/mL)">
          <Input
            type="number"
            min="0"
            step="0.01"
            value={concentration}
            onChange={(event) => setConcentration(event.target.value)}
          />
        </Field>
        <div className="rounded-xl bg-white p-3 text-sm">
          <span className="block text-xs text-muted-foreground">
            الحجم المحسوب
          </span>
          <strong className="text-lg text-sky-900">
            {volumeMl > 0 ? roundDose(volumeMl) : "—"} mL
          </strong>
          {totalMg > 0 && (
            <span className="mt-1 block text-xs">
              إجمالي المادة: {roundDose(totalMg)} mg
            </span>
          )}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          المعادلة: الجرعة mg/kg × الوزن kg ÷ التركيز mg/mL.
        </p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={!volumeMl}
          onClick={() =>
            onApply(
              `${roundDose(dose)} mg/kg × ${roundDose(weightKg)} kg = ${roundDose(totalMg)} mg = ${roundDose(volumeMl)} mL بتركيز ${roundDose(strength)} mg/mL`,
            )
          }
        >
          اعتماد الحجم في خانة الجرعة
        </Button>
      </div>
    </div>
  );
}

function calculateFluidPlan({
  species,
  weightKg,
  dehydrationPercent,
  maintenanceOverride,
  ongoingLosses,
  hours,
}: {
  species: string;
  weightKg: number;
  dehydrationPercent: number;
  maintenanceOverride: number;
  ongoingLosses: number;
  hours: number;
}) {
  if (weightKg <= 0 || hours <= 0) return null;
  const defaultMaintenance =
    species === "cat" || species === "dog"
      ? 30 * weightKg + 70
      : weightKg * (species === "bird" ? 75 : 60);
  const maintenance =
    maintenanceOverride > 0
      ? weightKg * maintenanceOverride
      : defaultMaintenance;
  const deficit = weightKg * Math.max(0, dehydrationPercent) * 10;
  const losses = Math.max(0, ongoingLosses);
  const total = deficit + maintenance + losses;
  return {
    weight: roundDose(weightKg),
    dehydration: roundDose(dehydrationPercent),
    deficit: roundDose(deficit),
    maintenance: roundDose(maintenance),
    losses: roundDose(losses),
    total: roundDose(total),
    hours: roundDose(hours),
    hourly: roundDose(total / hours),
  };
}

function roundDose(value: number) {
  return Number(value.toFixed(value < 10 ? 3 : 1));
}

function updateDiagnosticRow(
  setter: React.Dispatch<React.SetStateAction<VisitBundleClient>>,
  diagnosticIndex: number,
  rowIndex: number,
  patch: Partial<LabResultRow>,
) {
  setter((current) => ({
    ...current,
    diagnostics: current.diagnostics.map((diagnostic, index) =>
      index === diagnosticIndex
        ? {
            ...diagnostic,
            results: diagnostic.results.map((row, resultIndex) =>
              resultIndex === rowIndex ? { ...row, ...patch } : row,
            ),
          }
        : diagnostic,
    ),
  }));
}

function SectionTitle({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Activity;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3 border-b pb-4">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#eef2ff] text-[#2563eb]">
        <Icon className="size-5" />
      </span>
      <div>
        <h2 className="font-black">{title}</h2>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          {description}
        </p>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function NumberField({
  label,
  value,
  step = "1",
  onChange,
}: {
  label: string;
  value: number | null;
  step?: string;
  onChange: (value: number | null) => void;
}) {
  return (
    <Field label={label}>
      <Input
        type="number"
        min="0"
        step={step}
        value={value ?? ""}
        onChange={(event) => onChange(numeric(event.target.value))}
      />
    </Field>
  );
}

function MedicalHistoryFields({
  value,
  onChange,
}: {
  value: VisitBundleClient["visit"]["medicalHistory"];
  onChange: (
    patch: Partial<VisitBundleClient["visit"]["medicalHistory"]>,
  ) => void;
}) {
  return (
    <>
      <SectionTitle
        icon={Activity}
        title="التاريخ المرضي والمعلومات العامة"
        description="سجّل ما يذكره المربي وما تلاحظه في الفحص العام قبل الانتقال إلى علامات أجهزة الجسم."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="وقت ظهور الأعراض">
          <Input
            value={value.symptomOnset}
            onChange={(event) => onChange({ symptomOnset: event.target.value })}
            placeholder="مثلاً: منذ يومين أو اليوم صباحاً"
          />
        </Field>
        <HistorySelect
          label="الشهية"
          value={value.appetite}
          options={["غير مسجل", "طبيعية", "ضعيفة", "معدومة", "زائدة", "متغيرة"]}
          onChange={(appetite) => onChange({ appetite })}
        />
        <HistorySelect
          label="شرب الماء"
          value={value.waterIntake}
          options={["غير مسجل", "طبيعي", "قليل", "معدوم", "زائد"]}
          onChange={(waterIntake) => onChange({ waterIntake })}
        />
        <HistorySelect
          label="التقيؤ"
          value={value.vomiting}
          options={[
            "غير مسجل",
            "لا يوجد",
            "مرة واحدة",
            "متكرر",
            "مع دم",
            "بعد الأكل",
          ]}
          onChange={(vomiting) => onChange({ vomiting })}
        />
        <HistorySelect
          label="التبول"
          value={value.urination}
          options={[
            "غير مسجل",
            "طبيعي",
            "قليل",
            "متكرر",
            "صعب أو مؤلم",
            "لا يوجد",
            "مع دم",
          ]}
          onChange={(urination) => onChange({ urination })}
        />
        <HistorySelect
          label="التبرز"
          value={value.defecation}
          options={[
            "غير مسجل",
            "طبيعي",
            "إسهال",
            "إمساك",
            "لا يوجد",
            "مع دم أو مخاط",
          ]}
          onChange={(defecation) => onChange({ defecation })}
        />
        <HistorySelect
          label="إفراز اللعاب"
          value={value.salivation}
          options={["غير مسجل", "طبيعي", "زائد", "رغوي", "مع رائحة"]}
          onChange={(salivation) => onChange({ salivation })}
        />
        <HistorySelect
          label="الحالة الصحية العامة"
          value={value.generalCondition}
          options={["غير مسجل", "جيدة", "مستقرة", "متوسطة", "ضعيفة", "حرجة"]}
          onChange={(generalCondition) => onChange({ generalCondition })}
        />
        <HistorySelect
          label="بنية الجسم"
          value={value.bodyCondition}
          options={[
            "غير مسجل",
            "نحيف جداً",
            "نحيف",
            "مثالي",
            "زائد الوزن",
            "سمين",
          ]}
          onChange={(bodyCondition) => onChange({ bodyCondition })}
        />
        <HistorySelect
          label="الجفاف"
          value={value.dehydration}
          options={["غير مسجل", "لا يوجد", "خفيف", "متوسط", "شديد"]}
          onChange={(dehydration) => onChange({ dehydration })}
        />
        <Field label="الأكل ونوع الغذاء" className="sm:col-span-2">
          <Textarea
            value={value.foodDetails}
            onChange={(event) => onChange({ foodDetails: event.target.value })}
            rows={3}
            placeholder="نوع الغذاء، آخر وجبة، وهل حدث تغيير حديث..."
          />
        </Field>
        <Field
          label="أمراض أو عمليات سابقة"
          className="sm:col-span-2 lg:col-span-3"
        >
          <Textarea
            value={value.previousDiseases}
            onChange={(event) =>
              onChange({ previousDiseases: event.target.value })
            }
            rows={3}
          />
        </Field>
        <Field
          label="أدوية أو علاجات أُعطيت قبل الزيارة"
          className="sm:col-span-2 lg:col-span-3"
        >
          <Textarea
            value={value.medicationsGiven}
            onChange={(event) =>
              onChange({ medicationsGiven: event.target.value })
            }
            rows={3}
            placeholder="اسم الدواء والجرعة والوقت إن عُرفت"
          />
        </Field>
      </div>
    </>
  );
}

function HistorySelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <Field label={label}>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}

function EmptyHint({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed bg-[#fafcfc] p-5 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}
