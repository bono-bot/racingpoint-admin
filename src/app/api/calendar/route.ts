import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:3100';
    const API_KEY = process.env.GATEWAY_API_KEY || 'rp-gateway-2026-secure-key';

    const res = await fetch(`${GATEWAY_URL}/api/calendar?limit=30`, {
      headers: { 'x-api-key': API_KEY },
      cache: 'no-store',
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json({ events: [], error: err.message || 'Gateway error' }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ events: [], error: 'Calendar unavailable' }, { status: 500 });
  }
}
