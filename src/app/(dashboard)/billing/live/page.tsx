'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { billingApi } from '@/lib/api/billing';
import { fleetApi } from '@/lib/api/fleet';
import type { ActiveSession } from '@/lib/api/billing';
import type { PodFleetStatus } from '@/lib/api/fleet';

/* ---------- Helpers ---------- */

function fmt(paise: number) {
  return `\u20B9${(paise / 100).toLocaleString('en-IN')}`;
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

function todayIST(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

type PodStatus = 'idle' | 'active' | 'connecting' | 'offline';

interface PodInfo {
  podNumber: number;
  podId: string | null;
  status: PodStatus;
  customerName: string | null;
  remainingSeconds: number;
  pricePaise: number;
  wsConnected: boolean;
  httpReachable: boolean;
}

interface TodaySummary {
  totalRevenuePaise: number;
  activeCount: number;
  completedCount: number;
}

/* ---------- Components ---------- */

function StatusBadge({ status }: { status: PodStatus }) {
  const styles: Record<PodStatus, string> = {
    idle: 'bg-zinc-800 text-zinc-400 border-zinc-700',
    active: 'bg-green-900/40 text-green-400 border-green-800',
    connecting: 'bg-yellow-900/40 text-yellow-400 border-yellow-800',
    offline: 'bg-red-900/40 text-red-400 border-red-800',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium border ${styles[status]}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function PodCard({ pod }: { pod: PodInfo }) {
  const isLowTime = pod.status === 'active' && pod.remainingSeconds > 0 && pod.remainingSeconds <= 300;

  return (
    <div className={`bg-rp-card border rounded-xl p-4 transition-colors ${
      isLowTime
        ? 'border-yellow-500/70 shadow-[0_0_12px_rgba(234,179,8,0.15)]'
        : 'border-rp-border'
    }`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-lg font-bold">Pod {pod.podNumber}</span>
        <StatusBadge status={pod.status} />
      </div>

      <div className="space-y-2">
        <div className="text-sm">
          <span className="text-neutral-500">Customer</span>
          <p className={`font-medium ${pod.customerName ? 'text-white' : 'text-neutral-600'}`}>
            {pod.customerName || 'Idle'}
          </p>
        </div>

        {pod.status === 'active' && (
          <>
            <div className="text-sm">
              <span className="text-neutral-500">Time Remaining</span>
              <p className={`text-xl font-bold tabular-nums ${
                pod.remainingSeconds <= 300
                  ? 'text-red-400 animate-pulse'
                  : pod.remainingSeconds <= 1800
                    ? 'text-yellow-400'
                    : 'text-emerald-400'
              }`}>
                {fmtCountdown(pod.remainingSeconds)}
              </p>
            </div>
            <div className="text-sm">
              <span className="text-neutral-500">Price</span>
              <p className="text-white font-medium">{fmt(pod.pricePaise)}</p>
            </div>
          </>
        )}

        {pod.status === 'idle' && (
          <div className="text-sm text-neutral-600 pt-2">
            Ready for session
          </div>
        )}

        {pod.status === 'offline' && (
          <div className="text-sm text-red-400/70 pt-2">
            Pod unreachable
          </div>
        )}

        {pod.status === 'connecting' && (
          <div className="text-sm text-yellow-400/70 pt-2">
            Establishing connection...
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ label, value, subtext }: { label: string; value: string; subtext?: string }) {
  return (
    <div className="bg-rp-card border border-rp-border rounded-xl p-4">
      <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-2xl font-bold tabular-nums">{value}</p>
      {subtext && <p className="text-xs text-neutral-500 mt-1">{subtext}</p>}
    </div>
  );
}

/* ---------- Main Page ---------- */

export default function LiveOperationsPage() {
  const [pods, setPods] = useState<PodInfo[]>([]);
  const [summary, setSummary] = useState<TodaySummary>({ totalRevenuePaise: 0, activeCount: 0, completedCount: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [countdowns, setCountdowns] = useState<Record<number, number>>({});
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [activeSessions, healthData, todaySessions] = await Promise.all([
        billingApi.getActive(),
        fleetApi.getHealth(),
        billingApi.getHistory({ from: todayIST(), to: todayIST(), limit: 500, offset: 0 }),
      ]);

      // Build a map of pod_number -> active session
      const sessionByPod = new Map<number, ActiveSession>();
      for (const s of activeSessions) {
        sessionByPod.set(s.pod_number, s);
      }

      // Build pod info for all 8 pods
      const podInfos: PodInfo[] = [];
      const newCountdowns: Record<number, number> = {};

      for (let n = 1; n <= 8; n++) {
        const fleetPod = healthData.pods.find((p: PodFleetStatus) => p.pod_number === n);
        const session = sessionByPod.get(n);

        let status: PodStatus = 'idle';
        if (!fleetPod || (!fleetPod.ws_connected && !fleetPod.http_reachable)) {
          status = 'offline';
        } else if (fleetPod.ws_connected && !fleetPod.http_reachable) {
          status = 'connecting';
        } else if (!fleetPod.ws_connected && fleetPod.http_reachable) {
          status = 'connecting';
        } else if (session) {
          status = 'active';
        }

        if (session) {
          newCountdowns[n] = Math.max(0, session.remaining_seconds);
        }

        podInfos.push({
          podNumber: n,
          podId: fleetPod?.pod_id ?? null,
          status,
          customerName: session?.driver_name ?? null,
          remainingSeconds: session ? Math.max(0, session.remaining_seconds) : 0,
          pricePaise: session?.price_paise ?? 0,
          wsConnected: fleetPod?.ws_connected ?? false,
          httpReachable: fleetPod?.http_reachable ?? false,
        });
      }

      setCountdowns(newCountdowns);
      setPods(podInfos);

      // Calculate today summary
      const allToday = todaySessions.sessions;
      const completedToday = allToday.filter(s => s.status === 'completed' || s.status === 'ended_early');
      const totalRevenue = allToday.reduce((sum, s) => sum + s.price_paise, 0);

      setSummary({
        totalRevenuePaise: totalRevenue,
        activeCount: activeSessions.length,
        completedCount: completedToday.length,
      });

      setError(null);
      setLastRefresh(new Date());
    } catch (err) {
      setError((err as Error).message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch + 30-second auto-refresh
  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(fetchData, 30000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchData]);

  // Tick countdowns every second
  useEffect(() => {
    countdownRef.current = setInterval(() => {
      setCountdowns(prev => {
        const next: Record<number, number> = {};
        for (const [podNum, val] of Object.entries(prev)) {
          next[Number(podNum)] = Math.max(0, val - 1);
        }
        return next;
      });
    }, 1000);
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  // Merge countdown ticks into pod data for display
  const displayPods = pods.map(p => ({
    ...p,
    remainingSeconds: p.status === 'active' ? (countdowns[p.podNumber] ?? p.remainingSeconds) : 0,
  }));

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Live Operations</h1>
        <div className="text-center text-rp-grey py-12">Loading live data...</div>
      </div>
    );
  }

  if (error && pods.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Live Operations</h1>
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
          <p className="text-red-400 text-sm mb-2">Failed to load live data: {error}</p>
          <button
            onClick={() => { setLoading(true); fetchData(); }}
            className="text-sm bg-red-500/20 hover:bg-red-500/30 text-red-300 px-3 py-1 rounded transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Live Operations</h1>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="Auto-refreshing every 30s" />
        </div>
        {lastRefresh && (
          <span className="text-xs text-neutral-500">
            Last updated: {lastRefresh.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'Asia/Kolkata' })} IST
          </span>
        )}
      </div>

      {/* Error banner (non-blocking, shows stale data) */}
      {error && pods.length > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mb-4">
          <p className="text-yellow-400 text-sm">Refresh failed: {error}. Showing last known data.</p>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <SummaryCard
          label="Today's Revenue"
          value={fmt(summary.totalRevenuePaise)}
          subtext={`${todayIST()}`}
        />
        <SummaryCard
          label="Active Sessions"
          value={String(summary.activeCount)}
          subtext={`of 8 pods`}
        />
        <SummaryCard
          label="Completed Today"
          value={String(summary.completedCount)}
          subtext="sessions"
        />
      </div>

      {/* Pod Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {displayPods.map(pod => (
          <PodCard key={pod.podNumber} pod={pod} />
        ))}
      </div>
    </div>
  );
}
