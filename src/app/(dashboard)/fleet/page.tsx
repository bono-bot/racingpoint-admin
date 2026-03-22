'use client';

import useSWR from 'swr';
import { useState } from 'react';
import { fleetApi } from '@/lib/api/fleet';
import type { PodFleetStatus, FleetHealthResponse, ActivityEntry } from '@/lib/api/fleet';

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

const CATEGORY_STYLES: Record<string, string> = {
  billing: 'bg-blue-900/40 text-blue-400',
  game: 'bg-purple-900/40 text-purple-400',
  maintenance: 'bg-yellow-900/40 text-yellow-400',
  system: 'bg-neutral-800 text-neutral-400',
};

function categoryBadgeClass(category: string): string {
  return CATEGORY_STYLES[category] || 'bg-neutral-800 text-neutral-300';
}

function formatActivityTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const isToday =
    date.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' }) ===
    now.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });
  if (isToday) {
    return date.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false });
  }
  return date.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false });
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
  const [podFilter, setPodFilter] = useState('');
  const [limit, setLimit] = useState(100);

  const { data, error, mutate } = useSWR<FleetHealthResponse>(
    '/fleet/health',
    () => fleetApi.getHealth(),
    { refreshInterval: 5000 }
  );

  const { data: activity } = useSWR<ActivityEntry[]>(
    ['/fleet/activity', podFilter, limit],
    () => podFilter ? fleetApi.getPodActivity(podFilter, limit) : fleetApi.getActivity(limit),
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

      {/* Activity Log */}
      <div className="flex items-center justify-between mt-8 mb-4">
        <h2 className="text-xl font-semibold">Activity Log</h2>
        <select
          value={podFilter}
          onChange={e => { setPodFilter(e.target.value); setLimit(100); }}
          className="bg-rp-card border border-rp-border rounded-lg px-3 py-1.5 text-sm text-white"
        >
          <option value="">All Pods</option>
          {data?.pods.map(pod => (
            <option key={pod.pod_number} value={pod.pod_id ?? ''}>
              Pod {pod.pod_number}
            </option>
          ))}
        </select>
      </div>

      {activity === undefined ? (
        <p className="text-sm text-neutral-400 text-center py-8">Loading activity...</p>
      ) : activity.length === 0 ? (
        <p className="text-sm text-neutral-400 text-center py-8">No activity recorded</p>
      ) : (
        <>
          <div className="bg-rp-card border border-rp-border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-rp-border">
                  <th className="text-left text-xs uppercase text-rp-grey px-4 py-2">Time</th>
                  <th className="text-left text-xs uppercase text-rp-grey px-4 py-2">Pod</th>
                  <th className="text-left text-xs uppercase text-rp-grey px-4 py-2">Category</th>
                  <th className="text-left text-xs uppercase text-rp-grey px-4 py-2">Action</th>
                  <th className="text-left text-xs uppercase text-rp-grey px-4 py-2">Details</th>
                  <th className="text-left text-xs uppercase text-rp-grey px-4 py-2">Source</th>
                </tr>
              </thead>
              <tbody>
                {activity.map(entry => (
                  <tr key={entry.id} className="border-b border-rp-border/50 hover:bg-rp-black/30 transition-colors">
                    <td className="px-4 py-2 text-sm text-white whitespace-nowrap">
                      {formatActivityTime(entry.timestamp)}
                    </td>
                    <td className="px-4 py-2 text-sm text-white">Pod {entry.pod_number}</td>
                    <td className="px-4 py-2">
                      <span className={`text-xs px-2 py-0.5 rounded ${categoryBadgeClass(entry.category)}`}>
                        {entry.category}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-sm text-white">{entry.action}</td>
                    <td className="px-4 py-2 text-sm text-neutral-400 max-w-xs truncate" title={entry.details}>
                      {entry.details}
                    </td>
                    <td className="px-4 py-2 text-xs text-rp-grey">{entry.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {activity.length === limit && (
            <button
              onClick={() => setLimit(prev => prev + 100)}
              className="w-full py-2 text-sm text-rp-grey hover:text-white bg-rp-card border border-rp-border rounded-lg mt-2"
            >
              Load more
            </button>
          )}
        </>
      )}
    </div>
  );
}
