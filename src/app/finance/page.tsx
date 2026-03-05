'use client';

import { useEffect, useState } from 'react';
import { formatDate } from '@/lib/utils';
import { useToast } from '@/components/Toast';
import { SkeletonCard, SkeletonTable } from '@/components/Skeleton';

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

function StatCard({ label, value, sub, trend }: { label: string; value: string; sub?: string; trend?: 'up' | 'down' | 'neutral' }) {
  return (
    <div className="bg-rp-card border border-rp-border rounded-xl p-5">
      <p className="text-xs text-rp-grey mb-1">{label}</p>
      <div className="flex items-end gap-2">
        <p className="text-2xl font-bold">{value}</p>
        {trend && (
          <span className={`text-xs pb-0.5 ${trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-red-400' : 'text-rp-grey'}`}>
            {trend === 'up' ? (
              <svg className="w-3.5 h-3.5 inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M7 17l5-5 5 5M7 7l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            ) : trend === 'down' ? (
              <svg className="w-3.5 h-3.5 inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M7 7l5 5 5-5M7 17l5-5 5 5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            ) : null}
          </span>
        )}
      </div>
      {sub && <p className="text-xs text-rp-grey mt-1">{sub}</p>}
    </div>
  );
}

export default function FinancePage() {
  const { toast } = useToast();
  const [data, setData] = useState<FinanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showBank, setShowBank] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [transactions, setTransactions] = useState<ParsedTransaction[]>([]);
  const [saving, setSaving] = useState(false);
  const [txFilter, setTxFilter] = useState<'all' | 'matched' | 'unmatched'>('all');

  useEffect(() => {
    fetch('/api/finance').then(r => r.json()).then(d => { setData(d); setLoading(false); })
      .catch(() => { toast('Failed to load finance data', 'error'); setLoading(false); });
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
        toast(result.error, 'error');
      } else {
        setTransactions(result.transactions || []);
        const matched = (result.transactions || []).filter((t: ParsedTransaction) => t.match).length;
        toast(`Parsed ${result.transactions?.length || 0} transactions, ${matched} auto-matched`, 'success');
      }
    } catch {
      toast('Failed to parse statement', 'error');
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
      toast(`${transactions.length} transactions saved`, 'success');
      setTransactions([]);
      setShowBank(false);
    } catch {
      toast('Failed to save transactions', 'error');
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div>
        <div className="flex justify-between items-center mb-6">
          <div className="h-7 w-48 bg-rp-border/50 rounded animate-pulse" />
          <div className="h-9 w-40 bg-rp-border/50 rounded-lg animate-pulse" />
        </div>
        <div className="grid grid-cols-5 gap-4 mb-8">
          <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
        </div>
        <div className="grid grid-cols-2 gap-6">
          <SkeletonTable rows={4} cols={3} />
          <SkeletonTable rows={4} cols={3} />
        </div>
      </div>
    );
  }

  if (!data) return <div className="text-center text-rp-grey py-8">Failed to load finance data</div>;

  const { summary, byPayment, topItems, purchasesByCategory } = data;
  const fmt = (n: number) => `\u20B9${n.toLocaleString('en-IN')}`;

  const filteredTx = transactions.filter(t => {
    if (txFilter === 'matched') return t.match !== null;
    if (txFilter === 'unmatched') return t.match === null;
    return true;
  });

  const matchedCount = transactions.filter(t => t.match).length;
  const totalPayments = byPayment.reduce((s, p) => s + p.total, 0);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Finance Dashboard</h1>
        <button onClick={() => setShowBank(!showBank)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
            showBank ? 'bg-rp-card border border-rp-border text-neutral-400' : 'bg-blue-600 hover:bg-blue-500 text-white'
          }`}>
          {showBank ? 'Close' : (
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Import Bank Statement
            </span>
          )}
        </button>
      </div>

      {/* Bank Statement Import */}
      {showBank && (
        <div className="bg-rp-card border border-rp-border rounded-xl p-5 mb-6 animate-scale-in">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <svg className="w-4 h-4 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <rect x="1" y="4" width="22" height="16" rx="2" /><path d="M1 10h22" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-sm">Bank Statement Reconciliation</h3>
              <p className="text-xs text-neutral-400">Upload CSV or image. AI matches transactions to purchases/sales.</p>
            </div>
          </div>

          <label htmlFor="bank-file" className="block mb-4">
            <div className="border-2 border-dashed border-rp-border rounded-xl p-6 text-center cursor-pointer hover:border-blue-500/50 transition-colors">
              {parsing ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-neutral-400">Parsing statement...</p>
                </div>
              ) : (
                <>
                  <svg className="w-8 h-8 mx-auto text-rp-grey mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <p className="text-sm text-neutral-400">Upload CSV or image of bank statement</p>
                </>
              )}
            </div>
            <input id="bank-file" type="file" accept=".csv,image/*" onChange={handleBankUpload} className="hidden" />
          </label>

          {transactions.length > 0 && (
            <div className="animate-fade-in">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <p className="text-sm text-neutral-400">
                    <span className="text-white font-medium">{transactions.length}</span> transactions,{' '}
                    <span className="text-emerald-400 font-medium">{matchedCount}</span> matched
                  </p>
                  <div className="flex gap-1">
                    {(['all', 'matched', 'unmatched'] as const).map(f => (
                      <button key={f} onClick={() => setTxFilter(f)}
                        className={`px-2 py-0.5 rounded text-[10px] font-medium cursor-pointer transition-colors ${
                          txFilter === f ? 'bg-rp-red/10 text-rp-red' : 'text-rp-grey hover:text-white'
                        }`}>
                        {f}
                      </button>
                    ))}
                  </div>
                </div>
                <button onClick={saveTransactions} disabled={saving}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors cursor-pointer">
                  {saving ? 'Saving...' : 'Save All'}
                </button>
              </div>
              <div className="border border-rp-border rounded-lg overflow-hidden max-h-80 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-rp-card z-10">
                    <tr className="border-b border-rp-border text-rp-grey">
                      <th className="px-3 py-2 text-left font-medium">Date</th>
                      <th className="px-3 py-2 text-left font-medium">Description</th>
                      <th className="px-3 py-2 text-left font-medium">Type</th>
                      <th className="px-3 py-2 text-right font-medium">Amount</th>
                      <th className="px-3 py-2 text-left font-medium">Match</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTx.map((tx, i) => (
                      <tr key={i} className="border-b border-rp-border/50 hover:bg-rp-black/30 transition-colors">
                        <td className="px-3 py-2 text-neutral-400 text-xs">{formatDate(tx.date)}</td>
                        <td className="px-3 py-2 max-w-[200px] truncate">{tx.description}</td>
                        <td className="px-3 py-2">
                          <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full ${
                            tx.type === 'credit' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rp-red/10 text-rp-red'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${tx.type === 'credit' ? 'bg-emerald-400' : 'bg-rp-red'}`} />
                            {tx.type}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right font-mono">{'\u20B9'}{tx.amount.toLocaleString('en-IN')}</td>
                        <td className="px-3 py-2">
                          {tx.match ? (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">{tx.match.label}</span>
                          ) : (
                            <span className="text-xs text-rp-grey/70">Unmatched</span>
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
        <StatCard label="Total Revenue" value={fmt(summary.totalSales)} trend={summary.totalSales > 0 ? 'up' : 'neutral'} />
        <StatCard label="Total Expenses" value={fmt(summary.totalPurchases)} trend={summary.totalPurchases > 0 ? 'down' : 'neutral'} />
        <StatCard label="Net Profit" value={fmt(summary.netProfit)}
          trend={summary.netProfit > 0 ? 'up' : summary.netProfit < 0 ? 'down' : 'neutral'} />
        <StatCard label="Today's Sales" value={fmt(summary.todaySales)} sub="today" />
        <StatCard label="Today's Expenses" value={fmt(summary.todayPurchases)} sub="today" />
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Payment methods */}
        <div className="bg-rp-card border border-rp-border rounded-xl p-5">
          <h2 className="text-sm font-semibold mb-4 text-rp-grey uppercase tracking-wider">Sales by Payment Method</h2>
          {byPayment.length === 0 ? (
            <p className="text-sm text-rp-grey py-4 text-center">No sales data yet</p>
          ) : (
            <div className="space-y-3">
              {byPayment.map(p => (
                <div key={p.payment_method}>
                  <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center gap-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        p.payment_method === 'upi' ? 'bg-blue-500/10 text-blue-400' :
                        p.payment_method === 'card' ? 'bg-purple-500/10 text-purple-400' :
                        'bg-emerald-500/10 text-emerald-400'
                      }`}>{p.payment_method.toUpperCase()}</span>
                      <span className="text-xs text-neutral-400">{p.count} txns</span>
                    </div>
                    <span className="font-mono text-sm">{fmt(p.total)}</span>
                  </div>
                  <div className="h-1.5 bg-rp-black rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${
                      p.payment_method === 'upi' ? 'bg-blue-500' :
                      p.payment_method === 'card' ? 'bg-purple-500' : 'bg-emerald-500'
                    }`} style={{ width: `${totalPayments > 0 ? (p.total / totalPayments) * 100 : 0}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Expenses by category */}
        <div className="bg-rp-card border border-rp-border rounded-xl p-5">
          <h2 className="text-sm font-semibold mb-4 text-rp-grey uppercase tracking-wider">Expenses by Category</h2>
          {purchasesByCategory.length === 0 ? (
            <p className="text-sm text-rp-grey py-4 text-center">No expense data yet</p>
          ) : (
            <div className="space-y-3">
              {purchasesByCategory.map(p => {
                const totalExp = purchasesByCategory.reduce((s, x) => s + x.total, 0);
                return (
                  <div key={p.category}>
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center gap-3">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-rp-black text-neutral-400">{p.category}</span>
                        <span className="text-xs text-neutral-500">{p.count}</span>
                      </div>
                      <span className="font-mono text-sm">{fmt(p.total)}</span>
                    </div>
                    <div className="h-1.5 bg-rp-black rounded-full overflow-hidden">
                      <div className="h-full bg-rp-red rounded-full" style={{ width: `${totalExp > 0 ? (p.total / totalExp) * 100 : 0}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top selling items */}
        <div className="bg-rp-card border border-rp-border rounded-xl p-5 col-span-2">
          <h2 className="text-sm font-semibold mb-4 text-rp-grey uppercase tracking-wider">Top Selling Items</h2>
          {topItems.length === 0 ? (
            <p className="text-sm text-rp-grey py-4 text-center">No sales data yet</p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {topItems.map((item, i) => (
                <div key={item.item_name} className="flex justify-between items-center p-3 bg-rp-black/50 rounded-lg hover:bg-rp-black transition-colors">
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                      i < 3 ? 'bg-rp-red/10 text-rp-red' : 'bg-rp-card text-rp-grey'
                    }`}>
                      {i + 1}
                    </span>
                    <span className="text-sm font-medium">{item.item_name}</span>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-sm">{fmt(item.total_revenue)}</p>
                    <p className="text-xs text-rp-grey">{item.total_qty} sold</p>
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
