'use client';

import useSWR from 'swr';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { driversApi, type Driver } from '@/lib/api/drivers';

function formatWallet(paise: number): string {
  return '₹' + (paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function AddDriverModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      await driversApi.createDriver({
        name: name.trim(),
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
      });
      toast.success('Driver created');
      onCreated();
      onClose();
    } catch (err) {
      toast.error('Failed to create driver: ' + (err as Error).message);
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
        className="bg-rp-card border border-rp-border rounded-xl w-full max-w-md p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold mb-4">Add Driver</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-rp-grey mb-1">Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full bg-rp-black border border-rp-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-rp-red"
              placeholder="Driver name"
            />
          </div>
          <div>
            <label className="block text-sm text-rp-grey mb-1">Phone</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-rp-black border border-rp-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-rp-red"
              placeholder="Phone number"
            />
          </div>
          <div>
            <label className="block text-sm text-rp-grey mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-rp-black border border-rp-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-rp-red"
              placeholder="Email address"
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
              disabled={submitting || !name.trim()}
              className="px-4 py-2 text-sm bg-rp-red hover:bg-rp-red/90 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Creating...' : 'Create Driver'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function DriversPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  const { data: drivers, error, mutate } = useSWR<Driver[]>(
    '/drivers',
    () => driversApi.getDrivers(),
    { refreshInterval: 30000 }
  );

  const filtered = drivers
    ? drivers.filter((d) => {
        const q = search.toLowerCase();
        return (
          d.name.toLowerCase().includes(q) ||
          (d.phone ?? '').toLowerCase().includes(q) ||
          (d.email ?? '').toLowerCase().includes(q)
        );
      })
    : [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Drivers</h1>
          {drivers && (
            <p className="text-sm text-rp-grey mt-1">{drivers.length} total</p>
          )}
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-rp-red hover:bg-rp-red/90 text-white text-sm px-4 py-2 rounded-lg transition-colors"
        >
          + Add Driver
        </button>
      </div>

      <input
        type="text"
        placeholder="Search by name, phone, or email..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full bg-rp-card border border-rp-border rounded-lg px-4 py-2 text-sm mb-6 focus:outline-none focus:border-rp-red"
      />

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
          <p className="text-red-400 text-sm mb-2">Failed to load drivers.</p>
          <button
            onClick={() => mutate()}
            className="text-sm bg-red-500/20 hover:bg-red-500/30 text-red-300 px-3 py-1 rounded transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {!drivers && !error ? (
        <div className="text-center text-rp-grey py-8">Loading drivers...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center text-rp-grey py-8">
          {search ? 'No drivers match your search' : 'No drivers found'}
        </div>
      ) : (
        <div className="bg-rp-card border border-rp-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-rp-border">
                <th className="text-left text-xs uppercase text-rp-grey px-4 py-3">Name</th>
                <th className="text-left text-xs uppercase text-rp-grey px-4 py-3">Phone</th>
                <th className="text-left text-xs uppercase text-rp-grey px-4 py-3">Email</th>
                <th className="text-right text-xs uppercase text-rp-grey px-4 py-3">Sessions</th>
                <th className="text-right text-xs uppercase text-rp-grey px-4 py-3">Laps</th>
                <th className="text-right text-xs uppercase text-rp-grey px-4 py-3">Wallet</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((driver) => (
                <tr
                  key={driver.id}
                  onClick={() => router.push(`/customers/${driver.id}`)}
                  className="border-b border-rp-border/50 hover:bg-rp-black/30 transition-colors cursor-pointer"
                >
                  <td className="px-4 py-3 text-sm font-medium text-white">{driver.name}</td>
                  <td className="px-4 py-3 text-sm text-neutral-400">{driver.phone ?? '—'}</td>
                  <td className="px-4 py-3 text-sm text-neutral-400">{driver.email ?? '—'}</td>
                  <td className="px-4 py-3 text-sm text-white text-right">{driver.total_sessions}</td>
                  <td className="px-4 py-3 text-sm text-white text-right">{driver.total_laps}</td>
                  <td className="px-4 py-3 text-sm text-emerald-400 text-right font-medium">
                    {formatWallet(driver.wallet_balance_paise)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAddModal && (
        <AddDriverModal
          onClose={() => setShowAddModal(false)}
          onCreated={() => mutate()}
        />
      )}
    </div>
  );
}
