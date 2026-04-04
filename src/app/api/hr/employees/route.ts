import { NextRequest, NextResponse } from 'next/server';

// Inline cookie name to avoid import issues in standalone build
const COOKIE_NAME = 'rp-admin-token';

export async function GET(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const rcUrl = process.env.RC_URL || 'http://localhost:8080';

  try {
    const res = await fetch(`${rcUrl}/api/v1/staff`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      return NextResponse.json({ error: `rc returned ${res.status}`, employees: [] }, { status: res.status });
    }

    const data = await res.json();
    const staff = data.staff || [];

    const employees = staff.map((s: { id: string; name: string; phone: string; role: string; is_active: boolean; last_login_at: string | null }) => ({
      id: s.id,
      name: s.name,
      phone: s.phone,
      role: s.role,
      department: 'operations',
      hire_date: null,
      status: s.is_active ? 'active' : 'inactive',
      last_login_at: s.last_login_at,
      email: null,
      created_at: null,
      updated_at: null,
    }));

    return NextResponse.json({ employees });
  } catch (err) {
    return NextResponse.json({ error: `rc unreachable: ${String(err)}`, employees: [] }, { status: 502 });
  }
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const body = await req.json();
  const { name, phone, pin, role } = body;
  if (!name || !phone || !pin) {
    return NextResponse.json({ error: 'name, phone, pin required' }, { status: 400 });
  }

  const rcUrl = process.env.RC_URL || 'http://localhost:8080';

  try {
    const res = await fetch(`${rcUrl}/api/v1/staff`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ name, phone, pin }),
    });
    const data = await res.json();
    if (!res.ok || data.error) {
      return NextResponse.json({ error: data.error || 'Failed to create' }, { status: 400 });
    }

    if (role && role !== 'staff' && data.id) {
      await fetch(`${rcUrl}/api/v1/staff/${data.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ role }),
      });
    }

    return NextResponse.json({
      employee: { id: data.id, name, phone, role: role || 'staff', department: 'operations', status: 'active' },
    });
  } catch {
    return NextResponse.json({ error: 'Cannot reach racecontrol server' }, { status: 502 });
  }
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

  const rcUrl = process.env.RC_URL || 'http://localhost:8080';

  try {
    if (status === 'inactive') {
      await fetch(`${rcUrl}/api/v1/staff/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
    } else {
      await fetch(`${rcUrl}/api/v1/staff/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ is_active: true }),
      });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Cannot reach racecontrol server' }, { status: 502 });
  }
}
