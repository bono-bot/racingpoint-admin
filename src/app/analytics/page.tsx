'use client';

import { useEffect, useState } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface AnalyticsData {
  hourlyData: { hour: number; label: string; count: number; revenue: number }[];
  dailyRevenue: { date: string; revenue: number; transactions: number }[];
  topItems: { item_name: string; total_qty: number; total_revenue: number }[];
  paymentBreakdown: { payment_method: string; count: number; total: number }[];
  expenseBreakdown: { category: string; total: number; count: number }[];
  monthlyRevenue: { month: string; revenue: number }[];
  monthlyExpenses: { month: string; expenses: number }[];
  bookingStats: { total: number; sources: { whatsapp: number; discord: number } };
  lowStock: { item_name: string; quantity: number; unit: string; min_stock: number }[];
}

const COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899'];

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
      <p className="text-xs text-zinc-500 mb-1">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
      {sub && <p className="text-xs text-zinc-500 mt-1">{sub}</p>}
    </div>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/analytics').then(r => r.json()).then(d => { setData(d); setLoading(false); });
  }, []);

  if (loading) return <div className="text-center text-zinc-500 py-8">Loading analytics...</div>;
  if (!data) return <div className="text-center text-zinc-500 py-8">Failed to load</div>;

  const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`;
  const totalRevenue = data.dailyRevenue.reduce((s, d) => s + d.revenue, 0);
  const totalExpenses = data.expenseBreakdown.reduce((s, d) => s + d.total, 0);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Smart Analytics</h1>

      {/* Top stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Bookings" value={String(data.bookingStats.total)}
          sub={`WhatsApp: ${data.bookingStats.sources.whatsapp} | Discord: ${data.bookingStats.sources.discord}`} />
        <StatCard label="30-Day Revenue" value={fmt(totalRevenue)}
          sub={`${data.dailyRevenue.length} active days`} />
        <StatCard label="Total Expenses" value={fmt(totalExpenses)}
          sub={`${data.expenseBreakdown.length} categories`} />
        <StatCard label="Low Stock Alerts" value={String(data.lowStock.length)}
          sub={data.lowStock.length > 0 ? data.lowStock.slice(0, 2).map(i => i.item_name).join(', ') : 'All stocked'} />
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Peak Hours */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <h2 className="text-lg font-semibold mb-4">Peak Hours</h2>
          {data.hourlyData.some(h => h.count > 0) ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.hourlyData.filter(h => h.hour >= 10 && h.hour <= 23)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="label" tick={{ fill: '#71717a', fontSize: 11 }} />
                <YAxis tick={{ fill: '#71717a', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 8 }} />
                <Bar dataKey="count" fill="#ef4444" radius={[4, 4, 0, 0]} name="Orders" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-zinc-500 py-8 text-center">No sales data yet — charts will appear as sales are recorded</p>
          )}
        </div>

        {/* Revenue Trend */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <h2 className="text-lg font-semibold mb-4">Revenue Trend (30 days)</h2>
          {data.dailyRevenue.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={data.dailyRevenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="date" tick={{ fill: '#71717a', fontSize: 11 }}
                  tickFormatter={(v: string) => v.slice(5)} />
                <YAxis tick={{ fill: '#71717a', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 8 }}
                  formatter={(value: number | undefined) => [fmt(value ?? 0), 'Revenue']} />
                <Line type="monotone" dataKey="revenue" stroke="#ef4444" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-zinc-500 py-8 text-center">No revenue data yet</p>
          )}
        </div>

        {/* Payment Methods */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <h2 className="text-lg font-semibold mb-4">Payment Methods</h2>
          {data.paymentBreakdown.length > 0 ? (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width="50%" height={200}>
                <PieChart>
                  <Pie data={data.paymentBreakdown} dataKey="total" nameKey="payment_method"
                    cx="50%" cy="50%" outerRadius={80} strokeWidth={0}>
                    {data.paymentBreakdown.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 8 }}
                    formatter={(value: number | undefined) => fmt(value ?? 0)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {data.paymentBreakdown.map((p, i) => (
                  <div key={p.payment_method} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="text-sm text-zinc-400">{p.payment_method.toUpperCase()}</span>
                    <span className="text-sm font-mono">{fmt(p.total)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-zinc-500 py-8 text-center">No payment data yet</p>
          )}
        </div>

        {/* Expense Breakdown */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <h2 className="text-lg font-semibold mb-4">Expense Breakdown</h2>
          {data.expenseBreakdown.length > 0 ? (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width="50%" height={200}>
                <PieChart>
                  <Pie data={data.expenseBreakdown} dataKey="total" nameKey="category"
                    cx="50%" cy="50%" outerRadius={80} strokeWidth={0}>
                    {data.expenseBreakdown.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 8 }}
                    formatter={(value: number | undefined) => fmt(value ?? 0)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {data.expenseBreakdown.map((p, i) => (
                  <div key={p.category} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="text-sm text-zinc-400">{p.category}</span>
                    <span className="text-sm font-mono">{fmt(p.total)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-zinc-500 py-8 text-center">No expense data yet</p>
          )}
        </div>
      </div>

      {/* Top Selling Items */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-6">
        <h2 className="text-lg font-semibold mb-4">Top Selling Items</h2>
        {data.topItems.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.topItems.slice(0, 10)} layout="vertical" margin={{ left: 120 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis type="number" tick={{ fill: '#71717a', fontSize: 11 }} />
              <YAxis type="category" dataKey="item_name" tick={{ fill: '#a1a1aa', fontSize: 12 }} width={120} />
              <Tooltip contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 8 }} />
              <Bar dataKey="total_qty" fill="#3b82f6" radius={[0, 4, 4, 0]} name="Qty Sold" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-zinc-500 py-8 text-center">No sales data yet</p>
        )}
      </div>

      {/* Booking Sources */}
      {data.bookingStats.total > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <h2 className="text-lg font-semibold mb-4">Booking Sources</h2>
          <div className="flex items-center gap-6">
            <ResponsiveContainer width="30%" height={200}>
              <PieChart>
                <Pie data={[
                  { name: 'WhatsApp', value: data.bookingStats.sources.whatsapp },
                  { name: 'Discord', value: data.bookingStats.sources.discord },
                ]} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} strokeWidth={0}>
                  <Cell fill="#22c55e" />
                  <Cell fill="#8b5cf6" />
                </Pie>
                <Tooltip contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-sm text-zinc-400">WhatsApp</span>
                <span className="text-sm font-mono">{data.bookingStats.sources.whatsapp}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-purple-500" />
                <span className="text-sm text-zinc-400">Discord</span>
                <span className="text-sm font-mono">{data.bookingStats.sources.discord}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
