import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { COOKIE_NAME } from '@/lib/auth-config';
import {
  recordRequest,
  checkRateLimit,
  type CallerClass,
} from '@/lib/admin-gateway-state';

/**
 * Admin gateway proxy — forwards /api/rc/<path> to racecontrol /api/v1/<path>.
 *
 * Implements GATEWAY-CONTRACT.md (racecontrol/.planning/specs/admin-panel-spinal-cord/).
 *
 * v1 (2026-04-23, Phase A1+A2+A5-stub of Track A):
 * - Methods: GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS
 * - Auth modes: admin-cookie (substituted), staff-jwt, customer-jwt, X-Service-Key,
 *   x-terminal-secret, kiosk-PIN, public — passthrough as-is when present
 * - Header passthrough: deny-list strip (Host, Content-Length, Connection,
 *   Transfer-Encoding); everything else (Idempotency-Key, ETag, Range, Accept) passes
 * - Body: arrayBuffer for binary-safe forwarding (multipart, JSON, form)
 * - Request-id: generated if not provided; logged + returned to client
 * - Cloud-authoritative writes: staff/* (except validate-pin) + admin/staff
 *   route to RC_CLOUD_URL when set
 * - Structured stdout log per request (sampled — 100% writes/errors, 1% GETs)
 * - Rate limit: stub via checkRateLimit() — disabled unless ADMIN_GATEWAY_RATE_LIMIT=1
 *
 * NOT supported (intentional — see GATEWAY-CONTRACT.md):
 * - WebSocket relay (A4 exempt — kiosk /ws/* hits :8080 direct)
 *
 * Backward-compatible with admin-UI cookie flow (v47.0 Phase 345-01 contract preserved).
 */

const STRIP_HEADERS_REQ = new Set([
  'host',
  'content-length',
  'connection',
  'transfer-encoding',
]);

const STRIP_HEADERS_RES = new Set(['transfer-encoding', 'connection']);

const SAMPLE_GET_RATE = 0.01;

function isCloudAuthoritativeWrite(method: string, segments: string[]): boolean {
  if (method === 'GET' || method === 'HEAD') return false;
  const head = segments[0];
  const tail = segments[1];
  if (head === 'staff' && tail !== 'validate-pin') return true;
  if (head === 'admin' && tail === 'staff') return true;
  return false;
}

interface CallerInfo {
  class: CallerClass;
  substituteAuth: boolean;
  identityKey: string;
}

function classifyCaller(req: NextRequest): CallerInfo {
  const serviceKey = req.headers.get('x-service-key');
  if (serviceKey) {
    return { class: 'service-key', substituteAuth: false, identityKey: serviceKey.slice(0, 16) };
  }
  const terminalSecret = req.headers.get('x-terminal-secret');
  if (terminalSecret) {
    return {
      class: 'terminal-secret',
      substituteAuth: false,
      identityKey: terminalSecret.slice(0, 16),
    };
  }
  const authHeader = req.headers.get('authorization');
  if (authHeader) {
    return { class: 'staff-jwt', substituteAuth: false, identityKey: authHeader.slice(0, 24) };
  }
  const kioskPin = req.headers.get('x-kiosk-pin');
  if (kioskPin) {
    return { class: 'kiosk-pin', substituteAuth: false, identityKey: kioskPin };
  }
  const cookieToken = req.cookies.get(COOKIE_NAME)?.value;
  if (cookieToken) {
    return { class: 'admin-cookie', substituteAuth: true, identityKey: cookieToken.slice(0, 16) };
  }
  return { class: 'public', substituteAuth: false, identityKey: req.headers.get('x-forwarded-for') || 'anon' };
}

function buildOutboundHeaders(
  req: NextRequest,
  requestId: string,
  caller: CallerInfo
): Headers {
  const out = new Headers();
  req.headers.forEach((value, key) => {
    if (!STRIP_HEADERS_REQ.has(key.toLowerCase())) {
      out.set(key, value);
    }
  });

  if (caller.substituteAuth) {
    const token = req.cookies.get(COOKIE_NAME)?.value;
    if (token) out.set('Authorization', `Bearer ${token}`);
  }

  const xff = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  if (xff) {
    out.set('X-Forwarded-For', xff);
  } else if (realIp) {
    out.set('X-Forwarded-For', realIp);
  }
  out.set('X-Forwarded-Host', req.nextUrl.host);
  if (!req.headers.get('x-request-id')) {
    out.set('X-Request-Id', requestId);
  }

  return out;
}

