'use client';

import useSWR from 'swr';
import { useState, useEffect, useRef, useCallback, Fragment } from 'react';
import { toast } from 'sonner';
import { billingApi } from '@/lib/api/billing';
import { fleetApi } from '@/lib/api/fleet';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useConnection } from '@/contexts/ConnectionContext';
import type { ActiveSession, SessionEvent, BillingRate } from '@/lib/api/billing';
import type { PodFleetStatus } from '@/lib/api/fleet';

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
    paused_disconnect: 'bg-yellow-900/40 text-yellow-400 border-yellow-800',
    ended_early: 'bg-amber-900/40 text-amber-400 border-amber-800',
    expired: 'bg-zinc-800 text-zinc-400 border-zinc-700',
  };
  const c = colors[status] || 'bg-zinc-800 text-zinc-400 border-zinc-700';
  return (
    <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium border ${c}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

function fmtTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'Asia/Kolkata' });
}

function eventDotColor(eventType: string) {
  switch (eventType) {
    case 'start': case 'resume': return 'bg-green-400';
    case 'pause': return 'bg-yellow-400';
    case 'extend': return 'bg-blue-400';
    case 'stop': return 'bg-red-400';
    default: return 'bg-zinc-400';
  }
}

/* ---------- Start Session Modal ---------- */

