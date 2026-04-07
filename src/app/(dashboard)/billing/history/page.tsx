'use client';

import useSWR from 'swr';
import { useState, useEffect, useCallback, Fragment } from 'react';
import { toast } from 'sonner';
import { format, subDays } from 'date-fns';
import { billingApi } from '@/lib/api/billing';
import type { ActiveSession, SessionEvent, SplitBillingInfo } from '@/lib/api/billing';

/** Extends ActiveSession with currency_type from Phase 339 wallet separation */
interface SessionWithCurrency extends ActiveSession {
  currency_type?: 'rupee' | 'credit' | null;
}

/* ---------- Helpers ---------- */

function fmt(paise: number) {
  return `\u20B9${(paise / 100).toLocaleString('en-IN')}`;
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
    refunded: 'bg-orange-900/40 text-orange-400 border-orange-800',
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

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
}

function fmtElapsed(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
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

function currencyBadge(currencyType: string | null | undefined) {
  if (currencyType === 'rupee') {
    return (
      <span className="px-2 py-0.5 rounded-full text-[11px] font-medium border bg-green-900/30 text-green-400 border-green-800">
        rupee
      </span>
    );
  }
  if (currencyType === 'credit') {
    return (
      <span className="px-2 py-0.5 rounded-full text-[11px] font-medium border bg-blue-900/30 text-blue-400 border-blue-800">
        credit
      </span>
    );
  }
  return <span className="text-rp-grey text-xs">-</span>;
}

/* ---------- Refund Modal ---------- */

function RefundModal({ session, onClose, onSuccess }: {
  session: ActiveSession | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [partialAmount, setPartialAmount] = useState('');
  const [method, setMethod] = useState<'wallet' | 'cash' | 'upi'>('wallet');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [amountError, setAmountError] = useState('');

  useEffect(() => {
    if (!session) return;
    setPartialAmount('');
    setMethod('wallet');
    setReason('');
    setAmountError('');
  }, [session]);

  useEffect(() => {
    if (!session) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [session, onClose]);

  if (!session) return null;

  const partialAmountPaise = partialAmount ? Math.round(parseFloat(partialAmount) * 100) : 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (partialAmount && partialAmountPaise > session!.price_paise) {
      setAmountError(`Cannot exceed original price of ${fmt(session!.price_paise)}`);
      return;
    }
    setAmountError('');
    setSubmitting(true);
    try {
      await billingApi.refundSession(session!.id, {
        amount_paise: partialAmountPaise || undefined,
        method,
        reason: reason || undefined,
      });
      toast.success('Refund processed');
      onSuccess();
    } catch (err) {
      toast.error('Failed to process refund: ' + (err as Error).message);
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
      >
        <h3 className="text-lg font-semibold mb-4">Refund Session</h3>

        <div className="mb-4 space-y-1 text-sm">
          <p className="text-neutral-400">Pod <span className="text-white font-medium">{session.pod_number}</span></p>
          <p className="text-neutral-400">Customer <span className="text-white font-medium">{session.driver_name}</span></p>
          <p className="text-neutral-400">Original price <span className="text-white font-medium">{fmt(session.price_paise)}</span></p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-neutral-400 mb-1">
              Full refund: {fmt(session.price_paise)}
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={partialAmount}
              onChange={e => { setPartialAmount(e.target.value); setAmountError(''); }}
              placeholder="Partial amount (₹) — leave empty for full refund"
              className="w-full bg-rp-black border border-rp-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-rp-red"
            />
            {amountError && <p className="text-xs text-red-400 mt-1">{amountError}</p>}
          </div>

          <div>
            <label className="block text-sm text-neutral-400 mb-1">Refund Method *</label>
            <div className="flex gap-2">
              {(['wallet', 'cash', 'upi'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMethod(m)}
                  className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-colors ${
                    method === m
                      ? 'bg-rp-red/20 border-rp-red text-white'
                      : 'bg-rp-black border-rp-border text-neutral-400 hover:text-white hover:border-neutral-500'
                  }`}
                >
                  {m.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Reason (optional)"
              rows={2}
              className="w-full bg-rp-black border border-rp-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-rp-red resize-none"
            />
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
              disabled={submitting}
              className="bg-orange-600 hover:bg-orange-500 text-white text-sm px-4 py-2 rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Processing...' : 'Process Refund'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ---------- Main History Page ---------- */

export default function BillingHistoryPage() {
  const [filters, setFilters] = useState({
    status: '',
    pod_id: '',
    driver_name: '',
    from: format(subDays(new Date(), 7), 'yyyy-MM-dd'),
    to: format(new Date(), 'yyyy-MM-dd'),
  });
  const [limit, setLimit] = useState(50);
  const [refundTarget, setRefundTarget] = useState<ActiveSession | null>(null);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [sessionEvents, setSessionEvents] = useState<Record<string, SessionEvent[]>>({});
  const [sessionSplits, setSessionSplits] = useState<Record<string, SplitBillingInfo | null>>({});

  const { data, error, mutate } = useSWR(
    ['/billing/history', filters, limit],
    () => billingApi.getHistory({ ...filters, limit, offset: 0 }),
  );

  const toggleExpand = useCallback(async (id: string) => {
    if (expandedSession === id) {
      setExpandedSession(null);
      return;
    }
    setExpandedSession(id);
    // Lazy-load events and splits
    if (!sessionEvents[id]) {
      try {
        const events = await billingApi.getSessionEvents(id);
        setSessionEvents(prev => ({ ...prev, [id]: events }));
      } catch {
        toast.error('Failed to load session events');
      }
    }
    if (!(id in sessionSplits)) {
      const splits = await billingApi.getSessionSplits(id);
      setSessionSplits(prev => ({ ...prev, [id]: splits }));
    }
  }, [expandedSession, sessionEvents, sessionSplits]);

  const colCount = 10;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Billing History</h1>

      {/* Refund Modal */}
      <RefundModal
        session={refundTarget}
        onClose={() => setRefundTarget(null)}
        onSuccess={() => { setRefundTarget(null); mutate(); }}
      />

      {/* Filter Bar */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <input
          type="date"
          value={filters.from}
          onChange={e => setFilters(f => ({ ...f, from: e.target.value }))}
          className="bg-rp-card border border-rp-border rounded-lg px-3 py-1.5 text-sm text-white"
        />
        <span className="text-neutral-500">to</span>
        <input
          type="date"
          value={filters.to}
          onChange={e => setFilters(f => ({ ...f, to: e.target.value }))}
          className="bg-rp-card border border-rp-border rounded-lg px-3 py-1.5 text-sm text-white"
        />
        <select
          value={filters.status}
          onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
          className="bg-rp-card border border-rp-border rounded-lg px-3 py-1.5 text-sm text-white"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="refunded">Refunded</option>
          <option value="cancelled">Cancelled</option>
          <option value="paused_manual">Paused</option>
          <option value="paused_disconnect">Paused (Idle)</option>
          <option value="ended_early">Ended Early</option>
          <option value="expired">Expired</option>
        </select>
        <select
          value={filters.pod_id}
          onChange={e => setFilters(f => ({ ...f, pod_id: e.target.value }))}
          className="bg-rp-card border border-rp-border rounded-lg px-3 py-1.5 text-sm text-white"
        >
          <option value="">All Pods</option>
          {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
            <option key={n} value={`pod-${n}`}>Pod {n}</option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Search driver..."
          value={filters.driver_name}
          onChange={e => setFilters(f => ({ ...f, driver_name: e.target.value }))}
          className="bg-rp-card border border-rp-border rounded-lg px-3 py-1.5 text-sm text-white placeholder:text-neutral-500"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-4">
          <p className="text-red-400 text-sm mb-2">Failed to load billing history.</p>
          <button
            onClick={() => mutate()}
            className="text-sm bg-red-500/20 hover:bg-red-500/30 text-red-300 px-3 py-1 rounded transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading */}
      {!data && !error && (
        <div className="text-center text-rp-grey py-12">Loading sessions...</div>
      )}

      {/* Empty */}
      {data && data.sessions.length === 0 && (
        <div className="bg-rp-card border border-rp-border rounded-xl p-12 text-center">
          <p className="text-rp-grey text-lg mb-2">No sessions found</p>
          <p className="text-neutral-500 text-sm">Try adjusting your filters or date range</p>
        </div>
      )}

      {/* Table */}
      {data && data.sessions.length > 0 && (
        <div className="bg-rp-card border border-rp-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-rp-border text-rp-grey text-left">
                  <th className="px-2 py-2.5 w-8"></th>
                  <th className="px-4 py-2.5 font-medium">Date</th>
                  <th className="px-4 py-2.5 font-medium">Pod</th>
                  <th className="px-4 py-2.5 font-medium">Customer</th>
                  <th className="px-4 py-2.5 font-medium">Rate</th>
                  <th className="px-4 py-2.5 font-medium">Duration</th>
                  <th className="px-4 py-2.5 font-medium text-center">Status</th>
                  <th className="px-4 py-2.5 font-medium">Currency</th>
                  <th className="px-4 py-2.5 font-medium text-right">Price</th>
                  <th className="px-4 py-2.5 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.sessions.map((session) => {
                  const isExpanded = expandedSession === session.id;
                  return (
                    <Fragment key={session.id}>
                      <tr className="border-b border-rp-border/50 last:border-0 hover:bg-white/[0.02]">
                        {/* Expand toggle */}
                        <td className="px-2 py-2.5 text-center">
                          <button
                            onClick={() => toggleExpand(session.id)}
                            className="text-neutral-400 hover:text-white transition-transform"
                            aria-label={isExpanded ? 'Collapse' : 'Expand'}
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
                        <td className="px-4 py-2.5 text-neutral-300">
                          <div>{fmtDate(session.started_at)}</div>
                          <div className="text-xs text-neutral-500">{fmtTime(session.started_at)}</div>
                        </td>
                        <td className="px-4 py-2.5 font-medium">Pod {session.pod_number}</td>
                        <td className="px-4 py-2.5">{session.driver_name}</td>
                        <td className="px-4 py-2.5">{session.pricing_tier_name}</td>
                        <td className="px-4 py-2.5 tabular-nums text-neutral-400">{fmtElapsed(session.driving_seconds)}</td>
                        <td className="px-4 py-2.5 text-center">{statusBadge(session.status)}</td>
                        <td className="px-4 py-2.5">{currencyBadge((session as SessionWithCurrency).currency_type)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums font-medium">{fmt(session.price_paise)}</td>
                        <td className="px-4 py-2.5">
                          {(session.status === 'completed' || session.status === 'active') && (
                            <button
                              onClick={() => setRefundTarget(session)}
                              className="text-xs px-2 py-1 rounded text-orange-400 hover:bg-orange-400/10 transition-colors"
                            >
                              Refund
                            </button>
                          )}
                        </td>
                      </tr>
                      {/* Expanded: events + split info */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={colCount} className="px-0 py-0">
                            <div className="bg-rp-black/30 rounded-lg p-4 my-2 mx-4">
                              {/* Event timeline */}
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

                              {/* Split billing */}
                              {sessionSplits[session.id] && sessionSplits[session.id]!.splits.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-rp-border/50">
                                  <p className="text-xs font-medium text-neutral-300 mb-2">Split Billing</p>
                                  {sessionSplits[session.id]!.splits.map((s, i) => (
                                    <div key={i} className="flex items-center justify-between text-xs text-neutral-400 mb-1">
                                      <span>{s.driver_name}</span>
                                      <span className={s.paid ? 'text-emerald-400' : 'text-yellow-400'}>
                                        {fmt(s.amount_paise)} {s.paid ? '(paid)' : '(pending)'}
                                      </span>
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

      {/* Load more */}
      {data && data.sessions.length === limit && (
        <button
          onClick={() => setLimit(prev => prev + 50)}
          className="w-full py-2 text-sm text-rp-grey hover:text-white bg-rp-card border border-rp-border rounded-lg mt-2"
        >
          Load more
        </button>
      )}
    </div>
  );
}
