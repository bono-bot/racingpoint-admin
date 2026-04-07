'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { format } from 'date-fns';
import { billingApi } from '@/lib/api/billing';
import { walletApi } from '@/lib/api/wallet';

function fmt(paise: number) {
  return `\u20B9${(paise / 100).toLocaleString('en-IN')}`;
}

function fmtDuration(secs: number): string {
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default function BillingReportsPage() {
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const { data, error, mutate } = useSWR(
    ['/billing/report/daily', date],
    () => billingApi.getDailyReport(date),
  );

  const { data: walletData } = useSWR(
    ['/wallet/transactions', date],
    () => walletApi.getTransactions(date),
  );

  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Daily Billing Report</h1>
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
          <p className="text-red-400 text-sm mb-2">Failed to load report.</p>
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
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Daily Billing Report</h1>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="bg-rp-card border border-rp-border rounded-lg px-3 py-1.5 text-sm text-white" />
        </div>
        <div className="text-center text-rp-grey py-12">Loading report...</div>
      </div>
    );
  }

  // Aggregate by pricing tier
  const byRate = new Map<string, { count: number; revenue_paise: number }>();
  for (const s of data.sessions) {
    const key = s.pricing_tier_name || 'Unknown';
    const prev = byRate.get(key) || { count: 0, revenue_paise: 0 };
    byRate.set(key, {
      count: prev.count + 1,
      revenue_paise: prev.revenue_paise + s.price_paise,
    });
  }

  const avgDuration = data.total_sessions > 0
    ? data.total_driving_seconds / data.total_sessions
    : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Daily Billing Report</h1>
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          className="bg-rp-card border border-rp-border rounded-lg px-3 py-1.5 text-sm text-white" />
      </div>

      {data.total_sessions === 0 ? (
        <div className="bg-rp-card border border-rp-border rounded-xl p-12 text-center">
          <p className="text-rp-grey text-lg">No sessions on this date</p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-rp-card border border-rp-border rounded-xl p-5">
              <p className="text-sm text-neutral-400 mb-1">Total Revenue</p>
              <p className="text-2xl font-bold tabular-nums">{fmt(data.total_revenue_paise)}</p>
            </div>
            <div className="bg-rp-card border border-rp-border rounded-xl p-5">
              <p className="text-sm text-neutral-400 mb-1">Sessions</p>
              <p className="text-2xl font-bold tabular-nums">{data.total_sessions}</p>
            </div>
            <div className="bg-rp-card border border-rp-border rounded-xl p-5">
              <p className="text-sm text-neutral-400 mb-1">Avg Duration</p>
              <p className="text-2xl font-bold tabular-nums">{fmtDuration(avgDuration)}</p>
            </div>
            <div className="bg-rp-card border border-rp-border rounded-xl p-5">
              <p className="text-sm text-neutral-400 mb-1">Discounts</p>
              <p className="text-2xl font-bold tabular-nums">{fmt(data.total_discount_paise)}</p>
            </div>
          </div>

          {/* Wallet Summary Cards — per D-01, D-02 */}
          {walletData && (
            <>
              <h2 className="text-sm font-semibold text-rp-grey uppercase tracking-wider mb-3">Wallet Summary</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-rp-card border border-rp-border rounded-xl p-5">
                  <p className="text-sm text-neutral-400 mb-1">Rupee Deposits</p>
                  <p className="text-2xl font-bold tabular-nums text-green-400">{fmt(walletData.summary.total_rupee_deposits)}</p>
                </div>
                <div className="bg-rp-card border border-rp-border rounded-xl p-5">
                  <p className="text-sm text-neutral-400 mb-1">Bonus Credits</p>
                  <p className="text-2xl font-bold tabular-nums text-purple-400">{fmt(walletData.summary.total_bonus_credits)}</p>
                </div>
                <div className="bg-rp-card border border-rp-border rounded-xl p-5">
                  <p className="text-sm text-neutral-400 mb-1">Credits Spent</p>
                  <p className="text-2xl font-bold tabular-nums text-red-400">{fmt(walletData.summary.total_debits_paise)}</p>
                </div>
                <div className="bg-rp-card border border-rp-border rounded-xl p-5">
                  <p className="text-sm text-neutral-400 mb-1">Cash Refunds</p>
                  <p className="text-2xl font-bold tabular-nums text-orange-400">{fmt(walletData.summary.total_cash_refunds)}</p>
                </div>
              </div>
            </>
          )}

          {/* Rate Breakdown Table */}
          <div className="bg-rp-card border border-rp-border rounded-xl overflow-hidden mb-6">
            <div className="px-4 py-3 border-b border-rp-border">
              <h2 className="text-sm font-medium text-neutral-400">By Rate</h2>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-rp-border text-rp-grey text-left">
                  <th className="px-4 py-2.5 font-medium">Rate</th>
                  <th className="px-4 py-2.5 font-medium text-right">Sessions</th>
                  <th className="px-4 py-2.5 font-medium text-right">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {Array.from(byRate.entries()).map(([name, row]) => (
                  <tr key={name} className="border-b border-rp-border/50 last:border-0">
                    <td className="px-4 py-2.5">{name}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{row.count}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums font-medium">{fmt(row.revenue_paise)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Session Details Table */}
          <div className="bg-rp-card border border-rp-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-rp-border">
              <h2 className="text-sm font-medium text-neutral-400">Sessions</h2>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-rp-border text-rp-grey text-left">
                  <th className="px-4 py-2.5 font-medium">Driver</th>
                  <th className="px-4 py-2.5 font-medium">Pod</th>
                  <th className="px-4 py-2.5 font-medium">Rate</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium text-right">Price</th>
                  <th className="px-4 py-2.5 font-medium">Staff</th>
                </tr>
              </thead>
              <tbody>
                {data.sessions.map(s => (
                  <tr key={s.id} className="border-b border-rp-border/50 last:border-0">
                    <td className="px-4 py-2.5">{s.driver_name}</td>
                    <td className="px-4 py-2.5">
                      {s.pod_id.replace('pod_', 'Pod ')}
                    </td>
                    <td className="px-4 py-2.5">{s.pricing_tier_name}</td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        s.status === 'completed' ? 'bg-emerald-900/40 text-emerald-400' :
                        s.status === 'cancelled' ? 'bg-red-900/40 text-red-400' :
                        s.status === 'active' ? 'bg-blue-900/40 text-blue-400' :
                        'bg-neutral-800 text-neutral-400'
                      }`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums font-medium">{fmt(s.price_paise)}</td>
                    <td className="px-4 py-2.5 text-neutral-400">{s.staff_name || '��'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
