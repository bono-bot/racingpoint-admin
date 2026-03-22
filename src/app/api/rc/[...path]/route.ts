import { NextRequest, NextResponse } from 'next/server';
import { COOKIE_NAME } from '@/lib/auth-config';

const RC_URL = process.env.RC_URL;
if (!RC_URL) throw new Error('RC_URL environment variable is required');

async function proxy(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const token = req.cookies.get(COOKIE_NAME)?.value;

  // Defense in depth: reject if no token
  // (middleware should catch this, but belt-and-suspenders)
  if (!token) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const rcPath = `/api/v1/${path.join('/')}`;
  const url = `${RC_URL}${rcPath}${req.nextUrl.search}`;

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };

    const res = await fetch(url, {
      method: req.method,
      headers,
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
