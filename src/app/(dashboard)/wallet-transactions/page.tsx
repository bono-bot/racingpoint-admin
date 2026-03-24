'use client';

import { useEffect, useState, useCallback } from 'react';

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

interface DriverOption {
  id: string;
  name: string;
  phone: string | null;
  wallet_balance_paise: number;
}

interface DriversListResponse {
  drivers: DriverOption[];
  error?: string;
}

interface TopupResponse {
  success?: boolean;
  error?: string;
  balance_paise?: number;
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

const TOPUP_METHODS = [
  { value: 'topup_cash', label: 'Cash' },
  { value: 'topup_upi', label: 'UPI' },
  { value: 'topup_card', label: 'Card' },
] as const;

export default function WalletTransactionsPage() {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [report, setReport] = useState<TxnReport | null>(null);
  const [loading, setLoading] = useState(true);

  // Driver filter state
  const [drivers, setDrivers] = useState<DriverOption[]>([]);
  const [driversLoading, setDriversLoading] = useState(true);
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  const [driverSearch, setDriverSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  // Top-up modal state
  const [showTopup, setShowTopup] = useState(false);
  const [topupAmount, setTopupAmount] = useState('');
  const [topupMethod, setTopupMethod] = useState<string>('topup_cash');
  const [topupNotes, setTopupNotes] = useState('');
  const [topupLoading, setTopupLoading] = useState(false);
  const [topupError, setTopupError] = useState('');

  // Fetch driver list on mount
  useEffect(() => {
    setDriversLoading(true);
    fetch('/api/rc/customer/drivers')
      .then(r => r.json())
      .then((d: DriversListResponse) => {
        setDrivers(d.drivers || []);
        setDriversLoading(false);
      })
      .catch(() => {
        setDriversLoading(false);
      });
  }, []);

  const selectedDriver = drivers.find(d => d.id === selectedDriverId);

  // Fetch transactions (with optional driver_id filter)
  const fetchTransactions = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ date });
    if (selectedDriverId) params.set('driver_id', selectedDriverId);
    fetch(`/api/rc/wallet/transactions?${params.toString()}`)
      .then(r => r.json())
      .then((d: TxnReport) => { setReport(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [date, selectedDriverId]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Filter dropdown options
  const filteredDrivers = driverSearch.trim()
    ? drivers.filter(d =>
        d.name.toLowerCase().includes(driverSearch.toLowerCase()) ||
        (d.phone && d.phone.includes(driverSearch))
      )
    : drivers;

  // Handle driver selection
  function selectDriver(driverId: string) {
    setSelectedDriverId(driverId);
    const d = drivers.find(dr => dr.id === driverId);
    setDriverSearch(d ? d.name : '');
    setShowDropdown(false);
  }

  function clearDriver() {
    setSelectedDriverId('');
    setDriverSearch('');
  }

  // Top-up handler
  async function handleTopup() {
    if (!selectedDriverId || !topupAmount) return;
    const amountPaise = Math.round(parseFloat(topupAmount) * 100);
    if (isNaN(amountPaise) || amountPaise <= 0) {
      setTopupError('Enter a valid amount');
      return;
    }

    setTopupLoading(true);
    setTopupError('');
    try {
      const res = await fetch(`/api/rc/wallet/topup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          driver_id: selectedDriverId,
          amount_paise: amountPaise,
          txn_type: topupMethod,
          notes: topupNotes || undefined,
        }),
      });
      const data: TopupResponse = await res.json();
      if (!res.ok || data.error) {
        setTopupError(data.error || `Topup failed (${res.status})`);
      } else {
        // Refresh transactions and driver balance
        setShowTopup(false);
        setTopupAmount('');
        setTopupNotes('');
        fetchTransactions();
        // Update driver balance in local state
        if (data.balance_paise !== undefined) {
          setDrivers(prev => prev.map(d =>
            d.id === selectedDriverId ? { ...d, wallet_balance_paise: data.balance_paise as number } : d
          ));
        }
      }
    } catch {
      setTopupError('Network error — could not reach server');
    } finally {
      setTopupLoading(false);
    }
  }

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

      {/* Driver Filter */}
      <div className="mb-6 flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <label className="block text-xs text-rp-grey mb-1">Filter by Driver</label>
          <input
            type="text"
            value={driverSearch}
            onChange={e => { setDriverSearch(e.target.value); setShowDropdown(true); }}
            onFocus={() => setShowDropdown(true)}
            placeholder={driversLoading ? 'Loading drivers...' : 'Search by name or phone...'}
            disabled={driversLoading}
            className="w-full bg-rp-card border border-rp-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-rp-grey focus:outline-none focus:border-rp-red"
          />
          {showDropdown && filteredDrivers.length > 0 && (
            <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-rp-card border border-rp-border rounded-lg max-h-60 overflow-y-auto shadow-xl">
              {filteredDrivers.slice(0, 20).map(d => (
                <button
                  key={d.id}
                  onClick={() => selectDriver(d.id)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-white/[0.05] flex items-center justify-between"
                >
                  <div>
                    <span className="text-white">{d.name}</span>
                    {d.phone && <span className="text-rp-grey ml-2 text-xs">{d.phone}</span>}
                  </div>
                  <span className="text-xs text-rp-grey">{fmt(d.wallet_balance_paise)}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {selectedDriverId && (
          <>
            <button
              onClick={clearDriver}
              className="mt-5 text-sm text-rp-grey hover:text-white transition-colors"
            >
              Clear
            </button>
            <button
              onClick={() => setShowTopup(true)}
              className="mt-5 px-4 py-2 bg-rp-red/10 text-rp-red rounded-lg text-sm font-medium hover:bg-rp-red/20 transition-colors"
            >
              Top Up
            </button>
          </>
        )}
      </div>

      {/* Click outside to close dropdown */}
      {showDropdown && (
        <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
      )}

      {/* Selected Driver Wallet Balance */}
      {selectedDriver && (
        <div className="mb-6 bg-rp-card border border-rp-border rounded-xl p-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-rp-grey mb-1">Selected Driver</p>
            <p className="text-white font-bold text-lg">{selectedDriver.name}</p>
            {selectedDriver.phone && <p className="text-rp-grey text-sm">{selectedDriver.phone}</p>}
          </div>
          <div className="text-right">
            <p className="text-xs text-rp-grey mb-1">Wallet Balance</p>
            <p className="text-2xl font-bold text-green-400">{fmt(selectedDriver.wallet_balance_paise)}</p>
          </div>
        </div>
      )}

      {/* Top Up Modal */}
      {showTopup && selectedDriver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-rp-card border border-rp-border rounded-xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-lg font-bold mb-1">Top Up Wallet</h2>
            <p className="text-rp-grey text-sm mb-4">Adding funds for {selectedDriver.name}</p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-rp-grey mb-1">Amount (INR)</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={topupAmount}
                  onChange={e => setTopupAmount(e.target.value)}
                  placeholder="500"
                  className="w-full bg-rp-black border border-rp-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-rp-grey focus:outline-none focus:border-rp-red"
                />
              </div>

              <div>
                <label className="block text-xs text-rp-grey mb-1">Payment Method</label>
                <div className="flex gap-2">
                  {TOPUP_METHODS.map(m => (
                    <button
                      key={m.value}
                      onClick={() => setTopupMethod(m.value)}
                      className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        topupMethod === m.value
                          ? 'bg-rp-red/10 text-rp-red border border-rp-red/30'
                          : 'bg-rp-black border border-rp-border text-rp-grey hover:text-white'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs text-rp-grey mb-1">Notes (optional)</label>
                <input
                  type="text"
                  value={topupNotes}
                  onChange={e => setTopupNotes(e.target.value)}
                  placeholder="e.g. Walk-in cash topup"
                  className="w-full bg-rp-black border border-rp-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-rp-grey focus:outline-none focus:border-rp-red"
                />
              </div>

              {topupError && (
                <p className="text-red-400 text-sm">{topupError}</p>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => { setShowTopup(false); setTopupError(''); }}
                className="px-4 py-2 rounded-lg text-sm text-rp-grey hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleTopup}
                disabled={topupLoading || !topupAmount}
                className="px-4 py-2 bg-rp-red text-white rounded-lg text-sm font-medium hover:bg-rp-red/80 transition-colors disabled:opacity-50"
              >
                {topupLoading ? 'Processing...' : 'Confirm Top Up'}
              </button>
            </div>
          </div>
        </div>
      )}

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
            <h2 className="text-sm font-semibold text-rp-grey uppercase tracking-wider mb-3">
              {selectedDriver ? `Transactions for ${selectedDriver.name}` : 'All Transactions'}
            </h2>
            {report.transactions.length === 0 ? (
              <div className="text-center text-rp-grey py-12 bg-rp-card border border-rp-border rounded-xl">
                {selectedDriver
                  ? `No transactions for ${selectedDriver.name} on ${date}`
                  : `No transactions on ${date}`
                }
              </div>
            ) : (
              <div className="bg-rp-card border border-rp-border rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-rp-border text-rp-grey text-left">
                        <th className="px-4 py-2.5 font-medium">Txn ID</th>
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
                            <td className="px-4 py-2.5 font-mono text-[11px] text-rp-grey">{t.id.slice(0, 8)}</td>
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
