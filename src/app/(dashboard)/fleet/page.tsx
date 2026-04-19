'use client';

import useSWR from 'swr';
import { useState, useRef, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { fleetApi } from '@/lib/api/fleet';
import { useAuth } from '@/hooks/useAuth';
import ConfirmDialog from '@/components/ConfirmDialog';
import { podLabel } from '@/lib/utils';
import type { PodFleetStatus, FleetHealthResponse, ActivityEntry, DeployStatus, ExecResult } from '@/lib/api/fleet';

function formatUptime(secs: number | null | undefined): string {
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

function StateBadge({ active, label, activeColor, inactiveColor }: {
  active: boolean; label: string; activeColor: string; inactiveColor?: string;
}) {
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
      active ? activeColor : (inactiveColor || 'bg-neutral-800/50 text-neutral-600')
    }`}>
      {label}
    </span>
  );
}

function PodCard({
  pod,
  onAction,
  isAdmin,
}: {
  pod: PodFleetStatus;
  onAction: (label: string, fn: () => Promise<void>, needsConfirm: boolean) => void;
  isAdmin: boolean;
}) {
  const status = podStatus(pod);
  const disabled = !pod.pod_id;
  const isMaintenance = !!pod.in_maintenance;
  const isFreedom = !!pod.freedom_mode;
  const isScreenBlanked = !!pod.screen_blanked;
  const gameState = pod.game_state;
  const isGameRunning = gameState === 'running' || gameState === 'loading';
  const isOnline = pod.ws_connected && pod.http_reachable;

  return (
    <div className={`bg-rp-card border rounded-lg p-4 ${
      isMaintenance ? 'border-yellow-500/50' :
      isFreedom ? 'border-blue-500/50' :
      isGameRunning ? 'border-purple-500/50' :
      'border-rp-border'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <span className="font-semibold">{podLabel(pod)}</span>
        <span className={`w-3 h-3 rounded-full inline-block ${status.color}`} />
      </div>
      <p className={`text-sm font-medium mb-2 ${status.textColor}`}>{status.label}</p>

      {/* State badges — at-a-glance view of what's ON */}
      <div className="flex flex-wrap gap-1 mb-3">
        <StateBadge active={isOnline} label={isOnline ? 'CONNECTED' : 'OFFLINE'}
          activeColor="bg-emerald-900/40 text-emerald-400" inactiveColor="bg-red-900/40 text-red-400" />
        <StateBadge active={isMaintenance} label="MAINTENANCE"
          activeColor="bg-yellow-900/40 text-yellow-400" />
        <StateBadge active={isFreedom} label="FREEDOM"
          activeColor="bg-blue-900/40 text-blue-400" />
        <StateBadge active={isGameRunning} label={gameState?.toUpperCase() || 'NO GAME'}
          activeColor="bg-purple-900/40 text-purple-400" />
        <StateBadge active={isScreenBlanked} label="BLANKED"
          activeColor="bg-neutral-700 text-neutral-300" />
      </div>

      {/* Info */}
      <div className="space-y-1 text-sm text-neutral-400">
        <p>Build: {pod.build_id ? pod.build_id.slice(0, 7) : '-'} | Up: {formatUptime(pod.uptime_secs)}</p>
        <p>
          WS:{' '}
          <span className={pod.ws_connected ? 'text-emerald-400' : 'text-red-400'}>
            {pod.ws_connected ? '\u2713' : '\u2717'}
          </span>{' '}
          HTTP:{' '}
          <span className={pod.http_reachable ? 'text-emerald-400' : 'text-red-400'}>
            {pod.http_reachable ? '\u2713' : '\u2717'}
          </span>
        </p>
      </div>

      {/* Action buttons with state indicators */}
      <div className="mt-3 pt-3 border-t border-rp-border space-y-2">
        {/* Row 1: Power controls */}
        <div className="flex gap-1.5">
          <button disabled={disabled}
            onClick={() => onAction('Wake Pod ' + pod.pod_number, () => fleetApi.wakePod(pod.pod_id!), false)}
            className="text-xs px-2 py-1 rounded text-emerald-400 hover:bg-emerald-400/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
            Wake
          </button>
          <button disabled={disabled}
            onClick={() => onAction('Shutdown Pod ' + pod.pod_number, () => fleetApi.shutdownPod(pod.pod_id!), true)}
            className="text-xs px-2 py-1 rounded text-red-400 hover:bg-red-400/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
            Shutdown
          </button>
          <button disabled={disabled}
            onClick={() => onAction('Restart Pod ' + pod.pod_number, () => fleetApi.restartPod(pod.pod_id!), true)}
            className="text-xs px-2 py-1 rounded text-yellow-400 hover:bg-yellow-400/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
            Restart
          </button>
        </div>

        {/* Row 2: Lockdown + Enable/Disable — with state coloring */}
        <div className="flex gap-1.5">
          <button disabled={disabled}
            onClick={() => isMaintenance
              ? onAction('Unlock Pod ' + pod.pod_number, () => fleetApi.unlockPod(pod.pod_id!), false)
              : onAction('Lockdown Pod ' + pod.pod_number, () => fleetApi.lockdownPod(pod.pod_id!), true)}
            className={`text-xs px-2 py-1 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
              isMaintenance
                ? 'bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30 ring-1 ring-yellow-500/50'
                : 'text-red-400 hover:bg-red-400/10'
            }`}>
            {isMaintenance ? 'Unlock' : 'Lockdown'}
          </button>
          <button disabled={disabled}
            onClick={() => onAction('Enable Pod ' + pod.pod_number, () => fleetApi.enablePod(pod.pod_id!), false)}
            className="text-xs px-2 py-1 rounded text-emerald-400 hover:bg-emerald-400/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
            Enable
          </button>
          <button disabled={disabled}
            onClick={() => onAction('Disable Pod ' + pod.pod_number, () => fleetApi.disablePod(pod.pod_id!), false)}
            className="text-xs px-2 py-1 rounded text-red-400 hover:bg-red-400/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
            Disable
          </button>
        </div>

        {/* Row 3: Maintenance toggle + Freedom — filled when active */}
        <div className="flex gap-1.5">
          <button disabled={disabled}
            onClick={() => isMaintenance
              ? onAction('Clear Maintenance Pod ' + pod.pod_number, () => fleetApi.clearMaintenance(pod.pod_id!), false)
              : onAction('Set Maintenance Pod ' + pod.pod_number, () => fleetApi.lockdownPod(pod.pod_id!), false)}
            className={`text-xs px-2 py-1 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
              isMaintenance
                ? 'bg-yellow-500/30 text-yellow-300 ring-1 ring-yellow-500/50 hover:bg-yellow-500/40'
                : 'text-yellow-400 hover:bg-yellow-400/10'
            }`}>
            {isMaintenance ? 'Clear Maint.' : 'Maintenance'}
          </button>
          <button disabled={disabled}
            onClick={() => onAction('Freedom Mode Pod ' + pod.pod_number, () => fleetApi.freedomMode(pod.pod_id!), false)}
            className={`text-xs px-2 py-1 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
              isFreedom
                ? 'bg-blue-500/30 text-blue-300 ring-1 ring-blue-500/50 hover:bg-blue-500/40'
                : 'text-blue-400 hover:bg-blue-400/10'
            }`}>
            {isFreedom ? 'Freedom ON' : 'Freedom'}
          </button>
        </div>
      </div>

      {/* Remote Exec (admin-only) */}
      {isAdmin && pod.pod_id && <RemoteExecSection podId={pod.pod_id} />}
    </div>
  );
}

function BulkActionBar({ onAction }: { onAction: (label: string, fn: () => Promise<void>, needsConfirm: boolean) => void }) {
  return (
    <div className="flex items-center gap-3 mb-6 pb-4 border-b border-rp-border">
      <span className="text-sm font-medium text-neutral-400">Fleet Actions</span>
      <button
        onClick={() => onAction('Wake All Pods', () => fleetApi.wakeAll(), false)}
        className="text-sm px-3 py-1.5 rounded bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 transition-colors"
      >
        Wake All
      </button>
      <button
        onClick={() => onAction('Shutdown All Pods', () => fleetApi.shutdownAll(), true)}
        className="text-sm px-3 py-1.5 rounded bg-red-600/20 text-red-400 hover:bg-red-600/30 transition-colors"
      >
        Shutdown All
      </button>
      <button
        onClick={() => onAction('Restart All Pods', () => fleetApi.restartAll(), true)}
        className="text-sm px-3 py-1.5 rounded bg-yellow-600/20 text-yellow-400 hover:bg-yellow-600/30 transition-colors"
      >
        Restart All
      </button>
      <button
        onClick={() => onAction('Lockdown All Pods', () => fleetApi.lockdownAll(), true)}
        className="text-sm px-3 py-1.5 rounded bg-red-600/20 text-red-400 hover:bg-red-600/30 transition-colors"
      >
        Lockdown All
      </button>
    </div>
  );
}

const DEPLOY_POD_STYLES: Record<string, string> = {
  pending: 'bg-neutral-700 text-neutral-300',
  deploying: 'bg-blue-900/40 text-blue-400 animate-pulse',
  success: 'bg-emerald-900/40 text-emerald-400',
  failed: 'bg-red-900/40 text-red-400',
};

function DeploySection() {
  const [deploying, setDeploying] = useState(false);
  const [deployState, setDeployState] = useState<DeployStatus | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  async function startDeploy() {
    try {
      setDeploying(true);
      await fleetApi.rollingDeploy();
      // Start polling deploy status
      pollRef.current = setInterval(async () => {
        try {
          const status = await fleetApi.deployStatus();
          setDeployState(status);
          const active = status.pods.some(p => p.status === 'pending' || p.status === 'deploying');
          if (!active) {
            stopPolling();
            setDeploying(false);
            const failed = status.pods.filter(p => p.status === 'failed').length;
            if (failed > 0) {
              toast.error(`Deploy completed with ${failed} failed pod(s)`);
            } else {
              toast.success('Rolling deploy completed successfully');
            }
          }
        } catch {
          stopPolling();
          setDeploying(false);
          toast.error('Failed to fetch deploy status');
        }
      }, 3000);
    } catch (e) {
      setDeploying(false);
      toast.error('Deploy failed: ' + (e as Error).message);
    }
  }

  return (
    <div className="flex flex-col gap-3 mb-6 pb-4 border-b border-rp-border">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-neutral-400">Deploy</span>
        <button
          disabled={deploying}
          onClick={startDeploy}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-1.5 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {deploying ? 'Deploying...' : 'Deploy'}
        </button>
      </div>
      {deployState && deployState.pods.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {deployState.pods.map(p => (
            <span
              key={p.pod_id}
              className={`text-xs px-2 py-1 rounded ${DEPLOY_POD_STYLES[p.status] || DEPLOY_POD_STYLES.pending}`}
            >
              {p.pod_number != null ? podLabel(p as unknown as { pod_number: number }) : p.pod_id}: {p.status}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function RemoteExecSection({ podId }: { podId: string }) {
  const [open, setOpen] = useState(false);
  const [command, setCommand] = useState('');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<ExecResult | null>(null);

  async function runCommand() {
    if (!command.trim()) return;
    setRunning(true);
    setResult(null);
    try {
      const res = await fleetApi.execOnPod(podId, command);
      setResult(res);
    } catch (e) {
      setResult({ stdout: '', stderr: (e as Error).message, exit_code: -1 });
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="mt-2 pt-2 border-t border-rp-border">
      <button
        onClick={() => setOpen(!open)}
        className="text-xs text-neutral-400 hover:text-white transition-colors"
      >
        {open ? '▾ Remote Exec' : '▸ Remote Exec'}
      </button>
      {open && (
        <div className="mt-2 space-y-2">
          <div className="flex gap-1.5">
            <input
              type="text"
              value={command}
              onChange={e => setCommand(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !running) runCommand(); }}
              placeholder="Enter command..."
              className="bg-rp-black border border-rp-border rounded text-sm px-2 py-1 w-full text-white placeholder:text-neutral-500"
            />
            <button
              disabled={running || !command.trim()}
              onClick={runCommand}
              className="bg-blue-600 text-white text-xs px-2 py-1 rounded whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {running ? 'Running...' : 'Run'}
            </button>
          </div>
          {result && (
            <div>
              {result.stdout && (
                <pre className="bg-rp-black text-emerald-400 text-xs p-2 rounded max-h-32 overflow-auto">
                  <code>{result.stdout}</code>
                </pre>
              )}
              {result.stderr && (
                <pre className="bg-rp-black text-red-400 text-xs p-2 rounded max-h-32 overflow-auto mt-1">
                  <code>{result.stderr}</code>
                </pre>
              )}
              <p className="text-xs text-neutral-500 mt-1">Exit code: {result.exit_code}</p>
            </div>
          )}
        </div>
      )}
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
  const { isAdmin } = useAuth();
  const [podFilter, setPodFilter] = useState('');
  const [limit, setLimit] = useState(100);
  const [confirm, setConfirm] = useState<{ title: string; message: string; action: () => Promise<void> } | null>(null);

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

  async function execAction(label: string, fn: () => Promise<void>) {
    try {
      await fn();
      toast.success(label + ' completed');
      mutate();
    } catch (e) {
      toast.error(label + ' failed: ' + (e as Error).message);
    }
  }

  function handleAction(label: string, fn: () => Promise<void>, needsConfirm: boolean) {
    if (needsConfirm) {
      setConfirm({
        title: label,
        message: `Are you sure you want to ${label.toLowerCase()}? This action cannot be undone.`,
        action: () => execAction(label, fn),
      });
    } else {
      execAction(label, fn);
    }
  }

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
            Last updated: {data.timestamp ? new Date(data.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '--'}
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

      {/* Bulk Action Bar */}
      <BulkActionBar onAction={handleAction} />

      {/* Deploy Section (admin-only) */}
      {isAdmin && <DeploySection />}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {!data && !error
          ? Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
          : data?.pods.map(pod => (
              <PodCard key={pod.pod_number} pod={pod} onAction={handleAction} isAdmin={isAdmin} />
            ))
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
              {podLabel(pod)}
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
                    <td className="px-4 py-2 text-sm text-white">{podLabel(entry)}</td>
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

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={!!confirm}
        title={confirm?.title ?? ''}
        message={confirm?.message ?? ''}
        confirmLabel="Confirm"
        danger
        onConfirm={async () => {
          if (confirm) {
            await confirm.action();
            setConfirm(null);
          }
        }}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
