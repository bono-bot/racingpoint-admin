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

    // Handle empty responses (e.g. freedom mode, billing/start return 200 with no body)
    const text = await res.text();
    if (!text || text.trim().length === 0) {
      return NextResponse.json({ ok: true }, { status: res.status });
    }
    try {
      const data = JSON.parse(text);
      return NextResponse.json(data, { status: res.status });
    } catch {
      // Non-JSON response (HTML error page, plain text)
      return NextResponse.json({ error: 'invalid response from server', raw: text.slice(0, 200) }, { status: 502 });
    }
  } catch {
    return NextResponse.json({ error: 'rc-core unreachable' }, { status: 502 });
  }
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const DELETE = proxy;
