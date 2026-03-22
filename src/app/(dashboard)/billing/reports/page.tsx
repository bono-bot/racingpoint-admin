'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { format } from 'date-fns';
import { billingApi } from '@/lib/api/billing';

function fmt(paise: number) {
  return `\u20B9${(paise / 100).toLocaleString('en-IN')}`;
}

export default function BillingReportsPage() {
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const { data, error, mutate } = useSWR(
    ['/billing/reports/daily', date],
    () => billingApi.getDailyReport(date),
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

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Daily Billing Report</h1>
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          className="bg-rp-card border border-rp-border rounded-lg px-3 py-1.5 text-sm text-white" />
      </div>

      {data.session_count === 0 ? (
        <div className="bg-rp-card border border-rp-border rounded-xl p-12 text-center">
          <p className="text-rp-grey text-lg">No sessions on this date</p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-rp-card border border-rp-border rounded-xl p-5">
              <p className="text-sm text-neutral-400 mb-1">Total Revenue</p>
              <p className="text-2xl font-bold tabular-nums">{fmt(data.total_revenue_paise)}</p>
            </div>
            <div className="bg-rp-card border border-rp-border rounded-xl p-5">
              <p className="text-sm text-neutral-400 mb-1">Sessions</p>
              <p className="text-2xl font-bold tabular-nums">{data.session_count}</p>
            </div>
            <div className="bg-rp-card border border-rp-border rounded-xl p-5">
              <p className="text-sm text-neutral-400 mb-1">Avg Duration</p>
              <p className="text-2xl font-bold tabular-nums">{Math.round(data.avg_duration_seconds / 60)}min</p>
            </div>
          </div>

          {/* Rate Breakdown Table */}
          <div className="bg-rp-card border border-rp-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-rp-border text-rp-grey text-left">
                  <th className="px-4 py-2.5 font-medium">Rate</th>
                  <th className="px-4 py-2.5 font-medium text-right">Sessions</th>
                  <th className="px-4 py-2.5 font-medium text-right">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {data.by_rate.map((row, i) => (
                  <tr key={i} className="border-b border-rp-border/50 last:border-0">
                    <td className="px-4 py-2.5">{row.rate_name}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{row.count}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums font-medium">{fmt(row.revenue_paise)}</td>
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
