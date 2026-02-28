import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  const db = getDb();
  const sales = db.prepare(`
    SELECT s.*,
      (SELECT COUNT(*) FROM sale_items si WHERE si.sale_id = s.id) as item_count
    FROM sales s
    ORDER BY s.sale_date DESC
  `).all();
  return NextResponse.json({ sales });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { customer_name, total_amount, payment_method, sale_date, notes, items } = body;
  if (!total_amount || !sale_date) {
    return NextResponse.json({ error: 'total_amount, sale_date required' }, { status: 400 });
  }

  const db = getDb();

  // Generate bill number: RP-BILL-YYYYMMDD-NNN
  const dateStr = sale_date.replace(/-/g, '');
  const existing = db.prepare("SELECT COUNT(*) as c FROM sales WHERE sale_date = ?").get(sale_date) as { c: number };
  const billNumber = `RP-BILL-${dateStr}-${String(existing.c + 1).padStart(3, '0')}`;

  const result = db.prepare(
    'INSERT INTO sales (bill_number, customer_name, total_amount, payment_method, sale_date, notes) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(billNumber, customer_name || null, total_amount, payment_method || 'cash', sale_date, notes || null);

  const saleId = result.lastInsertRowid;

  if (items && Array.isArray(items)) {
    const stmt = db.prepare(
      'INSERT INTO sale_items (sale_id, menu_item_id, item_name, quantity, unit_price, total) VALUES (?, ?, ?, ?, ?, ?)'
    );
    for (const item of items) {
      stmt.run(saleId, item.menu_item_id || null, item.item_name, item.quantity || 1, item.unit_price, item.total || item.quantity * item.unit_price);
    }
  }

  return NextResponse.json({ id: saleId, bill_number: billNumber });
}
