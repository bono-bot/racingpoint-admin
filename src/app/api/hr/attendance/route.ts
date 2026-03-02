import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get('date') || new Date().toISOString().slice(0, 10);

  const db = getDb();
  const records = db.prepare(`
    SELECT a.*, e.name as employee_name
    FROM attendance a
    JOIN employees e ON a.employee_id = e.id
    WHERE a.date = ?
    ORDER BY a.check_in
  `).all(date);

  return NextResponse.json({ records });
}
