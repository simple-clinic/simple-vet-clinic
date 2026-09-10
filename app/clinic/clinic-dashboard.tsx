"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  BellRing,
  BedDouble,
  Boxes,
  CalendarCheck2,
  Check,
  ChevronLeft,
  CircleUserRound,
  ExternalLink,
  FileHeart,
  FolderArchive,
  Home,
  LayoutDashboard,
  Loader2,
  LockKeyhole,
  LogOut,
  Menu,
  MessageCircle,
  PawPrint,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Settings2,
  ShieldCheck,
  Stethoscope,
  Syringe,
  Trash2,
  UsersRound,
  WalletCards,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Toaster } from "@/components/ui/sonner";
import { REMINDER_KIND_LABELS, SPECIES, speciesLabel } from "@/lib/vet-data";
import { whatsappNumber } from "@/lib/phone";
import { OWNER_PORTAL_URL, WHATSAPP_SOCIAL_LINKS } from "@/lib/clinic-links";
import { petPhotoUrl } from "@/lib/pet-photo";
import { NewCaseSheet } from "./new-case-sheet";
import { LegacyPatientSheet } from "./legacy-patient-sheet";
import { cleanOwnerMessage, messageDate } from "@/lib/message-format";
import { EditPatientSheet } from "./edit-patient-sheet";
import { Boarding } from "./boarding";
import { BoardingSheet, type BoardingTarget } from "./boarding-sheet";
import { Inventory } from "./inventory";
import { PatientDetailSheet } from "./patient-detail-sheet";
import { VisitSheet, type VisitTarget } from "./visit-sheet";
import type {
  ArchivedPatientSummary,
  DashboardData,
  FinanceData,
  InventoryAlert,
  PatientSummary,
  Reminder,
} from "./types";
import {
  defaultClinicSettings,
  type ClinicSection,
  type ClinicSettings,
} from "@/lib/clinic-settings-shared";
import { SettingsPanel } from "./settings-panel";
import { AmbientEffects } from "@/components/ambient-effects";
import { PatientExportDialog } from "./patient-export-dialog";

type Section = ClinicSection | `custom:${string}`;

function formatDate(value: string | null, short = false) {
  if (!value) return "غير محدد";
  const date =
    value.includes("T") || value.includes(" ")
      ? new Date(value.replace(" ", "T") + (value.endsWith("Z") ? "" : "Z"))
      : new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  const numeric = `${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}`;
  return short ? numeric : numeric;
}

function daysUntil(value: string | null) {
  if (!value) return null;
  const due = new Date(`${value}T12:00:00`).getTime();
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  return Math.ceil((due - today.getTime()) / 86_400_000);
}

function dueMeta(value: string | null) {
  const days = daysUntil(value);
  if (days === null)
    return { label: "بدون تاريخ", className: "bg-slate-100 text-slate-600" };
  if (days < 0)
    return {
      label: `متأخر ${Math.abs(days)} يوم`,
      className: "bg-red-50 text-red-700",
    };
  if (days === 0)
    return { label: "اليوم", className: "bg-amber-100 text-amber-800" };
  if (days <= 7)
    return {
      label: `بعد ${days} أيام`,
      className: "bg-amber-50 text-amber-700",
    };
  return {
    label: formatDate(value, true),
    className: "bg-[#eef2ff] text-[#2563eb]",
  };
}

function inventoryAlertSummary(item: InventoryAlert) {
  const parts: string[] = [];
  if (item.quantity <= item.low_stock_threshold) {
    parts.push(
      item.quantity === 0
        ? "نفدت الكمية"
        : `بقي ${item.quantity} ${item.unit} (حد التنبيه ${item.low_stock_threshold})`,
    );
  }
  const days = daysUntil(item.expiry_date);
  if (days !== null && days <= 1) {
    parts.push(
      days < 0
        ? `الصلاحية منتهية منذ ${Math.abs(days)} يوم`
        : days === 0
          ? "تنتهي الصلاحية اليوم"
          : `تنتهي الصلاحية بعد ${days} يوم`,
    );
  }
  return parts.join(" · ") || "يحتاج مراجعة";
}

