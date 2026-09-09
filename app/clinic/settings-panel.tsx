"use client";

import { useRef, useState } from "react";
import {
  Eye,
  EyeOff,
  ImagePlus,
  Loader2,
  LockKeyhole,
  MapPin,
  Palette,
  Plus,
  RotateCcw,
  Save,
  Settings2,
  Sparkles,
  Trash2,
  Type,
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
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  CLINIC_SECTIONS,
  defaultClinicSettings,
  type ClinicSettings,
} from "@/lib/clinic-settings-shared";

export function SettingsPanel({
  value,
  onSaved,
}: {
  value: ClinicSettings;
  onSaved: (settings: ClinicSettings) => void;
}) {
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<
    "portal" | "admin" | "banner" | null
  >(null);
  const [passwords, setPasswords] = useState({
    current: "",
    next: "",
    confirm: "",
  });
  const portalLogo = useRef<HTMLInputElement>(null);
  const adminLogo = useRef<HTMLInputElement>(null);
  const bannerImage = useRef<HTMLInputElement>(null);
  const update = <K extends keyof ClinicSettings>(
    key: K,
    next: ClinicSettings[K],
  ) => setDraft((current) => ({ ...current, [key]: next }));

  function restoreDefaults(
    patch: Partial<ClinicSettings>,
    sectionName: string,
  ) {
    setDraft((current) => ({ ...current, ...patch }));
    toast.info(
      `تمت استعادة الإعدادات الافتراضية لـ${sectionName}. اضغط حفظ لتثبيتها.`,
    );
  }

  async function save() {
    if (passwords.next && passwords.next !== passwords.confirm) {
      toast.error("تأكيد كلمة السر غير مطابق.");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch("/api/clinic/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settings: draft,
          currentPassword: passwords.current,
          newPassword: passwords.next,
        }),
      });
      const result = (await response.json()) as {
        error?: string;
        message?: string;
        settings?: ClinicSettings;
      };
      if (!response.ok) throw new Error(result.error || "تعذّر الحفظ.");
      if (result.settings) {
        setDraft(result.settings);
        onSaved(result.settings);
      }
      setPasswords({ current: "", next: "", confirm: "" });
      toast.success(result.message || "تم حفظ الإعدادات.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذّر الحفظ.");
    } finally {
      setSaving(false);
    }
  }

  async function uploadLogo(
    target: "portal" | "admin" | "banner",
    file?: File,
  ) {
    if (!file) return;
    setUploading(target);
    try {
      const form = new FormData();
      form.set("target", target);
      form.set("logo", file);
      const response = await fetch("/api/clinic/settings/logo", {
        method: "PUT",
        body: form,
      });
      const result = (await response.json()) as {
        error?: string;
        key?: string;
        keys?: string[];
      };
      if (!response.ok) throw new Error(result.error || "تعذّر رفع الصورة.");
      const next =
        target === "banner"
          ? {
              ...draft,
              portalBannerImageKey: "",
              portalBannerImageKeys:
                result.keys ||
                [...draft.portalBannerImageKeys, result.key || ""].filter(
                  Boolean,
                ),
            }
          : {
              ...draft,
              [target === "admin" ? "adminLogoKey" : "portalLogoKey"]:
                result.key || "",
            };
      setDraft(next);
      onSaved(next);
      if (target === "banner" && bannerImage.current)
        bannerImage.current.value = "";
      toast.success(
        target === "banner" ? "تمت إضافة صورة البنر." : "تم تغيير الصورة.",
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذّر رفع الصورة.");
    } finally {
      setUploading(null);
    }
  }

  async function removeLogo(
    target: "portal" | "admin" | "banner",
    key?: string,
  ) {
    setUploading(target);
    try {
      const response = await fetch(
        `/api/clinic/settings/logo?target=${target}${key ? `&key=${encodeURIComponent(key)}` : ""}`,
        { method: "DELETE" },
      );
      if (!response.ok) throw new Error("تعذّر حذف الصورة.");
      const next =
        target === "banner"
          ? {
              ...draft,
              portalBannerImageKey: "",
              portalBannerImageKeys: draft.portalBannerImageKeys.filter(
                (item) => item !== key,
              ),
            }
          : {
              ...draft,
              [target === "admin" ? "adminLogoKey" : "portalLogoKey"]: "",
            };
      setDraft(next);
      onSaved(next);
      toast.success("تم حذف الصورة.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذّر حذف الصورة.");
    } finally {
      setUploading(null);
    }
  }

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-4 rounded-2xl border bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold text-[#2563eb]">
            تحكم كامل من مكان واحد
          </p>
          <h2 className="mt-1 text-2xl font-black">إعدادات العيادة والبوابة</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            غيّر المظهر والنصوص وما يراه المربي بدون المساس بأي سجل.
          </p>
        </div>
        <Button
          onClick={() => void save()}
          disabled={saving}
          className="rounded-xl bg-[#2563eb]"
        >
          <Save className="size-4" />
          {saving ? "جارٍ الحفظ..." : "حفظ كل التغييرات"}
        </Button>
      </section>
      <Tabs defaultValue="portal" dir="rtl">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 rounded-2xl bg-white p-2 shadow-sm sm:grid-cols-4">
          <TabsTrigger value="portal">
            <Eye className="size-4" />
            بوابة المربي
          </TabsTrigger>
          <TabsTrigger value="appearance">
            <Palette className="size-4" />
            الشكل والألوان
          </TabsTrigger>
          <TabsTrigger value="sections">
            <Settings2 className="size-4" />
            أقسام المدير
          </TabsTrigger>
          <TabsTrigger value="security">
            <LockKeyhole className="size-4" />
            كلمة السر
          </TabsTrigger>
        </TabsList>
        <TabsContent value="portal" className="space-y-5">
          <Card
            title="نصوص بوابة المربي"
            icon={Type}
            action={
              <ResetButton
                onClick={() =>
                  restoreDefaults(
                    {
                      clinicName: defaultClinicSettings.clinicName,
                      portalEyebrow: defaultClinicSettings.portalEyebrow,
                      portalTitle: defaultClinicSettings.portalTitle,
                      portalDescription:
                        defaultClinicSettings.portalDescription,
                    },
                    "نصوص بوابة المربي",
                  )
                }
              />
            }
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="اسم العيادة">
                <Input
                  value={draft.clinicName}
                  onChange={(e) => update("clinicName", e.target.value)}
                />
              </Field>
              <Field label="العبارة الصغيرة">
                <Input
                  value={draft.portalEyebrow}
                  onChange={(e) => update("portalEyebrow", e.target.value)}
                />
              </Field>
              <Field label="عنوان مربع الدخول">
                <Input
                  value={draft.portalTitle}
                  onChange={(e) => update("portalTitle", e.target.value)}
                />
              </Field>
              <Field label="وصف البوابة">
                <Input
                  value={draft.portalDescription}
                  onChange={(e) => update("portalDescription", e.target.value)}
                />
              </Field>
            </div>
          </Card>
          <Card
            title="البنر الإعلاني"
            icon={ImagePlus}
            action={
              <ResetButton
                onClick={() =>
                  restoreDefaults(
                    {
                      portalBannerEnabled:
                        defaultClinicSettings.portalBannerEnabled,
                      portalBannerTitle:
                        defaultClinicSettings.portalBannerTitle,
                      portalBannerBody: defaultClinicSettings.portalBannerBody,
                    },
                    "البنر الإعلاني",
                  )
                }
              />
            }
          >
            <Toggle
              label="إظهار البنر للمربي"
              checked={draft.portalBannerEnabled}
              onChange={(v) => update("portalBannerEnabled", v)}
            />
            <div className="mt-4 grid gap-4">
              <div className="rounded-xl border p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-bold">صور البنر المتحرك</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      المقاس الأنسب 1600 × 600 بكسل (نسبة 8:3)، JPG أو PNG أو
                      WEBP، وبحد أقصى 5MB للصورة و10 صور.
                    </p>
                  </div>
                  <input
                    ref={bannerImage}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) =>
                      void uploadLogo("banner", e.target.files?.[0])
                    }
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => bannerImage.current?.click()}
                    disabled={uploading === "banner"}
                  >
                    <ImagePlus className="size-4" />
                    إضافة صورة
                  </Button>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {(draft.portalBannerImageKeys.length
                    ? draft.portalBannerImageKeys
                    : draft.portalBannerImageKey
                      ? [draft.portalBannerImageKey]
                      : []
                  ).map((key, index) => (
                    <div
                      key={key}
                      className="relative overflow-hidden rounded-xl border bg-[#f5f8f7]"
                    >
                      <img
                        src={`/api/branding/banner?key=${encodeURIComponent(key)}`}
                        alt={`صورة البنر ${index + 1}`}
                        className="aspect-[8/3] w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => void removeLogo("banner", key)}
                        className="absolute left-2 top-2 grid size-8 place-items-center rounded-full bg-white text-red-600 shadow"
                        aria-label="حذف الصورة"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  ))}
                  {!draft.portalBannerImageKeys.length &&
                    !draft.portalBannerImageKey && (
                      <p className="text-sm text-muted-foreground">
                        لم تضف صوراً بعد.
                      </p>
                    )}
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="عنوان الإعلان">
                  <Input
                    value={draft.portalBannerTitle}
                    onChange={(e) =>
                      update("portalBannerTitle", e.target.value)
                    }
                    placeholder="مثال: خصم على لقاحات هذا الأسبوع"
                  />
                </Field>
                <Field label="تفاصيل الإعلان">
                  <Textarea
                    value={draft.portalBannerBody}
                    onChange={(e) => update("portalBannerBody", e.target.value)}
                    rows={3}
                  />
                </Field>
              </div>
            </div>
          </Card>
          <Card
            title="ما يظهر داخل ملف الحيوان"
            icon={Eye}
            action={
              <ResetButton
                onClick={() =>
                  restoreDefaults(
                    {
                      portalShowVisits: defaultClinicSettings.portalShowVisits,
                      portalShowComplaint:
                        defaultClinicSettings.portalShowComplaint,
                      portalShowHistory:
                        defaultClinicSettings.portalShowHistory,
                      portalShowFindings:
                        defaultClinicSettings.portalShowFindings,
                      portalShowDiagnosis:
                        defaultClinicSettings.portalShowDiagnosis,
                      portalShowTreatment:
                        defaultClinicSettings.portalShowTreatment,
                      portalShowMedications:
                        defaultClinicSettings.portalShowMedications,
                      portalShowProcedures:
                        defaultClinicSettings.portalShowProcedures,
                      portalShowDiagnostics:
                        defaultClinicSettings.portalShowDiagnostics,
                      portalShowGrooming:
                        defaultClinicSettings.portalShowGrooming,
                      portalShowFollowup:
                        defaultClinicSettings.portalShowFollowup,
                    },
                    "خيارات ظهور معلومات المربي",
                  )
                }
              />
            }
          >
            <p className="mb-4 text-sm leading-7 text-muted-foreground">
              اللقاحات والجرع وبيانات الحيوان تبقى ظاهرة دائماً. كل زر أدناه
              يعمل مستقلاً، وحالته مكتوبة بوضوح.
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <Toggle
                label="الزيارات"
                checked={draft.portalShowVisits}
                onChange={(v) => update("portalShowVisits", v)}
              />
              <Toggle
                label="الشكوى"
                checked={draft.portalShowComplaint}
                onChange={(v) => update("portalShowComplaint", v)}
              />
              <Toggle
                label="تاريخ الحالة"
                checked={draft.portalShowHistory}
                onChange={(v) => update("portalShowHistory", v)}
              />
              <Toggle
                label="علامات الفحص"
                checked={draft.portalShowFindings}
                onChange={(v) => update("portalShowFindings", v)}
              />
              <Toggle
                label="التشخيص"
                checked={draft.portalShowDiagnosis}
                onChange={(v) => update("portalShowDiagnosis", v)}
              />
              <Toggle
                label="خطة العلاج"
                checked={draft.portalShowTreatment}
                onChange={(v) => update("portalShowTreatment", v)}
              />
              <Toggle
                label="الأدوية والجرع"
                checked={draft.portalShowMedications}
                onChange={(v) => update("portalShowMedications", v)}
              />
              <Toggle
                label="العمليات والإجراءات"
                checked={draft.portalShowProcedures}
                onChange={(v) => update("portalShowProcedures", v)}
              />
              <Toggle
                label="التحاليل والتصوير"
                checked={draft.portalShowDiagnostics}
                onChange={(v) => update("portalShowDiagnostics", v)}
              />
              <Toggle
                label="الحلاقة والغسل"
                checked={draft.portalShowGrooming}
                onChange={(v) => update("portalShowGrooming", v)}
              />
              <Toggle
                label="موعد المتابعة"
                checked={draft.portalShowFollowup}
                onChange={(v) => update("portalShowFollowup", v)}
              />
            </div>
          </Card>
          <Card
            title="بيانات الاتصال والتذييل"
            icon={MapPin}
            action={
              <ResetButton
                onClick={() =>
                  restoreDefaults(
                    {
                      clinicPhone: defaultClinicSettings.clinicPhone,
                      clinicAddress: defaultClinicSettings.clinicAddress,
                      clinicMapsUrl: defaultClinicSettings.clinicMapsUrl,
                      clinicInstagramUrl:
                        defaultClinicSettings.clinicInstagramUrl,
                      clinicFacebookUrl:
                        defaultClinicSettings.clinicFacebookUrl,
                      clinicTikTokUrl: defaultClinicSettings.clinicTikTokUrl,
                      portalFooterText: defaultClinicSettings.portalFooterText,
                    },
                    "بيانات الاتصال والتذييل",
                  )
                }
              />
            }
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="رقم الهاتف">
                <Input
                  dir="ltr"
                  value={draft.clinicPhone}
                  onChange={(e) => update("clinicPhone", e.target.value)}
                />
              </Field>
              <Field label="عنوان العيادة">
                <Input
                  value={draft.clinicAddress}
                  onChange={(e) => update("clinicAddress", e.target.value)}
                />
              </Field>
              <Field label="رابط الموقع GPS">
                <Input
                  dir="ltr"
                  value={draft.clinicMapsUrl}
                  onChange={(e) => update("clinicMapsUrl", e.target.value)}
                />
              </Field>
              <Field label="رابط إنستغرام">
                <Input
                  dir="ltr"
                  value={draft.clinicInstagramUrl}
                  onChange={(e) => update("clinicInstagramUrl", e.target.value)}
                />
              </Field>
              <Field label="رابط فيسبوك">
                <Input
                  dir="ltr"
                  value={draft.clinicFacebookUrl}
                  onChange={(e) => update("clinicFacebookUrl", e.target.value)}
                  placeholder="اتركه فارغاً لإخفاء الأيقونة"
                />
              </Field>
              <Field label="رابط تيك توك">
                <Input
                  dir="ltr"
                  value={draft.clinicTikTokUrl}
                  onChange={(e) => update("clinicTikTokUrl", e.target.value)}
                  placeholder="اتركه فارغاً لإخفاء الأيقونة"
                />
              </Field>
              <Field label="نص الحقوق">
                <Input
                  value={draft.portalFooterText}
                  onChange={(e) => update("portalFooterText", e.target.value)}
                />
              </Field>
            </div>
          </Card>
        </TabsContent>
        <TabsContent value="appearance" className="space-y-5">
          <Card title="الشعارات" icon={ImagePlus}>
            <div className="grid gap-4 sm:grid-cols-2">
              <LogoControl
                label="شعار بوابة المربي"
                target="portal"
                present={Boolean(draft.portalLogoKey)}
                busy={uploading === "portal"}
                inputRef={portalLogo}
                onUpload={uploadLogo}
                onRemove={removeLogo}
              />
              <LogoControl
                label="شعار لوحة المدير"
                target="admin"
                present={Boolean(draft.adminLogoKey)}
                busy={uploading === "admin"}
                inputRef={adminLogo}
                onUpload={uploadLogo}
                onRemove={removeLogo}
              />
            </div>
          </Card>
          <Card
            title="ألوان بوابة المربي"
            icon={Palette}
            action={
              <ResetButton
                onClick={() =>
                  restoreDefaults(
                    {
                      portalPrimary: defaultClinicSettings.portalPrimary,
                      portalAccent: defaultClinicSettings.portalAccent,
                      portalBackground: defaultClinicSettings.portalBackground,
                    },
                    "ألوان بوابة المربي",
                  )
                }
              />
            }
          >
            <div className="grid gap-4 sm:grid-cols-3">
              <Color
                label="اللون الرئيسي"
                value={draft.portalPrimary}
                onChange={(v) => update("portalPrimary", v)}
              />
              <Color
                label="اللون المساعد"
                value={draft.portalAccent}
                onChange={(v) => update("portalAccent", v)}
              />
              <Color
                label="الخلفية"
                value={draft.portalBackground}
                onChange={(v) => update("portalBackground", v)}
              />
            </div>
          </Card>
          <Card
            title="المؤثرات الموسمية"
            icon={Sparkles}
            action={
              <ResetButton
                onClick={() =>
                  restoreDefaults(
                    {
                      ambientEffect: defaultClinicSettings.ambientEffect,
                      ambientPortalEnabled:
                        defaultClinicSettings.ambientPortalEnabled,
                      ambientAdminEnabled:
                        defaultClinicSettings.ambientAdminEnabled,
                      ambientDensity: defaultClinicSettings.ambientDensity,
                      ambientSpeed: defaultClinicSettings.ambientSpeed,
                      ambientOpacity: defaultClinicSettings.ambientOpacity,
                    },
                    "المؤثرات الموسمية",
                  )
                }
              />
            }
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="نوع المؤثر">
                <Select
                  value={draft.ambientEffect}
                  onValueChange={(v) => update("ambientEffect", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">بدون مؤثر</SelectItem>
                    <SelectItem value="snow">ثلوج</SelectItem>
                    <SelectItem value="rain">مطر</SelectItem>
                    <SelectItem value="autumn">أوراق خريفية</SelectItem>
                    <SelectItem value="spring">زهور ربيعية</SelectItem>
                    <SelectItem value="ramadan">أجواء رمضانية</SelectItem>
                    <SelectItem value="christmas">أجواء كرسمس</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Toggle
                  label="للمربي"
                  checked={draft.ambientPortalEnabled}
                  onChange={(v) => update("ambientPortalEnabled", v)}
                />
                <Toggle
                  label="للوحة المدير"
                  checked={draft.ambientAdminEnabled}
                  onChange={(v) => update("ambientAdminEnabled", v)}
                />
              </div>
            </div>
            <div className="mt-5 grid gap-5 sm:grid-cols-3">
              <Range
                label={`الكمية: ${draft.ambientDensity}`}
                value={draft.ambientDensity}
                min={4}
                max={60}
                step={1}
                onChange={(v) => update("ambientDensity", v)}
              />
              <Range
                label={`السرعة: ${draft.ambientSpeed} ثانية`}
                value={draft.ambientSpeed}
                min={4}
                max={30}
                step={1}
                onChange={(v) => update("ambientSpeed", v)}
              />
              <Range
                label={`الشفافية: ${Math.round(draft.ambientOpacity * 100)}%`}
                value={draft.ambientOpacity}
                min={0.1}
                max={1}
                step={0.05}
                onChange={(v) => update("ambientOpacity", v)}
              />
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              المؤثر طبقة خفيفة لا تمنع الضغط ولا تغطي الأزرار أو الكتابة.
            </p>
          </Card>
          <Card
            title="ألوان لوحة المدير وحركتها"
            icon={Palette}
            action={
              <ResetButton
                onClick={() =>
                  restoreDefaults(
                    {
                      adminPrimary: defaultClinicSettings.adminPrimary,
                      adminSidebar: defaultClinicSettings.adminSidebar,
                      adminAccent: defaultClinicSettings.adminAccent,
                      adminAnimations: defaultClinicSettings.adminAnimations,
                    },
                    "ألوان وحركات لوحة المدير",
                  )
                }
              />
            }
          >
            <div className="grid gap-4 sm:grid-cols-3">
              <Color
                label="لون الأزرار"
                value={draft.adminPrimary}
                onChange={(v) => update("adminPrimary", v)}
              />
              <Color
                label="لون القائمة"
                value={draft.adminSidebar}
                onChange={(v) => update("adminSidebar", v)}
              />
              <Color
                label="لون التمييز"
                value={draft.adminAccent}
                onChange={(v) => update("adminAccent", v)}
              />
            </div>
            <div className="mt-4">
              <Toggle
                label="تفعيل الحركات والمؤثرات"
                checked={draft.adminAnimations}
                onChange={(v) => update("adminAnimations", v)}
              />
            </div>
          </Card>
        </TabsContent>
        <TabsContent value="sections" className="space-y-5">
          <Card
            title="أقسام لوحة المدير"
            icon={Settings2}
            action={
              <ResetButton
                onClick={() =>
                  restoreDefaults(
                    {
                      sectionLabels: {
                        ...defaultClinicSettings.sectionLabels,
                      },
                      sectionVisibility: {
                        ...defaultClinicSettings.sectionVisibility,
                      },
                    },
                    "أسماء وظهور أقسام لوحة المدير",
                  )
                }
              />
            }
          >
            <p className="mb-4 text-sm text-muted-foreground">
              عدّل اسم أي قسم أو أخفه من القائمة. قسم الإعدادات يبقى ظاهراً
              دائماً حتى لا تفقد التحكم.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {CLINIC_SECTIONS.map((id) => (
                <div
                  key={id}
                  className="flex items-center gap-3 rounded-xl border p-3"
                >
                  <Input
                    value={draft.sectionLabels[id]}
                    onChange={(e) =>
                      update("sectionLabels", {
                        ...draft.sectionLabels,
                        [id]: e.target.value,
                      })
                    }
                  />
                  <Switch
                    checked={draft.sectionVisibility[id]}
                    disabled={id === "settings"}
                    onCheckedChange={(v) =>
                      update("sectionVisibility", {
                        ...draft.sectionVisibility,
                        [id]: v,
                      })
                    }
                    aria-label={`إظهار ${draft.sectionLabels[id]}`}
                  />
                  {draft.sectionVisibility[id] ? (
                    <Eye className="size-4 text-[#2563eb]" />
                  ) : (
                    <EyeOff className="size-4 text-muted-foreground" />
                  )}
                </div>
              ))}
            </div>
          </Card>
          <Card
            title="إضافة أقسام خاصة"
            icon={Plus}
            action={
              <ResetButton
                label="حذف الأقسام الخاصة"
                onClick={() => {
                  if (
                    draft.customSections.length > 0 &&
                    !window.confirm(
                      "هل تريد حذف كل الأقسام الخاصة من الإعدادات؟ لن يُطبق الحذف إلا بعد الضغط على حفظ.",
                    )
                  )
                    return;
                  restoreDefaults({ customSections: [] }, "الأقسام الخاصة");
                }}
              />
            }
          >
            <div className="space-y-3">
              {draft.customSections.map((item, index) => (
                <div
                  key={item.id}
                  className="grid gap-3 rounded-xl border p-4 sm:grid-cols-[1fr_2fr_auto]"
                >
                  <Input
                    value={item.title}
                    onChange={(e) =>
                      update(
                        "customSections",
                        draft.customSections.map((entry, i) =>
                          i === index
                            ? { ...entry, title: e.target.value }
                            : entry,
                        ),
                      )
                    }
                    placeholder="اسم القسم"
                  />
                  <Textarea
                    value={item.content}
                    onChange={(e) =>
                      update(
                        "customSections",
                        draft.customSections.map((entry, i) =>
                          i === index
                            ? { ...entry, content: e.target.value }
                            : entry,
                        ),
                      )
                    }
                    rows={2}
                    placeholder="تفاصيل القسم"
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="text-red-600"
                    onClick={() =>
                      update(
                        "customSections",
                        draft.customSections.filter((_, i) => i !== index),
                      )
                    }
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
              {draft.customSections.length === 0 && (
                <p className="rounded-xl bg-[#f7faf9] p-4 text-sm text-muted-foreground">
                  لا توجد أقسام خاصة بعد.
                </p>
              )}
            </div>
            <Button
              type="button"
              variant="outline"
              className="mt-4"
              onClick={() =>
                update("customSections", [
                  ...draft.customSections,
                  { id: crypto.randomUUID(), title: "قسم جديد", content: "" },
                ])
              }
            >
              <Plus className="size-4" />
              إضافة قسم
            </Button>
          </Card>
        </TabsContent>
        <TabsContent value="security">
          <Card title="تغيير كلمة سر المدير" icon={LockKeyhole}>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="كلمة السر الحالية">
                <Input
                  type="password"
                  value={passwords.current}
                  onChange={(e) =>
                    setPasswords((p) => ({ ...p, current: e.target.value }))
                  }
                />
              </Field>
              <Field label="كلمة السر الجديدة">
                <Input
                  type="password"
                  value={passwords.next}
                  onChange={(e) =>
                    setPasswords((p) => ({ ...p, next: e.target.value }))
                  }
                />
              </Field>
              <Field label="تأكيد كلمة السر">
                <Input
                  type="password"
                  value={passwords.confirm}
                  onChange={(e) =>
                    setPasswords((p) => ({ ...p, confirm: e.target.value }))
                  }
                />
              </Field>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              إذا تركتها فارغة تبقى كلمة السر الحالية كما هي.
            </p>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Card({
  title,
  icon: Icon,
  action,
  children,
}: {
  title: string;
  icon: typeof Settings2;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-xl bg-[#eef2ff] text-[#2563eb]">
            <Icon className="size-4" />
          </span>
          <h3 className="font-black">{title}</h3>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function ResetButton({
  onClick,
  label = "استعادة الافتراضي",
}: {
  onClick: () => void;
  label?: string;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={onClick}
      className="rounded-xl text-xs"
    >
      <RotateCcw className="size-3.5" />
      {label}
    </Button>
  );
}
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`flex w-full items-center justify-between gap-3 rounded-xl border p-3 text-right transition ${checked ? "border-[#79bcb5] bg-[#edf8f6]" : "bg-[#fafcfb]"}`}
    >
      <span>
        <span className="block font-bold">{label}</span>
        <span
          className={`mt-1 block text-xs ${checked ? "text-[#2563eb]" : "text-muted-foreground"}`}
        >
          {checked ? "ظاهر للمربي" : "مخفي عن المربي"}
        </span>
      </span>
      <Switch
        checked={checked}
        tabIndex={-1}
        className="pointer-events-none"
        aria-hidden
      />
    </button>
  );
}
function Color({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Field label={label}>
      <div className="flex gap-2">
        <Input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-14 p-1"
        />
        <Input
          dir="ltr"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </Field>
  );
}
function Range({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-3 rounded-xl border p-4">
      <Label>{label}</Label>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={(values) => onChange(values[0] ?? value)}
      />
    </div>
  );
}
function LogoControl({
  label,
  target,
  present,
  busy,
  inputRef,
  onUpload,
  onRemove,
}: {
  label: string;
  target: "portal" | "admin" | "banner";
  present: boolean;
  busy: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onUpload: (target: "portal" | "admin" | "banner", file?: File) => void;
  onRemove: (target: "portal" | "admin" | "banner") => void;
}) {
  return (
    <div className="rounded-xl border p-4">
      <p className="font-bold">{label}</p>
      {present && (
        <img
          src={`/api/branding/${target}?v=${Date.now()}`}
          alt={label}
          className={`mt-3 rounded-xl border object-cover ${target === "banner" ? "h-28 w-full" : "size-20"}`}
        />
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/svg+xml"
        className="hidden"
        onChange={(e) => void onUpload(target, e.target.files?.[0])}
      />
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
        >
          {busy ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <ImagePlus className="size-4" />
          )}
          اختيار صورة
        </Button>
        {present && (
          <Button
            type="button"
            variant="ghost"
            className="text-red-600"
            onClick={() => void onRemove(target)}
          >
            <Trash2 className="size-4" />
            حذف
          </Button>
        )}
      </div>
    </div>
  );
}
