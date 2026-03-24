import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { COOKIE_NAME } from '@/lib/auth-config';
import crypto from 'crypto';

const RC_URL = process.env.RC_URL;

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

  // Create staff member in racecontrol (single source of truth for PIN auth)
  if (RC_URL) {
    const token = req.cookies.get(COOKIE_NAME)?.value;
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    try {
      const rcRes = await fetch(`${RC_URL}/api/v1/staff`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ name, phone, pin }),
      });
      const rcData: { error?: string; status?: string; id?: string } = await rcRes.json();
      if (rcData.error && !rcData.error.includes('UNIQUE constraint')) {
        return NextResponse.json({ error: `Racecontrol: ${rcData.error}` }, { status: 400 });
      }
    } catch {
      return NextResponse.json({ error: 'Cannot reach racecontrol server — staff not created' }, { status: 502 });
    }
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
