// Metrics API client — stub implementation
// TODO: Replace with real API calls when Phase 286 ships

export interface MetricPoint {
  ts: number;
  value: number;
}

export interface MetricsQueryResponse {
  points: MetricPoint[];
  resolution: string;
}

export interface MetricSnapshot {
  metric_name: string;
  pod_id: string;
  value: number;
  recorded_at: string;
}

export interface MetricsSnapshotResponse {
  metrics: MetricSnapshot[];
}

export type TimeRange = '1h' | '6h' | '24h' | '7d' | '30d';

const METRIC_NAMES = [
  'cpu_usage',
  'gpu_temp',
  'fps',
  'billing_revenue',
  'ws_connections',
  'pod_health_score',
  'game_session_count',
] as const;

const METRIC_BASE_VALUES: Record<string, number> = {
  cpu_usage: 45,
  gpu_temp: 62,
  fps: 58,
  billing_revenue: 1200,
  ws_connections: 6,
  pod_health_score: 92,
  game_session_count: 3,
};

const METRIC_AMPLITUDES: Record<string, number> = {
  cpu_usage: 20,
  gpu_temp: 8,
  fps: 5,
  billing_revenue: 400,
  ws_connections: 2,
  pod_health_score: 5,
  game_session_count: 2,
};

function timeRangeToMs(range: TimeRange): number {
  switch (range) {
    case '1h': return 60 * 60 * 1000;
    case '6h': return 6 * 60 * 60 * 1000;
    case '24h': return 24 * 60 * 60 * 1000;
    case '7d': return 7 * 24 * 60 * 60 * 1000;
    case '30d': return 30 * 24 * 60 * 60 * 1000;
  }
}

function getResolution(rangeMs: number): { resolution: string; intervalMs: number } {
  if (rangeMs <= 24 * 60 * 60 * 1000) {
    return { resolution: 'raw', intervalMs: 60 * 1000 };
  }
  if (rangeMs <= 7 * 24 * 60 * 60 * 1000) {
    return { resolution: 'hourly', intervalMs: 60 * 60 * 1000 };
  }
  return { resolution: 'daily', intervalMs: 24 * 60 * 60 * 1000 };
}

function generateValue(metric: string, ts: number, pod?: number): number {
  const base = METRIC_BASE_VALUES[metric] ?? 50;
  const amplitude = METRIC_AMPLITUDES[metric] ?? 10;
  const phase = pod ? pod * 0.5 : 0;
  // Deterministic sine wave — no Math.random() to avoid SWR flicker
  const value = base + amplitude * Math.sin(ts * 0.001 * 0.01 + phase);
  return Math.round(value * 100) / 100;
}

// TODO: Replace with real API call when Phase 286 ships
async function fetchMetricNames(): Promise<string[]> {
  return [...METRIC_NAMES];
}

// TODO: Replace with real API call when Phase 286 ships
async function fetchMetricsQuery(
  metric: string,
  from: number,
  to: number,
  pod?: number,
): Promise<MetricsQueryResponse> {
  const rangeMs = to - from;
  const { resolution, intervalMs } = getResolution(rangeMs);
  const points: MetricPoint[] = [];

  for (let ts = from; ts <= to; ts += intervalMs) {
    points.push({ ts, value: generateValue(metric, ts, pod) });
  }

  return { points, resolution };
}

// TODO: Replace with real API call when Phase 286 ships
async function fetchMetricsSnapshot(pod?: number): Promise<MetricsSnapshotResponse> {
  const now = new Date().toISOString();
  const metrics: MetricSnapshot[] = [];
  const pods = pod ? [pod] : [1, 2, 3, 4, 5, 6, 7, 8];

  for (const p of pods) {
    for (const name of METRIC_NAMES) {
      metrics.push({
        metric_name: name,
        pod_id: String(p),
        value: generateValue(name, Date.now(), p),
        recorded_at: now,
      });
    }
  }

  return { metrics };
}

export const metricsApi = {
  fetchMetricNames,
  fetchMetricsQuery,
  fetchMetricsSnapshot,
  timeRangeToMs,
};
