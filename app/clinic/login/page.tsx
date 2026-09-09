import { redirect } from "next/navigation";
import { hasValidClinicSession } from "@/lib/clinic-auth";
import { ClinicLoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default async function ClinicLoginPage() {
  if (await hasValidClinicSession()) redirect("/clinic");
  return <ClinicLoginForm />;
}
