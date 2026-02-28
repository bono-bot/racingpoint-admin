'use client';

import { useEffect, useState } from 'react';
import { formatDate } from '@/lib/utils';

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

interface ParsedTransaction {
  date: string;
  description: string;
  amount: number;
  type: 'credit' | 'debit';
  match: { type: 'purchase' | 'sale'; id: number; label: string } | null;
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
  const [showBank, setShowBank] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [transactions, setTransactions] = useState<ParsedTransaction[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/finance').then(r => r.json()).then(d => { setData(d); setLoading(false); });
  }, []);

  async function handleBankUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setParsing(true);
    setTransactions([]);

    const fd = new FormData();
    fd.append('statement', file);

    try {
      const res = await fetch('/api/scan/bank-statement', { method: 'POST', body: fd });
      const result = await res.json();
      if (result.error) {
        alert(result.error);
      } else {
        setTransactions(result.transactions || []);
      }
    } catch {
      alert('Failed to parse statement');
    }
    setParsing(false);
  }

  async function saveTransactions() {
    setSaving(true);
    try {
      await fetch('/api/scan/bank-statement', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions }),
      });
      setTransactions([]);
      setShowBank(false);
    } catch {
      alert('Failed to save');
    }
    setSaving(false);
  }

  if (loading) return <div className="text-center text-zinc-500 py-8">Loading...</div>;
  if (!data) return <div className="text-center text-zinc-500 py-8">Failed to load finance data</div>;

  const { summary, byPayment, topItems, purchasesByCategory } = data;
  const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Finance Dashboard</h1>
        <button onClick={() => setShowBank(!showBank)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium">
          {showBank ? 'Close' : 'Import Bank Statement'}
        </button>
      </div>

      {/* Bank Statement Import */}
      {showBank && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-6">
          <h3 className="font-semibold mb-2">Import Bank Statement</h3>
          <p className="text-sm text-zinc-400 mb-4">Upload a CSV or image of your bank statement. AI will parse transactions and match them to existing purchases/sales.</p>

          <input type="file" accept=".csv,image/*" onChange={handleBankUpload}
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm w-full mb-4" />

          {parsing && <div className="text-sm text-zinc-400 py-4 text-center">Parsing statement...</div>}

          {transactions.length > 0 && (
            <div>
              <div className="flex justify-between items-center mb-3">
                <p className="text-sm text-zinc-400">{transactions.length} transactions found, {transactions.filter(t => t.match).length} matched</p>
                <button onClick={saveTransactions} disabled={saving}
                  className="px-4 py-2 bg-green-600 hover:bg-green-500 disabled:bg-zinc-800 rounded-lg text-sm font-medium">
                  {saving ? 'Saving...' : 'Save All'}
                </button>
              </div>
              <div className="border border-zinc-800 rounded-lg overflow-hidden max-h-80 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-zinc-900">
                    <tr className="border-b border-zinc-800 text-zinc-500">
                      <th className="px-3 py-2 text-left font-medium">Date</th>
                      <th className="px-3 py-2 text-left font-medium">Description</th>
                      <th className="px-3 py-2 text-left font-medium">Type</th>
                      <th className="px-3 py-2 text-right font-medium">Amount</th>
                      <th className="px-3 py-2 text-left font-medium">Match</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx, i) => (
                      <tr key={i} className="border-b border-zinc-800/50">
                        <td className="px-3 py-2 text-zinc-400">{formatDate(tx.date)}</td>
                        <td className="px-3 py-2 max-w-[200px] truncate">{tx.description}</td>
                        <td className="px-3 py-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            tx.type === 'credit' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                          }`}>{tx.type}</span>
                        </td>
                        <td className="px-3 py-2 text-right font-mono">₹{tx.amount.toLocaleString('en-IN')}</td>
                        <td className="px-3 py-2">
                          {tx.match ? (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400">{tx.match.label}</span>
                          ) : (
                            <span className="text-xs text-zinc-600">Unmatched</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

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
