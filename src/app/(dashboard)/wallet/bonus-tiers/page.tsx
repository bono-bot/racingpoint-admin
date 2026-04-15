'use client';

import { useEffect, useState } from 'react';
import { rcFetch } from '@/lib/api/base';
import { SkeletonTable } from '@/components/Skeleton';
import { toast } from 'sonner';

interface BonusTier {
  id: string;
  min_amount_paise: number;
  bonus_percent: number;
  sort_order: number;
  is_active: boolean;
}

export default function BonusTiersPage() {
  const [tiers, setTiers] = useState<BonusTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ min_amount_paise: '200000', bonus_percent: '10' });

  const load = async () => {
    setLoading(true);
    try {
      const data = await rcFetch('/wallet/bonus-tiers/admin');
      setTiers(data.tiers || []);
    } catch { toast.error('Failed to load bonus tiers'); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    try {
      await rcFetch('/wallet/bonus-tiers', {
        method: 'POST',
        body: JSON.stringify({
          min_amount_paise: Number(form.min_amount_paise),
          bonus_percent: Number(form.bonus_percent),
        }),
      });
      toast.success('Bonus tier created');
      setShowForm(false);
      setForm({ min_amount_paise: '200000', bonus_percent: '10' });
      load();
    } catch (err) { toast.error('Failed: ' + (err as Error).message); }
  };

  const handleToggle = async (id: string) => {
    try {
      await rcFetch(`/wallet/bonus-tiers/${id}/toggle`, { method: 'POST' });
      toast.success('Toggled');
      load();
    } catch (err) { toast.error('Failed: ' + (err as Error).message); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this bonus tier?')) return;
    try {
      await rcFetch(`/wallet/bonus-tiers/${id}`, { method: 'DELETE' });
      toast.success('Deleted');
      load();
    } catch (err) { toast.error('Failed: ' + (err as Error).message); }
  };

  const formatCredits = (paise: number) => (paise / 100).toLocaleString();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Wallet Bonus Tiers</h1>
          <p className="text-rp-grey text-sm mt-1">Top-up bonus rules: &quot;Top up 2000+ credits, get 10% bonus&quot;</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="bg-rp-red hover:bg-rp-red/90 text-white text-sm font-semibold px-4 py-2 rounded-lg">
          {showForm ? 'Cancel' : '+ New Tier'}
        </button>
      </div>

      {showForm && (
        <div className="bg-rp-card border border-rp-border rounded-xl p-5 mb-6 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-rp-grey mb-1 block">Min top-up amount (paise)</label>
              <input type="number" value={form.min_amount_paise}
                onChange={e => setForm({ ...form, min_amount_paise: e.target.value })}
                className="w-full bg-neutral-900 border border-rp-border rounded-lg px-3 py-2 text-sm" />
              <span className="text-[10px] text-neutral-500">{formatCredits(Number(form.min_amount_paise))} credits</span>
            </div>
            <div>
              <label className="text-xs text-rp-grey mb-1 block">Bonus %</label>
              <input type="number" value={form.bonus_percent}
                onChange={e => setForm({ ...form, bonus_percent: e.target.value })}
                className="w-full bg-neutral-900 border border-rp-border rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="text-xs text-neutral-400">
            Preview: Top up {formatCredits(Number(form.min_amount_paise))}+ credits, get {form.bonus_percent}% bonus
            ({formatCredits(Math.round(Number(form.min_amount_paise) * Number(form.bonus_percent) / 100))} bonus credits)
          </div>
          <button onClick={handleCreate}
            className="bg-rp-red hover:bg-rp-red/90 text-white text-sm px-4 py-2 rounded-lg">
            Create Tier
          </button>
        </div>
      )}

      {loading ? <SkeletonTable rows={4} cols={4} /> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-rp-grey border-b border-rp-border">
                <th className="pb-3 pr-4">Min Top-up</th>
                <th className="pb-3 pr-4">Bonus %</th>
                <th className="pb-3 pr-4">Example Bonus</th>
                <th className="pb-3 pr-4">Status</th>
                <th className="pb-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tiers.map(tier => (
                <tr key={tier.id} className="border-b border-rp-border/50 hover:bg-rp-card/50">
                  <td className="py-3 pr-4 font-mono">{formatCredits(tier.min_amount_paise)} credits</td>
                  <td className="py-3 pr-4 font-medium">{tier.bonus_percent}%</td>
                  <td className="py-3 pr-4 text-green-400 font-mono">
                    +{formatCredits(Math.round(tier.min_amount_paise * tier.bonus_percent / 100))}
                  </td>
                  <td className="py-3 pr-4">
                    <button onClick={() => handleToggle(tier.id)}
                      className={`px-2 py-0.5 text-xs rounded-full ${
                        tier.is_active ? 'bg-green-500/10 text-green-400' : 'bg-neutral-800 text-neutral-500'
                      }`}>
                      {tier.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="py-3">
                    <button onClick={() => handleDelete(tier.id)}
                      className="text-xs text-red-400 hover:text-red-300">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {tiers.length === 0 && <div className="text-center text-rp-grey py-8">No bonus tiers configured</div>}
        </div>
      )}
    </div>
  );
}
