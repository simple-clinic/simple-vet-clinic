"use client";

import { useState } from "react";
import { ClipboardPlus, PencilLine } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { VisitEditor, type VisitBundleClient } from "./visit-editor";

export type VisitTarget = {
  patientId: string;
  petName: string;
  species: string;
  visitId?: string;
  initialValue?: VisitBundleClient;
};

export function VisitSheet({ target, onOpenChange, onSaved }: { target: VisitTarget | null; onOpenChange: (open: boolean) => void; onSaved: (patientId: string) => void }) {
  const [saving, setSaving] = useState(false);
  const editing = Boolean(target?.visitId);

  async function save(bundle: VisitBundleClient) {
    if (!target) return;
    setSaving(true);
    try {
      const diagnostics = bundle.diagnostics.map(({ pendingImages: _pendingImages, ...item }) => item);
      const response = await fetch(editing ? `/api/clinic/visits/${target.visitId}` : `/api/clinic/patients/${target.patientId}/visits`, {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...bundle, diagnostics }),
      });
      const result = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) throw new Error(result.error || "تعذّر حفظ الزيارة.");
      for (const diagnostic of bundle.diagnostics) {
        if (!diagnostic.id || !diagnostic.pendingImages?.length) continue;
        const form = new FormData(); diagnostic.pendingImages.forEach((file) => form.append("images", file));
        const upload = await fetch(`/api/clinic/diagnostics/${diagnostic.id}/images`, { method: "POST", body: form });
        if (!upload.ok) toast.warning(`تم حفظ الفحص، لكن تعذّر رفع صوره: ${diagnostic.title}`);
      }
      toast.success(result.message || "تم حفظ الزيارة.");
      onSaved(target.patientId);
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذّر حفظ الزيارة.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={Boolean(target)} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-full overflow-y-auto border-0 p-0 sm:max-w-4xl">
        {target && (
          <>
            <SheetHeader className="sticky top-0 z-20 border-b bg-white/95 px-5 py-5 backdrop-blur sm:px-7">
              <div className="pl-8">
                <SheetTitle className="flex items-center gap-2 text-xl font-black">
                  {editing ? <PencilLine className="size-5 text-[#2563eb]" /> : <ClipboardPlus className="size-5 text-[#2563eb]" />}
                  {editing ? `تعديل زيارة ${target.petName}` : `إضافة زيارة جديدة لـ ${target.petName}`}
                </SheetTitle>
                <SheetDescription className="mt-1">لا تحتاج لإعادة تسجيل المربي أو الحيوان. الحفظ يتم فقط من الزر الأخير.</SheetDescription>
              </div>
            </SheetHeader>
            <VisitEditor
              key={`${target.patientId}-${target.visitId ?? "new"}`}
              species={target.species}
              initialValue={target.initialValue}
              saving={saving}
              onSave={save}
              submitLabel={editing ? "حفظ تعديل الزيارة" : "حفظ الزيارة الجديدة"}
            />
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