function StartSessionModal({ open, onClose, onSuccess }: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [pods, setPods] = useState<PodFleetStatus[]>([]);
  const [rates, setRates] = useState<BillingRate[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [podId, setPodId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [rateId, setRateId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoadingData(true);
    setPodId('');
    setCustomerName('');
    setRateId('');
    Promise.all([fleetApi.getHealth(), billingApi.getRates()])
      .then(([health, ratesData]) => {
        const available = health.pods.filter(p => p.ws_connected && p.http_reachable && !p.in_maintenance);
        setPods(available);
        setRates(ratesData.filter(r => r.active));
      })
      .catch(() => toast.error('Failed to load pods or rates'))
      .finally(() => setLoadingData(false));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!podId || !rateId) return;
    setSubmitting(true);
    try {
      await billingApi.startSession({ pod_id: podId, driver_id: customerName || undefined, rate_id: rateId });
      toast.success('Session started');
      onSuccess();
      onClose();
    } catch (err) {
      toast.error('Failed to start session: ' + (err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="bg-rp-card border border-rp-border rounded-xl p-6 w-full max-w-md shadow-2xl animate-scale-in"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="start-session-title"
      >
        <h3 id="start-session-title" className="text-lg font-semibold mb-4">Start Session</h3>
        {loadingData ? (
          <p className="text-sm text-neutral-400 py-8 text-center">Loading pods and rates...</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-neutral-400 mb-1">Pod *</label>
              <select
                value={podId}
                onChange={e => setPodId(e.target.value)}
                required
                className="w-full bg-rp-black border border-rp-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-rp-red"
              >
                <option value="">Select pod...</option>
                {pods.map(p => (
                  <option key={p.pod_id} value={p.pod_id!}>Pod {p.pod_number}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-neutral-400 mb-1">Customer</label>
              <input
                type="text"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                placeholder="Walk-in (optional)"
                className="w-full bg-rp-black border border-rp-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-rp-red"
              />
            </div>
            <div>
              <label className="block text-sm text-neutral-400 mb-1">Rate *</label>
              <select
                value={rateId}
                onChange={e => setRateId(e.target.value)}
                required
                className="w-full bg-rp-black border border-rp-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-rp-red"
              >
                <option value="">Select rate...</option>
                {rates.map(r => (
                  <option key={r.id} value={r.id}>{r.name} - {r.duration_minutes}min - {fmt(r.price_paise)}</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm text-neutral-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !podId || !rateId}
                className="bg-rp-red hover:bg-rp-red-light text-white text-sm px-4 py-2 rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                      <circle cx="12" cy="12" r="10" className="opacity-25" />
                      <path d="M4 12a8 8 0 018-8" className="opacity-75" />
                    </svg>
                    Starting...
                  </span>
                ) : 'Start Session'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

/* ---------- Main Billing Page ---------- */

export default function BillingPage() {
  const { status: connStatus } = useConnection();
  const isOffline = connStatus === 'offline';
  const { data, error, mutate } = useSWR<ActiveSession[]>(
    '/billing/active',
    () => billingApi.getActive(),
    { refreshInterval: 5000 }
  );

  const [countdowns, setCountdowns] = useState<Record<string, number>>({});
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [showStartModal, setShowStartModal] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<Record<string, string>>({});
  const [confirmStop, setConfirmStop] = useState<{ id: string; driverName: string; podNumber: number } | null>(null);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [sessionEvents, setSessionEvents] = useState<Record<string, SessionEvent[]>>({});

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

  const handleAction = useCallback(async (id: string, actionName: string, fn: () => Promise<void>) => {
    setActionInProgress(prev => ({ ...prev, [id]: actionName }));
    try {
      await fn();
      toast.success(`Session ${actionName}`);
      mutate();
    } catch (e) {
      toast.error(`Failed to ${actionName}: ${(e as Error).message}`);
    } finally {
      setActionInProgress(prev => {
        const n = { ...prev };
        delete n[id];
        return n;
      });
    }
  }, [mutate]);

  const toggleExpand = useCallback(async (id: string) => {
    if (expandedSession === id) {
      setExpandedSession(null);
      return;
    }
    setExpandedSession(id);
    if (!sessionEvents[id]) {
      try {
        const events = await billingApi.getSessionEvents(id);
        setSessionEvents(prev => ({ ...prev, [id]: events }));
      } catch {
        toast.error('Failed to load session events');
      }
    }
  }, [expandedSession, sessionEvents]);

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

  const colCount = 9; // expand + 7 data cols + actions

  return (
    <div>
      <StartSessionModal
        open={showStartModal}
        onClose={() => setShowStartModal(false)}
        onSuccess={() => mutate()}
      />

      <ConfirmDialog
        open={!!confirmStop}
        title="Stop Session"
        message={confirmStop ? `Stop billing for ${confirmStop.driverName} on Pod ${confirmStop.podNumber}? This will end the session.` : ''}
        variant="danger"
        confirmLabel="Stop Session"
        loading={confirmStop ? !!actionInProgress[confirmStop.id] : false}
        onConfirm={() => {
          if (confirmStop) {
            handleAction(confirmStop.id, 'stopped', () => billingApi.stopSession(confirmStop.id));
            setConfirmStop(null);
          }
        }}
        onCancel={() => setConfirmStop(null)}
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Active Sessions</h1>
          <span className="bg-rp-card border border-rp-border text-sm px-2.5 py-0.5 rounded-full text-neutral-300 tabular-nums">
            {data.length}
          </span>
        </div>
        <button
          onClick={() => setShowStartModal(true)}
          disabled={isOffline}
          title={isOffline ? 'Backend offline' : undefined}
          className="bg-rp-red hover:bg-rp-red-light text-white text-sm px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Start Session
        </button>
      </div>

      {data.length === 0 ? (
        <div className="bg-rp-card border border-rp-border rounded-xl p-12 text-center">
          <p className="text-rp-grey text-lg mb-4">No active sessions</p>
          <button
            onClick={() => setShowStartModal(true)}
            disabled={isOffline}
            title={isOffline ? 'Backend offline' : undefined}
            className="bg-rp-red hover:bg-rp-red-light text-white text-sm px-6 py-2.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                  <th className="px-2 py-2.5 w-8"></th>
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
                  const isExpanded = expandedSession === session.id;
                  const busy = !!actionInProgress[session.id];
                  const busyLabel = actionInProgress[session.id] || '';

                  return (
                    <Fragment key={session.id}>
                      <tr className="border-b border-rp-border/50 last:border-0 hover:bg-white/[0.02]">
                        {/* Expand toggle */}
                        <td className="px-2 py-2.5 text-center">
                          <button
                            onClick={() => toggleExpand(session.id)}
                            className="text-neutral-400 hover:text-white transition-transform"
                            aria-label={isExpanded ? 'Collapse events' : 'Expand events'}
                          >
                            <svg
                              className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <path d="M9 18l6-6-6-6" />
                            </svg>
                          </button>
                        </td>
                        <td className="px-4 py-2.5 font-medium">Pod {session.pod_number}</td>
                        <td className="px-4 py-2.5">{session.driver_name}</td>
                        <td className="px-4 py-2.5">{session.pricing_tier_name}</td>
                        <td className={`px-4 py-2.5 tabular-nums ${countdownColor(remaining)}`}>
                          {fmtCountdown(remaining)}
                        </td>
                        <td className="px-4 py-2.5 tabular-nums text-neutral-400">{fmtElapsed(session.driving_seconds)}</td>
                        <td className="px-4 py-2.5 text-center">{statusBadge(session.status)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums font-medium">{fmt(session.price_paise)}</td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-1">
                            {session.status === 'active' && (
                              <>
                                <button
                                  onClick={() => handleAction(session.id, 'paused', () => billingApi.pauseSession(session.id))}
                                  disabled={busy || isOffline}
                                  title={isOffline ? 'Backend offline' : undefined}
                                  className="text-xs px-2 py-1 rounded text-yellow-400 hover:bg-yellow-400/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                  {busyLabel === 'paused' ? 'Pausing...' : 'Pause'}
                                </button>
                                <select
                                  value=""
                                  onChange={e => {
                                    const mins = parseInt(e.target.value, 10);
                                    if (mins) handleAction(session.id, 'extended', () => billingApi.extendSession(session.id, mins));
                                  }}
                                  disabled={busy || isOffline}
                                  className="bg-rp-card border border-rp-border rounded text-xs px-1 py-0.5 text-white disabled:opacity-30 disabled:cursor-not-allowed focus:outline-none"
                                >
                                  <option value="">Extend...</option>
                                  <option value="15">+15 min</option>
                                  <option value="30">+30 min</option>
                                  <option value="60">+1 hour</option>
                                </select>
                              </>
                            )}
                            {(session.status === 'paused_manual' || session.status === 'paused_disconnect') && (
                              <button
                                onClick={() => handleAction(session.id, 'resumed', () => billingApi.resumeSession(session.id))}
                                disabled={busy || isOffline}
                                title={isOffline ? 'Backend offline' : undefined}
                                className="text-xs px-2 py-1 rounded text-green-400 hover:bg-green-400/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                              >
                                {busyLabel === 'resumed' ? 'Resuming...' : 'Resume'}
                              </button>
                            )}
                            {(session.status === 'active' || session.status === 'paused_manual' || session.status === 'paused_disconnect') && (
                              <button
                                onClick={() => setConfirmStop({ id: session.id, driverName: session.driver_name, podNumber: session.pod_number })}
                                disabled={busy || isOffline}
                                title={isOffline ? 'Backend offline' : undefined}
                                className="text-xs px-2 py-1 rounded text-red-400 hover:bg-red-400/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                              >
                                Stop
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {/* Expanded event timeline */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={colCount} className="px-0 py-0">
                            <div className="bg-rp-black/30 rounded-lg p-4 my-2 mx-4">
                              {!sessionEvents[session.id] ? (
                                <p className="text-sm text-neutral-400 text-center py-2">Loading events...</p>
                              ) : sessionEvents[session.id].length === 0 ? (
                                <p className="text-sm text-neutral-400 text-center py-2">No events recorded</p>
                              ) : (
                                <div className="relative pl-6">
                                  <div className="absolute left-[7px] top-2 bottom-2 w-px bg-rp-border" />
                                  {sessionEvents[session.id].map((evt, i) => (
                                    <div key={evt.id || i} className="relative flex items-start gap-3 mb-3 last:mb-0">
                                      <div className={`absolute left-[-20px] top-1.5 w-3 h-3 rounded-full ${eventDotColor(evt.event_type)} ring-2 ring-rp-black/50`} />
                                      <div>
                                        <div className="flex items-center gap-2">
                                          <span className="text-xs font-medium text-white">{evt.event_type}</span>
                                          <span className="text-xs text-neutral-500">{fmtTime(evt.timestamp)}</span>
                                          {evt.staff_name && (
                                            <span className="text-xs text-neutral-500">by {evt.staff_name}</span>
                                          )}
                                        </div>
                                        {evt.details && (
                                          <p className="text-xs text-neutral-400 mt-0.5">{evt.details}</p>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
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
