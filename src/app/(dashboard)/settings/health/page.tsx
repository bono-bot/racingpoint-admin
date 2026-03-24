'use client';

import useSWR from 'swr';

interface AppHealthEntry {
  app: string;
  status: string;
  pages_expected: number | null;
  pages_available: number | null;
  last_checked: string;
  response_ms: number;
  error: string | null;
}

interface DeployLogEntry {
  id: string;
  app: string;
  timestamp: string;
  deployer: string;
  result: string;
  pages_before: number | null;
  pages_after: number | null;
  pages_missing: string;
  duration_secs: number | null;
  error: string | null;
  build_hash: string | null;
}

function fetcher<T>(url: string): Promise<T> {
  return fetch(url).then(r => r.json() as Promise<T>);
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function statusColor(status: string): string {
  switch (status) {
    case 'ok': return 'bg-green-500/10 text-green-400';
    case 'degraded': return 'bg-yellow-500/10 text-yellow-400';
    case 'unreachable': return 'bg-red-500/10 text-red-400';
    default: return 'bg-neutral-500/10 text-neutral-400';
  }
}

function resultColor(result: string): string {
  switch (result) {
    case 'success': return 'bg-green-500/10 text-green-400';
    case 'failed': return 'bg-red-500/10 text-red-400';
    case 'rolled_back':
    case 'rollback': return 'bg-yellow-500/10 text-yellow-400';
    default: return 'bg-neutral-500/10 text-neutral-400';
  }
}

function appLabel(app: string): string {
  return app.charAt(0).toUpperCase() + app.slice(1);
}

function SkeletonCard() {
  return (
    <div className="bg-rp-card border border-rp-border rounded-xl p-5 animate-pulse">
      <div className="h-5 bg-rp-border rounded w-24 mb-4" />
      <div className="space-y-3">
        <div className="h-4 bg-rp-border rounded w-20" />
        <div className="h-4 bg-rp-border rounded w-32" />
        <div className="h-4 bg-rp-border rounded w-16" />
      </div>
    </div>
  );
}

export default function SystemHealthPage() {
  const { data: health, error: healthError } = useSWR<AppHealthEntry[]>(
    '/api/rc/app-health',
    fetcher,
    { refreshInterval: 10000, keepPreviousData: true }
  );

  const { data: deploys } = useSWR<DeployLogEntry[]>(
    '/api/rc/deploy-log',
    fetcher,
    { refreshInterval: 30000, keepPreviousData: true }
  );

  const isLoading = !health && !healthError;
  const recentDeploys = deploys?.slice(0, 20) ?? [];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">System Health</h1>
        <p className="text-sm text-rp-grey mt-1">Real-time health monitoring for all apps</p>
      </div>

      {/* Health Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {isLoading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : healthError ? (
          <div className="col-span-full bg-rp-card border border-rp-border rounded-xl p-5">
            <p className="text-sm text-red-400">Failed to load health data. Retrying...</p>
          </div>
        ) : health && health.length > 0 ? (
          health.map((entry) => (
            <div key={entry.app} className="bg-rp-card border border-rp-border rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">{appLabel(entry.app)}</h2>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${statusColor(entry.status)}`}>
                  {entry.status}
                </span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-neutral-400">Pages</span>
                  <span className="text-neutral-300">
                    {entry.pages_available ?? '?'}/{entry.pages_expected ?? '?'} pages
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Last checked</span>
                  <span className="text-neutral-300">
                    {entry.last_checked ? relativeTime(entry.last_checked) : 'Never'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Response time</span>
                  <span className="text-neutral-300">{entry.response_ms}ms</span>
                </div>
                {entry.error && (
                  <p className="text-red-400 text-xs mt-2 break-words">{entry.error}</p>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full bg-rp-card border border-rp-border rounded-xl p-5">
            <p className="text-sm text-rp-grey">No health data available</p>
          </div>
        )}
      </div>

      {/* Deploy Timeline */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Deploy History</h2>
        {recentDeploys.length === 0 ? (
          <div className="bg-rp-card border border-rp-border rounded-xl p-5">
            <p className="text-sm text-rp-grey">No deploy history</p>
          </div>
        ) : (
          <div className="bg-rp-card border border-rp-border rounded-xl divide-y divide-rp-border">
            {recentDeploys.map((deploy) => (
              <div key={deploy.id} className="flex items-center gap-3 px-5 py-3 text-sm">
                <span className="text-rp-grey text-xs w-20 shrink-0">
                  {deploy.timestamp ? relativeTime(deploy.timestamp) : ''}
                </span>
                <span className="bg-rp-border/50 text-neutral-300 text-xs px-2 py-0.5 rounded font-medium w-16 text-center shrink-0">
                  {appLabel(deploy.app)}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${resultColor(deploy.result)}`}>
                  {deploy.result}
                </span>
                <span className="text-neutral-400 text-xs">
                  {deploy.pages_before != null && deploy.pages_after != null
                    ? `${deploy.pages_before} -> ${deploy.pages_after} pages`
                    : ''}
                </span>
                {deploy.duration_secs != null && (
                  <span className="text-rp-grey text-xs">{deploy.duration_secs}s</span>
                )}
                <span className="text-rp-grey text-xs ml-auto">{deploy.deployer}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
