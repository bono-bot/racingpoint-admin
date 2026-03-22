'use client';

import useSWR from 'swr';
import { useState, useEffect, useRef } from 'react';
import { billingApi } from '@/lib/api/billing';
import type { ActiveSession } from '@/lib/api/billing';

function fmt(paise: number) {
  return `\u20B9${(paise / 100).toLocaleString('en-IN')}`;
}

function fmtElapsed(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function fmtCountdown(seconds: number) {
  if (seconds <= 0) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  if (h > 0) return `${h}:${pad(m)}:${pad(s)}`;
  return `${m}:${pad(s)}`;
}

function countdownColor(seconds: number) {
  if (seconds <= 300) return 'text-red-400 font-bold animate-pulse';
  if (seconds <= 1800) return 'text-yellow-400';
  return 'text-emerald-400';
}

function statusBadge(status: string) {
  const colors: Record<string, string> = {
    active: 'bg-green-900/40 text-green-400 border-green-800',
    completed: 'bg-blue-900/40 text-blue-400 border-blue-800',
    cancelled: 'bg-red-900/40 text-red-400 border-red-800',
    paused_manual: 'bg-yellow-900/40 text-yellow-400 border-yellow-800',
    expired: 'bg-zinc-800 text-zinc-400 border-zinc-700',
  };
  const c = colors[status] || 'bg-zinc-800 text-zinc-400 border-zinc-700';
  return (
    <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium border ${c}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

export default function BillingPage() {
  const { data, error, mutate } = useSWR<ActiveSession[]>(
    '/billing/active',
    () => billingApi.getActive(),
    { refreshInterval: 5000 }
  );

  const [countdowns, setCountdowns] = useState<Record<string, number>>({});
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Sync countdowns from server data
  useEffect(() => {
    if (data) {
      const next: Record<string, number> = {};
      for (const s of data) {
        next[s.id] = Math.max(0, s.remaining_seconds);
      }
      setCountdowns(next);
    }
  }, [data]);

  // Tick countdowns every second
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setCountdowns(prev => {
        const next: Record<string, number> = {};
        for (const [id, val] of Object.entries(prev)) {
          next[id] = Math.max(0, val - 1);
        }
        return next;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Active Sessions</h1>
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
          <p className="text-red-400 text-sm mb-2">Failed to load active sessions.</p>
          <button
            onClick={() => mutate()}
            className="text-sm bg-red-500/20 hover:bg-red-500/30 text-red-300 px-3 py-1 rounded transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Active Sessions</h1>
        <div className="text-center text-rp-grey py-12">Loading sessions...</div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Active Sessions</h1>
          <span className="bg-rp-card border border-rp-border text-sm px-2.5 py-0.5 rounded-full text-neutral-300 tabular-nums">
            {data.length}
          </span>
        </div>
        <button
          disabled
          className="bg-rp-red hover:bg-rp-red/80 text-white text-sm px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Start Session
        </button>
      </div>

      {data.length === 0 ? (
        <div className="bg-rp-card border border-rp-border rounded-xl p-12 text-center">
          <p className="text-rp-grey text-lg mb-4">No active sessions</p>
          <button
            disabled
            className="bg-rp-red hover:bg-rp-red/80 text-white text-sm px-6 py-2.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Start Session
          </button>
        </div>
      ) : (
        <div className="bg-rp-card border border-rp-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-rp-border text-rp-grey text-left">
                  <th className="px-4 py-2.5 font-medium">Pod</th>
                  <th className="px-4 py-2.5 font-medium">Customer</th>
                  <th className="px-4 py-2.5 font-medium">Rate</th>
                  <th className="px-4 py-2.5 font-medium">Time Remaining</th>
                  <th className="px-4 py-2.5 font-medium">Elapsed</th>
                  <th className="px-4 py-2.5 font-medium text-center">Status</th>
                  <th className="px-4 py-2.5 font-medium text-right">Price</th>
                  <th className="px-4 py-2.5 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.map((session) => {
                  const remaining = countdowns[session.id] ?? session.remaining_seconds;
                  return (
                    <tr key={session.id} className="border-b border-rp-border/50 last:border-0 hover:bg-white/[0.02]">
                      <td className="px-4 py-2.5 font-medium">Pod {session.pod_number}</td>
                      <td className="px-4 py-2.5">{session.driver_name}</td>
                      <td className="px-4 py-2.5">{session.pricing_tier_name}</td>
                      <td className={`px-4 py-2.5 tabular-nums ${countdownColor(remaining)}`}>
                        {fmtCountdown(remaining)}
                      </td>
                      <td className="px-4 py-2.5 tabular-nums text-neutral-400">{fmtElapsed(session.driving_seconds)}</td>
                      <td className="px-4 py-2.5 text-center">{statusBadge(session.status)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums font-medium">{fmt(session.price_paise)}</td>
                      <td className="px-4 py-2.5">{/* Actions added in Plan 02 */}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
