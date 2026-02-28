'use client';

import { useEffect, useState } from 'react';

interface FinanceData {
  summary: {
    totalSales: number;
    totalPurchases: number;
    netProfit: number;
    todaySales: number;
    todayPurchases: number;
  };
  dailyRevenue: { date: string; revenue: number }[];
  byPayment: { payment_method: string; count: number; total: number }[];
  topItems: { item_name: string; total_qty: number; total_revenue: number }[];
  purchasesByCategory: { category: string; count: number; total: number }[];
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
      <p className="text-xs text-zinc-500 mb-1">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
      {sub && <p className="text-xs text-zinc-500 mt-1">{sub}</p>}
    </div>
  );
}

export default function FinancePage() {
  const [data, setData] = useState<FinanceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/finance').then(r => r.json()).then(d => { setData(d); setLoading(false); });
  }, []);

  if (loading) return <div className="text-center text-zinc-500 py-8">Loading...</div>;
  if (!data) return <div className="text-center text-zinc-500 py-8">Failed to load finance data</div>;

  const { summary, byPayment, topItems, purchasesByCategory } = data;
  const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Finance Dashboard</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-5 gap-4 mb-8">
        <StatCard label="Total Revenue" value={fmt(summary.totalSales)} />
        <StatCard label="Total Expenses" value={fmt(summary.totalPurchases)} />
        <StatCard label="Net Profit" value={fmt(summary.netProfit)} />
        <StatCard label="Today's Sales" value={fmt(summary.todaySales)} />
        <StatCard label="Today's Expenses" value={fmt(summary.todayPurchases)} />
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Payment methods breakdown */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <h2 className="text-lg font-semibold mb-4">Sales by Payment Method</h2>
          {byPayment.length === 0 ? (
            <p className="text-sm text-zinc-500">No sales data yet</p>
          ) : (
            <div className="space-y-3">
              {byPayment.map(p => (
                <div key={p.payment_method} className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      p.payment_method === 'upi' ? 'bg-blue-500/10 text-blue-400' :
                      p.payment_method === 'card' ? 'bg-purple-500/10 text-purple-400' :
                      'bg-green-500/10 text-green-400'
                    }`}>{p.payment_method.toUpperCase()}</span>
                    <span className="text-sm text-zinc-400">{p.count} transactions</span>
                  </div>
                  <span className="font-mono text-sm">{fmt(p.total)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Expenses by category */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <h2 className="text-lg font-semibold mb-4">Expenses by Category</h2>
          {purchasesByCategory.length === 0 ? (
            <p className="text-sm text-zinc-500">No expense data yet</p>
          ) : (
            <div className="space-y-3">
              {purchasesByCategory.map(p => (
                <div key={p.category} className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">{p.category}</span>
                    <span className="text-sm text-zinc-400">{p.count} purchases</span>
                  </div>
                  <span className="font-mono text-sm">{fmt(p.total)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top selling items */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 col-span-2">
          <h2 className="text-lg font-semibold mb-4">Top Selling Items</h2>
          {topItems.length === 0 ? (
            <p className="text-sm text-zinc-500">No sales data yet</p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {topItems.map((item, i) => (
                <div key={item.item_name} className="flex justify-between items-center p-3 bg-zinc-800/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-zinc-500 w-5">#{i + 1}</span>
                    <span className="text-sm font-medium">{item.item_name}</span>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-sm">{fmt(item.total_revenue)}</p>
                    <p className="text-xs text-zinc-500">{item.total_qty} sold</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
