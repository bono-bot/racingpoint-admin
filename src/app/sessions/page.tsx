'use client';

import { useEffect, useState } from 'react';

interface SessionRow {
  id: string;
  driver_id: string;
  driver_name: string;
  pod_id: string;
  pricing_tier_name: string;
  allocated_seconds: number;
  driving_seconds: number;
  status: string;
  price_paise: number;
  started_at: string | null;
  ended_at: string | null;
  staff_id: string | null;
  staff_name: string | null;
}

interface StaffSummary {
  staff_id: string;
  staff_name: string;
  sessions: number;
  revenue_paise: number;
}

interface DailyReport {
  date: string;
  total_sessions: number;
  total_revenue_paise: number;
  total_driving_seconds: number;
  staff_summary: StaffSummary[];
  sessions: SessionRow[];
  error?: string;
}

function fmt(paise: number) {
  return `\u20B9${(paise / 100).toLocaleString('en-IN')}`;
}

function fmtTime(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function fmtClock(iso: string | null) {
  if (!iso) return '-';
  const d = new Date(iso);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
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

export default function SessionsPage() {
  const [date, setDate] = useState(() => {
    const now = new Date();
    return now.toISOString().slice(0, 10);
  });
  const [report, setReport] = useState<DailyReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/rc/billing/report/daily?date=${date}`)
      .then(r => r.json())
      .then((d: DailyReport) => { setReport(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [date]);

  const uniqueCustomers = report
    ? new Set(report.sessions.map(s => s.driver_id)).size
    : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Sessions</h1>
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="bg-rp-card border border-rp-border rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-rp-red"
        />
      </div>

      {loading && (
        <div className="text-center text-rp-grey py-12">Loading sessions...</div>
      )}

      {!loading && report && !report.error && (
        <>
          {/* Stat Cards */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-rp-card border border-rp-border rounded-xl p-5">
              <p className="text-xs text-rp-grey mb-1">Total Sessions</p>
              <p className="text-2xl font-bold">{report.total_sessions}</p>
            </div>
            <div className="bg-rp-card border border-rp-border rounded-xl p-5">
              <p className="text-xs text-rp-grey mb-1">Revenue</p>
              <p className="text-2xl font-bold">{fmt(report.total_revenue_paise)}</p>
            </div>
            <div className="bg-rp-card border border-rp-border rounded-xl p-5">
              <p className="text-xs text-rp-grey mb-1">Total Drive Time</p>
              <p className="text-2xl font-bold">{fmtTime(report.total_driving_seconds)}</p>
            </div>
            <div className="bg-rp-card border border-rp-border rounded-xl p-5">
              <p className="text-xs text-rp-grey mb-1">Unique Customers</p>
              <p className="text-2xl font-bold">{uniqueCustomers}</p>
            </div>
          </div>

          {/* Staff Summary */}
          {report.staff_summary.length > 0 && (
            <div className="mb-6">
              <h2 className="text-sm font-semibold text-rp-grey uppercase tracking-wider mb-3">Staff Summary</h2>
              <div className="bg-rp-card border border-rp-border rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-rp-border text-rp-grey text-left">
                      <th className="px-4 py-2.5 font-medium">Staff</th>
                      <th className="px-4 py-2.5 font-medium text-right">Sessions</th>
                      <th className="px-4 py-2.5 font-medium text-right">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.staff_summary.map((s, i) => (
                      <tr key={i} className="border-b border-rp-border/50 last:border-0">
                        <td className="px-4 py-2.5 font-medium">{s.staff_name}</td>
                        <td className="px-4 py-2.5 text-right">{s.sessions}</td>
                        <td className="px-4 py-2.5 text-right">{fmt(s.revenue_paise)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Sessions Table */}
          <div>
            <h2 className="text-sm font-semibold text-rp-grey uppercase tracking-wider mb-3">All Sessions</h2>
            {report.sessions.length === 0 ? (
              <div className="text-center text-rp-grey py-12 bg-rp-card border border-rp-border rounded-xl">
                No sessions on {date}
              </div>
            ) : (
              <div className="bg-rp-card border border-rp-border rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-rp-border text-rp-grey text-left">
                        <th className="px-4 py-2.5 font-medium">Time</th>
                        <th className="px-4 py-2.5 font-medium">Staff</th>
                        <th className="px-4 py-2.5 font-medium">Customer</th>
                        <th className="px-4 py-2.5 font-medium">Pod</th>
                        <th className="px-4 py-2.5 font-medium">Tier</th>
                        <th className="px-4 py-2.5 font-medium text-right">Duration</th>
                        <th className="px-4 py-2.5 font-medium text-center">Status</th>
                        <th className="px-4 py-2.5 font-medium text-right">Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.sessions.map((s) => (
                        <tr key={s.id} className="border-b border-rp-border/50 last:border-0 hover:bg-white/[0.02]">
                          <td className="px-4 py-2.5 tabular-nums">{fmtClock(s.started_at)}</td>
                          <td className="px-4 py-2.5">
                            {s.staff_name ? (
                              <span className="text-white">{s.staff_name}</span>
                            ) : (
                              <span className="text-rp-grey italic">Self</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 font-medium">{s.driver_name}</td>
                          <td className="px-4 py-2.5">{s.pod_id}</td>
                          <td className="px-4 py-2.5">{s.pricing_tier_name}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums">{fmtTime(s.driving_seconds)}</td>
                          <td className="px-4 py-2.5 text-center">{statusBadge(s.status)}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums font-medium">{fmt(s.price_paise)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {!loading && report?.error && (
        <div className="text-center text-red-400 py-12">Error: {report.error}</div>
      )}
    </div>
  );
}
