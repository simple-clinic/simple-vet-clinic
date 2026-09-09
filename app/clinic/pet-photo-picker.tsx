"use client";

import { useEffect, useId, useState } from "react";
import { Camera, ImagePlus, Loader2, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PET_PHOTO_TYPES } from "@/lib/pet-photo";

export function PetPhotoPicker({
  currentUrl,
  onFileChange,
  onRemoveCurrent,
  removing = false,
  disabled = false,
}: {
  currentUrl?: string | null;
  onFileChange: (file: File | null) => void;
  onRemoveCurrent?: () => void;
  removing?: boolean;
  disabled?: boolean;
}) {
  const inputId = useId();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  function selectFile(file: File | null) {
    if (!file) return;
    if (!PET_PHOTO_TYPES.includes(file.type as (typeof PET_PHOTO_TYPES)[number])) {
      toast.error("صيغة الصورة غير مدعومة. استخدم JPG أو PNG أو WEBP.");
      return;
    }
    const nextPreview = URL.createObjectURL(file);
    setPreviewUrl(nextPreview);
    onFileChange(file);
  }

  function clearSelection() {
    setPreviewUrl(null);
    onFileChange(null);
  }

  const displayedUrl = previewUrl || currentUrl;
  return (
    <div className="rounded-2xl border border-[#cfe2de] bg-[#f7fbfa] p-4 sm:col-span-2">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="grid size-24 shrink-0 place-items-center overflow-hidden rounded-2xl border-2 border-white bg-[#e7f3f0] text-[#2563eb] shadow-sm">
          {displayedUrl ? <img src={displayedUrl} alt="صورة الحيوان" className="h-full w-full object-cover" /> : <Camera className="size-9" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-black">صورة الحيوان</p>
          <p className="mt-1 text-xs leading-6 text-muted-foreground">التقط صورة من الهاتف أو اختر صورة JPG أو PNG أو WEBP. ستظهر للمربي داخل بطاقة حيوانه.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <label htmlFor={inputId} className={`inline-flex h-9 cursor-pointer items-center gap-2 rounded-md bg-[#2563eb] px-3 text-sm font-bold text-white hover:bg-[#1d4ed8] ${disabled ? "pointer-events-none opacity-50" : ""}`}>
              <ImagePlus className="size-4" />{displayedUrl ? "تغيير الصورة" : "التقاط / رفع صورة"}
            </label>
            <input id={inputId} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="sr-only" disabled={disabled} onChange={(event) => { selectFile(event.target.files?.[0] ?? null); event.currentTarget.value = ""; }} />
            {previewUrl && <Button type="button" size="sm" variant="outline" disabled={disabled} onClick={clearSelection}><X className="size-4" />إلغاء الصورة الجديدة</Button>}
            {!previewUrl && currentUrl && onRemoveCurrent && <Button type="button" size="sm" variant="outline" className="text-red-600" disabled={disabled || removing} onClick={onRemoveCurrent}>{removing ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}حذف الصورة</Button>}
          </div>
        </div>
      </div>
    </div>
  );
}
