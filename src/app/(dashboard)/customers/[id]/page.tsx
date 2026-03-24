'use client';

import useSWR from 'swr';
import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { driversApi, type Driver, type WalletBalance } from '@/lib/api/drivers';
import { formatDate } from '@/lib/utils';

function formatWallet(paise: number): string {
  return '₹' + (paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function formatDriveTime(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function TopUpModal({
  driverId,
  onClose,
  onSuccess,
}: {
  driverId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [amountRupees, setAmountRupees] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const rupees = parseFloat(amountRupees);
    if (isNaN(rupees) || rupees <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    const amount_paise = Math.round(rupees * 100);
    setSubmitting(true);
    try {
      await driversApi.topupWallet(driverId, { amount_paise, note: note.trim() || undefined });
      toast.success(`Topped up ${formatWallet(amount_paise)}`);
      onSuccess();
      onClose();
    } catch (err) {
      toast.error('Top up failed: ' + (err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="bg-rp-card border border-rp-border rounded-xl w-full max-w-sm p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold mb-4">Top Up Wallet</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-rp-grey mb-1">Amount (₹) *</label>
            <input
              type="number"
              min="1"
              step="0.01"
              value={amountRupees}
              onChange={(e) => setAmountRupees(e.target.value)}
              required
              autoFocus
              className="w-full bg-rp-black border border-rp-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-rp-red"
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="block text-sm text-rp-grey mb-1">Note</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full bg-rp-black border border-rp-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-rp-red"
              placeholder="Optional note"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-rp-grey hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !amountRupees}
              className="px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Processing...' : 'Top Up'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function DriverDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [showTopUp, setShowTopUp] = useState(false);

  const { data: driver, error: driverError } = useSWR<Driver>(
    id ? `/drivers/${id}` : null,
    () => driversApi.getDriver(id)
  );

  const { data: wallet, error: walletError, mutate: mutateWallet } = useSWR<WalletBalance>(
    id ? `/wallet/${id}` : null,
    () => driversApi.getDriverWallet(id)
  );

  if (driverError) {
    return (
      <div>
        <button
          onClick={() => router.push('/customers')}
          className="text-sm text-rp-grey hover:text-white mb-6 flex items-center gap-1 transition-colors"
        >
          &larr; Back to Drivers
        </button>
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
          <p className="text-red-400 text-sm">Failed to load driver profile.</p>
        </div>
      </div>
    );
  }

  const loading = !driver;

  return (
    <div>
      {/* Back button */}
      <button
        onClick={() => router.push('/customers')}
        className="text-sm text-rp-grey hover:text-white mb-6 flex items-center gap-1 transition-colors"
      >
        &larr; Back to Drivers
      </button>

      {loading ? (
        <div className="space-y-4">
          <div className="h-8 bg-rp-card rounded w-48 animate-pulse" />
          <div className="h-4 bg-rp-card rounded w-32 animate-pulse" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 bg-rp-card border border-rp-border rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold">{driver.name}</h1>
            <div className="flex flex-wrap gap-4 mt-2 text-sm text-neutral-400">
              {driver.phone && <span>{driver.phone}</span>}
              {driver.email && <span>{driver.email}</span>}
              <span>Joined {formatDate(driver.created_at)}</span>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <div className="bg-rp-card border border-rp-border rounded-xl p-4">
              <p className="text-xs uppercase text-rp-grey mb-1">Sessions</p>
              <p className="text-2xl font-bold">{driver.total_sessions}</p>
            </div>
            <div className="bg-rp-card border border-rp-border rounded-xl p-4">
              <p className="text-xs uppercase text-rp-grey mb-1">Laps</p>
              <p className="text-2xl font-bold">{driver.total_laps}</p>
            </div>
            <div className="bg-rp-card border border-rp-border rounded-xl p-4">
              <p className="text-xs uppercase text-rp-grey mb-1">Drive Time</p>
              <p className="text-2xl font-bold">{formatDriveTime(driver.total_drive_time_secs)}</p>
            </div>
            <div className="bg-rp-card border border-rp-border rounded-xl p-4">
              <p className="text-xs uppercase text-rp-grey mb-1">Wallet</p>
              <p className="text-2xl font-bold text-emerald-400">
                {formatWallet(driver.wallet_balance_paise)}
              </p>
            </div>
          </div>

          {/* Wallet section */}
          <div className="bg-rp-card border border-rp-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Wallet</h2>
              <button
                onClick={() => setShowTopUp(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm px-4 py-2 rounded-lg transition-colors"
              >
                Top Up
              </button>
            </div>
            {walletError ? (
              <p className="text-sm text-red-400">Failed to load wallet balance.</p>
            ) : !wallet ? (
              <div className="h-12 bg-rp-black rounded animate-pulse" />
            ) : (
              <div className="flex items-center gap-3">
                <div className="text-3xl font-bold text-emerald-400">
                  {formatWallet(wallet.balance_paise)}
                </div>
                <div className="text-sm text-rp-grey">current balance</div>
              </div>
            )}
          </div>

          {/* Additional profile info */}
          {(driver.steam_guid || driver.iracing_id) && (
            <div className="bg-rp-card border border-rp-border rounded-xl p-6 mt-4">
              <h2 className="text-lg font-semibold mb-4">Gaming Profiles</h2>
              <div className="space-y-2 text-sm">
                {driver.steam_guid && (
                  <div className="flex gap-3">
                    <span className="text-rp-grey w-24">Steam GUID</span>
                    <span className="text-white font-mono">{driver.steam_guid}</span>
                  </div>
                )}
                {driver.iracing_id && (
                  <div className="flex gap-3">
                    <span className="text-rp-grey w-24">iRacing ID</span>
                    <span className="text-white font-mono">{driver.iracing_id}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {showTopUp && driver && (
        <TopUpModal
          driverId={driver.id}
          onClose={() => setShowTopUp(false)}
          onSuccess={() => mutateWallet()}
        />
      )}
    </div>
  );
}
