import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  const db = getDb();
  const items = db.prepare('SELECT * FROM menu_items ORDER BY category, name').all();
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { category, name, price, veg } = body;
  if (!category || !name || !price) {
    return NextResponse.json({ error: 'category, name, price required' }, { status: 400 });
  }
  const db = getDb();
  const result = db.prepare('INSERT INTO menu_items (category, name, price, veg) VALUES (?, ?, ?, ?)').run(category, name, price, veg ? 1 : 0);
  return NextResponse.json({ id: result.lastInsertRowid });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { id, ...updates } = body;
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const db = getDb();
  const fields: string[] = [];
  const values: unknown[] = [];
  for (const [k, v] of Object.entries(updates)) {
    if (['category', 'name', 'price', 'veg', 'available'].includes(k)) {
      fields.push(`${k} = ?`);
      values.push(v);
    }
  }
  if (fields.length === 0) return NextResponse.json({ error: 'no valid fields' }, { status: 400 });
  values.push(id);
  db.prepare(`UPDATE menu_items SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return NextResponse.json({ ok: true });
}
