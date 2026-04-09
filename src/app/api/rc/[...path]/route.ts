import { NextRequest, NextResponse } from 'next/server';
import { COOKIE_NAME } from '@/lib/auth-config';

/**
 * rc proxy — forwards /api/rc/<path> to racecontrol /api/v1/<path> with admin JWT.
 *
 * v47.0 Phase 345-01: env validation moved INSIDE the handler so a missing
 * RC_URL no longer crashes the module at load time (which caused cloud admin
 * login 500 — "Error: RC_URL environment variable is required").
 *
 * On missing env: returns structured JSON 503 with error_code.
 * On unreachable backend: returns 502 with hint.
 */

async function proxy(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const rcUrl = process.env.RC_URL;
  if (!rcUrl) {
    return NextResponse.json(
      {
        error: 'admin backend misconfigured',
        error_code: 'RC_URL_MISSING',
        hint: 'set RC_URL in .env.production.local or pm2/bat env',
      },
      { status: 503 }
    );
  }

  const { path } = await params;
  const token = req.cookies.get(COOKIE_NAME)?.value;

  // Defense in depth: reject if no token
  // (middleware should catch this, but belt-and-suspenders)
  if (!token) {
    return NextResponse.json({ error: 'unauthorized', error_code: 'NO_TOKEN' }, { status: 401 });
  }

  const rcPath = `/api/v1/${path.join('/')}`;
  const url = `${rcUrl}${rcPath}${req.nextUrl.search}`;

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
      return NextResponse.json(
        {
          error: 'invalid response from racecontrol',
          error_code: 'INVALID_RC_RESPONSE',
          raw: text.slice(0, 200),
        },
        { status: 502 }
      );
    }
  } catch (err) {
    return NextResponse.json(
      {
        error: 'racecontrol unreachable',
        error_code: 'RC_UNREACHABLE',
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 502 }
    );
  }
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const DELETE = proxy;
