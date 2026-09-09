import { getD1 } from "@/db";
import { authorizeClinicRequest } from "@/lib/clinic-auth";

export const dynamic = "force-dynamic";

function monthBounds(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const next = monthNumber === 12 ? `${year + 1}-01-01` : `${year}-${String(monthNumber + 1).padStart(2, "0")}-01`;
  return { start: `${month}-01`, next };
}

export async function GET(request: Request) {
  const auth = await authorizeClinicRequest();
  if (!auth.ok) return Response.json({ error: auth.message }, { status: auth.status });

  try {
    const url = new URL(request.url);
    const fallbackMonth = new Date().toISOString().slice(0, 7);
    const month = url.searchParams.get("from") || url.searchParams.get("month") || fallbackMonth;
    const toMonth = url.searchParams.get("to") || month;
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
      return Response.json({ error: "صيغة الشهر غير صحيحة." }, { status: 400 });
    }
    const { start } = monthBounds(month);
    const { next } = monthBounds(toMonth);
    const db = getD1();
    const [summary, rows, externalRows] = await Promise.all([
      db.prepare(
        `SELECT
          COALESCE((SELECT SUM(cost_iqd) FROM visits WHERE date(created_at) >= date(?) AND date(created_at) < date(?)), 0) AS visit_revenue,
          COALESCE((SELECT SUM(pr.cost_iqd) FROM procedures pr JOIN visits v ON v.id = pr.visit_id WHERE date(COALESCE(pr.procedure_date, pr.created_at)) >= date(?) AND date(COALESCE(pr.procedure_date, pr.created_at)) < date(?)), 0) AS procedure_revenue,
          COALESCE((SELECT SUM(d.cost_iqd) FROM diagnostics d WHERE date(d.created_at) >= date(?) AND date(d.created_at) < date(?)), 0) AS diagnostic_revenue,
          COALESCE((SELECT SUM(s.total_iqd) FROM inventory_sales s WHERE date(s.sold_at) >= date(?) AND date(s.sold_at) < date(?)), 0) AS store_revenue,
          COALESCE((SELECT SUM(bp.amount_iqd) FROM boarding_payments bp WHERE date(bp.paid_at) >= date(?) AND date(bp.paid_at) < date(?)), 0) AS boarding_revenue,
          COALESCE((SELECT SUM(es.amount_iqd) FROM external_services es WHERE date(es.created_at) >= date(?) AND date(es.created_at) < date(?)), 0) AS external_revenue,
          (SELECT COUNT(*) FROM visits WHERE date(created_at) >= date(?) AND date(created_at) < date(?)) AS visit_count,
          (SELECT COUNT(*) FROM procedures pr WHERE date(COALESCE(pr.procedure_date, pr.created_at)) >= date(?) AND date(COALESCE(pr.procedure_date, pr.created_at)) < date(?)) AS procedure_count,
          (SELECT COUNT(*) FROM inventory_sales s WHERE date(s.sold_at) >= date(?) AND date(s.sold_at) < date(?)) AS sale_count`,
      ).bind(start, next, start, next, start, next, start, next, start, next, start, next, start, next, start, next, start, next).first<Record<string, number>>(),
      db.prepare(
        `SELECT * FROM (
          SELECT v.id, v.created_at AS service_date, 'visit' AS source, v.visit_type AS category,
            v.chief_complaint AS service, v.cost_iqd AS amount, p.name AS patient_name, o.name AS owner_name
          FROM visits v JOIN patients p ON p.id = v.patient_id JOIN owners o ON o.id = p.owner_id
          WHERE v.cost_iqd > 0 AND date(v.created_at) >= date(?) AND date(v.created_at) < date(?)
          UNION ALL
          SELECT pr.id, COALESCE(pr.procedure_date, pr.created_at), 'procedure', pr.category,
            pr.procedure_type, pr.cost_iqd, p.name, o.name
          FROM procedures pr JOIN visits v ON v.id = pr.visit_id JOIN patients p ON p.id = v.patient_id JOIN owners o ON o.id = p.owner_id
          WHERE pr.cost_iqd > 0 AND date(COALESCE(pr.procedure_date, pr.created_at)) >= date(?) AND date(COALESCE(pr.procedure_date, pr.created_at)) < date(?)
          UNION ALL
          SELECT d.id, d.created_at, 'diagnostic', d.category, d.title, d.cost_iqd, p.name, o.name
          FROM diagnostics d JOIN visits v ON v.id = d.visit_id JOIN patients p ON p.id = v.patient_id JOIN owners o ON o.id = p.owner_id
          WHERE d.cost_iqd > 0 AND date(d.created_at) >= date(?) AND date(d.created_at) < date(?)
          UNION ALL
          SELECT s.id, s.sold_at, 'store', i.category, i.name, s.total_iqd,
            COALESCE(p.name, 'بيع مخزن'), s.buyer_name
          FROM inventory_sales s JOIN inventory_items i ON i.id = s.item_id
          LEFT JOIN patients p ON p.id = s.patient_id
          WHERE s.total_iqd > 0 AND date(s.sold_at) >= date(?) AND date(s.sold_at) < date(?)
          UNION ALL
          SELECT bp.id, bp.paid_at, 'boarding', bs.stay_type,
            'مبيت - قفص ' || bs.cage_number, bp.amount_iqd, p.name, o.name
          FROM boarding_payments bp JOIN boarding_stays bs ON bs.id = bp.stay_id
          JOIN patients p ON p.id = bs.patient_id JOIN owners o ON o.id = p.owner_id
          WHERE bp.amount_iqd > 0 AND date(bp.paid_at) >= date(?) AND date(bp.paid_at) < date(?)
        ) ORDER BY service_date DESC`,
      ).bind(start, next, start, next, start, next, start, next, start, next).all<Record<string, unknown>>(),
      db.prepare("SELECT id, service_date, 'external' AS source, 'external' AS category, service_type AS service, amount_iqd AS amount, 'خدمة خارجية' AS patient_name, description AS owner_name FROM external_services WHERE amount_iqd > 0 AND date(service_date) >= date(?) AND date(service_date) < date(?) ORDER BY service_date DESC").bind(start, next).all<Record<string, unknown>>(),
    ]);

    const visitRevenue = Number(summary?.visit_revenue ?? 0);
    const procedureRevenue = Number(summary?.procedure_revenue ?? 0);
    const diagnosticRevenue = Number(summary?.diagnostic_revenue ?? 0);
    const storeRevenue = Number(summary?.store_revenue ?? 0);
    const boardingRevenue = Number(summary?.boarding_revenue ?? 0);
    const externalRevenue = Number(summary?.external_revenue ?? 0);
    return Response.json({
      month,
      summary: {
        visitRevenue,
        procedureRevenue,
        diagnosticRevenue,
        storeRevenue,
        boardingRevenue,
        externalRevenue,
        totalRevenue: visitRevenue + procedureRevenue + diagnosticRevenue + storeRevenue + boardingRevenue + externalRevenue,
        visitCount: Number(summary?.visit_count ?? 0),
        procedureCount: Number(summary?.procedure_count ?? 0),
        saleCount: Number(summary?.sale_count ?? 0),
      },
      rows: [...(rows.results ?? []), ...(externalRows.results ?? [])].sort((a, b) => String(b.service_date).localeCompare(String(a.service_date))),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "تعذّر تحميل الوارد الشهري.";
    return Response.json({ error: message }, { status: 500 });
  }
}