export function ClinicDashboard({
  initialUser,
  signOutPath,
  adminConfigured,
}: {
  initialUser: { displayName: string; email: string };
  signOutPath: string;
  adminConfigured: boolean;
}) {
  const [section, setSection] = useState<Section>("overview");
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [speciesFilter, setSpeciesFilter] = useState("all");
  const [newCaseOpen, setNewCaseOpen] = useState(false);
  const [legacyOpen, setLegacyOpen] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(
    null,
  );
  const [visitTarget, setVisitTarget] = useState<VisitTarget | null>(null);
  const [editPatientId, setEditPatientId] = useState<string | null>(null);
  const [boardingTarget, setBoardingTarget] = useState<BoardingTarget | null>(
    null,
  );
  const [boardingRefresh, setBoardingRefresh] = useState(0);
  const [detailRefresh, setDetailRefresh] = useState(0);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [settings, setSettings] = useState<ClinicSettings>(
    defaultClinicSettings,
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const response = await fetch("/api/clinic/cases", { cache: "no-store" });
      const payload = (await response.json()) as DashboardData & {
        error?: string;
      };
      if (!response.ok)
        throw new Error(payload.error || "تعذّر تحميل السجلات.");
      setData(payload);
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "تعذّر تحميل السجلات.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (!cancelled) return loadData();
    });
    return () => {
      cancelled = true;
    };
  }, [loadData]);

  useEffect(() => {
    void fetch("/api/clinic/settings", { cache: "no-store" }).then(
      async (response) => {
        if (response.ok) setSettings((await response.json()) as ClinicSettings);
      },
    );
  }, []);

  const filteredPatients = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (data?.patients ?? []).filter((patient) => {
      const matchesSpecies =
        speciesFilter === "all" || patient.species === speciesFilter;
      const haystack =
        `${patient.patient_name} ${patient.owner_name} ${patient.phone} ${patient.breed}`.toLowerCase();
      return matchesSpecies && (!query || haystack.includes(query));
    });
  }, [data?.patients, search, speciesFilter]);

  const upcoming = useMemo(
    () =>
      (data?.reminders ?? []).filter((reminder) => {
        const days = daysUntil(reminder.due_date);
        return days !== null && days <= 1;
      }),
    [data?.reminders],
  );
  const displayUser = data?.user ?? initialUser;
  const notificationCount =
    Number(data?.stats.due_count ?? 0) +
    Number(data?.inventoryAlerts?.length ?? 0);

  function goTo(next: Section) {
    setSection(next);
    setMobileNavOpen(false);
  }
  const currentSectionLabel = section.startsWith("custom:")
    ? (settings.customSections.find((item) => `custom:${item.id}` === section)
        ?.title ?? "قسم مخصص")
    : settings.sectionLabels[section as ClinicSection];

  async function updateReminder(id: string, action: "mark_sent" | "complete") {
    try {
      const response = await fetch(`/api/clinic/reminders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || "تعذّر تحديث التذكير.");
      setData((current) => {
        if (!current) return current;
        if (action === "complete") {
          return {
            ...current,
            reminders: current.reminders.filter((item) => item.id !== id),
          };
        }
        return {
          ...current,
          reminders: current.reminders.map((item) =>
            item.id === id
              ? { ...item, sent_at: new Date().toISOString() }
              : item,
          ),
        };
      });
      if (action === "complete") toast.success("تم إكمال التذكير.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "تعذّر تحديث التذكير.",
      );
    }
  }

  function whatsappHref(reminder: Reminder) {
    const date = messageDate(reminder.due_date);
    const message = cleanOwnerMessage(
      `مرحباً ${reminder.owner_name}، نذكّركم بموعد ${REMINDER_KIND_LABELS[reminder.kind] ?? "المراجعة"} للحيوان ${reminder.patient_name}: ${reminder.title} بتاريخ ${date}.\n\nيمكنكم فتح ملف ${reminder.patient_name} وكتابة رقم الهاتف واسم الحيوان لمشاهدة بياناته ومواعيد الوقاية من هنا:\n${OWNER_PORTAL_URL}\n\n${WHATSAPP_SOCIAL_LINKS}\n\nمع تحيات Simple Vet Clinic.`,
    );
    return `https://wa.me/${whatsappNumber(reminder.phone)}?text=${encodeURIComponent(message)}`;
  }

  return (
    <main
      style={
        {
          "--admin-primary": settings.adminPrimary,
          "--admin-sidebar": settings.adminSidebar,
          "--admin-accent": settings.adminAccent,
        } as React.CSSProperties
      }
      className={`simple-admin-shell min-h-screen bg-[#f3f6ff] text-[#17203b] lg:pr-[292px] ${settings.adminAnimations ? "" : "[&_*]:!transition-none [&_*]:!animate-none"}`}
    >
      <AmbientEffects
        effect={settings.ambientEffect}
        enabled={settings.ambientAdminEnabled}
        density={settings.ambientDensity}
        speed={settings.ambientSpeed}
        opacity={settings.ambientOpacity}
      />
      <Toaster richColors position="top-center" />
      <Sidebar
        section={section}
        onChange={goTo}
        user={displayUser}
        signOutPath={signOutPath}
        mobileOpen={mobileNavOpen}
        onMobileClose={() => setMobileNavOpen(false)}
        settings={settings}
      />

      <header className="sticky top-0 z-20 flex h-[84px] items-center justify-between border-b border-[#dce2f1] bg-white/80 px-4 shadow-sm backdrop-blur-xl sm:px-7 lg:px-9">
        <div className="flex items-center gap-3">
          <Button
            size="icon"
            variant="outline"
            className="rounded-xl lg:hidden"
            onClick={() => setMobileNavOpen(true)}
          >
            <Menu className="size-5" />
          </Button>
          <div>
            <p className="text-xs font-bold text-[#73838a]">
              SIMPLE VET CLINIC / لوحة العيادة
            </p>
            <h1 className="mt-1 text-xl font-black">{currentSectionLabel}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ExternalServiceBox />
          <Button
            size="icon"
            variant="outline"
            className="relative rounded-xl bg-white"
            onClick={() => goTo("overview")}
            aria-label={`فتح التنبيهات${notificationCount ? `، ${notificationCount} تنبيه` : ""}`}
          >
            <BellRing className="size-4" />
            {notificationCount > 0 && (
              <span className="absolute -left-1.5 -top-1.5 grid min-w-5 place-items-center rounded-full bg-red-600 px-1 text-[10px] font-black leading-5 text-white">
                {notificationCount > 99 ? "+99" : notificationCount}
              </span>
            )}
          </Button>
          <Button
            size="icon"
            variant="outline"
            className="rounded-xl bg-white"
            onClick={() => void loadData()}
            aria-label="تحديث البيانات"
          >
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button
            style={{ backgroundColor: settings.adminPrimary }}
            className="rounded-xl px-4 font-bold shadow-lg"
            onClick={() => setNewCaseOpen(true)}
          >
            <Plus className="size-4" />
            <span className="hidden sm:inline">تسجيل حالة</span>
          </Button>
          <Button
            variant="outline"
            className="hidden rounded-xl bg-white sm:inline-flex"
            onClick={() => setLegacyOpen(true)}
          >
            حيوان سابق ودفتر لقاح
          </Button>
        </div>
      </header>

      <div className="px-4 py-6 sm:px-7 lg:px-9">
        {!adminConfigured && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
            <LockKeyhole className="mt-0.5 size-5 shrink-0 text-amber-700" />
            <p>
              <strong>نسخة التجربة محمية بصلاحية الموقع الحالية.</strong> قبل
              فتح بوابة المربي للعامة سنثبت بريد مدير العيادة حتى تبقى لوحة
              السجلات محصورة بحسابك فقط.
            </p>
          </div>
        )}

        {loadError ? (
          <div className="grid min-h-[60vh] place-items-center">
            <div className="max-w-md text-center">
              <AlertCircle className="mx-auto size-10 text-red-500" />
              <h2 className="mt-4 text-xl font-black">
                لم نستطع تحميل قاعدة البيانات
              </h2>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                {loadError}
              </p>
              <Button
                className="mt-5 rounded-xl"
                onClick={() => void loadData()}
              >
                إعادة المحاولة
              </Button>
            </div>
          </div>
        ) : loading && !data ? (
          <div className="grid min-h-[60vh] place-items-center">
            <div className="flex items-center gap-2 font-bold text-[#2563eb]">
              <Loader2 className="size-5 animate-spin" /> جارٍ تحضير السجلات...
            </div>
          </div>
        ) : (
          <>
            {section === "overview" && (
              <Overview
                data={data}
                reminders={upcoming}
                onNewCase={() => setNewCaseOpen(true)}
                onShowRecords={() => goTo("records")}
                onShowReminders={() => goTo("reminders")}
                onShowInventory={() => goTo("inventory")}
                onOpenPatient={setSelectedPatientId}
              />
            )}
            {section === "records" && (
              <Records
                patients={filteredPatients}
                search={search}
                onSearch={setSearch}
                speciesFilter={speciesFilter}
                onSpeciesFilter={setSpeciesFilter}
                onOpenPatient={setSelectedPatientId}
                onNewCase={() => setNewCaseOpen(true)}
              />
            )}
            {section === "archive" && (
              <ArchivePatients
                patients={data?.archivedPatients ?? []}
                onOpenPatient={setSelectedPatientId}
                onRestored={() => void loadData()}
              />
            )}
            {section === "reminders" && (
              <Reminders
                reminders={data?.reminders ?? []}
                whatsappHref={whatsappHref}
                onMarkSent={(id) => void updateReminder(id, "mark_sent")}
                onComplete={(id) => void updateReminder(id, "complete")}
              />
            )}
            {section === "inventory" && <Inventory />}
            {section === "boarding" && (
              <Boarding
                refreshToken={boardingRefresh}
                onNewStay={setBoardingTarget}
              />
            )}
            {section === "finance" && <Finance />}
            {section === "settings" && (
              <SettingsPanel value={settings} onSaved={setSettings} />
            )}
            {section.startsWith("custom:") &&
              (() => {
                const custom = settings.customSections.find(
                  (item) => `custom:${item.id}` === section,
                );
                return custom ? (
                  <section className="rounded-2xl border bg-white p-6 shadow-sm">
                    <h2 className="text-2xl font-black">{custom.title}</h2>
                    <p className="mt-4 whitespace-pre-wrap text-sm leading-8 text-muted-foreground">
                      {custom.content ||
                        "هذا القسم جاهز لإضافة تفاصيلك من الإعدادات."}
                    </p>
                  </section>
                ) : null;
              })()}
          </>
        )}
      </div>

      <NewCaseSheet
        open={newCaseOpen}
        onOpenChange={setNewCaseOpen}
        onSaved={(patientId) => {
          void loadData();
          setSelectedPatientId(patientId);
        }}
      />
      <LegacyPatientSheet
        open={legacyOpen}
        onOpenChange={setLegacyOpen}
        onSaved={(patientId) => {
          void loadData();
          setSelectedPatientId(patientId);
        }}
      />
      <PatientDetailSheet
        patientId={selectedPatientId}
        refreshToken={detailRefresh}
        onOpenChange={(open) => !open && setSelectedPatientId(null)}
        onAddVisit={(target) => {
          setSelectedPatientId(null);
          setVisitTarget(target);
        }}
        onEditVisit={(target) => {
          setSelectedPatientId(null);
          setVisitTarget(target);
        }}
        onEditPatient={(patientId) => {
          setSelectedPatientId(null);
          setEditPatientId(patientId);
        }}
        onBoarding={(target) => {
          setSelectedPatientId(null);
          setBoardingTarget({ patient: target });
        }}
        onDeleted={() => {
          setSelectedPatientId(null);
          void loadData();
        }}
        onChanged={() => {
          setDetailRefresh((value) => value + 1);
          void loadData();
        }}
      />
      <VisitSheet
        target={visitTarget}
        onOpenChange={(open) => !open && setVisitTarget(null)}
        onSaved={(patientId) => {
          void loadData();
          setDetailRefresh((value) => value + 1);
          setSelectedPatientId(patientId);
        }}
      />
      <EditPatientSheet
        patientId={editPatientId}
        onOpenChange={(open) => !open && setEditPatientId(null)}
        onSaved={(patientId) => {
          void loadData();
          setDetailRefresh((value) => value + 1);
          setSelectedPatientId(patientId);
        }}
      />
      <BoardingSheet
        target={boardingTarget}
        onOpenChange={(open) => !open && setBoardingTarget(null)}
        onSaved={() => {
          setBoardingRefresh((value) => value + 1);
          setSection("boarding");
          void loadData();
        }}
      />
    </main>
  );
}

