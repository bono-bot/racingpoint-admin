import { NextRequest, NextResponse } from 'next/server';
import { COOKIE_NAME, COOKIE_OPTIONS } from '@/lib/auth-config';

const RC_URL = process.env.RC_URL;
if (!RC_URL) throw new Error('RC_URL environment variable is required');

export async function POST(req: NextRequest) {
  const { pin } = await req.json();

  if (!pin || typeof pin !== 'string') {
    return NextResponse.json({ error: 'PIN is required' }, { status: 400 });
  }

  const rcRes = await fetch(`${RC_URL}/api/v1/auth/admin-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin }),
  });

  if (!rcRes.ok) {
    const status = rcRes.status;
    const error = status === 401 ? 'Invalid PIN'
                : status === 429 ? 'Too many attempts. Try again later.'
                : 'Login failed';
    return NextResponse.json({ error }, { status });
  }

  const { token, expires_in } = await rcRes.json();

  const res = NextResponse.json({ success: true });
  res.cookies.set(COOKIE_NAME, token, {
    ...COOKIE_OPTIONS,
    maxAge: expires_in,  // Use RC's value (43200s)
  });

  return res;
}
