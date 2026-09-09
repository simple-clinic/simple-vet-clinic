"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, BellRing, Boxes, CircleDollarSign, ImagePlus, Loader2, PackagePlus, PencilLine, Plus, RefreshCw, Search, ShoppingCart, Trash2, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { INVENTORY_CATEGORIES, inventoryCategoryLabel } from "@/lib/inventory-data";
import { inventoryPhotoUrl } from "@/lib/pet-photo";

type Item = {
  id: string; name: string; category: string; unit: string; sku: string; quantity: number;
  low_stock_threshold: number; wholesale_price_iqd: number; retail_price_iqd: number;
  expiry_date: string | null; notes: string; photo_key: string | null; stock_status: "ok" | "low" | "out";
};
type Sale = { id: string; item_name: string; category: string; patient_name: string | null; buyer_name: string; quantity: number; unit_price_iqd: number; total_iqd: number; cost_total_iqd: number; sold_at: string };
type InventoryData = { month: string; from?: string; to?: string; items: Item[]; sales: Sale[]; stats: { item_count?: number; out_count?: number; low_count?: number; stock_cost_value?: number; stock_retail_value?: number; month_sales?: number; month_profit?: number } };
type DeleteTarget = { kind: "item" | "sale"; id: string; label: string };
type ItemDraft = { name: string; category: string; unit: string; sku: string; quantity: string; lowStockThreshold: string; wholesalePriceIqd: string; retailPriceIqd: string; expiryDate: string; notes: string };
const blank: ItemDraft = { name: "", category: "dry_food", unit: "قطعة", sku: "", quantity: "0", lowStockThreshold: "1", wholesalePriceIqd: "", retailPriceIqd: "", expiryDate: "", notes: "" };
const money = (value: number | undefined) => `${Number(value ?? 0).toLocaleString("ar-IQ")} د.ع`;
const formatDate = (value: string | null) => { if (!value) return "—"; const [year, month, day] = value.slice(0, 10).split("-").map(Number); return year && month && day ? `${day}-${month}-${year}` : "—"; };

function expiryMeta(expiryDate: string | null) {
  if (!expiryDate) return null;
  const target = new Date(`${expiryDate.slice(0, 10)}T12:00:00`).getTime();
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const days = Math.ceil((target - today.getTime()) / 86_400_000);
  if (days < 0) return { days, label: `منتهية منذ ${Math.abs(days)} يوم`, className: "bg-red-100 text-red-700" };
  if (days === 0) return { days, label: "تنتهي اليوم", className: "bg-red-100 text-red-700" };
  if (days === 1) return { days, label: "تنتهي غداً", className: "bg-amber-100 text-amber-800" };
  return { days, label: formatDate(expiryDate), className: "bg-slate-100 text-slate-700" };
}

