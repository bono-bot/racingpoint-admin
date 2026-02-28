import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  const db = getDb();
  const purchases = db.prepare(`
    SELECT p.*,
      (SELECT COUNT(*) FROM purchase_items pi WHERE pi.purchase_id = p.id) as item_count
    FROM purchases p
    ORDER BY p.purchase_date DESC
  `).all();
  return NextResponse.json({ purchases });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { vendor, invoice_number, total_amount, purchase_date, category, notes, items } = body;
  if (!vendor || !total_amount || !purchase_date) {
    return NextResponse.json({ error: 'vendor, total_amount, purchase_date required' }, { status: 400 });
  }

  const db = getDb();
  const result = db.prepare(
    'INSERT INTO purchases (vendor, invoice_number, total_amount, purchase_date, category, notes) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(vendor, invoice_number || null, total_amount, purchase_date, category || 'General', notes || null);

  const purchaseId = result.lastInsertRowid;

  if (items && Array.isArray(items)) {
    const stmt = db.prepare(
      'INSERT INTO purchase_items (purchase_id, item_name, quantity, unit_price, total) VALUES (?, ?, ?, ?, ?)'
    );
    for (const item of items) {
      stmt.run(purchaseId, item.item_name, item.quantity, item.unit_price, item.total || item.quantity * item.unit_price);
    }
  }

  return NextResponse.json({ id: purchaseId });
}
