import { NextResponse } from 'next/server';

const HIRING_BOT_URL = 'http://localhost:3050';

export async function GET() {
  try {
    const res = await fetch(`${HIRING_BOT_URL}/api/candidates`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Hiring bot returned ${res.status}`);
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ candidates: [], error: 'Hiring bot not reachable' }, { status: 200 });
  }
}