export function Inventory() {
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [toMonth, setToMonth] = useState(month);
  const [data, setData] = useState<InventoryData | null>(null); const [loading, setLoading] = useState(true); const [search, setSearch] = useState(""); const [category, setCategory] = useState("all");
  const [itemDialog, setItemDialog] = useState<{ item?: Item } | null>(null); const [actionDialog, setActionDialog] = useState<{ type: "sell" | "stock"; item: Item } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null); const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { const response = await fetch(`/api/clinic/inventory?from=${month}&to=${toMonth}`, { cache: "no-store" }); const payload = (await response.json()) as InventoryData & { error?: string }; if (!response.ok) throw new Error(payload.error || "تعذّر تحميل المخزن."); setData(payload); }
    catch (error) { toast.error(error instanceof Error ? error.message : "تعذّر تحميل المخزن."); }
    finally { setLoading(false); }
  }, [month, toMonth]);
  useEffect(() => { let cancelled = false; void Promise.resolve().then(() => { if (!cancelled) return load(); }); return () => { cancelled = true; }; }, [load]);

  const items = useMemo(() => (data?.items ?? []).filter((item) => {
    const query = search.trim().toLowerCase(); return (category === "all" || item.category === category) && (!query || `${item.name} ${item.sku}`.toLowerCase().includes(query));
  }), [data?.items, search, category]);

  const alertItems = useMemo(() => (data?.items ?? []).filter((item) => {
    const expiry = expiryMeta(item.expiry_date);
    return item.stock_status !== "ok" || Boolean(expiry && expiry.days <= 1);
  }).sort((a, b) => {
    const aExpiry = expiryMeta(a.expiry_date)?.days ?? 99999;
    const bExpiry = expiryMeta(b.expiry_date)?.days ?? 99999;
    const aUrgency = a.stock_status === "out" ? -20000 : a.stock_status === "low" ? -10000 : aExpiry;
    const bUrgency = b.stock_status === "out" ? -20000 : b.stock_status === "low" ? -10000 : bExpiry;
    return aUrgency - bUrgency;
  }), [data?.items]);

  const expiryAlertCount = (data?.items ?? []).filter((item) => {
    const expiry = expiryMeta(item.expiry_date);
    return Boolean(expiry && expiry.days <= 1);
  }).length;

  const cards = [
    { label: "مواد المخزن", value: String(data?.stats.item_count ?? 0), icon: Boxes, color: "bg-[#e9f7f4] text-[#2563eb]" },
    { label: "منخفضة أو نافدة", value: String(Number(data?.stats.low_count ?? 0) + Number(data?.stats.out_count ?? 0)), icon: AlertTriangle, color: "bg-red-50 text-red-600" },
    { label: "تنتهي غداً أو اليوم", value: String(expiryAlertCount), icon: BellRing, color: "bg-orange-50 text-orange-700" },
    { label: "مبيعات الفترة", value: money(data?.stats.month_sales), icon: CircleDollarSign, color: "bg-[#fff4d8] text-[#8a6810]" },
    { label: "ربح الفترة التقريبي", value: money(data?.stats.month_profit), icon: TrendingUp, color: "bg-[#eef1fa] text-[#4b5ea7]" },
    { label: "مجموع كلفة البضاعة", value: money(data?.stats.stock_cost_value), icon: Boxes, color: "bg-sky-50 text-sky-700" },
  ];

  async function removeTarget() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const path = deleteTarget.kind === "item" ? `/api/clinic/inventory/${deleteTarget.id}` : `/api/clinic/finance/store/${deleteTarget.id}`;
      const response = await fetch(path, { method: "DELETE" });
      const result = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) throw new Error(result.error || "تعذّر الحذف.");
      toast.success(result.message);
      setDeleteTarget(null);
      await load();
    } catch (error) { toast.error(error instanceof Error ? error.message : "تعذّر الحذف."); }
    finally { setDeleting(false); }
  }

  return <div className="space-y-6">
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{cards.map((card) => <article key={card.label} className="rounded-2xl border bg-white p-5 shadow-sm"><span className={`grid size-10 place-items-center rounded-xl ${card.color}`}><card.icon className="size-5" /></span><p className="mt-4 text-xs font-bold text-muted-foreground">{card.label}</p><p className="mt-1 text-xl font-black">{card.value}</p></article>)}</section>
    <section className={`rounded-2xl border p-5 shadow-sm ${alertItems.length ? "border-amber-200 bg-amber-50" : "border-emerald-200 bg-emerald-50"}`}>
      <div className="flex items-start gap-3"><span className={`grid size-11 shrink-0 place-items-center rounded-xl ${alertItems.length ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-700"}`}><BellRing className="size-5" /></span><div><h2 className="font-black">تنبيهات المخزن</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">يظهر التنبيه تلقائياً عند وصول الكمية إلى الحد الذي حددته أو قبل انتهاء الصلاحية بيوم واحد، ويبقى ظاهراً يوم الانتهاء وبعده.</p></div></div>
      {alertItems.length ? <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{alertItems.map((item) => {
        const expiry = expiryMeta(item.expiry_date);
        return <article key={item.id} className="rounded-xl border border-amber-200 bg-white p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="font-black">{item.name}</h3><p className="mt-1 text-xs text-muted-foreground">المتوفر: {item.quantity} {item.unit} · حد التنبيه: {item.low_stock_threshold}</p></div><AlertTriangle className="size-5 shrink-0 text-amber-700" /></div><div className="mt-3 flex flex-wrap gap-2">{item.stock_status === "out" && <Badge className="bg-red-100 text-red-700">نفدت الكمية</Badge>}{item.stock_status === "low" && <Badge className="bg-amber-100 text-amber-800">وصلت إلى حد الكمية</Badge>}{expiry && expiry.days <= 1 && <Badge className={expiry.className}>{expiry.label}</Badge>}</div></article>;
      })}</div> : <p className="mt-4 text-sm font-bold text-emerald-800">لا توجد حالياً مواد منخفضة أو قريبة الانتهاء.</p>}
    </section>
    <Tabs defaultValue="stock" dir="rtl" className="gap-5">
      <div className="flex flex-col gap-3 rounded-2xl border bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <TabsList><TabsTrigger value="stock"><Boxes className="size-4" />المخزون</TabsTrigger><TabsTrigger value="sales"><ShoppingCart className="size-4" />مبيعات الفترة</TabsTrigger></TabsList>
        <div className="flex flex-wrap items-center gap-2"><Input type="month" value={month} onChange={(event) => setMonth(event.target.value)} className="w-40" /><span className="text-sm text-muted-foreground">إلى</span><Input type="month" value={toMonth} onChange={(event) => setToMonth(event.target.value)} className="w-40" /><Button type="button" variant="outline" size="icon" onClick={() => void load()}><RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /></Button><Button type="button" className="bg-[#2563eb]" onClick={() => setItemDialog({})}><Plus className="size-4" />إضافة مادة</Button></div>
      </div>
      <TabsContent value="stock" className="rounded-2xl border bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b p-4 sm:flex-row"><div className="relative flex-1"><Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} className="pr-9" placeholder="اسم المادة أو الرمز..." /></div><Select value={category} onValueChange={setCategory}><SelectTrigger className="w-full sm:w-52"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">كل التصنيفات</SelectItem>{INVENTORY_CATEGORIES.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select></div>
        {loading && !data ? <div className="grid min-h-56 place-items-center"><Loader2 className="size-6 animate-spin text-[#2563eb]" /></div> : items.length ? <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>المادة</TableHead><TableHead>التصنيف</TableHead><TableHead>المتوفر</TableHead><TableHead>سعر الجملة</TableHead><TableHead>سعر المفرد</TableHead><TableHead>الانتهاء</TableHead><TableHead>الإجراءات</TableHead></TableRow></TableHeader><TableBody>{items.map((item) => { const expiry = expiryMeta(item.expiry_date); return <TableRow key={item.id}><TableCell><strong>{item.name}</strong><p className="mt-1 text-xs text-muted-foreground">{item.sku || "بدون رمز"}</p></TableCell><TableCell>{inventoryCategoryLabel(item.category)}</TableCell><TableCell><Badge className={item.stock_status === "out" ? "bg-red-100 text-red-700" : item.stock_status === "low" ? "bg-amber-100 text-amber-800" : "bg-emerald-50 text-emerald-700"}>{item.quantity} {item.unit}{item.stock_status === "out" ? " · نافد" : item.stock_status === "low" ? " · منخفض" : ""}</Badge></TableCell><TableCell>{money(item.wholesale_price_iqd)}</TableCell><TableCell className="font-bold text-[#2563eb]">{money(item.retail_price_iqd)}</TableCell><TableCell>{expiry ? <Badge className={expiry.className}>{expiry.label}</Badge> : "—"}</TableCell><TableCell><div className="flex gap-1"><Button type="button" size="sm" className="bg-[#1d8f5c]" disabled={item.quantity === 0} onClick={() => setActionDialog({ type: "sell", item })}><ShoppingCart className="size-3.5" />بيع</Button><Button type="button" size="sm" variant="outline" onClick={() => setActionDialog({ type: "stock", item })}><PackagePlus className="size-3.5" />إضافة رصيد</Button><Button type="button" size="icon-sm" variant="ghost" onClick={() => setItemDialog({ item })}><PencilLine className="size-4" /></Button><Button type="button" size="icon-sm" variant="ghost" className="text-red-600" onClick={() => setDeleteTarget({ kind: "item", id: item.id, label: item.name })}><Trash2 className="size-4" /></Button></div></TableCell></TableRow>; })}</TableBody></Table></div> : <div className="p-10 text-center text-sm text-muted-foreground">لا توجد مواد مطابقة. أضف أول مادة إلى المخزن.</div>}
      </TabsContent>
      <TabsContent value="sales" className="rounded-2xl border bg-white shadow-sm">{data?.sales.length ? <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>التاريخ</TableHead><TableHead>المادة</TableHead><TableHead>المشتري / الحيوان</TableHead><TableHead>العدد</TableHead><TableHead>سعر الوحدة</TableHead><TableHead>الإجمالي</TableHead><TableHead>الربح</TableHead><TableHead>حذف</TableHead></TableRow></TableHeader><TableBody>{data.sales.map((sale) => <TableRow key={sale.id}><TableCell>{formatDate(sale.sold_at)}</TableCell><TableCell><strong>{sale.item_name}</strong><p className="text-xs text-muted-foreground">{inventoryCategoryLabel(sale.category)}</p></TableCell><TableCell>{sale.patient_name || sale.buyer_name || "بيع مباشر"}</TableCell><TableCell>{sale.quantity}</TableCell><TableCell>{money(sale.unit_price_iqd)}</TableCell><TableCell className="font-black text-[#2563eb]">{money(sale.total_iqd)}</TableCell><TableCell>{money(sale.total_iqd - sale.cost_total_iqd)}</TableCell><TableCell><Button type="button" size="icon-sm" variant="ghost" className="text-red-600" onClick={() => setDeleteTarget({ kind: "sale", id: sale.id, label: sale.item_name })}><Trash2 className="size-4" /></Button></TableCell></TableRow>)}</TableBody></Table></div> : <div className="p-10 text-center text-sm text-muted-foreground">لا توجد مبيعات مسجلة ضمن الفترة المحددة.</div>}</TabsContent>
    </Tabs>
    <ItemDialog state={itemDialog} onClose={() => setItemDialog(null)} onSaved={() => { setItemDialog(null); void load(); }} />
    <InventoryActionDialog state={actionDialog} onClose={() => setActionDialog(null)} onSaved={() => { setActionDialog(null); void load(); }} />
    <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}><AlertDialogContent dir="rtl"><AlertDialogHeader><AlertDialogTitle>تأكيد حذف {deleteTarget?.label}</AlertDialogTitle><AlertDialogDescription className="leading-7">{deleteTarget?.kind === "sale" ? "ستُحذف المبيعة من الوارد وتُعاد الكمية المباعة تلقائياً إلى المخزن." : "ستختفي المادة من المخزن. إذا كانت مرتبطة بمبيعات سابقة فتبقى تلك المبيعات محفوظة في التقارير."}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={deleting}>تراجع</AlertDialogCancel><AlertDialogAction className="bg-red-600 hover:bg-red-700" disabled={deleting} onClick={(event) => { event.preventDefault(); void removeTarget(); }}>{deleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}تأكيد الحذف</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div>;
}

