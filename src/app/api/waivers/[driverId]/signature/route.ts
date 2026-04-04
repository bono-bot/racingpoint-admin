import { NextRequest, NextResponse } from 'next/server';

const RC_URL = process.env.RC_URL || process.env.RACECONTROL_URL || 'http://localhost:8080';
const COOKIE_NAME = 'rp-admin-token';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ driverId: string }> },
) {
  const { driverId } = await params;
  try {
    const token = req.cookies.get(COOKIE_NAME)?.value;
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(
      `${RC_URL}/api/v1/waivers/${driverId}/signature`,
      { headers, cache: 'no-store' },
    );
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Signature service unavailable' }, { status: 500 });
  }
}
