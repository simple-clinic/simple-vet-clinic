import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { hasValidClinicSession } from "@/lib/clinic-auth";
import { ClinicDashboard } from "./clinic-dashboard";

export const dynamic = "force-dynamic";

export default async function ClinicPage() {
  if (!(await hasValidClinicSession())) redirect("/clinic/login");

  return (
    <ClinicDashboard
      initialUser={{ displayName: "مدير Simple Vet Clinic", email: "لوحة خاصة" }}
      signOutPath="/api/clinic-auth/logout"
      adminConfigured
    />
  );
}

export function ClinicLoading() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#f3f6ff]">
      <div className="flex items-center gap-3 font-bold text-[#2563eb]">
        <Plus className="size-7 animate-pulse" strokeWidth={3} />
        جارٍ فتح لوحة Simple Vet Clinic...
      </div>
    </main>
  );
}
