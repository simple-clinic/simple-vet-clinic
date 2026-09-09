"use client";

import { useState } from "react";
import { FileDown, Loader2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type PatientExportRow = {
  id: string;
  owner_name: string;
  patient_name: string;
  weight_kg: number | null;
  phone: string;
};

function escapeHtml(value: string | number) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatWeight(weight: number | null) {
  return weight === null ? "—" : `${weight} كغم`;
}

function numericDate() {
  const date = new Date();
  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
}

export function PatientExportDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [patients, setPatients] = useState<PatientExportRow[]>([]);

  async function loadPatients() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/clinic/patients/export", {
        cache: "no-store",
      });
      const payload = (await response.json()) as {
        patients?: PatientExportRow[];
        error?: string;
      };
      if (!response.ok) throw new Error(payload.error || "تعذّر تحميل الحالات.");
      setPatients(payload.patients ?? []);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "تعذّر تحميل الحالات.",
      );
    } finally {
      setLoading(false);
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) void loadPatients();
  }

  function printPatients() {
    const printWindow = window.open("", "simple-vet-patient-list", "width=1000,height=800");
    if (!printWindow) {
      setError("المتصفح منع نافذة الطباعة. اسمح بالنوافذ المنبثقة وحاول مجددًا.");
      return;
    }

    const rows = patients
      .map(
        (patient, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${escapeHtml(patient.owner_name)}</td>
            <td>${escapeHtml(patient.patient_name)}</td>
            <td>${escapeHtml(formatWeight(patient.weight_kg))}</td>
            <td class="phone">${escapeHtml(patient.phone)}</td>
          </tr>`,
      )
      .join("");

    printWindow.document.write(`<!doctype html>
      <html lang="ar" dir="rtl">
        <head>
          <meta charset="utf-8" />
          <title>قائمة الحالات المسجلة</title>
          <style>
            @page { size: A4 portrait; margin: 12mm; }
            * { box-sizing: border-box; }
            body { margin: 0; color: #17203b; font-family: Tahoma, Arial, sans-serif; }
            header { display: flex; align-items: end; justify-content: space-between; gap: 20px; margin-bottom: 14px; }
            h1 { margin: 0 0 5px; font-size: 22px; }
            p { margin: 0; color: #52626b; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 11px; }
            thead { display: table-header-group; }
            tr { break-inside: avoid; page-break-inside: avoid; }
            th, td { border: 1px solid #87969d; padding: 7px 6px; text-align: right; overflow-wrap: anywhere; }
            th { background: #e8f5f2; color: #075f5a; font-weight: 700; }
            th:first-child, td:first-child { width: 42px; text-align: center; }
            .phone { direction: ltr; text-align: right; }
            @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
          </style>
        </head>
        <body>
          <header>
            <div><h1>قائمة الحالات المسجلة</h1><p>Simple Vet Clinic</p></div>
            <p>التاريخ: ${numericDate()} &nbsp; | &nbsp; العدد: ${patients.length}</p>
          </header>
          <table>
            <thead><tr><th>ت</th><th>اسم المربي</th><th>اسم الحيوان</th><th>وزن الحيوان</th><th>رقم المربي</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
          <script>window.onload = () => { window.focus(); window.print(); };</script>
        </body>
      </html>`);
    printWindow.document.close();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" className="border-[#2563eb] text-[#2563eb]">
          <FileDown className="size-4" />
          قائمة الحالات PDF
        </Button>
      </DialogTrigger>
      <DialogContent dir="rtl" className="max-h-[90vh] max-w-[calc(100%-1.5rem)] overflow-hidden p-0 sm:max-w-5xl">
        <DialogHeader className="border-b px-6 py-5 text-right">
          <DialogTitle>قائمة الحالات المسجلة</DialogTitle>
          <DialogDescription>
            جدول كامل وجاهز للطباعة أو الحفظ بصيغة PDF، ويتوزع تلقائيًا على صفحات A4.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between gap-3 px-6">
          <p className="text-sm font-bold text-muted-foreground">
            عدد الحالات: {patients.length}
          </p>
          <Button onClick={printPatients} disabled={loading || !!error || !patients.length}>
            <Printer className="size-4" />
            طباعة / حفظ PDF
          </Button>
        </div>

        <div className="max-h-[62vh] overflow-auto px-6 pb-6">
          {loading ? (
            <div className="flex min-h-48 items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
              جارٍ تحضير كل الحالات...
            </div>
          ) : error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
              {error}
            </div>
          ) : patients.length ? (
            <div className="overflow-hidden rounded-xl border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 text-center">ت</TableHead>
                    <TableHead>اسم المربي</TableHead>
                    <TableHead>اسم الحيوان</TableHead>
                    <TableHead>وزن الحيوان</TableHead>
                    <TableHead>رقم المربي</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {patients.map((patient, index) => (
                    <TableRow key={patient.id}>
                      <TableCell className="text-center">{index + 1}</TableCell>
                      <TableCell className="font-bold">{patient.owner_name}</TableCell>
                      <TableCell>{patient.patient_name}</TableCell>
                      <TableCell>{formatWeight(patient.weight_kg)}</TableCell>
                      <TableCell dir="ltr" className="text-right">{patient.phone}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
              لا توجد حالات مسجلة حاليًا.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
