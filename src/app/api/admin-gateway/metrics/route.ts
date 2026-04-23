import { NextResponse } from 'next/server';
import { renderPrometheusMetrics } from '@/lib/admin-gateway-state';

/**
 * Admin gateway metrics endpoint — GATEWAY-CONTRACT.md §8.
 *
 * Prometheus text exposition format (v0.0.4).
 * Routed at /api/rc/__metrics — exact paths take precedence over [...path]
 * catch-all in Next.js.
 *
 * v0 caveat: process-local in-memory state. Resets on PM2 restart. For multi-
 * instance scrape use prom-client with shared store.
 */

export async function GET() {
  const text = renderPrometheusMetrics();
  return new NextResponse(text, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
