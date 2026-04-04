import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { COOKIE_NAME } from '@/lib/auth-config';

const RC_URL = process.env.RC_URL;

// ---------------------------------------------------------------------------
// Racecontrol staff_members is the SINGLE SOURCE OF TRUTH for staff identity,
// auth (PINs), roles, and active status.  admin.db only stores HR-specific
// metadata (department, hire_date) keyed by racecontrol staff_id.
// ---------------------------------------------------------------------------

interface RcStaff {
  id: string;
  name: string;
  phone: string;
  is_active: boolean;
  role: string;
  last_login_at: string | null;
}

interface HrMeta {
  staff_id: string;
  department: string;
  hire_date: string | null;
}

function ensureHrMetaTable() {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS hr_staff_meta (
      staff_id TEXT PRIMARY KEY,
      department TEXT DEFAULT 'operations',
      hire_date TEXT
    )
  `);
  return db;
}

async function fetchRcStaff(token: string): Promise<RcStaff[]> {
  if (!RC_URL) return [];
  const res = await fetch(`${RC_URL}/api/v1/staff`, {
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    cache: 'no-store',
  });
  if (!res.ok) return [];
  const data: { staff?: RcStaff[] } = await res.json();
  return data.staff || [];
}

export async function GET(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const rcStaff = await fetchRcStaff(token);
  const db = ensureHrMetaTable();
  const metaRows = db.prepare('SELECT * FROM hr_staff_meta').all() as HrMeta[];
  const metaMap = new Map(metaRows.map(m => [m.staff_id, m]));

  const employees = rcStaff.map(s => {
    const meta = metaMap.get(s.id);
    return {
      id: s.id,
      name: s.name,
      phone: s.phone,
      role: s.role,
      department: meta?.department || 'operations',
      hire_date: meta?.hire_date || null,
      status: s.is_active ? 'active' : 'inactive',
      last_login_at: s.last_login_at,
      email: null,
      created_at: null,
      updated_at: null,
    };
  });

  return NextResponse.json({ employees });
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const body = await req.json();
  const { name, phone, pin, role, department, hire_date } = body;
  if (!name || !phone || !pin) {
    return NextResponse.json({ error: 'name, phone, pin required' }, { status: 400 });
  }

  // Create in racecontrol (single source of truth)
  if (!RC_URL) {
    return NextResponse.json({ error: 'RC_URL not configured' }, { status: 500 });
  }

  let staffId: string;
  try {
    const rcRes = await fetch(`${RC_URL}/api/v1/staff`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ name, phone, pin }),
    });
    const rcData: { error?: string; status?: string; id?: string; name?: string } = await rcRes.json();
    if (!rcRes.ok || rcData.error) {
      return NextResponse.json({ error: rcData.error || 'Failed to create staff' }, { status: 400 });
    }
    staffId = rcData.id || '';
  } catch {
    return NextResponse.json({ error: 'Cannot reach racecontrol server' }, { status: 502 });
  }

  // Update role if not default
  if (role && role !== 'staff' && staffId) {
    try {
      await fetch(`${RC_URL}/api/v1/staff/${staffId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ role }),
      });
    } catch { /* role update is best-effort */ }
  }

  // Store HR-specific metadata locally
  const db = ensureHrMetaTable();
  db.prepare(
    'INSERT OR REPLACE INTO hr_staff_meta (staff_id, department, hire_date) VALUES (?, ?, ?)'
  ).run(staffId, department || 'operations', hire_date || new Date().toISOString().slice(0, 10));

  // Seed leave balances (keyed by staff_id now)
  try {
    const leaveStmt = db.prepare(
      'INSERT OR IGNORE INTO leave_balances (employee_id, leave_type, total_days, used_days) VALUES (?, ?, ?, 0)'
    );
    leaveStmt.run(staffId, 'casual', 12);
    leaveStmt.run(staffId, 'sick', 6);
    leaveStmt.run(staffId, 'paid', 15);
  } catch { /* leave_balances table may not exist yet or use integer keys — graceful fail */ }

  return NextResponse.json({
    employee: { id: staffId, name, phone, role: role || 'staff', department: department || 'operations', status: 'active' },
  });
}

export async function PUT(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const body = await req.json();
  const { id, status } = body;
  if (!id || !status) {
    return NextResponse.json({ error: 'id and status required' }, { status: 400 });
  }

  // Toggle active status in racecontrol
  if (RC_URL) {
    try {
      if (status === 'inactive') {
        await fetch(`${RC_URL}/api/v1/staff/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` },
        });
      } else {
        await fetch(`${RC_URL}/api/v1/staff/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ is_active: true }),
        });
      }
    } catch {
      return NextResponse.json({ error: 'Cannot reach racecontrol server' }, { status: 502 });
    }
  }

  return NextResponse.json({ ok: true });
}
