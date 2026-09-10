"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, Loader2, LockKeyhole, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ClinicLoginForm() {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/clinic-auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || "تعذّر تسجيل الدخول.");
      window.location.assign("/clinic");
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "تعذّر تسجيل الدخول.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[#111b3a] px-5 py-10" dir="rtl">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(86,214,201,0.22),transparent_28rem),radial-gradient(circle_at_85%_80%,rgba(37,99,235,0.34),transparent_32rem)]" />
      <div className="absolute inset-y-0 right-0 hidden w-[38%] border-l border-white/10 bg-white/4 lg:block" />
      <section className="relative w-full max-w-md rounded-[2.4rem] border border-white/20 bg-white p-7 shadow-[0_35px_100px_rgba(2,8,30,0.5)] sm:p-10">
        <span className="mx-auto grid size-16 place-items-center rounded-[1.4rem] bg-[#2563eb] text-white shadow-[0_12px_30px_rgba(37,99,235,0.35)]"><Plus className="size-9" strokeWidth={3} /></span>
        <div className="mt-5 text-center"><p className="text-xs font-black tracking-[0.2em] text-[#2563eb]">SIMPLE VET CLINIC</p><h1 className="mt-2 text-2xl font-black text-[#17203b]">دخول مدير العيادة</h1><p className="mt-2 text-sm leading-7 text-muted-foreground">لوحة السجلات والمخزن والمبيت محمية بكلمة سر خاصة.</p></div>
        <form className="mt-7 space-y-4" onSubmit={submit}>
          <div className="space-y-2"><Label htmlFor="clinic-password">كلمة السر</Label><div className="relative"><Input id="clinic-password" autoFocus autoComplete="current-password" type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} className="h-12 pl-11" placeholder="أدخل كلمة سر المدير" /><button type="button" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-[#2563eb]" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "إخفاء كلمة السر" : "إظهار كلمة السر"}>{showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}</button></div></div>
          {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}
          <Button type="submit" className="h-12 w-full rounded-2xl bg-[#2563eb] font-black shadow-lg hover:bg-[#1d4ed8]" disabled={loading || !password}>{loading ? <Loader2 className="size-4 animate-spin" /> : <LockKeyhole className="size-4" />}دخول لوحة الإدارة</Button>
        </form>
        <Link href="/" className="mt-5 block text-center text-sm font-bold text-[#5b4bdb] hover:underline">العودة إلى بوابة المربي</Link>
      </section>
    </main>
  );
}
