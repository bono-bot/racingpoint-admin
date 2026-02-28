import { NextResponse } from 'next/server';

const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:3100';
const API_KEY = process.env.GATEWAY_API_KEY || 'rp-gateway-2026-secure-key';

export async function GET() {
  try {
    const res = await fetch(`${GATEWAY_URL}/api/health`, {
      headers: { 'x-api-key': API_KEY },
      cache: 'no-store',
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ status: 'offline' }, { status: 503 });
  }
}