function Sidebar({
  section,
  onChange,
  user,
  signOutPath,
  mobileOpen,
  onMobileClose,
  settings,
}: {
  section: Section;
  onChange: (section: Section) => void;
  user: { displayName: string; email: string };
  signOutPath: string;
  mobileOpen: boolean;
  onMobileClose: () => void;
  settings: ClinicSettings;
}) {
  const items: Array<{ id: Section; label: string; icon: typeof Home }> = (
    [
      { id: "overview", label: "نظرة عامة", icon: LayoutDashboard },
      { id: "records", label: "سجلات الحيوانات", icon: FileHeart },
      { id: "archive", label: "أرشيف الحالات", icon: FolderArchive },
      { id: "reminders", label: "التذكيرات", icon: BellRing },
      { id: "inventory", label: "المخزن والمبيعات", icon: Boxes },
      { id: "boarding", label: "المبيت والأقفاص", icon: BedDouble },
      { id: "finance", label: "الوارد الشهري", icon: WalletCards },
      { id: "settings", label: "الإعدادات", icon: Settings2 },
    ] as Array<{ id: ClinicSection; label: string; icon: typeof Home }>
  )
    .filter((item) => settings.sectionVisibility[item.id])
    .concat(
      settings.customSections.map((item) => ({
        id: `custom:${item.id}` as Section,
        label: item.title,
        icon: Settings2,
      })),
    );
  return (
    <>
      {mobileOpen && (
        <button
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={onMobileClose}
          aria-label="إغلاق القائمة"
        />
      )}
      <aside
        style={{ backgroundColor: settings.adminSidebar }}
        className={`fixed inset-y-0 right-0 z-50 flex w-[292px] flex-col border-l border-white/10 px-5 py-6 text-white shadow-[0_0_60px_rgba(17,27,58,0.3)] transition-transform lg:translate-x-0 ${mobileOpen ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="mb-8 flex items-center justify-between px-2">
          <div className="flex items-center gap-3">
            <span
              style={{ backgroundColor: settings.adminAccent }}
              className="grid size-12 place-items-center overflow-hidden rounded-[1.1rem] text-[#111b3a] shadow-lg"
            >
              {settings.adminLogoKey ? (
                <img
                  src="/api/branding/admin"
                  alt="شعار لوحة المدير"
                  className="h-full w-full object-cover"
                />
              ) : (
                <Plus className="size-7" strokeWidth={3} />
              )}
            </span>
            <div>
              <p className="text-lg font-black tracking-wider">
                {settings.clinicName}
              </p>
              <p className="text-[10px] tracking-[0.18em] text-[#aab8dc]">SMART CLINIC</p>
            </div>
          </div>
          <Button
            size="icon-sm"
            variant="ghost"
            className="text-white lg:hidden"
            onClick={onMobileClose}
          >
            <X className="size-4" />
          </Button>
        </div>
        <nav className="space-y-2">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => onChange(item.id)}
              className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-sm font-bold transition ${section === item.id ? "bg-white text-[#17203b] shadow-[0_10px_28px_rgba(0,0,0,0.18)]" : "text-[#cbd5f1] hover:bg-white/8 hover:text-white"}`}
            >
              <item.icon className="size-5" />
              {item.id.startsWith("custom:")
                ? item.label
                : settings.sectionLabels[item.id as ClinicSection] ||
                  item.label}
            </button>
          ))}
        </nav>
        <div className="mt-7 rounded-2xl border border-white/10 bg-white/6 p-4">
          <p className="text-xs font-bold text-[#56d6c9]">وصول سريع</p>
          <Link
            href="/"
            target="_blank"
            className="mt-3 flex items-center justify-between text-sm text-[#cbd5f1] hover:text-white"
          >
            معاينة بوابة المربي <ExternalLink className="size-4" />
          </Link>
        </div>
        <div className="mt-auto border-t border-white/10 pt-4">
          <div className="flex items-center gap-3 rounded-xl bg-white/6 p-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/10">
              <CircleUserRound className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{user.displayName}</p>
              <p
                dir="ltr"
                className="truncate text-left text-[10px] text-[#9cadd6]"
              >
                {user.email}
              </p>
            </div>
            <Link
              href={signOutPath}
              aria-label="تسجيل الخروج"
              className="text-[#aab8dc] hover:text-white"
            >
              <LogOut className="size-4" />
            </Link>
          </div>
        </div>
      </aside>
    </>
  );
}

