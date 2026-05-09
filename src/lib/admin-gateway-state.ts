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

/**
 * MI symptom emission (doctrine v3 §6 + MI-INTEGRATION.md).
 *
 * Gateway is a nervous-system endpoint — errors become non-blocking POSTs
 * to `/api/v1/mesh/audit-seed-service`. Bucketed over 30s by problem_key
 * so a flood of 502s becomes ONE aggregate POST, not N.
 *
 * Opt-in via `ADMIN_GATEWAY_MI_EMIT=1`. Needs `RC_SERVICE_KEY` in env
 * (same key pods use for `/mesh/audit-seed-service`).
 *
 * Best-effort: emit failure is logged once per window at warn, never
 * cascades into the client response.
 */
interface MiSymptomBucket {
  count: number;
  first_seen: number;
  last_seen: number;
  sample: {
    endpoint: string;
    caller: CallerClass;
    upstream_status: number | null;
    request_id: string;
    upstream_url: string;
  };
  severity: 'P1' | 'P2' | 'P3';
}

const miBuckets = new Map<string, MiSymptomBucket>();
const MI_FLUSH_INTERVAL_MS = 30_000;
let miFlushTimer: NodeJS.Timeout | null = null;
let miKeyWarnedMissing = false;

function miEmitEnabled(): boolean {
  return process.env.ADMIN_GATEWAY_MI_EMIT === '1';
}

export function recordMiSymptom(args: {
  problem_key: string;
  severity: 'P1' | 'P2' | 'P3';
  endpoint: string;
  caller: CallerClass;
  upstream_status: number | null;
  request_id: string;
  upstream_url: string;
}): void {
  if (!miEmitEnabled()) return;
  const now = Date.now();
  const existing = miBuckets.get(args.problem_key);
  if (existing) {
    existing.count++;
    existing.last_seen = now;
  } else {
    miBuckets.set(args.problem_key, {
      count: 1,
      first_seen: now,
      last_seen: now,
      sample: {
        endpoint: args.endpoint,
        caller: args.caller,
        upstream_status: args.upstream_status,
        request_id: args.request_id,
        upstream_url: args.upstream_url,
      },
      severity: args.severity,
    });
  }
  ensureMiFlushTimer();
}

function ensureMiFlushTimer(): void {
  if (miFlushTimer) return;
  miFlushTimer = setInterval(() => {
    flushMiBuckets().catch((err) => {
      console.warn(
        JSON.stringify({
          ts: new Date().toISOString(),
          component: 'admin-gateway',
          event: 'mi_flush_error',
          error: err instanceof Error ? err.message : String(err),
        })
      );
    });
  }, MI_FLUSH_INTERVAL_MS);
  if (typeof miFlushTimer.unref === 'function') miFlushTimer.unref();
}

async function flushMiBuckets(): Promise<void> {
  if (miBuckets.size === 0) return;

  const rcUrl = process.env.RC_URL;
  const serviceKey = process.env.RC_SERVICE_KEY;
  if (!rcUrl || !serviceKey) {
    if (!miKeyWarnedMissing) {
      console.warn(
        JSON.stringify({
          ts: new Date().toISOString(),
          component: 'admin-gateway',
          event: 'mi_emit_disabled',
          reason: !rcUrl ? 'RC_URL missing' : 'RC_SERVICE_KEY missing',
        })
      );
      miKeyWarnedMissing = true;
    }
    miBuckets.clear();
    return;
  }

  const findings = Array.from(miBuckets.entries()).map(([problem_key, b]) => ({
    problem_key,
    severity: b.severity,
    symptom_patterns: [
      `upstream_status=${b.sample.upstream_status ?? 'unreachable'}`,
      `endpoint=${b.sample.endpoint}`,
      `caller=${b.sample.caller}`,
      `count=${b.count}`,
    ],
    source: 'admin-gateway',
    request_id: b.sample.request_id,
    endpoint: b.sample.endpoint,
    caller: b.sample.caller,
    upstream_status: b.sample.upstream_status,
    upstream_url: b.sample.upstream_url,
    first_seen: new Date(b.first_seen).toISOString(),
    fix_status: 'unknown',
    escalation_message: `Admin gateway: ${b.count} ${problem_key} event(s) in last ${Math.round(
      (b.last_seen - b.first_seen) / 1000
    )}s — sample endpoint ${b.sample.endpoint} caller=${b.sample.caller}`,
  }));

  miBuckets.clear();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${rcUrl}/api/v1/mesh/audit-seed-service`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Service-Key': serviceKey,
      },
      body: JSON.stringify({ findings }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) {
      console.warn(
        JSON.stringify({
          ts: new Date().toISOString(),
          component: 'admin-gateway',
          event: 'mi_emit_rejected',
          status: res.status,
          findings_count: findings.length,
        })
      );
    }
  } catch (err) {
    console.warn(
      JSON.stringify({
        ts: new Date().toISOString(),
        component: 'admin-gateway',
        event: 'mi_emit_error',
        error: err instanceof Error ? err.message : String(err),
        findings_count: findings.length,
      })
    );
  }
}
