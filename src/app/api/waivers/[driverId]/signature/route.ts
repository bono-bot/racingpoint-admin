import { NextRequest, NextResponse } from 'next/server';

const RACECONTROL_URL = process.env.RACECONTROL_URL || 'http://localhost:8080';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ driverId: string }> },
) {
  const { driverId } = await params;
  try {
    const res = await fetch(
      `${RACECONTROL_URL}/api/v1/waivers/${driverId}/signature`,
      { cache: 'no-store' },
    );
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Signature service unavailable' }, { status: 500 });
  }
}
