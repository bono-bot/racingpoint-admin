import { NextRequest, NextResponse } from 'next/server';

const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:3100';
const API_KEY = process.env.GATEWAY_API_KEY || 'rp-gateway-2026-secure-key';

export async function GET(req: NextRequest) {
  try {
    const phone = req.nextUrl.searchParams.get('phone');
    const email = req.nextUrl.searchParams.get('email');

    let path = '/api/waivers';
    if (phone || email) {
      const params = new URLSearchParams();
      if (phone) params.set('phone', phone);
      if (email) params.set('email', email);
      path = `/api/waivers/check?${params.toString()}`;
    }

    const res = await fetch(`${GATEWAY_URL}${path}`, {
      headers: { 'x-api-key': API_KEY },
      cache: 'no-store',
    });

    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Waiver service unavailable' }, { status: 500 });
  }
}
