import { NextRequest, NextResponse } from 'next/server';

const RACECONTROL_URL = process.env.RACECONTROL_URL || 'http://localhost:8080';

export async function GET(req: NextRequest) {
  try {
    const phone = req.nextUrl.searchParams.get('phone');
    const email = req.nextUrl.searchParams.get('email');

    // Check waiver by phone/email
    if (phone || email) {
      const params = new URLSearchParams();
      if (phone) params.set('phone', phone);
      if (email) params.set('email', email);

      const res = await fetch(`${RACECONTROL_URL}/api/v1/waivers/check?${params.toString()}`, {
        cache: 'no-store',
      });
      const data = await res.json();
      return NextResponse.json(data);
    }

    // List all waivers
    const page = req.nextUrl.searchParams.get('page') || '1';
    const res = await fetch(`${RACECONTROL_URL}/api/v1/waivers?page=${page}&per_page=50`, {
      cache: 'no-store',
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Waiver service unavailable' }, { status: 500 });
  }
}
