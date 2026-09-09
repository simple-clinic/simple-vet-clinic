type D1Database = ReturnType<typeof import("@/db").getD1>;

export type InventoryUsage = { inventoryItemId?: string | null; inventoryQuantity?: number };
export type StoredInventoryUsage = { inventory_item_id: string | null; inventory_quantity: number | null };

function requestedTotals(records: InventoryUsage[]) {
  const totals = new Map<string, number>();
  for (const record of records) {
    if (!record.inventoryItemId) continue;
    const quantity = Math.max(1, Math.trunc(Number(record.inventoryQuantity || 1)));
    totals.set(record.inventoryItemId, (totals.get(record.inventoryItemId) ?? 0) + quantity);
  }
  return totals;
}

function storedTotals(records: StoredInventoryUsage[]) {
  const totals = new Map<string, number>();
  for (const record of records) {
    if (!record.inventory_item_id) continue;
    const quantity = Math.max(1, Math.trunc(Number(record.inventory_quantity || 1)));
    totals.set(record.inventory_item_id, (totals.get(record.inventory_item_id) ?? 0) + quantity);
  }
  return totals;
}

export async function validateInventoryUsage(
  db: D1Database,
  records: InventoryUsage[],
  restoredRecords: StoredInventoryUsage[] = [],
) {
  const restored = storedTotals(restoredRecords);
  for (const [itemId, quantity] of requestedTotals(records)) {
    const item = await db.prepare(
      "SELECT name, quantity, active FROM inventory_items WHERE id = ? LIMIT 1",
    ).bind(itemId).first<{ name: string; quantity: number; active: number }>();
    if (!item || !item.active) throw new Error("مادة المخزن المختارة غير موجودة.");
    const available = Number(item.quantity || 0) + (restored.get(itemId) ?? 0);
    if (available < quantity) {
      throw new Error(`مخزون ${item.name} غير كافٍ. المتوفر ${available} والمطلوب ${quantity}.`);
    }
  }
}

export function inventoryDeductionStatements(db: D1Database, records: InventoryUsage[]) {
  const statements = [];
  for (const [itemId, quantity] of requestedTotals(records)) {
    statements.push(
      db.prepare(
        "UPDATE inventory_items SET quantity = quantity - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND active = 1 AND quantity >= ?",
      ).bind(quantity, itemId, quantity),
      db.prepare(
        `INSERT INTO inventory_movements
          (id, item_id, movement_type, quantity_delta, unit_cost_iqd, notes)
         SELECT ?, id, 'vaccine', ?, wholesale_price_iqd, 'خصم تلقائي عند تسجيل لقاح أو جرعة'
         FROM inventory_items WHERE id = ?`,
      ).bind(crypto.randomUUID(), -quantity, itemId),
    );
  }
  return statements;
}

export function inventoryRestorationStatements(db: D1Database, records: StoredInventoryUsage[]) {
  const statements = [];
  for (const [itemId, quantity] of storedTotals(records)) {
    statements.push(
      db.prepare(
        "UPDATE inventory_items SET quantity = quantity + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      ).bind(quantity, itemId),
      db.prepare(
        `INSERT INTO inventory_movements
          (id, item_id, movement_type, quantity_delta, unit_cost_iqd, notes)
         SELECT ?, id, 'vaccine_restore', ?, wholesale_price_iqd, 'إرجاع تلقائي بعد حذف أو تعديل سجل لقاح'
         FROM inventory_items WHERE id = ?`,
      ).bind(crypto.randomUUID(), quantity, itemId),
    );
  }
  return statements;
}

export async function visitInventoryUsage(db: D1Database, visitId: string) {
  const result = await db.prepare(
    `SELECT inventory_item_id, inventory_quantity
     FROM preventive_records
     WHERE visit_id = ? AND inventory_item_id IS NOT NULL`,
  ).bind(visitId).all<StoredInventoryUsage>();
  return result.results ?? [];
}
