import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import crypto from 'crypto';

export async function GET() {
  const db = getDb();
  const employees = db.prepare('SELECT * FROM employees ORDER BY name').all();
  return NextResponse.json({ employees });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, phone, pin, role, department, hire_date } = body;
  if (!name || !phone || !pin) {
    return NextResponse.json({ error: 'name, phone, pin required' }, { status: 400 });
  }

  const pin_hash = crypto.createHash('sha256').update(pin).digest('hex');
  const db = getDb();

  const result = db.prepare(
    'INSERT INTO employees (name, phone, pin_hash, role, department, hire_date) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(name, phone, pin_hash, role || 'staff', department || 'operations', hire_date || new Date().toISOString().slice(0, 10));

  const employeeId = result.lastInsertRowid;

  // Seed leave balances
  const leaveStmt = db.prepare(
    'INSERT INTO leave_balances (employee_id, leave_type, total_days, used_days) VALUES (?, ?, ?, 0)'
  );
  leaveStmt.run(employeeId, 'casual', 12);
  leaveStmt.run(employeeId, 'sick', 6);
  leaveStmt.run(employeeId, 'paid', 15);

  const employee = db.prepare('SELECT * FROM employees WHERE id = ?').get(employeeId);
  return NextResponse.json({ employee });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { id, status } = body;
  if (!id || !status) {
    return NextResponse.json({ error: 'id and status required' }, { status: 400 });
  }

  const db = getDb();
  db.prepare('UPDATE employees SET status = ?, updated_at = datetime(\'now\') WHERE id = ?').run(status, id);
  return NextResponse.json({ ok: true });
}
