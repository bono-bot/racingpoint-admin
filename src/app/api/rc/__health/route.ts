import { NextResponse } from 'next/server';
import { getHealthSnapshot } from '@/lib/admin-gateway-state';

/**
 * Admin gateway health endpoint — GATEWAY-CONTRACT.md §8.
 *
 * Returns proxy self-state + upstream RC reachability + last-success timestamp.
 * Consumed by reliability probe (see plan_admin_panel_spinal_cord_gap_20260422.md
 * P1-5).
 *
 * Routed at /api/rc/__health — note the double underscore avoids collision with
 * any backend route that might be named "health" (the catch-all [...path] route
 * does not match this since exact paths take precedence in Next.js).
 */

export async function GET() {
  const rcUrl = process.env.RC_URL;
  if (!rcUrl) {
    return NextResponse.json(
      {
        healthy: false,
        proxy: 'admin-gateway',
        error: 'RC_URL not configured',
      },
      { status: 503 }
    );
  }

  let upstreamReachable = false;
  let upstreamLatencyMs: number | null = null;
  let upstreamStatus: number | null = null;
  let probeError: string | null = null;

  try {
    const t0 = Date.now();
    const res = await fetch(`${rcUrl}/api/v1/health`, {
      method: 'GET',
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    });
    upstreamLatencyMs = Date.now() - t0;
    upstreamStatus = res.status;
    upstreamReachable = res.ok;
  } catch (err) {
    upstreamReachable = false;
    probeError = err instanceof Error ? err.message : String(err);
  }

  const snapshot = getHealthSnapshot();
  const healthy = upstreamReachable;

  return NextResponse.json(
    {
      healthy,
      proxy: 'admin-gateway',
      upstream_url: rcUrl,
      upstream_reachable: upstreamReachable,
      upstream_status: upstreamStatus,
      upstream_latency_ms: upstreamLatencyMs,
      probe_error: probeError,
      ...snapshot,
    },
    { status: healthy ? 200 : 503 }
  );
}

export async function HEAD() {
  // Same logic as GET but no body — useful for cheap liveness probes.
  const rcUrl = process.env.RC_URL;
  if (!rcUrl) {
    return new NextResponse(null, { status: 503 });
  }
  try {
    const res = await fetch(`${rcUrl}/api/v1/health`, {
      method: 'GET',
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    });
    return new NextResponse(null, { status: res.ok ? 200 : 503 });
  } catch {
    return new NextResponse(null, { status: 503 });
  }
}