function ItemDialog({ state, onClose, onSaved }: { state: { item?: Item } | null; onClose: () => void; onSaved: () => void }) {
  const item = state?.item; const [draft, setDraft] = useState<ItemDraft>(blank); const [saving, setSaving] = useState(false);
  useEffect(() => { if (!state) return; const next = item ? { name: item.name, category: item.category, unit: item.unit, sku: item.sku, quantity: String(item.quantity), lowStockThreshold: String(item.low_stock_threshold), wholesalePriceIqd: String(item.wholesale_price_iqd), retailPriceIqd: String(item.retail_price_iqd), expiryDate: item.expiry_date || "", notes: item.notes } : blank; void Promise.resolve().then(() => setDraft(next)); }, [state, item]);
  const set = (key: keyof ItemDraft, value: string) => setDraft((current) => ({ ...current, [key]: value }));
  async function save() { if (!draft.name.trim()) return toast.error("اكتب اسم المادة."); setSaving(true); try { const response = await fetch(item ? `/api/clinic/inventory/${item.id}` : "/api/clinic/inventory", { method: item ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: draft.name, category: draft.category, unit: draft.unit, sku: draft.sku, quantity: Number(draft.quantity) || 0, lowStockThreshold: Number(draft.lowStockThreshold) || 0, wholesalePriceIqd: Number(draft.wholesalePriceIqd) || 0, retailPriceIqd: Number(draft.retailPriceIqd) || 0, expiryDate: draft.expiryDate || null, notes: draft.notes }) }); const result = (await response.json()) as { error?: string; message?: string }; if (!response.ok) throw new Error(result.error || "تعذّر الحفظ."); toast.success(result.message); onSaved(); } catch (error) { toast.error(error instanceof Error ? error.message : "تعذّر الحفظ."); } finally { setSaving(false); } }
  return <Dialog open={Boolean(state)} onOpenChange={(open) => !open && onClose()}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl" dir="rtl"><DialogHeader><DialogTitle>{item ? "تعديل مادة المخزن" : "إضافة مادة إلى المخزن"}</DialogTitle><DialogDescription>سجّل سعر الجملة، سعر المفرد، والعدد المتوفر.</DialogDescription></DialogHeader><div className="grid gap-4 sm:grid-cols-2"><Field label="اسم المادة"><Input value={draft.name} onChange={(event) => set("name", event.target.value)} /></Field><Field label="التصنيف"><Select value={draft.category} onValueChange={(value) => set("category", value)}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{INVENTORY_CATEGORIES.map((entry) => <SelectItem key={entry.value} value={entry.value}>{entry.label}</SelectItem>)}</SelectContent></Select></Field><Field label="وحدة العد"><Input value={draft.unit} onChange={(event) => set("unit", event.target.value)} placeholder="قطعة / علبة / كيس" /></Field><Field label="الرمز / الباركود"><Input value={draft.sku} onChange={(event) => set("sku", event.target.value)} /></Field>{!item && <Field label="العدد الافتتاحي"><Input type="number" min="0" value={draft.quantity} onChange={(event) => set("quantity", event.target.value)} /></Field>}<Field label="تنبيه عند وصول العدد إلى"><Input type="number" min="0" value={draft.lowStockThreshold} onChange={(event) => set("lowStockThreshold", event.target.value)} /></Field><Field label="سعر الجملة (د.ع)"><Input type="number" min="0" value={draft.wholesalePriceIqd} onChange={(event) => set("wholesalePriceIqd", event.target.value)} /></Field><Field label="سعر المفرد (د.ع)"><Input type="number" min="0" value={draft.retailPriceIqd} onChange={(event) => set("retailPriceIqd", event.target.value)} /></Field><Field label="تاريخ الانتهاء"><Input type="date" value={draft.expiryDate} onChange={(event) => set("expiryDate", event.target.value)} /></Field><Field label="ملاحظات" className="sm:col-span-2"><Textarea value={draft.notes} onChange={(event) => set("notes", event.target.value)} /></Field></div><DialogFooter><Button type="button" variant="outline" onClick={onClose}>إلغاء</Button><Button type="button" className="bg-[#2563eb]" disabled={saving} onClick={save}>{saving && <Loader2 className="size-4 animate-spin" />}حفظ المادة</Button></DialogFooter></DialogContent></Dialog>;
}

