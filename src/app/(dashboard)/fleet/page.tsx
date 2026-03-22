'use client';

import useSWR from 'swr';
import { fleetApi } from '@/lib/api/fleet';
import type { PodFleetStatus, FleetHealthResponse } from '@/lib/api/fleet';

function formatUptime(secs: number | null): string {
  if (secs === null || secs === undefined) return 'N/A';
  const days = Math.floor(secs / 86400);
  const hours = Math.floor((secs % 86400) / 3600);
  const mins = Math.floor((secs % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

function podStatus(pod: PodFleetStatus): { color: string; textColor: string; label: string } {
  if (pod.in_maintenance) {
    return { color: 'bg-yellow-400', textColor: 'text-yellow-400', label: 'Maintenance' };
  }
  if (pod.ws_connected && pod.http_reachable) {
    return { color: 'bg-emerald-400', textColor: 'text-emerald-400', label: 'Online' };
  }
  return { color: 'bg-red-400', textColor: 'text-red-400', label: 'Offline' };
}

function PodCard({ pod }: { pod: PodFleetStatus }) {
  const status = podStatus(pod);

  return (
    <div className="bg-rp-card border border-rp-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold">Pod {pod.pod_number}</span>
        <span className={`w-3 h-3 rounded-full inline-block ${status.color}`} />
      </div>
      <p className={`text-sm font-medium mb-3 ${status.textColor}`}>{status.label}</p>
      <div className="space-y-1 text-sm text-neutral-400">
        <p>Version: {pod.version ?? 'Unknown'}</p>
        <p>Uptime: {formatUptime(pod.uptime_secs)}</p>
        <p>Build: {pod.build_id ? pod.build_id.slice(0, 7) : '-'}</p>
        <p>
          Connection: WS:{' '}
          <span className={pod.ws_connected ? 'text-emerald-400' : 'text-red-400'}>
            {pod.ws_connected ? '\u2713' : '\u2717'}
          </span>{' '}
          HTTP:{' '}
          <span className={pod.http_reachable ? 'text-emerald-400' : 'text-red-400'}>
            {pod.http_reachable ? '\u2713' : '\u2717'}
          </span>
        </p>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-rp-card border border-rp-border rounded-lg p-4 animate-pulse">
      <div className="h-5 bg-neutral-700 rounded w-20 mb-2" />
      <div className="h-4 bg-neutral-700 rounded w-16 mb-3" />
      <div className="space-y-2">
        <div className="h-3 bg-neutral-700 rounded w-28" />
        <div className="h-3 bg-neutral-700 rounded w-24" />
        <div className="h-3 bg-neutral-700 rounded w-20" />
        <div className="h-3 bg-neutral-700 rounded w-32" />
      </div>
    </div>
  );
}

export default function FleetPage() {
  const { data, error, mutate } = useSWR<FleetHealthResponse>(
    '/fleet/health',
    () => fleetApi.getHealth(),
    { refreshInterval: 5000 }
  );

  const onlineCount = data?.pods.filter(p => p.ws_connected && p.http_reachable && !p.in_maintenance).length ?? 0;
  const totalPods = data?.pods.length ?? 8;

  const summaryColor =
    !data ? 'text-neutral-400' :
    onlineCount === totalPods ? 'text-emerald-400' :
    onlineCount === 0 ? 'text-red-400' :
    'text-yellow-400';

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Fleet Health</h1>
        {data && (
          <p className="text-sm text-neutral-400 mt-1">
            Last updated: {new Date(data.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
          </p>
        )}
        <p className={`text-sm font-medium mt-2 ${summaryColor}`}>
          {data ? `${onlineCount}/${totalPods} pods online` : 'Loading fleet status...'}
        </p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
          <p className="text-red-400 text-sm mb-2">Failed to load fleet health data.</p>
          <button
            onClick={() => mutate()}
            className="text-sm bg-red-500/20 hover:bg-red-500/30 text-red-300 px-3 py-1 rounded transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {!data && !error
          ? Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
          : data?.pods.map(pod => <PodCard key={pod.pod_number} pod={pod} />)
        }
      </div>
    </div>
  );
}
