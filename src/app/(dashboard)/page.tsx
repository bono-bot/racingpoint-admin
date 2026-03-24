'use client';

import useSWR from 'swr';
import Link from 'next/link';
import { fleetApi } from '@/lib/api/fleet';
import { billingApi } from '@/lib/api/billing';
import { SkeletonCard } from '@/components/Skeleton';
import type { FleetHealthResponse, PodFleetStatus } from '@/lib/api/fleet';
import type { ActiveSession } from '@/lib/api/billing';

// --- Helpers ---

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatPaise(paise: number): string {
  return `\u20B9${(paise / 100).toLocaleString('en-IN')}`;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

// --- Pod status logic ---

interface PodStatusInfo {
  color: string;
  label: string;
}

function getPodStatus(pod: PodFleetStatus, activeSessions: ActiveSession[]): PodStatusInfo {
  if (!pod.ws_connected && !pod.http_reachable) {
    return { color: 'bg-neutral-600', label: 'Offline' };
  }
  if (pod.in_maintenance) {
    return { color: 'bg-yellow-400', label: 'Maintenance' };
  }
  const hasSession = activeSessions.some(
    (s) => s.pod_number === pod.pod_number && (s.status === 'active' || s.status === 'paused_manual' || s.status === 'paused_idle')
  );
  if (hasSession) {
    return { color: 'bg-blue-400', label: 'In Session' };
  }
  if (pod.ws_connected && pod.http_reachable) {
    return { color: 'bg-emerald-400', label: 'Idle' };
  }
  return { color: 'bg-red-400', label: 'Error' };
}

// --- Health type ---

interface HealthStatus {
  status: string;
  uptime?: number;
  version?: string;
}

// --- Component ---

export default function ControlRoomPage() {
  // Fleet health — 10s refresh
  const { data: fleetData, isLoading: fleetLoading } = useSWR<FleetHealthResponse>(
    'control-room-fleet',
    () => fleetApi.getHealth(),
    { refreshInterval: 10000 }
  );

  // Active sessions — 10s refresh
  const { data: sessions, isLoading: sessionsLoading } = useSWR<ActiveSession[]>(
    'control-room-sessions',
    () => billingApi.getActive(),
    { refreshInterval: 10000 }
  );

  // Admin app health — 30s refresh
  const { data: appHealth } = useSWR<HealthStatus>(
    'control-room-health',
    () => fetch('/api/health').then((r) => {
      if (!r.ok) throw new Error('Health check failed');
      return r.json() as Promise<HealthStatus>;
    }),
    { refreshInterval: 30000 }
  );

  const pods = fleetData?.pods ?? [];
  const activeSessions = sessions ?? [];
  const onlinePods = pods.filter((p) => p.ws_connected).length;
  const totalPods = pods.length || 8;
  const activeSessionCount = activeSessions.filter(
    (s) => s.status === 'active' || s.status === 'paused_manual' || s.status === 'paused_idle'
  ).length;

  // Revenue: sum of cost_paise from active sessions
  const todayRevenue = activeSessions.reduce((sum, s) => sum + (s.cost_paise ?? s.price_paise ?? 0), 0);

  // System health aggregate
  const rcOnline = pods.length > 0; // If fleet health returns pods, RC is online
  const adminHealthy = appHealth?.status === 'ok' || appHealth?.status === 'healthy';
  const healthScore = rcOnline && adminHealthy ? 'Healthy' : rcOnline || adminHealthy ? 'Degraded' : 'Down';
  const healthColor = healthScore === 'Healthy' ? 'text-emerald-400' : healthScore === 'Degraded' ? 'text-amber-400' : 'text-red-400';

  const isLoading = fleetLoading || sessionsLoading;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Control Room</h1>

      {/* Row 1: Key Metrics */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            label="Active Sessions"
            value={activeSessionCount}
            accent="text-rp-red"
            icon={<SessionIcon />}
          />
          <MetricCard
            label="Fleet Online"
            value={`${onlinePods}/${totalPods}`}
            accent="text-emerald-400"
            icon={<FleetIcon />}
          />
          <MetricCard
            label="Today's Revenue"
            value={formatPaise(todayRevenue)}
            accent="text-blue-400"
            icon={<RevenueIcon />}
          />
          <MetricCard
            label="System Health"
            value={healthScore}
            accent={healthColor}
            icon={<HealthIcon />}
          />
        </div>
      )}

      {/* Row 2: Fleet Overview + Active Sessions */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Fleet Overview — 60% */}
        <div className="lg:col-span-3 bg-rp-card border border-rp-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-rp-grey uppercase tracking-wider">Fleet Overview</h2>
            <Link href="/fleet" className="text-xs text-rp-red hover:text-rp-red/80 transition-colors">
              View Details &rarr;
            </Link>
          </div>
          {fleetLoading ? (
            <div className="grid grid-cols-4 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-16 bg-rp-border/30 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-3">
              {pods
                .sort((a, b) => a.pod_number - b.pod_number)
                .map((pod) => {
                  const st = getPodStatus(pod, activeSessions);
                  return (
                    <Link
                      key={pod.pod_number}
                      href="/fleet"
                      className="flex flex-col items-center justify-center p-3 bg-rp-black/50 hover:bg-rp-black rounded-lg transition-colors group"
                    >
                      <span className={`w-4 h-4 rounded-full ${st.color} mb-2 group-hover:scale-110 transition-transform`} />
                      <span className="text-sm font-medium text-neutral-300">Pod {pod.pod_number}</span>
                      <span className="text-[11px] text-rp-grey">{st.label}</span>
                    </Link>
                  );
                })}
            </div>
          )}
          {/* Legend */}
          <div className="flex gap-4 mt-4 text-[11px] text-rp-grey">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400" /> Idle</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-400" /> In Session</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-yellow-400" /> Maintenance</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-400" /> Error</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-neutral-600" /> Offline</span>
          </div>
        </div>

        {/* Active Sessions — 40% */}
        <div className="lg:col-span-2 bg-rp-card border border-rp-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-rp-grey uppercase tracking-wider">Active Sessions</h2>
            <Link href="/billing" className="text-xs text-rp-red hover:text-rp-red/80 transition-colors">
              View All &rarr;
            </Link>
          </div>
          {sessionsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-12 bg-rp-border/30 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : activeSessions.length === 0 ? (
            <p className="text-sm text-rp-grey py-8 text-center">No active sessions</p>
          ) : (
            <div className="space-y-2 max-h-[260px] overflow-y-auto">
              {activeSessions
                .filter((s) => s.status === 'active' || s.status === 'paused_manual' || s.status === 'paused_idle')
                .map((session) => (
                  <Link
                    key={session.id}
                    href="/billing"
                    className="flex items-center justify-between px-3 py-2.5 bg-rp-black/50 hover:bg-rp-black rounded-lg transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-medium text-rp-red bg-rp-red/10 px-2 py-0.5 rounded">
                        Pod {session.pod_number}
                      </span>
                      <div>
                        <p className="text-sm text-neutral-300">{session.driver_name || 'Guest'}</p>
                        <p className="text-[11px] text-rp-grey">{session.pricing_tier_name}</p>
                      </div>
                    </div>
                    <span className="text-xs text-rp-grey">
                      {session.elapsed_seconds != null ? formatElapsed(session.elapsed_seconds) : '--'}
                    </span>
                  </Link>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Row 3: Quick Actions + System Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <div className="bg-rp-card border border-rp-border rounded-xl p-6">
          <h2 className="text-sm font-semibold text-rp-grey uppercase tracking-wider mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-2">
            {QUICK_ACTIONS.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="flex items-center gap-3 px-4 py-3 bg-rp-black/50 hover:bg-rp-black rounded-lg transition-colors group"
              >
                <div className="w-8 h-8 rounded-lg bg-rp-card flex items-center justify-center group-hover:bg-rp-red/10 transition-colors">
                  {action.icon}
                </div>
                <span className="text-sm text-neutral-400 group-hover:text-white transition-colors">{action.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* System Status */}
        <div className="bg-rp-card border border-rp-border rounded-xl p-6">
          <h2 className="text-sm font-semibold text-rp-grey uppercase tracking-wider mb-4">System Status</h2>
          <div className="space-y-3">
            <StatusRow
              label="Admin Dashboard"
              status={appHealth ? (adminHealthy ? 'online' : 'degraded') : 'checking'}
            />
            <StatusRow
              label="RaceControl Core"
              status={rcOnline ? 'online' : fleetLoading ? 'checking' : 'offline'}
            />
            <StatusRow
              label="Fleet Health"
              status={
                fleetLoading
                  ? 'checking'
                  : onlinePods === totalPods
                    ? 'online'
                    : onlinePods > 0
                      ? 'degraded'
                      : 'offline'
              }
              detail={fleetLoading ? undefined : `${onlinePods}/${totalPods} pods`}
            />
            <StatusRow
              label="API Gateway"
              status={appHealth ? 'online' : 'checking'}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Sub-components ---

function MetricCard({
  label,
  value,
  accent,
  icon,
}: {
  label: string;
  value: string | number;
  accent: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-rp-card border border-rp-border rounded-xl p-6 hover:border-rp-border/80 transition-colors">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-rp-grey mb-2">{label}</p>
          <p className={`text-3xl font-bold ${accent}`}>
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
        </div>
        <div className="w-10 h-10 rounded-lg bg-rp-black flex items-center justify-center">
          {icon}
        </div>
      </div>
    </div>
  );
}

function StatusRow({
  label,
  status,
  detail,
}: {
  label: string;
  status: 'online' | 'degraded' | 'offline' | 'checking';
  detail?: string;
}) {
  const colorMap = {
    online: { text: 'text-emerald-400', dot: 'bg-emerald-400' },
    degraded: { text: 'text-amber-400', dot: 'bg-amber-400 animate-pulse' },
    offline: { text: 'text-red-400', dot: 'bg-red-400' },
    checking: { text: 'text-yellow-400', dot: 'bg-yellow-400 animate-pulse' },
  };
  const c = colorMap[status];

  return (
    <div className="flex justify-between items-center py-2 px-3 bg-rp-black/30 rounded-lg">
      <span className="text-sm text-neutral-400">{label}</span>
      <div className="flex items-center gap-2">
        {detail && <span className="text-xs text-rp-grey">{detail}</span>}
        <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${c.text}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
          {status}
        </span>
      </div>
    </div>
  );
}

// --- Quick Actions config ---

const QUICK_ACTIONS = [
  {
    href: '/billing',
    label: 'Start Session',
    icon: (
      <svg className="w-4 h-4 text-rp-grey group-hover:text-rp-red transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <circle cx="12" cy="12" r="10" /><path d="M10 8l6 4-6 4V8z" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    href: '/fleet',
    label: 'Fleet Management',
    icon: (
      <svg className="w-4 h-4 text-rp-grey group-hover:text-rp-red transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8M12 17v4" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: '/billing/history',
    label: 'Billing History',
    icon: (
      <svg className="w-4 h-4 text-rp-grey group-hover:text-rp-red transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: '/billing/reports',
    label: 'Revenue Reports',
    icon: (
      <svg className="w-4 h-4 text-rp-grey group-hover:text-rp-red transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: '/leaderboard',
    label: 'Leaderboard',
    icon: (
      <svg className="w-4 h-4 text-rp-grey group-hover:text-rp-red transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14 2 9.27l6.91-1.01L12 2z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: '/chat',
    label: 'AI Assistant',
    icon: (
      <svg className="w-4 h-4 text-rp-grey group-hover:text-rp-red transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

// --- Icons ---

function SessionIcon() {
  return (
    <svg className="w-5 h-5 text-rp-red" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" strokeLinecap="round" />
    </svg>
  );
}

function FleetIcon() {
  return (
    <svg className="w-5 h-5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8M12 17v4" strokeLinecap="round" />
    </svg>
  );
}

function RevenueIcon() {
  return (
    <svg className="w-5 h-5 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function HealthIcon() {
  return (
    <svg className="w-5 h-5 text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
