import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');

  const db = getDb();
  let query = `
    SELECT lr.*, e.name as employee_name
    FROM leave_requests lr
    JOIN employees e ON lr.employee_id = e.id
  `;
  const params: string[] = [];

  if (status) {
    query += ' WHERE lr.status = ?';
    params.push(status);
  }

  query += ' ORDER BY lr.created_at DESC';

  const requests = db.prepare(query).all(...params);
  return NextResponse.json({ requests });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { id, status, reviewed_by } = body;
  if (!id || !status) {
    return NextResponse.json({ error: 'id and status required' }, { status: 400 });
  }

  const db = getDb();

  // Get the leave request details before updating
  const leaveRequest = db.prepare('SELECT * FROM leave_requests WHERE id = ?').get(id) as {
    id: number; employee_id: number; leave_type: string; days: number; status: string;
  } | undefined;

  if (!leaveRequest) {
    return NextResponse.json({ error: 'Leave request not found' }, { status: 404 });
  }

  // Update the leave request status
  db.prepare(
    'UPDATE leave_requests SET status = ?, reviewed_by = ?, reviewed_at = datetime(\'now\') WHERE id = ?'
  ).run(status, reviewed_by || 'Admin', id);

  // If approved, update leave_balances used_days
  if (status === 'approved') {
    db.prepare(
      'UPDATE leave_balances SET used_days = used_days + ? WHERE employee_id = ? AND leave_type = ?'
    ).run(leaveRequest.days, leaveRequest.employee_id, leaveRequest.leave_type);
  }

  return NextResponse.json({ ok: true });
}
