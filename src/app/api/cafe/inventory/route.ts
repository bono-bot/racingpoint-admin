import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  const db = getDb();
  const items = db.prepare(`
    SELECT i.*,
      CASE WHEN i.quantity <= i.min_stock THEN 1 ELSE 0 END as low_stock
    FROM inventory i
    ORDER BY low_stock DESC, i.category, i.item_name
  `).all();
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { item_name, category, quantity, unit, min_stock, cost_per_unit } = body;
  if (!item_name) return NextResponse.json({ error: 'item_name required' }, { status: 400 });

  const db = getDb();
  const result = db.prepare(
    'INSERT INTO inventory (item_name, category, quantity, unit, min_stock, cost_per_unit) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(item_name, category || 'General', quantity || 0, unit || 'pcs', min_stock || 5, cost_per_unit || 0);
  return NextResponse.json({ id: result.lastInsertRowid });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { id, adjustment, type, notes, ...updates } = body;
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const db = getDb();

  // Stock adjustment
  if (adjustment !== undefined && type) {
    const item = db.prepare('SELECT * FROM inventory WHERE id = ?').get(id) as { quantity: number } | undefined;
    if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 });

    const newQty = type === 'in' ? item.quantity + adjustment : type === 'out' ? item.quantity - adjustment : adjustment;
    db.prepare('UPDATE inventory SET quantity = ?, updated_at = datetime("now") WHERE id = ?').run(newQty, id);
    db.prepare('INSERT INTO stock_movements (inventory_id, type, quantity, notes) VALUES (?, ?, ?, ?)').run(id, type, adjustment, notes || null);
    return NextResponse.json({ ok: true, quantity: newQty });
  }

  // Field updates
  const fields: string[] = [];
  const values: unknown[] = [];
  for (const [k, v] of Object.entries(updates)) {
    if (['item_name', 'category', 'quantity', 'unit', 'min_stock', 'cost_per_unit'].includes(k)) {
      fields.push(`${k} = ?`);
      values.push(v);
    }
  }
  if (fields.length > 0) {
    fields.push('updated_at = datetime("now")');
    values.push(id);
    db.prepare(`UPDATE inventory SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  }
  return NextResponse.json({ ok: true });
}
