/**
 * Admin gateway proxy — in-memory state for /api/rc/__health and /api/rc/__metrics.
 *
 * v0 — process-local. State resets on PM2 restart. For real metrics use prom-client.
 *
 * GATEWAY-CONTRACT.md §8 (observability).
 */

export type CallerClass =
  | 'admin-cookie'
  | 'staff-jwt'
  | 'service-key'
  | 'terminal-secret'
  | 'kiosk-pin'
  | 'public';

interface RequestState {
  lastUpstreamSuccessAt: number | null;
  lastUpstreamFailureAt: number | null;
  lastUpstreamStatus: number | null;
  totalRequests: number;
  // key: `${method}:${status}:${caller}`
  requestCounts: Map<string, number>;
  // key: `${method}:${caller}`, values: latency in ms (bounded ring)
  latencyBuckets: Map<string, number[]>;
}

const state: RequestState = {
  lastUpstreamSuccessAt: null,
  lastUpstreamFailureAt: null,
  lastUpstreamStatus: null,
  totalRequests: 0,
  requestCounts: new Map(),
  latencyBuckets: new Map(),
};

const LATENCY_BUCKET_CAP = 1000;

export function recordRequest(
  method: string,
  status: number,
  caller: CallerClass,
  latencyMs: number
): void {
  state.totalRequests++;

  const counterKey = `${method}:${status}:${caller}`;
  state.requestCounts.set(counterKey, (state.requestCounts.get(counterKey) || 0) + 1);

  const latencyKey = `${method}:${caller}`;
  const bucket = state.latencyBuckets.get(latencyKey) || [];
  bucket.push(latencyMs);
  if (bucket.length > LATENCY_BUCKET_CAP) bucket.shift();
  state.latencyBuckets.set(latencyKey, bucket);

  if (status >= 500) {
    state.lastUpstreamFailureAt = Date.now();
  } else {
    state.lastUpstreamSuccessAt = Date.now();
  }
  state.lastUpstreamStatus = status;
}

export function getHealthSnapshot(): {
  last_upstream_success_at: string | null;
  last_upstream_failure_at: string | null;
  last_upstream_status: number | null;
  total_requests: number;
} {
  return {
    last_upstream_success_at: state.lastUpstreamSuccessAt
      ? new Date(state.lastUpstreamSuccessAt).toISOString()
      : null,
    last_upstream_failure_at: state.lastUpstreamFailureAt
      ? new Date(state.lastUpstreamFailureAt).toISOString()
      : null,
    last_upstream_status: state.lastUpstreamStatus,
    total_requests: state.totalRequests,
  };
}

function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor(sorted.length * q));
  return sorted[idx];
}

export function renderPrometheusMetrics(): string {
  const lines: string[] = [];

  lines.push('# HELP admin_gateway_requests_total Total proxied requests by method, status, caller');
  lines.push('# TYPE admin_gateway_requests_total counter');
  for (const [key, count] of state.requestCounts.entries()) {
    const parts = key.split(':');
    const method = parts[0];
    const status = parts[1];
    const caller = parts[2];
    lines.push(
      `admin_gateway_requests_total{method="${method}",status="${status}",caller="${caller}"} ${count}`
    );
  }

  lines.push('# HELP admin_gateway_request_duration_seconds Request latency by method and caller');
  lines.push('# TYPE admin_gateway_request_duration_seconds summary');
  for (const [key, bucket] of state.latencyBuckets.entries()) {
    if (bucket.length === 0) continue;
    const sorted = [...bucket].sort((a, b) => a - b);
    const parts = key.split(':');
    const method = parts[0];
    const caller = parts[1];
    const p50 = quantile(sorted, 0.5) / 1000;
    const p95 = quantile(sorted, 0.95) / 1000;
    const p99 = quantile(sorted, 0.99) / 1000;
    const sum = sorted.reduce((a, b) => a + b, 0) / 1000;
    lines.push(
      `admin_gateway_request_duration_seconds{method="${method}",caller="${caller}",quantile="0.5"} ${p50}`
    );
    lines.push(
      `admin_gateway_request_duration_seconds{method="${method}",caller="${caller}",quantile="0.95"} ${p95}`
    );
    lines.push(
      `admin_gateway_request_duration_seconds{method="${method}",caller="${caller}",quantile="0.99"} ${p99}`
    );
    lines.push(
      `admin_gateway_request_duration_seconds_sum{method="${method}",caller="${caller}"} ${sum}`
    );
    lines.push(
      `admin_gateway_request_duration_seconds_count{method="${method}",caller="${caller}"} ${bucket.length}`
    );
  }

  return lines.join('\n') + '\n';
}

/**
 * Rate-limit stub (A5 deferred — disabled by default).
 * Enable with ADMIN_GATEWAY_RATE_LIMIT=1 in env.
 * Limits per GATEWAY-CONTRACT.md §7.
 */
const RATE_LIMITS: Record<CallerClass, number> = {
  'admin-cookie': 100,
  'staff-jwt': 50,
  'service-key': 50,
  'terminal-secret': 30,
  'kiosk-pin': 20,
  'public': 5,
};

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

const rateLimitBuckets = new Map<string, RateLimitBucket>();

export function checkRateLimit(callerKey: string, callerClass: CallerClass): {
  allowed: boolean;
  retryAfterSeconds?: number;
} {
  if (process.env.ADMIN_GATEWAY_RATE_LIMIT !== '1') {
    return { allowed: true };
  }
  const limit = RATE_LIMITS[callerClass];
  const now = Date.now();
  const key = `${callerClass}:${callerKey}`;
  const bucket = rateLimitBuckets.get(key);
  if (!bucket || now >= bucket.resetAt) {
    rateLimitBuckets.set(key, { count: 1, resetAt: now + 1000 });
    return { allowed: true };
  }
  if (bucket.count >= limit) {
    return { allowed: false, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  bucket.count++;
  return { allowed: true };
}