function shouldLog(method: string, status: number): boolean {
  if (status >= 400) return true;
  if (method !== 'GET' && method !== 'HEAD') return true;
  return Math.random() < SAMPLE_GET_RATE;
}

interface LogEntry {
  ts: string;
  component: string;
  request_id: string;
  method: string;
  path: string;
  caller: CallerClass;
  status: number;
  latency_ms: number;
  upstream_status: string;
  use_cloud: boolean;
}

function logRequest(entry: Omit<LogEntry, 'ts' | 'component'>): void {
  console.log(
    JSON.stringify({
      ts: new Date().toISOString(),
      component: 'admin-gateway',
      ...entry,
    })
  );
}

async function proxy(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
): Promise<NextResponse> {
  const t0 = Date.now();
  const requestId = req.headers.get('x-request-id') || randomUUID();

  const rcUrl = process.env.RC_URL;
  const rcCloudUrl = process.env.RC_CLOUD_URL;
  if (!rcUrl) {
    return NextResponse.json(
      {
        error: 'admin backend misconfigured',
        error_code: 'RC_URL_MISSING',
        request_id: requestId,
        hint: 'set RC_URL in .env.production.local or pm2/bat env',
      },
      { status: 503, headers: { 'X-Request-Id': requestId } }
    );
  }

  const { path } = await params;
  const caller = classifyCaller(req);

  // Defense in depth: if classified as admin-cookie, cookie must actually be present
  if (caller.class === 'admin-cookie' && !req.cookies.get(COOKIE_NAME)?.value) {
    return NextResponse.json(
      { error: 'unauthorized', error_code: 'NO_TOKEN', request_id: requestId },
      { status: 401, headers: { 'X-Request-Id': requestId } }
    );
  }

  // A5 stub: rate-limit gate (disabled unless env-toggled)
  const rl = checkRateLimit(caller.identityKey, caller.class);
  if (!rl.allowed) {
    return NextResponse.json(
      {
        error: 'rate limit exceeded',
        error_code: 'RATE_LIMITED',
        request_id: requestId,
        retry_after_seconds: rl.retryAfterSeconds,
      },
      {
        status: 429,
        headers: {
          'X-Request-Id': requestId,
          'Retry-After': String(rl.retryAfterSeconds || 1),
        },
      }
    );
  }

  const useCloud = Boolean(rcCloudUrl) && isCloudAuthoritativeWrite(req.method, path);
  const baseUrl = useCloud ? (rcCloudUrl as string) : rcUrl;

  const rcPath = `/api/v1/${path.join('/')}`;
  const url = `${baseUrl}${rcPath}${req.nextUrl.search}`;

  const headers = buildOutboundHeaders(req, requestId, caller);

  let body: ArrayBuffer | undefined;
  if (req.method !== 'GET' && req.method !== 'HEAD' && req.method !== 'OPTIONS') {
    body = await req.arrayBuffer();
  }

  let res: Response;
  try {
    res = await fetch(url, {
      method: req.method,
      headers,
      body,
      cache: 'no-store',
    });
  } catch (err) {
    const latencyMs = Date.now() - t0;
    recordRequest(req.method, 502, caller.class, latencyMs);
    logRequest({
      request_id: requestId,
      method: req.method,
      path: rcPath,
      caller: caller.class,
      status: 502,
      latency_ms: latencyMs,
      upstream_status: 'unreachable',
      use_cloud: useCloud,
    });
    return NextResponse.json(
      {
        error: 'racecontrol unreachable',
        error_code: 'RC_UNREACHABLE',
        request_id: requestId,
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 502, headers: { 'X-Request-Id': requestId } }
    );
  }

  // Build response — passthrough headers, preserve body bytes
  const outHeaders = new Headers();
  res.headers.forEach((value, key) => {
    const lk = key.toLowerCase();
    if (STRIP_HEADERS_RES.has(lk)) return;
    if (lk === 'set-cookie' && caller.class !== 'admin-cookie') return;
    outHeaders.set(key, value);
  });
  outHeaders.set('X-Request-Id', requestId);

  const responseBody = await res.arrayBuffer();
  const latencyMs = Date.now() - t0;

  recordRequest(req.method, res.status, caller.class, latencyMs);
  if (shouldLog(req.method, res.status)) {
    logRequest({
      request_id: requestId,
      method: req.method,
      path: rcPath,
      caller: caller.class,
      status: res.status,
      latency_ms: latencyMs,
      upstream_status: String(res.status),
      use_cloud: useCloud,
    });
  }

  return new NextResponse(responseBody, {
    status: res.status,
    headers: outHeaders,
  });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const HEAD = proxy;
export const OPTIONS = proxy;
