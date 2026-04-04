import { NextRequest, NextResponse } from 'next/server';

const RC_URL = process.env.RC_URL || process.env.RACECONTROL_URL || 'http://localhost:8080';
const COOKIE_NAME = 'rp-admin-token';

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get(COOKIE_NAME)?.value;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const phone = req.nextUrl.searchParams.get('phone');
    const email = req.nextUrl.searchParams.get('email');

    // Check waiver by phone/email
    if (phone || email) {
      const params = new URLSearchParams();
      if (phone) params.set('phone', phone);
      if (email) params.set('email', email);

      const res = await fetch(`${RC_URL}/api/v1/waivers/check?${params.toString()}`, {
        headers,
        cache: 'no-store',
      });
      const data = await res.json();
      return NextResponse.json(data);
    }

    // List all waivers
    const page = req.nextUrl.searchParams.get('page') || '1';
    const res = await fetch(`${RC_URL}/api/v1/waivers?page=${page}&per_page=50`, {
      headers,
      cache: 'no-store',
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Waiver service unavailable' }, { status: 500 });
  }
}
