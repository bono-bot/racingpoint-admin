'use client';

import { useState, useEffect, useCallback, useMemo, Fragment } from 'react';
import { format, subDays } from 'date-fns';
import { billingApi } from '@/lib/api/billing';
import { podLabel } from '@/lib/utils';
import type { ActiveSession } from '@/lib/api/billing';
import { SkeletonTable } from '@/components/Skeleton';

/* ---------- Helpers ---------- */

function fmt(paise: number) {
  return `\u20B9${(paise / 100).toLocaleString('en-IN')}`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Kolkata' });
}

function fmtElapsed(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function statusBadge(status: string) {
  const colors: Record<string, string> = {
    active: 'bg-green-900/40 text-green-400 border-green-800',
    completed: 'bg-blue-900/40 text-blue-400 border-blue-800',
    cancelled: 'bg-red-900/40 text-red-400 border-red-800',
    paused_manual: 'bg-yellow-900/40 text-yellow-400 border-yellow-800',
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

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOUR_LABELS = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
const PAGE_SIZE = 25;

/* ---------- Chart Components ---------- */

interface DailyRevenue {
  date: string;
  revenuePaise: number;
  label: string;
}

function RevenueBarChart({ data }: { data: DailyRevenue[] }) {
  const maxRevenue = Math.max(...data.map(d => d.revenuePaise), 1);

  return (
    <div className="bg-rp-card border border-rp-border rounded-xl p-4">
      <h3 className="text-sm font-medium text-neutral-300 mb-4">Daily Revenue (Last 30 Days)</h3>
      <div className="flex items-end gap-[2px] h-40">
        {data.map(d => {
          const heightPct = (d.revenuePaise / maxRevenue) * 100;
          return (
            <div key={d.date} className="flex-1 flex flex-col items-center justify-end h-full group relative">
              <div
                className="w-full bg-rp-red/80 hover:bg-rp-red rounded-t transition-colors min-h-[1px]"
                style={{ height: `${Math.max(heightPct, 1)}%` }}
              />
              {/* Tooltip */}
              <div className="absolute bottom-full mb-2 hidden group-hover:block z-10">
                <div className="bg-rp-black border border-rp-border rounded px-2 py-1 text-xs whitespace-nowrap shadow-lg">
                  <p className="text-neutral-300">{d.label}</p>
                  <p className="text-white font-medium">{fmt(d.revenuePaise)}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between mt-2 text-[10px] text-neutral-600">
        <span>{data[0]?.label || ''}</span>
        <span>{data[data.length - 1]?.label || ''}</span>
      </div>
    </div>
  );
}

interface TierRevenue {
  tierName: string;
  revenuePaise: number;
  count: number;
}

function TierBreakdown({ data }: { data: TierRevenue[] }) {
  const maxRevenue = Math.max(...data.map(d => d.revenuePaise), 1);

  return (
    <div className="bg-rp-card border border-rp-border rounded-xl p-4">
      <h3 className="text-sm font-medium text-neutral-300 mb-4">Revenue by Pricing Tier</h3>
      {data.length === 0 ? (
        <p className="text-sm text-neutral-500 text-center py-4">No data</p>
      ) : (
        <div className="space-y-3">
          {data.map(tier => {
            const widthPct = (tier.revenuePaise / maxRevenue) * 100;
            return (
              <div key={tier.tierName}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-neutral-300">{tier.tierName}</span>
                  <span className="text-white font-medium tabular-nums">{fmt(tier.revenuePaise)}</span>
                </div>
                <div className="w-full bg-rp-black rounded-full h-2.5 overflow-hidden">
                  <div
                    className="h-full bg-rp-red/80 rounded-full transition-all"
                    style={{ width: `${Math.max(widthPct, 2)}%` }}
                  />
                </div>
                <p className="text-[10px] text-neutral-600 mt-0.5">{tier.count} sessions</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface HeatmapCell {
  day: number; // 0=Sun .. 6=Sat
  hour: number; // 0-23
  intensity: number; // 0.0 to 1.0
  count: number;
}

function UtilizationHeatmap({ data }: { data: HeatmapCell[] }) {
  // Build a lookup: day-hour -> intensity
  const lookup = new Map<string, HeatmapCell>();
  for (const cell of data) {
    lookup.set(`${cell.day}-${cell.hour}`, cell);
  }

  // Reorder days: Mon(1) Tue(2) Wed(3) Thu(4) Fri(5) Sat(6) Sun(0)
  const dayOrder = [1, 2, 3, 4, 5, 6, 0];

  function cellColor(intensity: number): string {
    if (intensity === 0) return 'bg-rp-black';
    if (intensity < 0.15) return 'bg-rp-red/10';
    if (intensity < 0.3) return 'bg-rp-red/20';
    if (intensity < 0.5) return 'bg-rp-red/35';
    if (intensity < 0.7) return 'bg-rp-red/50';
    if (intensity < 0.85) return 'bg-rp-red/70';
    return 'bg-rp-red/90';
  }

  return (
    <div className="bg-rp-card border border-rp-border rounded-xl p-4">
      <h3 className="text-sm font-medium text-neutral-300 mb-4">Utilization Heatmap (% Pods Active)</h3>
      <div className="overflow-x-auto">
        <div className="inline-grid gap-[2px]" style={{ gridTemplateColumns: `auto repeat(24, minmax(16px, 1fr))` }}>
          {/* Hour header row */}
          <div />
          {HOUR_LABELS.map(h => (
            <div key={h} className="text-[9px] text-neutral-600 text-center">
              {parseInt(h) % 3 === 0 ? h : ''}
            </div>
          ))}

          {/* Data rows */}
          {dayOrder.map(dayIdx => (
            <Fragment key={`row-${dayIdx}`}>
              <div className="text-[10px] text-neutral-500 pr-2 flex items-center">
                {DAY_NAMES[dayIdx]}
              </div>
              {Array.from({ length: 24 }, (_, hour) => {
                const cell = lookup.get(`${dayIdx}-${hour}`);
                const intensity = cell?.intensity ?? 0;
                const count = cell?.count ?? 0;
                return (
                  <div
                    key={`${dayIdx}-${hour}`}
                    className={`w-4 h-4 rounded-[2px] ${cellColor(intensity)} group relative`}
                    title={`${DAY_NAMES[dayIdx]} ${HOUR_LABELS[hour]}:00 - ${Math.round(intensity * 100)}% (${count} sessions)`}
                  />
                );
              })}
            </Fragment>
          ))}
        </div>
      </div>
      {/* Legend */}
      <div className="flex items-center gap-1 mt-3 text-[10px] text-neutral-600">
        <span>Less</span>
        <div className="w-3 h-3 rounded-[2px] bg-rp-black border border-rp-border" />
        <div className="w-3 h-3 rounded-[2px] bg-rp-red/15" />
        <div className="w-3 h-3 rounded-[2px] bg-rp-red/35" />
        <div className="w-3 h-3 rounded-[2px] bg-rp-red/55" />
        <div className="w-3 h-3 rounded-[2px] bg-rp-red/75" />
        <div className="w-3 h-3 rounded-[2px] bg-rp-red/90" />
        <span>More</span>
      </div>
    </div>
  );
}

/* ---------- Main Page ---------- */

export default function BillingAnalyticsPage() {
  const [filters, setFilters] = useState({
    from: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    to: format(new Date(), 'yyyy-MM-dd'),
    pod_id: '',
    pricing_tier: '',
    status: '',
  });
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string | number> = {
        from: filters.from,
        to: filters.to,
        limit: 2000,
        offset: 0,
      };
      if (filters.pod_id) params.pod_id = filters.pod_id;
      if (filters.status) params.status = filters.status;

      const result = await billingApi.getHistory(params as Parameters<typeof billingApi.getHistory>[0]);
      setSessions(result.sessions);
      setPage(0);
    } catch (err) {
      setError((err as Error).message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // Apply client-side pricing tier filter
  const filteredSessions = useMemo(() => {
    if (!filters.pricing_tier) return sessions;
    return sessions.filter(s => s.pricing_tier_name === filters.pricing_tier);
  }, [sessions, filters.pricing_tier]);

  // Extract unique pricing tiers for the filter dropdown
  const pricingTiers = useMemo(() => {
    const tiers = new Set<string>();
    for (const s of sessions) {
      if (s.pricing_tier_name) tiers.add(s.pricing_tier_name);
    }
    return Array.from(tiers).sort();
  }, [sessions]);

  // Paginated sessions for table
  const paginatedSessions = useMemo(() => {
    const start = page * PAGE_SIZE;
    return filteredSessions.slice(start, start + PAGE_SIZE);
  }, [filteredSessions, page]);

  const totalPages = Math.ceil(filteredSessions.length / PAGE_SIZE);

  // --- Chart Data ---

  // Daily revenue for last 30 days
  const dailyRevenue: DailyRevenue[] = useMemo(() => {
    const byDate = new Map<string, number>();
    // Pre-fill all dates in range
    const start = new Date(filters.from);
    const end = new Date(filters.to);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const key = format(d, 'yyyy-MM-dd');
      byDate.set(key, 0);
    }
    for (const s of filteredSessions) {
      const dateKey = s.started_at.slice(0, 10);
      byDate.set(dateKey, (byDate.get(dateKey) ?? 0) + s.price_paise);
    }
    return Array.from(byDate.entries()).map(([date, revenuePaise]) => ({
      date,
      revenuePaise,
      label: new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', timeZone: 'Asia/Kolkata' }),
    }));
  }, [filteredSessions, filters.from, filters.to]);

  // Revenue by pricing tier
  const tierRevenue: TierRevenue[] = useMemo(() => {
    const byTier = new Map<string, { revenuePaise: number; count: number }>();
    for (const s of filteredSessions) {
      const tier = s.pricing_tier_name || 'Unknown';
      const existing = byTier.get(tier) || { revenuePaise: 0, count: 0 };
      existing.revenuePaise += s.price_paise;
      existing.count += 1;
      byTier.set(tier, existing);
    }
    return Array.from(byTier.entries())
      .map(([tierName, data]) => ({ tierName, ...data }))
      .sort((a, b) => b.revenuePaise - a.revenuePaise);
  }, [filteredSessions]);

  // Utilization heatmap
  const heatmapData: HeatmapCell[] = useMemo(() => {
    // Count sessions per (day, hour) slot
    const counts = new Map<string, number>();
    const totalPods = 8;

    for (const s of filteredSessions) {
      const d = new Date(s.started_at);
      const day = d.getDay();
      const hour = d.getHours();
      const key = `${day}-${hour}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    // Calculate days in range for normalization
    const start = new Date(filters.from);
    const end = new Date(filters.to);
    const dayCount = new Map<number, number>();
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dow = d.getDay();
      dayCount.set(dow, (dayCount.get(dow) ?? 0) + 1);
    }

    const cells: HeatmapCell[] = [];
    for (let day = 0; day < 7; day++) {
      for (let hour = 0; hour < 24; hour++) {
        const key = `${day}-${hour}`;
        const count = counts.get(key) ?? 0;
        const numWeeks = dayCount.get(day) ?? 1;
        // Average sessions per slot / total pods = utilization
        const avgPerSlot = count / numWeeks;
        const intensity = Math.min(avgPerSlot / totalPods, 1);
        cells.push({ day, hour, intensity, count });
      }
    }
    return cells;
  }, [filteredSessions, filters.from, filters.to]);

  // --- CSV Export ---
  const handleExportCSV = useCallback(() => {
    if (filteredSessions.length === 0) return;

    const headers = ['Date', 'Time', 'Pod', 'Customer', 'Rate', 'Duration', 'Status', 'Price (INR)'];
    const rows = filteredSessions.map(s => [
      fmtDate(s.started_at),
      fmtTime(s.started_at),
      `Pod ${s.pod_number}`,
      s.driver_name,
      s.pricing_tier_name,
      fmtElapsed(s.driving_seconds),
      s.status,
      (s.price_paise / 100).toFixed(2),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `billing-analytics-${filters.from}-to-${filters.to}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [filteredSessions, filters.from, filters.to]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Analytics & Reports</h1>
        <button
          onClick={handleExportCSV}
          disabled={filteredSessions.length === 0}
          className="bg-rp-card border border-rp-border hover:border-neutral-500 text-sm text-neutral-300 px-4 py-2 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
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
          value={filters.pod_id}
          onChange={e => setFilters(f => ({ ...f, pod_id: e.target.value }))}
          className="bg-rp-card border border-rp-border rounded-lg px-3 py-1.5 text-sm text-white"
        >
          <option value="">All Pods</option>
          {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
            <option key={n} value={`pod-${n}`}>Pod {n}</option>
          ))}
        </select>
        <select
          value={filters.pricing_tier}
          onChange={e => setFilters(f => ({ ...f, pricing_tier: e.target.value }))}
          className="bg-rp-card border border-rp-border rounded-lg px-3 py-1.5 text-sm text-white"
        >
          <option value="">All Tiers</option>
          {pricingTiers.map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select
          value={filters.status}
          onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
          className="bg-rp-card border border-rp-border rounded-lg px-3 py-1.5 text-sm text-white"
        >
          <option value="">All Statuses</option>
          <option value="completed">Completed</option>
          <option value="active">Active</option>
          <option value="refunded">Refunded</option>
          <option value="cancelled">Cancelled</option>
          <option value="expired">Expired</option>
        </select>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-4">
          <p className="text-red-400 text-sm mb-2">Failed to load analytics: {error}</p>
          <button
            onClick={fetchSessions}
            className="text-sm bg-red-500/20 hover:bg-red-500/30 text-red-300 px-3 py-1 rounded transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <SkeletonTable rows={5} cols={7} />
      )}

      {!loading && !error && (
        <>
          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            <RevenueBarChart data={dailyRevenue} />
            <TierBreakdown data={tierRevenue} />
          </div>

          {/* Heatmap */}
          <div className="mb-6">
            <UtilizationHeatmap data={heatmapData} />
          </div>

          {/* Session Summary */}
          <div className="flex items-center gap-4 mb-4 text-sm text-neutral-400">
            <span>{filteredSessions.length} sessions</span>
            <span>Total: {fmt(filteredSessions.reduce((s, sess) => s + sess.price_paise, 0))}</span>
          </div>

          {/* Sessions Table */}
          {filteredSessions.length === 0 ? (
            <div className="bg-rp-card border border-rp-border rounded-xl p-12 text-center">
              <p className="text-rp-grey text-lg mb-2">No sessions found</p>
              <p className="text-neutral-500 text-sm">Try adjusting your filters or date range</p>
            </div>
          ) : (
            <>
              <div className="bg-rp-card border border-rp-border rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-rp-border text-rp-grey text-left">
                        <th className="px-4 py-2.5 font-medium">Date</th>
                        <th className="px-4 py-2.5 font-medium">Pod</th>
                        <th className="px-4 py-2.5 font-medium">Customer</th>
                        <th className="px-4 py-2.5 font-medium">Rate</th>
                        <th className="px-4 py-2.5 font-medium">Duration</th>
                        <th className="px-4 py-2.5 font-medium text-center">Status</th>
                        <th className="px-4 py-2.5 font-medium text-right">Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedSessions.map(session => (
                        <tr key={session.id} className="border-b border-rp-border/50 last:border-0 hover:bg-white/[0.02]">
                          <td className="px-4 py-2.5 text-neutral-300">
                            <div>{fmtDate(session.started_at)}</div>
                            <div className="text-xs text-neutral-500">{fmtTime(session.started_at)}</div>
                          </td>
                          <td className="px-4 py-2.5 font-medium">{podLabel(session)}</td>
                          <td className="px-4 py-2.5">{session.driver_name}</td>
                          <td className="px-4 py-2.5">{session.pricing_tier_name}</td>
                          <td className="px-4 py-2.5 tabular-nums text-neutral-400">{fmtElapsed(session.driving_seconds)}</td>
                          <td className="px-4 py-2.5 text-center">{statusBadge(session.status)}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums font-medium">{fmt(session.price_paise)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-3">
                  <p className="text-xs text-neutral-500">
                    Showing {page * PAGE_SIZE + 1}-{Math.min((page + 1) * PAGE_SIZE, filteredSessions.length)} of {filteredSessions.length}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage(p => Math.max(0, p - 1))}
                      disabled={page === 0}
                      className="px-3 py-1 text-sm bg-rp-card border border-rp-border rounded-lg text-neutral-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      Previous
                    </button>
                    <span className="text-xs text-neutral-500 tabular-nums">
                      {page + 1} / {totalPages}
                    </span>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                      disabled={page >= totalPages - 1}
                      className="px-3 py-1 text-sm bg-rp-card border border-rp-border rounded-lg text-neutral-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
