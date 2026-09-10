"use client";

import { useEffect, useState } from "react";
import { MapPin, Phone, Plus } from "lucide-react";
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
              <Plus className="size-8" strokeWidth={3} />
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
      </header>
      <section className="mx-auto flex min-h-[calc(100vh-96px)] max-w-2xl items-center justify-center px-5 pb-16 pt-6 lg:px-10">
        <div className="relative w-full">
          <div className="absolute -inset-10 -z-10 rotate-3 rounded-[3rem] bg-gradient-to-br from-[#5b4bdb]/10 to-[#55d6be]/20" />
          <PortalClient settings={settings} />
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
