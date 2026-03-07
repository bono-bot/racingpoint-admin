'use client';

import { useEffect, useState } from 'react';

interface WalletTxn {
  id: string;
  driver_id: string;
  amount_paise: number;
  balance_after_paise: number;
  txn_type: string;
  reference_id: string | null;
  notes: string | null;
  staff_id: string | null;
  created_at: string;
  driver_name: string;
  driver_phone: string | null;
}

interface Summary {
  total_credits_paise: number;
  total_debits_paise: number;
  net_paise: number;
  count: number;
}

interface TxnReport {
  transactions: WalletTxn[];
  summary: Summary;
  error?: string;
}

function fmt(paise: number) {
  return `\u20B9${(paise / 100).toLocaleString('en-IN')}`;
}

function fmtClock(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

const typeLabels: Record<string, string> = {
  topup_cash: 'Cash Topup',
  topup_card: 'Card Topup',
  topup_upi: 'UPI Topup',
  debit_session: 'Session Debit',
  bonus: 'Bonus',
  refund_session: 'Refund',
  refund_manual: 'Refund (Manual)',
  debit_cafe: 'Cafe Debit',
};

function typeBadge(txnType: string) {
  const isCredit = txnType.startsWith('topup') || txnType === 'bonus' || txnType.startsWith('refund');
  const colors = isCredit
    ? txnType === 'bonus'
      ? 'bg-purple-900/40 text-purple-400 border-purple-800'
      : txnType.startsWith('refund')
        ? 'bg-blue-900/40 text-blue-400 border-blue-800'
        : 'bg-green-900/40 text-green-400 border-green-800'
    : 'bg-red-900/40 text-red-400 border-red-800';

  return (
    <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium border ${colors}`}>
      {typeLabels[txnType] || txnType.replace(/_/g, ' ')}
    </span>
  );
}

function methodBadge(txnType: string) {
  if (txnType === 'topup_cash') return <span className="px-2 py-0.5 rounded-full text-[11px] font-medium border bg-emerald-900/40 text-emerald-400 border-emerald-800">Cash</span>;
  if (txnType === 'topup_upi') return <span className="px-2 py-0.5 rounded-full text-[11px] font-medium border bg-blue-900/40 text-blue-400 border-blue-800">UPI</span>;
  if (txnType === 'topup_card') return <span className="px-2 py-0.5 rounded-full text-[11px] font-medium border bg-purple-900/40 text-purple-400 border-purple-800">Card</span>;
  return null;
}

export default function WalletTransactionsPage() {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [report, setReport] = useState<TxnReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/rc/wallet/transactions?date=${date}`)
      .then(r => r.json())
      .then((d: TxnReport) => { setReport(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [date]);

  // Payment method breakdown
  const methodBreakdown = report?.transactions.reduce((acc, t) => {
    if (t.txn_type === 'topup_cash') { acc.cash_count++; acc.cash_paise += t.amount_paise; }
    else if (t.txn_type === 'topup_upi') { acc.upi_count++; acc.upi_paise += t.amount_paise; }
    else if (t.txn_type === 'topup_card') { acc.card_count++; acc.card_paise += t.amount_paise; }
    return acc;
  }, { cash_count: 0, cash_paise: 0, upi_count: 0, upi_paise: 0, card_count: 0, card_paise: 0 });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Wallet Transactions</h1>
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="bg-rp-card border border-rp-border rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-rp-red"
        />
      </div>

      {loading && (
        <div className="text-center text-rp-grey py-12">Loading transactions...</div>
      )}

      {!loading && report && !report.error && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-rp-card border border-rp-border rounded-xl p-5">
              <p className="text-xs text-rp-grey mb-1">Total Credits</p>
              <p className="text-2xl font-bold text-green-400">{fmt(report.summary.total_credits_paise)}</p>
            </div>
            <div className="bg-rp-card border border-rp-border rounded-xl p-5">
              <p className="text-xs text-rp-grey mb-1">Total Debits</p>
              <p className="text-2xl font-bold text-red-400">{fmt(report.summary.total_debits_paise)}</p>
            </div>
            <div className="bg-rp-card border border-rp-border rounded-xl p-5">
              <p className="text-xs text-rp-grey mb-1">Net</p>
              <p className={`text-2xl font-bold ${report.summary.net_paise >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {fmt(report.summary.net_paise)}
              </p>
            </div>
            <div className="bg-rp-card border border-rp-border rounded-xl p-5">
              <p className="text-xs text-rp-grey mb-1">Transactions</p>
              <p className="text-2xl font-bold">{report.summary.count}</p>
            </div>
          </div>

          {/* Payment Method Breakdown */}
          {methodBreakdown && (methodBreakdown.cash_count + methodBreakdown.upi_count + methodBreakdown.card_count) > 0 && (
            <div className="mb-6">
              <h2 className="text-sm font-semibold text-rp-grey uppercase tracking-wider mb-3">Topup Breakdown</h2>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-rp-card border border-rp-border rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-rp-grey">Cash</p>
                    <span className="text-[11px] text-emerald-400">{methodBreakdown.cash_count} txns</span>
                  </div>
                  <p className="text-lg font-bold text-emerald-400">{fmt(methodBreakdown.cash_paise)}</p>
                </div>
                <div className="bg-rp-card border border-rp-border rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-rp-grey">UPI</p>
                    <span className="text-[11px] text-blue-400">{methodBreakdown.upi_count} txns</span>
                  </div>
                  <p className="text-lg font-bold text-blue-400">{fmt(methodBreakdown.upi_paise)}</p>
                </div>
                <div className="bg-rp-card border border-rp-border rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-rp-grey">Card</p>
                    <span className="text-[11px] text-purple-400">{methodBreakdown.card_count} txns</span>
                  </div>
                  <p className="text-lg font-bold text-purple-400">{fmt(methodBreakdown.card_paise)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Transactions Table */}
          <div>
            <h2 className="text-sm font-semibold text-rp-grey uppercase tracking-wider mb-3">All Transactions</h2>
            {report.transactions.length === 0 ? (
              <div className="text-center text-rp-grey py-12 bg-rp-card border border-rp-border rounded-xl">
                No transactions on {date}
              </div>
            ) : (
              <div className="bg-rp-card border border-rp-border rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-rp-border text-rp-grey text-left">
                        <th className="px-4 py-2.5 font-medium">Time</th>
                        <th className="px-4 py-2.5 font-medium">Customer</th>
                        <th className="px-4 py-2.5 font-medium">Type</th>
                        <th className="px-4 py-2.5 font-medium">Method</th>
                        <th className="px-4 py-2.5 font-medium text-right">Amount</th>
                        <th className="px-4 py-2.5 font-medium text-right">Balance After</th>
                        <th className="px-4 py-2.5 font-medium">Staff</th>
                        <th className="px-4 py-2.5 font-medium">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.transactions.map((t) => {
                        const isCredit = t.txn_type.startsWith('topup') || t.txn_type === 'bonus' || t.txn_type.startsWith('refund');
                        return (
                          <tr key={t.id} className="border-b border-rp-border/50 last:border-0 hover:bg-white/[0.02]">
                            <td className="px-4 py-2.5 tabular-nums">{fmtClock(t.created_at)}</td>
                            <td className="px-4 py-2.5">
                              <div className="font-medium">{t.driver_name}</div>
                              {t.driver_phone && <div className="text-[11px] text-rp-grey">{t.driver_phone}</div>}
                            </td>
                            <td className="px-4 py-2.5">{typeBadge(t.txn_type)}</td>
                            <td className="px-4 py-2.5">{methodBadge(t.txn_type)}</td>
                            <td className={`px-4 py-2.5 text-right tabular-nums font-medium ${isCredit ? 'text-green-400' : 'text-red-400'}`}>
                              {isCredit ? '+' : '-'}{fmt(t.amount_paise)}
                            </td>
                            <td className="px-4 py-2.5 text-right tabular-nums">{fmt(t.balance_after_paise)}</td>
                            <td className="px-4 py-2.5 text-rp-grey">{t.staff_id || '-'}</td>
                            <td className="px-4 py-2.5 text-rp-grey text-xs max-w-[200px] truncate">{t.notes || '-'}</td>
                          </tr>
                        );
                      })}
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
