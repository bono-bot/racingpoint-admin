import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get('date') || new Date().toISOString().slice(0, 10);

  const db = getDb();

  // Try joining with old employees table first (backward compat),
  // fall back to attendance-only if employees table doesn't exist or is empty
  try {
    const records = db.prepare(`
      SELECT a.*, COALESCE(e.name, a.employee_id) as employee_name
      FROM attendance a
      LEFT JOIN employees e ON CAST(a.employee_id AS TEXT) = CAST(e.id AS TEXT)
      WHERE a.date = ?
      ORDER BY a.check_in
    `).all(date);
    return NextResponse.json({ records });
  } catch {
    // employees table may not exist — return attendance without names
    const records = db.prepare(`
      SELECT *, employee_id as employee_name FROM attendance WHERE date = ? ORDER BY check_in
    `).all(date);
    return NextResponse.json({ records });
  }
}
