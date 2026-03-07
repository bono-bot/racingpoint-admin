import { NextRequest, NextResponse } from 'next/server';

const RC_URL = process.env.RC_URL || 'http://localhost:8080';

async function proxy(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const rcPath = `/api/v1/${path.join('/')}`;
  const qs = req.nextUrl.search;
  const url = `${RC_URL}${rcPath}${qs}`;

  try {
    const res = await fetch(url, {
      method: req.method,
      headers: { 'Content-Type': 'application/json' },
      body: req.method !== 'GET' && req.method !== 'HEAD' ? await req.text() : undefined,
      cache: 'no-store',
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'rc-core unreachable' }, { status: 502 });
  }
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const DELETE = proxy;