function Overview({
  data,
  reminders,
  onNewCase,
  onShowRecords,
  onShowReminders,
  onShowInventory,
  onOpenPatient,
}: {
  data: DashboardData | null;
  reminders: Reminder[];
  onNewCase: () => void;
  onShowRecords: () => void;
  onShowReminders: () => void;
  onShowInventory: () => void;
  onOpenPatient: (id: string) => void;
}) {
  const [statusText, setStatusText] = useState("");
  const stats = data?.stats ?? {
    patient_count: 0,
    owner_count: 0,
    today_visits: 0,
    due_count: 0,
  };
  const cards = [
    {
      label: "الحيوانات المسجلة",
      value: stats.patient_count,
      icon: PawPrint,
      color: "bg-[#e7f5f2] text-[#2563eb]",
    },
    {
      label: "المربّون",
      value: stats.owner_count,
      icon: UsersRound,
      color: "bg-[#eef1fa] text-[#4b5ea7]",
    },
    {
      label: "زيارات اليوم",
      value: stats.today_visits,
      icon: Stethoscope,
      color: "bg-[#fff4cf] text-[#8a6810]",
    },
    {
      label: "مواعيد غداً أو اليوم",
      value: stats.due_count,
      icon: BellRing,
      color: "bg-[#ffecec] text-[#b23a3a]",
    },
  ];
  const recentPatients = (data?.patients ?? []).slice(0, 5);
  const inventoryAlerts = data?.inventoryAlerts ?? [];
  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] bg-[#111b3a] p-6 text-white shadow-xl sm:p-8">
        <div className="absolute -left-10 -top-14 size-56 rounded-full border-[34px] border-white/5" />
        <div className="relative flex flex-col justify-between gap-7 sm:flex-row sm:items-center">
          <div>
            <Badge className="mb-4 bg-[#56d6c9] text-[#17203b] hover:bg-[#56d6c9]">
              صباح العافية
            </Badge>
            <h2 className="text-2xl font-black sm:text-3xl">
              كل حالة، كل زيارة، في سجل واحد
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-7 text-[#c2d5d9]">
              سجّل الحالة الجديدة أو افتح ملفاً سابقاً؛ عند تطابق الهاتف واسم
              الحيوان تُربط الزيارة تلقائياً بالسجل الموجود.
            </p>
          </div>
          <Button
            className="h-12 shrink-0 rounded-xl bg-[#56d6c9] px-6 font-black text-[#17203b] hover:bg-[#f3bd34]"
            onClick={onNewCase}
          >
            <Plus className="size-5" /> تسجيل حالة الآن
          </Button>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <article
            key={card.label}
            className="rounded-2xl border border-[#dce2f1] bg-white p-5 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <span
                className={`grid size-11 place-items-center rounded-xl ${card.color}`}
              >
                <card.icon className="size-5" />
              </span>
              <span className="text-3xl font-black">{card.value}</span>
            </div>
            <p className="mt-4 text-sm font-bold text-[#667780]">
              {card.label}
            </p>
          </article>
        ))}
      </section>

      <section className="rounded-2xl border border-[#bfe0d8] bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <MessageCircle className="mt-1 size-6 text-[#168b58]" />
          <div className="flex-1">
            <h3 className="font-black">نشر إعلان في حالة واتساب</h3>
            <p className="mt-1 text-xs leading-6 text-muted-foreground">
              اكتب دوام العيادة أو أي إعلان، ثم اختر WhatsApp وبعدها «حالتي» من
              شاشة المشاركة.
            </p>
            <Textarea
              className="mt-3"
              rows={3}
              placeholder="مثال: دوام العيادة اليوم من الساعة..."
              value={statusText}
              onChange={(event) => setStatusText(event.target.value)}
            />
            <Button
              className="mt-3 bg-[#1f9d62] hover:bg-[#188550]"
              disabled={!statusText.trim()}
              onClick={async () => {
                const text = cleanOwnerMessage(statusText);
                if (navigator.share) {
                  try {
                    await navigator.share({ text });
                    return;
                  } catch {}
                }
                window.open(
                  `https://wa.me/?text=${encodeURIComponent(text)}`,
                  "_blank",
                  "noopener,noreferrer",
                );
              }}
            >
              <MessageCircle className="size-4" />
              فتح واتساب للنشر
            </Button>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
        <div className="mb-4 flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-800">
            <BellRing className="size-5" />
          </span>
          <div>
            <h3 className="font-black">مركز التنبيهات</h3>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              يظهر التنبيه قبل موعد اللقاح أو الجرعة أو انتهاء الصلاحية بيوم
              واحد، ويبقى ظاهراً يوم الموعد وبعده حتى تتصرف.
            </p>
          </div>
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          <button
            type="button"
            onClick={onShowReminders}
            className={`rounded-xl border p-4 text-right transition hover:-translate-y-0.5 hover:shadow-sm ${reminders.length ? "border-red-200 bg-white" : "border-emerald-200 bg-emerald-50"}`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Syringe
                  className={`size-5 ${reminders.length ? "text-red-600" : "text-emerald-700"}`}
                />
                <strong>لقاحات وجرع ومواعيد قريبة</strong>
              </div>
              <Badge
                className={
                  reminders.length
                    ? "bg-red-100 text-red-700"
                    : "bg-emerald-100 text-emerald-700"
                }
              >
                {reminders.length}
              </Badge>
            </div>
            {reminders.length ? (
              <div className="mt-3 space-y-2">
                {reminders.slice(0, 3).map((reminder) => (
                  <p
                    key={reminder.id}
                    className="text-xs text-muted-foreground"
                  >
                    <strong className="text-foreground">
                      {reminder.patient_name}
                    </strong>{" "}
                    · {REMINDER_KIND_LABELS[reminder.kind] ?? reminder.title} ·{" "}
                    {dueMeta(reminder.due_date).label}
                  </p>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-xs font-bold text-emerald-800">
                لا توجد مواعيد قريبة حالياً.
              </p>
            )}
          </button>
          <button
            type="button"
            onClick={onShowInventory}
            className={`rounded-xl border p-4 text-right transition hover:-translate-y-0.5 hover:shadow-sm ${inventoryAlerts.length ? "border-amber-300 bg-white" : "border-emerald-200 bg-emerald-50"}`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Boxes
                  className={`size-5 ${inventoryAlerts.length ? "text-amber-700" : "text-emerald-700"}`}
                />
                <strong>تنبيهات المخزن والصلاحية</strong>
              </div>
              <Badge
                className={
                  inventoryAlerts.length
                    ? "bg-amber-100 text-amber-800"
                    : "bg-emerald-100 text-emerald-700"
                }
              >
                {inventoryAlerts.length}
              </Badge>
            </div>
            {inventoryAlerts.length ? (
              <div className="mt-3 space-y-2">
                {inventoryAlerts.slice(0, 3).map((item) => (
                  <p key={item.id} className="text-xs text-muted-foreground">
                    <strong className="text-foreground">{item.name}</strong> ·{" "}
                    {inventoryAlertSummary(item)}
                  </p>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-xs font-bold text-emerald-800">
                المخزون والصلاحيات ضمن الحدود الطبيعية.
              </p>
            )}
          </button>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.85fr]">
        <section className="rounded-2xl border border-[#dce2f1] bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-black">أحدث السجلات</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                آخر الحيوانات التي تمت زيارتها
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={onShowRecords}>
              عرض الكل <ChevronLeft className="size-4" />
            </Button>
          </div>
          {recentPatients.length ? (
            <div className="divide-y">
              {recentPatients.map((patient) => (
                <PatientRow
                  key={patient.id}
                  patient={patient}
                  onClick={() => onOpenPatient(patient.id)}
                />
              ))}
            </div>
          ) : (
            <EmptyDashboard onNewCase={onNewCase} />
          )}
        </section>

        <section className="rounded-2xl border border-[#dce2f1] bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-black">أقرب التذكيرات</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                لقاحات، ديدان ومراجعات
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={onShowReminders}>
              عرض الكل
            </Button>
          </div>
          {reminders.length ? (
            <div className="space-y-3">
              {reminders.slice(0, 6).map((reminder) => {
                const meta = dueMeta(reminder.due_date);
                return (
                  <div
                    key={reminder.id}
                    className="flex items-center gap-3 rounded-xl bg-[#f8faf9] p-3"
                  >
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-[#2563eb] shadow-sm">
                      <Syringe className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold">
                        {reminder.patient_name} · {reminder.title}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {reminder.owner_name}
                      </p>
                    </div>
                    <Badge
                      className={`${meta.className} hover:${meta.className}`}
                    >
                      {meta.label}
                    </Badge>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              لا توجد تذكيرات قادمة.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function PatientRow({
  patient,
  onClick,
}: {
  patient: PatientSummary;
  onClick: () => void;
}) {
  return (
    <button
      className="flex w-full items-center gap-3 py-3 text-right hover:bg-[#f8faf9]"
      onClick={onClick}
    >
      <PatientAvatar patient={patient} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-black">{patient.patient_name}</p>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {speciesLabel(patient.species)} · {patient.owner_name} ·{" "}
          {patient.phone}
        </p>
      </div>
      <div className="text-left">
        <p className="text-xs font-bold text-[#2563eb]">
          {patient.visit_count} زيارة
        </p>
        <p className="mt-1 text-[10px] text-muted-foreground">
          {formatDate(patient.last_visit_at, true)}
        </p>
      </div>
    </button>
  );
}

function EmptyDashboard({ onNewCase }: { onNewCase: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed p-8 text-center">
      <FileHeart className="mx-auto size-8 text-[#8da39f]" />
      <h4 className="mt-3 font-black">لا توجد حالات بعد</h4>
      <p className="mt-2 text-sm text-muted-foreground">
        ابدأ بتسجيل أول حيوان وزيارته الطبية.
      </p>
      <Button className="mt-4 rounded-xl" onClick={onNewCase}>
        <Plus className="size-4" />
        الحالة الأولى
      </Button>
    </div>
  );
}

function ExternalServiceBox() {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState("أشعة");
  const [amount, setAmount] = useState("");
  const [serviceDate, setServiceDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [saving, setSaving] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const closeOnOutside = (event: PointerEvent) => {
      if (!boxRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutside);
    return () => document.removeEventListener("pointerdown", closeOnOutside);
  }, [open]);
  async function save() {
    const value = Number(amount);
    if (!value) {
      toast.error("اكتب السعر");
      return;
    }
    setSaving(true);
    try {
      const r = await fetch("/api/clinic/external-services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceType: type,
          description: "",
          amountIqd: value,
          serviceDate,
        }),
      });
      const j = (await r.json()) as { error?: string; message?: string };
      if (!r.ok) throw new Error(j.error || "تعذّر الحفظ");
      toast.success(j.message);
      setAmount("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذّر الحفظ");
    } finally {
      setSaving(false);
    }
  }
  return (
    <div ref={boxRef} className="relative">
      <Button
        type="button"
        variant="outline"
        className="h-10 rounded-xl bg-white px-3 font-bold text-[#2563eb]"
        onClick={() => setOpen(!open)}
      >
        خدمات <Plus className="size-4" />
      </Button>
      {open && (
        <div className="absolute right-0 top-12 z-50 w-[min(18rem,calc(100vw-2rem))] rounded-2xl border bg-white p-3 shadow-xl">
          <p className="mb-2 font-black text-[#2563eb]">تسجيل خدمة خارجية</p>
          <div className="grid gap-2">
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="أشعة">أشعة</SelectItem>
                <SelectItem value="فحص خارجي">فحص خارجي</SelectItem>
                <SelectItem value="فحص خروج">فحص خروج</SelectItem>
                <SelectItem value="تنظيف أسنان">تنظيف أسنان</SelectItem>
                <SelectItem value="عملية سريعة">عملية سريعة</SelectItem>
                <SelectItem value="تحليل">تحليل</SelectItem>
                <SelectItem value="سونار">سونار</SelectItem>
                <SelectItem value="خدمة أخرى">خدمة أخرى</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="date"
              aria-label="تاريخ الخدمة"
              value={serviceDate}
              onChange={(e) => setServiceDate(e.target.value)}
            />
            <Input
              type="number"
              placeholder="السعر بالدينار"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <Button
              type="button"
              onClick={() => void save()}
              disabled={saving}
              className="bg-[#2563eb]"
            >
              {saving ? "حفظ..." : "حفظ الخدمة"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Records({
  patients,
  search,
  onSearch,
  speciesFilter,
  onSpeciesFilter,
  onOpenPatient,
  onNewCase,
}: {
  patients: PatientSummary[];
  search: string;
  onSearch: (value: string) => void;
  speciesFilter: string;
  onSpeciesFilter: (value: string) => void;
  onOpenPatient: (id: string) => void;
  onNewCase: () => void;
}) {
  return (
    <section className="rounded-2xl border border-[#dce2f1] bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-black">دليل الحيوانات والمربّين</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            ابحث بالاسم أو رقم الهاتف أو السلالة.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <PatientExportDialog />
          <div className="relative">
            <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => onSearch(event.target.value)}
              placeholder="بحث سريع..."
              className="w-full pr-9 sm:w-64"
            />
          </div>
          <Select value={speciesFilter} onValueChange={onSpeciesFilter}>
            <SelectTrigger className="w-full sm:w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الأنواع</SelectItem>
              {SPECIES.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {patients.length ? (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الحيوان</TableHead>
                <TableHead>المربي</TableHead>
                <TableHead>العمر / الوزن</TableHead>
                <TableHead>آخر شكوى</TableHead>
                <TableHead>الزيارات</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {patients.map((patient) => (
                <TableRow
                  key={patient.id}
                  className="cursor-pointer"
                  onClick={() => onOpenPatient(patient.id)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <PatientAvatar patient={patient} />
                      <div>
                        <p className="font-black">{patient.patient_name}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {speciesLabel(patient.species)} · {patient.breed}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="font-bold">{patient.owner_name}</p>
                    <p
                      dir="ltr"
                      className="mt-1 text-right text-xs text-muted-foreground"
                    >
                      {patient.phone}
                    </p>
                  </TableCell>
                  <TableCell className="text-sm">
                    {patient.age_value === null
                      ? "—"
                      : `${patient.age_value} ${patient.age_unit}`}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {patient.weight_kg
                        ? `${patient.weight_kg} كغم`
                        : "وزن غير مسجل"}
                    </p>
                  </TableCell>
                  <TableCell>
                    <p className="max-w-[230px] truncate text-sm">
                      {patient.chief_complaint || "—"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDate(patient.last_visit_at)}
                    </p>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{patient.visit_count}</Badge>
                  </TableCell>
                  <TableCell>
                    <Button size="icon-sm" variant="ghost">
                      <ChevronLeft className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="p-8">
          <EmptyDashboard onNewCase={onNewCase} />
        </div>
      )}
    </section>
  );
}

function ArchivePatients({
  patients,
  onOpenPatient,
  onRestored,
}: {
  patients: ArchivedPatientSummary[];
  onOpenPatient: (id: string) => void;
  onRestored: () => void;
}) {
  const [query, setQuery] = useState("");
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] =
    useState<ArchivedPatientSummary | null>(null);
  const [deleting, setDeleting] = useState(false);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return patients;
    return patients.filter((patient) =>
      `${patient.patient_name} ${patient.owner_name} ${patient.phone} ${patient.breed}`
        .toLowerCase()
        .includes(needle),
    );
  }, [patients, query]);

  async function restorePatient(patient: ArchivedPatientSummary) {
    setRestoringId(patient.id);
    try {
      const response = await fetch(
        `/api/clinic/patients/${patient.id}/restore`,
        { method: "POST" },
      );
      const result = (await response.json()) as {
        error?: string;
        message?: string;
      };
      if (!response.ok)
        throw new Error(result.error || "تعذّرت استعادة الحالة.");
      toast.success(result.message || `تمت استعادة ${patient.patient_name}.`);
      onRestored();
    } catch (restoreError) {
      toast.error(
        restoreError instanceof Error
          ? restoreError.message
          : "تعذّرت استعادة الحالة.",
      );
    } finally {
      setRestoringId(null);
    }
  }

  async function deletePermanently() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const response = await fetch(
        `/api/clinic/patients/${deleteTarget.id}/purge`,
        { method: "DELETE" },
      );
      const result = (await response.json()) as {
        error?: string;
        message?: string;
      };
      if (!response.ok)
        throw new Error(result.error || "تعذّر حذف الحالة نهائياً.");
      toast.success(
        result.message || `تم حذف ملف ${deleteTarget.patient_name} نهائياً.`,
      );
      setDeleteTarget(null);
      onRestored();
    } catch (deleteError) {
      toast.error(
        deleteError instanceof Error
          ? deleteError.message
          : "تعذّر حذف الحالة نهائياً.",
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <section className="rounded-2xl border border-[#dce2f1] bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-black">
              <FolderArchive className="size-5 text-[#2563eb]" />
              أرشيف الحالات
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              الحالات المحذوفة وحالات الوفاة تبقى محفوظة هنا ويمكن استعادتها
              للسجل.
            </p>
          </div>
          <div className="relative">
            <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="ابحث بالاسم أو الهاتف..."
              className="w-full pr-9 sm:w-72"
            />
          </div>
        </div>

        {filtered.length ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الحيوان</TableHead>
                  <TableHead>المربي</TableHead>
                  <TableHead>سبب الأرشفة</TableHead>
                  <TableHead>تاريخ الأرشفة</TableHead>
                  <TableHead>الزيارات</TableHead>
                  <TableHead>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((patient) => (
                  <TableRow
                    key={patient.id}
                    className="cursor-pointer"
                    onClick={() => onOpenPatient(patient.id)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <PatientAvatar patient={patient} archived />
                        <div>
                          <p className="font-black">{patient.patient_name}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {speciesLabel(patient.species)} · {patient.breed}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="font-bold">{patient.owner_name}</p>
                      <p
                        dir="ltr"
                        className="mt-1 text-right text-xs text-muted-foreground"
                      >
                        {patient.phone}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          patient.record_status === "deceased"
                            ? "bg-slate-800 text-white hover:bg-slate-800"
                            : "bg-amber-100 text-amber-800 hover:bg-amber-100"
                        }
                      >
                        {patient.record_status === "deceased"
                          ? "حالة وفاة"
                          : "محذوفة / مؤرشفة"}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(patient.archived_at)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{patient.visit_count}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={(event) => {
                            event.stopPropagation();
                            onOpenPatient(patient.id);
                          }}
                        >
                          <FileHeart className="size-4" />
                          عرض الملف
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          className="bg-[#2563eb] hover:bg-[#1d4ed8]"
                          disabled={restoringId === patient.id || deleting}
                          onClick={(event) => {
                            event.stopPropagation();
                            void restorePatient(patient);
                          }}
                        >
                          {restoringId === patient.id ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <RotateCcw className="size-4" />
                          )}
                          استعادة
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                          disabled={Boolean(restoringId) || deleting}
                          onClick={(event) => {
                            event.stopPropagation();
                            setDeleteTarget(patient);
                          }}
                        >
                          <Trash2 className="size-4" />
                          حذف نهائي
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="p-10 text-center text-sm text-muted-foreground">
            <FolderArchive className="mx-auto mb-3 size-9 text-[#8da39f]" />
            <p>
              {patients.length
                ? "لا توجد نتائج مطابقة للبحث."
                : "الأرشيف فارغ حالياً."}
            </p>
          </div>
        )}
      </section>
      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && !deleting && setDeleteTarget(null)}
      >
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>
              حذف ملف {deleteTarget?.patient_name} نهائياً؟
            </AlertDialogTitle>
            <AlertDialogDescription className="leading-7">
              هذا الحذف لا يمكن التراجع عنه. سيُحذف ملف الحيوان مع جميع الزيارات
              والعلامات والتشخيصات والعلاجات واللقاحات والعمليات والتحاليل
              وسجلات المبيت المرتبطة به نهائياً.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>تراجع</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              disabled={deleting}
              onClick={(event) => {
                event.preventDefault();
                void deletePermanently();
              }}
            >
              {deleting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              نعم، حذف نهائي
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function PatientAvatar({
  patient,
  archived = false,
}: {
  patient: PatientSummary;
  archived?: boolean;
}) {
  const url = petPhotoUrl(patient.photo_key);
  return (
    <span
      className={`grid size-10 shrink-0 place-items-center overflow-hidden rounded-xl font-black ${archived ? "bg-slate-100 text-slate-600" : "bg-[#eef2ff] text-[#2563eb]"}`}
    >
      {url ? (
        <img
          src={url}
          alt={`صورة ${patient.patient_name}`}
          className="h-full w-full object-cover"
        />
      ) : (
        patient.patient_name.slice(0, 1)
      )}
    </span>
  );
}

function Reminders({
  reminders,
  whatsappHref,
  onMarkSent,
  onComplete,
}: {
  reminders: Reminder[];
  whatsappHref: (reminder: Reminder) => string;
  onMarkSent: (id: string) => void;
  onComplete: (id: string) => void;
}) {
  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-[#cfe3df] bg-[#eaf6f3] p-5">
        <div className="flex items-start gap-3">
          <MessageCircle className="mt-0.5 size-5 text-[#2563eb]" />
          <div>
            <h2 className="font-black">
              تذكير واتساب جاهز باسم المربي والحيوان
            </h2>
            <p className="mt-2 text-sm leading-7 text-[#53716e]">
              زر واتساب يفتح رسالة مكتوبة مسبقاً. الإرسال التلقائي الكامل يحتاج
              ربط حساب WhatsApp Business API، ويمكن إضافته بالمرحلة التالية.
            </p>
          </div>
        </div>
      </section>
      {reminders.length ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {reminders.map((reminder) => {
            const meta = dueMeta(reminder.due_date);
            return (
              <article
                key={reminder.id}
                className="rounded-2xl border border-[#dce2f1] bg-white p-5 shadow-sm"
              >
                <div className="flex items-start gap-4">
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#eef2ff] text-[#2563eb]">
                    {reminder.kind === "vaccine" ? (
                      <Syringe className="size-5" />
                    ) : (
                      <CalendarCheck2 className="size-5" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-black">{reminder.patient_name}</h3>
                      <Badge variant="secondary">
                        {REMINDER_KIND_LABELS[reminder.kind] ?? "موعد"}
                      </Badge>
                      <Badge
                        className={`${meta.className} hover:${meta.className}`}
                      >
                        {meta.label}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm font-bold">{reminder.title}</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      المربي: {reminder.owner_name} · {reminder.phone}
                    </p>
                  </div>
                </div>
                <div className="mt-5 flex flex-wrap gap-2 border-t pt-4">
                  <Button
                    asChild
                    className="rounded-xl bg-[#1f9d62] hover:bg-[#188550]"
                    onClick={() => onMarkSent(reminder.id)}
                  >
                    <a
                      href={whatsappHref(reminder)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <MessageCircle className="size-4" />
                      فتح واتساب
                    </a>
                  </Button>
                  <Button
                    variant="outline"
                    className="rounded-xl"
                    onClick={() => onComplete(reminder.id)}
                  >
                    <Check className="size-4" />
                    تمت الجرعة / المراجعة
                  </Button>
                  {reminder.sent_at && (
                    <span className="mr-auto self-center text-xs font-bold text-[#2563eb]">
                      فُتحت رسالة التذكير {formatDate(reminder.sent_at)}
                    </span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed bg-white p-10 text-center text-muted-foreground">
          <BellRing className="mx-auto mb-3 size-8" />
          <p>لا توجد تذكيرات قادمة.</p>
        </div>
      )}
    </div>
  );
}

function Finance() {
  const [month, setMonth] = useState(() =>
    new Date().toISOString().slice(0, 7),
  );
  const [data, setData] = useState<FinanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleteRow, setDeleteRow] = useState<
    FinanceData["rows"][number] | null
  >(null);
  const [deleting, setDeleting] = useState(false);
  const [externalType, setExternalType] = useState("أشعة");
  const [externalDescription, setExternalDescription] = useState("");
  const [externalAmount, setExternalAmount] = useState("");
  const [externalSaving, setExternalSaving] = useState(false);
  const [toMonth, setToMonth] = useState(month);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(
        `/api/clinic/finance?from=${month}&to=${toMonth}`,
        { cache: "no-store" },
      );
      const payload = (await response.json()) as FinanceData & {
        error?: string;
      };
      if (!response.ok) throw new Error(payload.error || "تعذّر تحميل الوارد.");
      setData(payload);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "تعذّر تحميل الوارد.",
      );
    } finally {
      setLoading(false);
    }
  }, [month, toMonth]);

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (!cancelled) return load();
    });
    return () => {
      cancelled = true;
    };
  }, [load]);

  const money = (amount: number) =>
    `${Number(amount || 0).toLocaleString("ar-IQ")} د.ع`;
  const cards = [
    {
      label: "إجمالي الوارد",
      value: data?.summary.totalRevenue ?? 0,
      color: "bg-[#111b3a] text-white",
    },
    {
      label: "الكشوفات والزيارات",
      value: data?.summary.visitRevenue ?? 0,
      color: "bg-[#e9f7f4] text-[#2563eb]",
    },
    {
      label: "العمليات والإجراءات",
      value: data?.summary.procedureRevenue ?? 0,
      color: "bg-[#fff4d8] text-[#8a6810]",
    },
    {
      label: "التحاليل والتصوير",
      value: data?.summary.diagnosticRevenue ?? 0,
      color: "bg-[#eef1fa] text-[#4b5ea7]",
    },
    {
      label: "مبيعات المخزن",
      value: data?.summary.storeRevenue ?? 0,
      color: "bg-[#f0f6ff] text-[#315a9a]",
    },
    {
      label: "دفعات المبيت",
      value: data?.summary.boardingRevenue ?? 0,
      color: "bg-[#f6efff] text-[#7250a8]",
    },
  ];

  async function removeRevenueRow() {
    if (!deleteRow) return;
    setDeleting(true);
    try {
      const response = await fetch(
        deleteRow.source === "external"
          ? `/api/clinic/external-services/${deleteRow.id}`
          : `/api/clinic/finance/${deleteRow.source}/${deleteRow.id}`,
        { method: "DELETE" },
      );
      const result = (await response.json()) as {
        error?: string;
        message?: string;
      };
      if (!response.ok) throw new Error(result.error || "تعذّر حذف القيد.");
      toast.success(result.message);
      setDeleteRow(null);
      await load();
    } catch (removeError) {
      toast.error(
        removeError instanceof Error ? removeError.message : "تعذّر حذف القيد.",
      );
    } finally {
      setDeleting(false);
    }
  }

  async function addExternalService() {
    const amount = Number(externalAmount);
    if (!amount || amount < 0) {
      toast.error("اكتب مبلغ الخدمة.");
      return;
    }
    setExternalSaving(true);
    try {
      const response = await fetch("/api/clinic/external-services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceType: externalType,
          description: externalDescription,
          amountIqd: amount,
        }),
      });
      const result = (await response.json()) as {
        error?: string;
        message?: string;
      };
      if (!response.ok) throw new Error(result.error || "تعذّر الحفظ.");
      toast.success(result.message);
      setExternalDescription("");
      setExternalAmount("");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذّر الحفظ.");
    } finally {
      setExternalSaving(false);
    }
  }

  const deleteDescription =
    deleteRow?.source === "store"
      ? "ستُحذف مبيعة المخزن ويُعاد عددها إلى المخزون تلقائياً."
      : deleteRow?.source === "boarding"
        ? "ستُحذف دفعة المبيت وتعود قيمتها إلى المبلغ المتبقي على المربي."
        : "سيُحذف المبلغ من الوارد فقط، بينما تبقى الزيارة أو العملية أو نتيجة التحليل محفوظة في الملف الطبي.";

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 rounded-2xl border bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-black">تقرير وارد العيادة</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            الكشوفات والعمليات والتحاليل والمخزن والمبيت المسجلة للشهر.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Input
            type="month"
            value={month}
            onChange={(event) => setMonth(event.target.value)}
            className="w-40"
          />
          <span className="self-center text-sm">إلى</span>
          <Input
            type="month"
            value={toMonth}
            onChange={(event) => setToMonth(event.target.value)}
            className="w-40"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => void load()}
          >
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </section>
      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700">
          {error}
        </div>
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {cards.map((card) => (
              <article
                key={card.label}
                className={`rounded-2xl p-5 shadow-sm ${card.color}`}
              >
                <p className="text-sm font-bold opacity-80">{card.label}</p>
                <p className="mt-4 text-2xl font-black">{money(card.value)}</p>
              </article>
            ))}
          </section>
          <section className="rounded-2xl border bg-white shadow-sm">
            <div className="border-b p-5">
              <h3 className="font-black">تفاصيل الشهر</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {data?.summary.visitCount ?? 0} زيارة ·{" "}
                {data?.summary.procedureCount ?? 0} عملية / إجراء ·{" "}
                {data?.summary.saleCount ?? 0} مبيعة مخزن
              </p>
            </div>
            {loading && !data ? (
              <div className="grid min-h-48 place-items-center">
                <Loader2 className="size-6 animate-spin text-[#2563eb]" />
              </div>
            ) : data?.rows.length ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>التاريخ</TableHead>
                      <TableHead>الحيوان / المربي</TableHead>
                      <TableHead>الخدمة</TableHead>
                      <TableHead>النوع</TableHead>
                      <TableHead>المبلغ</TableHead>
                      <TableHead>إجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.rows.map((row) => (
                      <TableRow key={`${row.source}-${row.id}`}>
                        <TableCell>{formatDate(row.service_date)}</TableCell>
                        <TableCell>
                          <strong>{row.patient_name}</strong>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {row.owner_name}
                          </p>
                        </TableCell>
                        <TableCell>{row.service}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {row.source === "visit"
                              ? row.category === "grooming"
                                ? "حلاقة وغسل"
                                : "كشف"
                              : row.source === "procedure"
                                ? "عملية"
                                : row.source === "diagnostic"
                                  ? "تحليل"
                                  : row.source === "store"
                                    ? "مبيعات مخزن"
                                    : row.source === "external"
                                      ? "خدمة خارجية"
                                      : "مبيت"}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-black text-[#2563eb]">
                          {money(row.amount)}
                        </TableCell>
                        <TableCell className="flex gap-1">
                          {row.source === "external" && (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="text-[#2563eb]"
                              onClick={() => {
                                const amount = Number(
                                  window.prompt(
                                    "السعر الجديد",
                                    String(row.amount),
                                  ),
                                );
                                const service = window.prompt(
                                  "نوع الخدمة",
                                  row.service,
                                );
                                if (Number.isFinite(amount) && service)
                                  void fetch(
                                    `/api/clinic/external-services/${row.id}`,
                                    {
                                      method: "PATCH",
                                      headers: {
                                        "Content-Type": "application/json",
                                      },
                                      body: JSON.stringify({
                                        amountIqd: amount,
                                        serviceType: service,
                                      }),
                                    },
                                  ).then(() => load());
                              }}
                            >
                              تعديل
                            </Button>
                          )}
                          <Button
                            type="button"
                            size="icon-sm"
                            variant="ghost"
                            className="text-red-600"
                            onClick={() => setDeleteRow(row)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="p-10 text-center text-sm text-muted-foreground">
                لا توجد مبالغ مسجلة لهذا الشهر.
              </div>
            )}
          </section>
          <AlertDialog
            open={Boolean(deleteRow)}
            onOpenChange={(open) => !open && setDeleteRow(null)}
          >
            <AlertDialogContent dir="rtl">
              <AlertDialogHeader>
                <AlertDialogTitle>
                  حذف قيد {deleteRow?.service} من الوارد؟
                </AlertDialogTitle>
                <AlertDialogDescription className="leading-7">
                  {deleteDescription}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleting}>تراجع</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-red-600 hover:bg-red-700"
                  disabled={deleting}
                  onClick={(event) => {
                    event.preventDefault();
                    void removeRevenueRow();
                  }}
                >
                  {deleting ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Trash2 className="size-4" />
                  )}
                  تأكيد الحذف
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </div>
  );
}
