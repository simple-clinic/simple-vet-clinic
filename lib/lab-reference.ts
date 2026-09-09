export type LabResultRow = {
  name: string;
  result: string;
  unit: string;
  referenceRange: string;
  flag: "normal" | "high" | "low" | "unchecked";
};

export type LabTemplate = {
  category: string;
  title: string;
  rows: Array<Omit<LabResultRow, "result" | "flag">>;
  narrative?: boolean;
};

type SpeciesRanges = Record<string, string>;

const range = (dog: string, cat: string, rabbit = "حسب المختبر"):
  SpeciesRanges => ({ dog, cat, rabbit, bird: "حسب نوع الطائر والمختبر", hamster: "حسب المختبر" });

const pick = (ranges: SpeciesRanges, species: string) => ranges[species] ?? "حسب المختبر";

export function labTemplates(species: string): LabTemplate[] {
  return [
    {
      category: "cbc",
      title: "صورة دم كاملة CBC",
      rows: [
        { name: "PCV / HCT", unit: "%", referenceRange: pick(range("35–57", "30–45", "30–50"), species) },
        { name: "Hemoglobin", unit: "g/dL", referenceRange: pick(range("11.9–18.9", "9.8–15.4", "8–15"), species) },
        { name: "RBC", unit: "×10⁶/µL", referenceRange: pick(range("4.95–7.87", "5.0–10.0", "4–7"), species) },
        { name: "WBC", unit: "×10³/µL", referenceRange: pick(range("5.0–14.1", "5.5–19.5", "6–12"), species) },
        { name: "Neutrophils", unit: "×10³/µL", referenceRange: pick(range("2.9–12.0", "2.5–12.5", "1–9.4"), species) },
        { name: "Lymphocytes", unit: "×10³/µL", referenceRange: pick(range("0.4–2.9", "1.5–7.0", "1.6–10.6"), species) },
        { name: "Monocytes", unit: "×10³/µL", referenceRange: pick(range("0.1–1.4", "0–0.9", "0.05–0.5"), species) },
        { name: "Eosinophils", unit: "×10³/µL", referenceRange: pick(range("0–1.3", "0–0.8", "0.05–0.5"), species) },
        { name: "Platelets", unit: "×10³/µL", referenceRange: pick(range("211–621", "300–800", "250–650"), species) },
      ],
    },
    {
      category: "chemistry",
      title: "كيمياء الدم",
      rows: [
        { name: "Glucose", unit: "mg/dL", referenceRange: pick(range("76–119", "60–120", "75–155"), species) },
        { name: "Urea nitrogen (BUN)", unit: "mg/dL", referenceRange: pick(range("8–28", "19–34", "20–45"), species) },
        { name: "Creatinine", unit: "mg/dL", referenceRange: pick(range("0.5–1.7", "0.9–2.2", "0.5–2.5"), species) },
        { name: "ALT", unit: "U/L", referenceRange: pick(range("10–109", "25–97", "45–80"), species) },
        { name: "ALP", unit: "U/L", referenceRange: pick(range("1–114", "0–45", "12–96"), species) },
        { name: "AST", unit: "U/L", referenceRange: pick(range("13–15", "7–38", "35–130"), species) },
        { name: "Total protein", unit: "g/dL", referenceRange: pick(range("5.4–7.5", "6.0–7.9", "5.4–7.5"), species) },
        { name: "Albumin", unit: "g/dL", referenceRange: pick(range("2.3–3.1", "2.8–3.9", "2.7–5.0"), species) },
        { name: "Globulin", unit: "g/dL", referenceRange: pick(range("2.7–4.4", "2.6–5.1", "1.5–2.7"), species) },
        { name: "Calcium", unit: "mg/dL", referenceRange: pick(range("9.1–11.7", "8.7–11.7", "11–14"), species) },
        { name: "Phosphorus", unit: "mg/dL", referenceRange: pick(range("2.9–5.3", "3.0–6.1", "4.0–6.5"), species) },
        { name: "Sodium", unit: "mEq/L", referenceRange: pick(range("142–152", "146–156", "138–150"), species) },
        { name: "Potassium", unit: "mEq/L", referenceRange: pick(range("3.9–5.1", "3.7–6.1", "3.5–6.9"), species) },
        { name: "Total bilirubin", unit: "mg/dL", referenceRange: pick(range("0–0.3", "0–0.1", "0–0.7"), species) },
      ],
    },
    {
      category: "urinalysis",
      title: "تحليل البول",
      rows: [
        { name: "Specific gravity", unit: "", referenceRange: species === "dog" ? "1.016–1.060" : species === "cat" ? "1.020–1.040" : "حسب النوع والحالة المائية" },
        { name: "pH", unit: "", referenceRange: "حمضي غالباً في الكلاب والقطط؛ يتغير حسب الغذاء" },
        { name: "Protein", unit: "", referenceRange: "سلبي–Trace مع تفسيره حسب SG والرواسب" },
        { name: "Glucose", unit: "", referenceRange: "سلبي" },
        { name: "Ketones", unit: "", referenceRange: "سلبي" },
        { name: "Blood", unit: "", referenceRange: "سلبي" },
        { name: "Bilirubin", unit: "", referenceRange: "سلبي" },
        { name: "WBC / HPF", unit: "خلية", referenceRange: "0–5 تقريباً؛ حسب طريقة الجمع" },
        { name: "RBC / HPF", unit: "خلية", referenceRange: "0–5 تقريباً؛ حسب طريقة الجمع" },
        { name: "UPC ratio", unit: "", referenceRange: species === "dog" ? "<0.5" : species === "cat" ? "<0.4" : "حسب المختبر" },
      ],
    },
    {
      category: "hormones",
      title: "الهرمونات والغدد",
      rows: [
        { name: "Total T4", unit: "µg/dL", referenceRange: "حسب المختبر والعمر والحالة السريرية" },
        { name: "Free T4", unit: "pmol/L", referenceRange: "حسب طريقة القياس والمختبر" },
        { name: "TSH", unit: "ng/mL", referenceRange: "فحص نوعي؛ حسب المختبر" },
        { name: "Baseline cortisol", unit: "µg/dL", referenceRange: "حسب المختبر وتوقيت السحب" },
        { name: "Post-ACTH cortisol", unit: "µg/dL", referenceRange: "حسب بروتوكول المختبر" },
        { name: "Progesterone", unit: "ng/mL", referenceRange: "يُفسر حسب مرحلة الدورة والتوقيت" },
      ],
    },
    { category: "radiography", title: "الأشعة السينية", rows: [], narrative: true },
    { category: "ultrasound", title: "السونار", rows: [], narrative: true },
    { category: "fecal_microscopy", title: "فحص البراز المجهري", rows: [{ name: "الطفيليات / البيوض / الأكياس", unit: "", referenceRange: "غير مشاهدة / سلبي" }], narrative: true },
    { category: "urine_microscopy", title: "فحص رواسب البول المجهري", rows: [{ name: "خلايا / بلورات / أسطوانات / بكتيريا", unit: "", referenceRange: "لا توجد تغيرات مهمة" }], narrative: true },
    { category: "skin_microscopy", title: "فحص الجلد المجهري", rows: [{ name: "كشط جلد / شعر / شريط لاصق", unit: "", referenceRange: "سلبي للطفيليات والفطريات" }], narrative: true },
    { category: "blood_smear", title: "لطاخة الدم", rows: [{ name: "شكل الخلايا والطفيليات الدموية", unit: "", referenceRange: "لا توجد تغيرات مهمة / سلبي" }], narrative: true },
  ];
}

export const LAB_REFERENCE_NOTE =
  "القيم الظاهرة إرشادية للبالغين ومأخوذة من جداول Merck البيطرية. النطاق الموجود في تقرير المختبر المستخدم هو المرجع الأول لأنه يتغير حسب الجهاز والطريقة والعمر والسلالة.";