function InventoryActionDialog({ state, onClose, onSaved }: { state: { type: "sell" | "stock"; item: Item } | null; onClose: () => void; onSaved: () => void }) {
  const [quantity, setQuantity] = useState("1"); const [price, setPrice] = useState(""); const [buyer, setBuyer] = useState(""); const [notes, setNotes] = useState(""); const [saving, setSaving] = useState(false);
  useEffect(() => { if (!state) return; void Promise.resolve().then(() => { setQuantity("1"); setPrice(String(state.type === "sell" ? state.item.retail_price_iqd : state.item.wholesale_price_iqd)); setBuyer(""); setNotes(""); }); }, [state]);
  async function save() { if (!state) return; setSaving(true); try { const body = state.type === "sell" ? { quantity: Number(quantity), unitPriceIqd: Number(price) || 0, buyerName: buyer, notes } : { quantity: Number(quantity), unitCostIqd: Number(price) || 0, notes }; const response = await fetch(`/api/clinic/inventory/${state.item.id}/${state.type === "sell" ? "sell" : "stock"}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); const result = (await response.json()) as { error?: string; message?: string }; if (!response.ok) throw new Error(result.error || "تعذّر تنفيذ العملية."); toast.success(result.message); onSaved(); } catch (error) { toast.error(error instanceof Error ? error.message : "تعذّر تنفيذ العملية."); } finally { setSaving(false); } }
  return <Dialog open={Boolean(state)} onOpenChange={(open) => !open && onClose()}><DialogContent dir="rtl"><DialogHeader><DialogTitle>{state?.type === "sell" ? `بيع ${state.item.name}` : `إضافة رصيد: ${state?.item.name ?? ""}`}</DialogTitle><DialogDescription>{state?.type === "sell" ? `المتوفر حالياً ${state.item.quantity} ${state.item.unit}.` : "تُضاف الكمية إلى العدد الموجود وتُحفظ حركة المخزن."}</DialogDescription></DialogHeader><div className="grid gap-4 sm:grid-cols-2"><Field label="العدد"><Input type="number" min="1" max={state?.type === "sell" ? state.item.quantity : undefined} value={quantity} onChange={(event) => setQuantity(event.target.value)} /></Field><Field label={state?.type === "sell" ? "سعر بيع الوحدة" : "سعر جملة الوحدة الجديد"}><Input type="number" min="0" value={price} onChange={(event) => setPrice(event.target.value)} /></Field>{state?.type === "sell" && <Field label="اسم المشتري (اختياري)" className="sm:col-span-2"><Input value={buyer} onChange={(event) => setBuyer(event.target.value)} /></Field>}<Field label="ملاحظات" className="sm:col-span-2"><Textarea value={notes} onChange={(event) => setNotes(event.target.value)} /></Field></div>{state?.type === "sell" && <div className="rounded-xl bg-[#eef2ff] p-4 text-sm"><span>الإجمالي: </span><strong className="text-lg text-[#2563eb]">{money((Number(quantity) || 0) * (Number(price) || 0))}</strong></div>}<DialogFooter><Button type="button" variant="outline" onClick={onClose}>إلغاء</Button><Button type="button" className="bg-[#2563eb]" disabled={saving} onClick={save}>{saving && <Loader2 className="size-4 animate-spin" />}{state?.type === "sell" ? "تسجيل البيع" : "إضافة إلى الرصيد"}</Button></DialogFooter></DialogContent></Dialog>;
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) { return <div className={`space-y-2 ${className}`}><Label>{label}</Label>{children}</div>; }
