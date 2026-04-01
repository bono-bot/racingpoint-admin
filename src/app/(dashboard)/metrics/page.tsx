'use client';

import { useState } from 'react';
import useSWR from 'swr';
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { metricsApi } from '@/lib/api/metrics';
import type {
  TimeRange,
  MetricsQueryResponse,
  MetricsSnapshotResponse,
} from '@/lib/api/metrics';

const TIME_RANGES: TimeRange[] = ['1h', '6h', '24h', '7d', '30d'];

const METRIC_UNITS: Record<string, string> = {
  cpu_usage: '%',
  gpu_temp: '\u00B0C',
  fps: 'fps',
  billing_revenue: 'Rs',
  ws_connections: '',
  pod_health_score: '%',
  game_session_count: '',
};

function formatMetricName(name: string): string {
  return name
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour12: false,
  });
}

interface TooltipPayloadEntry {
  value: number;
  payload: { ts: number };
}

function ChartTooltip({
  active,
  payload,
  metric,
}: {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  metric: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const entry = payload[0];
  const unit = METRIC_UNITS[metric] ?? '';
  return (
    <div className="bg-[#222222] border border-[#333333] rounded px-2 py-1 text-xs text-white shadow-lg">
      <p>{formatTimestamp(entry.payload.ts)}</p>
      <p className="text-[#E10600] font-medium">
        {entry.value} {unit}
      </p>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-[#222222] border border-[#333333] rounded-lg p-4 animate-pulse">
      <div className="h-4 bg-neutral-700 rounded w-24 mb-3" />
      <div className="h-[120px] bg-neutral-700 rounded" />
    </div>
  );
}

function SnapshotSkeleton() {
  return (
    <div className="bg-[#222222] border border-[#333333] rounded-lg p-4 animate-pulse">
      <div className="h-3 bg-neutral-700 rounded w-16 mb-2" />
      <div className="h-6 bg-neutral-700 rounded w-12" />
    </div>
  );
}

function MetricChart({
  metric,
  timeRange,
  selectedPod,
}: {
  metric: string;
  timeRange: TimeRange;
  selectedPod: number | undefined;
}) {
  const now = Date.now();
  const from = now - metricsApi.timeRangeToMs(timeRange);

  const { data, error } = useSWR<MetricsQueryResponse>(
    ['metrics-query', metric, timeRange, selectedPod],
    () => metricsApi.fetchMetricsQuery(metric, from, now, selectedPod),
    { refreshInterval: 30000 },
  );

  if (error) {
    return (
      <div className="bg-[#222222] border border-[#333333] rounded-lg p-4">
        <p className="text-sm font-medium text-white mb-2">
          {formatMetricName(metric)}
        </p>
        <p className="text-xs text-red-400">Failed to load data</p>
      </div>
    );
  }

  if (!data) return <SkeletonCard />;

  return (
    <div className="bg-[#222222] border border-[#333333] rounded-lg p-4">
      <p className="text-sm font-medium text-white mb-2">
        {formatMetricName(metric)}
      </p>
      <ResponsiveContainer width="100%" height={120}>
        <AreaChart data={data.points}>
          <XAxis dataKey="ts" hide />
          <YAxis hide />
          <Tooltip
            content={({ active, payload }) => (
              <ChartTooltip
                active={active}
                payload={payload as TooltipPayloadEntry[] | undefined}
                metric={metric}
              />
            )}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="#E10600"
            fill="#E10600"
            fillOpacity={0.15}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function MetricsPage() {
  const [selectedPod, setSelectedPod] = useState<number | undefined>(undefined);
  const [timeRange, setTimeRange] = useState<TimeRange>('1h');

  const { data: metricNames } = useSWR<string[]>(
    'metrics-names',
    () => metricsApi.fetchMetricNames(),
  );

  const { data: snapshot } = useSWR<MetricsSnapshotResponse>(
    ['metrics-snapshot', selectedPod],
    () => metricsApi.fetchMetricsSnapshot(selectedPod),
    { refreshInterval: 30000 },
  );

  // Aggregate snapshot values: average across pods for each metric
  const snapshotByMetric: Record<string, number> = {};
  if (snapshot) {
    const counts: Record<string, number> = {};
    for (const m of snapshot.metrics) {
      snapshotByMetric[m.metric_name] =
        (snapshotByMetric[m.metric_name] ?? 0) + m.value;
      counts[m.metric_name] = (counts[m.metric_name] ?? 0) + 1;
    }
    for (const key of Object.keys(snapshotByMetric)) {
      snapshotByMetric[key] = Math.round(
        (snapshotByMetric[key] / (counts[key] ?? 1)) * 100,
      ) / 100;
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Metrics Dashboard</h1>

      {/* Headline Snapshot Numbers */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
        {metricNames
          ? metricNames.map((name) => {
              const val = snapshotByMetric[name];
              const unit = METRIC_UNITS[name] ?? '';
              return (
                <div
                  key={name}
                  className="bg-[#222222] border border-[#333333] rounded-lg p-4"
                >
                  <p className="text-xs text-neutral-400 mb-1">
                    {formatMetricName(name)}
                  </p>
                  <p className="text-xl font-bold text-[#E10600]">
                    {val !== undefined ? val : '--'}{' '}
                    <span className="text-xs text-neutral-400 font-normal">
                      {unit}
                    </span>
                  </p>
                </div>
              );
            })
          : Array.from({ length: 7 }).map((_, i) => (
              <SnapshotSkeleton key={i} />
            ))}
      </div>

      {/* Controls Row */}
      <div className="flex items-center gap-4 mb-6">
        {/* Pod Selector */}
        <select
          value={selectedPod ?? ''}
          onChange={(e) =>
            setSelectedPod(e.target.value ? Number(e.target.value) : undefined)
          }
          className="bg-[#222222] border border-[#333333] text-white rounded-lg px-3 py-1.5 text-sm"
        >
          <option value="">All Pods</option>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((p) => (
            <option key={p} value={p}>
              Pod {p}
            </option>
          ))}
        </select>

        {/* Time Range Picker */}
        <div className="flex gap-1">
          {TIME_RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setTimeRange(r)}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                timeRange === r
                  ? 'bg-[#E10600] text-white'
                  : 'bg-[#222222] border border-[#333333] text-gray-400 hover:text-white'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {metricNames
          ? metricNames.map((metric) => (
              <MetricChart
                key={metric}
                metric={metric}
                timeRange={timeRange}
                selectedPod={selectedPod}
              />
            ))
          : Array.from({ length: 7 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    </div>
  );
}
