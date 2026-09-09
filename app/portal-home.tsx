"use client";

import { useEffect, useState } from "react";
import {
  CalendarClock,
  LockKeyhole,
  MapPin,
  PawPrint,
  Phone,
  ShieldCheck,
  Stethoscope,
  Syringe,
} from "lucide-react";
import {
  defaultClinicSettings,
  type ClinicSettings,
} from "@/lib/clinic-settings-shared";
import { PortalClient } from "./portal-client";
import { AmbientEffects } from "@/components/ambient-effects";

export function PortalHome() {
  const [settings, setSettings] = useState<ClinicSettings>(
    defaultClinicSettings,
  );
  useEffect(() => {
    void fetch("/api/portal/settings", { cache: "no-store" }).then(
      async (response) => {
        if (response.ok) {
          const payload = (await response.json()) as Partial<ClinicSettings>;
          setSettings((current) => ({ ...current, ...payload }));
        }
      },
    );
  }, []);
  const style = {
    "--portal-primary": settings.portalPrimary,
    "--portal-accent": settings.portalAccent,
    "--portal-bg": settings.portalBackground,
  } as React.CSSProperties;
  return (
    <main
      style={style}
      className="simple-portal-shell min-h-screen overflow-hidden bg-[var(--portal-bg)] text-[#17203b]"
    >
      <AmbientEffects
        effect={settings.ambientEffect}
        enabled={settings.ambientPortalEnabled}
        density={settings.ambientDensity}
        speed={settings.ambientSpeed}
        opacity={settings.ambientOpacity}
      />
      <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-6 lg:px-10">
        <div className="flex items-center gap-3">
          <span className="grid size-12 place-items-center overflow-hidden rounded-[1.2rem] bg-[var(--portal-primary)] text-white shadow-[0_12px_30px_rgba(91,75,219,0.28)]">
            {settings.portalLogoKey ? (
              <img
                src="/api/branding/portal"
                alt="شعار العيادة"
                className="h-full w-full object-cover"
              />
            ) : (
              <PawPrint className="size-7" />
            )}
          </span>
          <div>
            <p className="text-xl font-black tracking-wide">
              {settings.clinicName}
            </p>
            <p className="text-xs font-bold text-[#667780]">
              رعاية بيطرية منظمة وبسيطة
            </p>
          </div>
        </div>
        <a href="/clinic" className="rounded-full border border-[#d9def1] bg-white/80 px-4 py-2 text-sm font-black text-[var(--portal-primary)] shadow-sm backdrop-blur">دخول الإدارة</a>
      </header>
      <section className="mx-auto grid min-h-[calc(100vh-96px)] max-w-7xl items-center gap-12 px-5 pb-16 pt-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-10">
        <div className="relative order-2 lg:order-2">
          <div className="absolute -inset-10 -z-10 rotate-3 rounded-[3rem] bg-gradient-to-br from-[#5b4bdb]/10 to-[#55d6be]/20" />
          <PortalClient settings={settings} />
        </div>
        <div className="order-1 lg:order-1 lg:pl-10">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#d9def1] bg-white/80 px-4 py-2 text-sm font-bold text-[var(--portal-primary)] shadow-sm backdrop-blur">
            <ShieldCheck className="size-4" />
            بوابة آمنة ومحدودة للمربي
          </div>
          <h1 className="max-w-2xl text-4xl font-black leading-[1.25] tracking-tight sm:text-5xl lg:text-6xl">
            ملف حيوانك
            <span className="relative mx-2 inline-block text-[var(--portal-primary)]">
              أوضح وأسهل
              <span className="absolute -bottom-2 right-0 h-1.5 w-full rounded-full bg-[var(--portal-accent)]" />
            </span>
          </h1>
          <p className="mt-7 max-w-xl text-lg leading-9 text-[#60727b]">
            {settings.portalDescription}
          </p>
          <section className="mt-7 max-w-xl rounded-[2rem] border border-[#dfe3f2] bg-[#111b3a] p-6 text-white shadow-xl">
            <div className="flex items-center gap-2">
              <Stethoscope className="size-5 text-[var(--portal-accent)]" />
              <h2 className="text-lg font-black">{settings.clinicName}</h2>
            </div>
            <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-2xl bg-white/8 p-4">
                <strong className="block text-[#56d6c9]">السجل الطبي</strong>
                <span className="mt-1 block text-xs text-white/65">متابعة الزيارات والحالات</span>
              </div>
              <div className="rounded-2xl bg-white/8 p-4">
                <strong className="block text-[#56d6c9]">الوقاية والمواعيد</strong>
                <span className="mt-1 block text-xs text-white/65">اللقاحات وجرعات الديدان</span>
              </div>
            </div>
          </section>
          <div className="mt-9 grid max-w-xl gap-3 sm:grid-cols-3">
            {[
              {
                icon: CalendarClock,
                title: "المواعيد",
                text: "السابق والقادم",
              },
              { icon: Syringe, title: "الوقاية", text: "لقاح وديدان وحشرات" },
              {
                icon: LockKeyhole,
                title: "خصوصية",
                text: "حسب إعدادات العيادة",
              },
            ].map((item) => (
              <article
                key={item.title}
                className="rounded-[1.4rem] border border-[#dfe3f2] bg-white/75 p-4 shadow-sm backdrop-blur"
              >
                <item.icon className="mb-3 size-5 text-[var(--portal-primary)]" />
                <h2 className="font-bold">{item.title}</h2>
                <p className="mt-1 text-xs leading-5 text-[#6b7b82]">
                  {item.text}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>
      <footer className="border-t border-[#dfe3f2] bg-white/75 px-5 py-6 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-center text-sm sm:flex-row sm:text-right">
          <p className="font-bold">{settings.portalFooterText}</p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            {settings.clinicPhone && <a href={`tel:${settings.clinicPhone.replace(/\s/g, "")}`} dir="ltr" className="inline-flex items-center gap-2 font-bold text-[var(--portal-primary)]"><Phone className="size-4" />{settings.clinicPhone}</a>}
            {settings.clinicMapsUrl && <a href={settings.clinicMapsUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 font-bold text-[var(--portal-primary)]"><MapPin className="size-4" />{settings.clinicAddress}</a>}
            {settings.clinicInstagramUrl && <a href={settings.clinicInstagramUrl} target="_blank" rel="noreferrer" aria-label="إنستغرام العيادة" className="text-[var(--portal-primary)]"><InstagramIcon /></a>}
            {settings.clinicFacebookUrl && (
              <a
                href={settings.clinicFacebookUrl}
                target="_blank"
                rel="noreferrer"
                aria-label="فيسبوك العيادة"
                className="text-[var(--portal-primary)] transition hover:scale-110"
              >
                <FacebookIcon />
              </a>
            )}
            {settings.clinicTikTokUrl && (
              <a
                href={settings.clinicTikTokUrl}
                target="_blank"
                rel="noreferrer"
                aria-label="تيك توك العيادة"
                className="text-[var(--portal-primary)] transition hover:scale-110"
              >
                <TikTokIcon />
              </a>
            )}
          </div>
        </div>
      </footer>
    </main>
  );
}

function InstagramIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-5"
    >
      <rect width="18" height="18" x="3" y="3" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <path d="M17.5 6.5h.01" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="size-5"
    >
      <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06C2 17.08 5.66 21.25 10.44 22v-7.03H7.9v-2.91h2.54V9.85c0-2.52 1.49-3.91 3.77-3.91 1.09 0 2.23.2 2.23.2v2.47h-1.25c-1.24 0-1.63.77-1.63 1.57v1.88h2.77l-.44 2.91h-2.33V22C18.34 21.25 22 17.08 22 12.06Z" />
    </svg>
  );
}

function TikTokIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="size-5"
    >
      <path d="M16.65 2c.18 1.55 1.04 2.94 2.35 3.78A6.3 6.3 0 0 0 22 6.7v3.18a9.4 9.4 0 0 1-5.33-1.68v7.37a6.43 6.43 0 1 1-5.55-6.37v3.24a3.25 3.25 0 1 0 2.35 3.13V2h3.18Z" />
    </svg>
  );
}
