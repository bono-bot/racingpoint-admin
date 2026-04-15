'use client';

import { useEffect, useState } from 'react';
import { rcFetch } from '@/lib/api/base';
import { SkeletonTable } from '@/components/Skeleton';
import { toast } from 'sonner';

interface PricingTier {
  id: string;
  name: string;
  duration_minutes: number;
  price_paise: number;
  is_trial: boolean;
  is_active: boolean;
  is_popular?: boolean;
  sort_order: number;
}

export default function PricingTiersPage() {
  const [tiers, setTiers] = useState<PricingTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', duration_minutes: '30', price_paise: '70000', is_trial: false, is_popular: false });

  const load = async () => {
    setLoading(true);
    try {
      const data = await rcFetch('/pricing');
      setTiers(data.tiers || []);
    } catch { toast.error('Failed to load pricing tiers'); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    try {
      await rcFetch('/pricing', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name,
          duration_minutes: Number(form.duration_minutes),
          price_paise: Number(form.price_paise),
          is_trial: form.is_trial,
          is_popular: form.is_popular,
        }),
      });
      toast.success('Tier created');
      setShowForm(false);
      setForm({ name: '', duration_minutes: '30', price_paise: '70000', is_trial: false, is_popular: false });
      load();
    } catch (err) { toast.error('Failed: ' + (err as Error).message); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this pricing tier? Active sessions will block deletion.')) return;
    try {
      await rcFetch(`/pricing/${id}`, { method: 'DELETE' });
      toast.success('Tier deleted');
      load();
    } catch (err) { toast.error('Failed: ' + (err as Error).message); }
  };

  const formatCredits = (paise: number) => `${(paise / 100).toLocaleString()} credits`;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Pricing Tiers</h1>
          <p className="text-rp-grey text-sm mt-1">Session plan cards shown on kiosk staff wizard</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="bg-rp-red hover:bg-rp-red/90 text-white text-sm font-semibold px-4 py-2 rounded-lg">
          {showForm ? 'Cancel' : '+ New Tier'}
        </button>
      </div>

      {showForm && (
        <div className="bg-rp-card border border-rp-border rounded-xl p-5 mb-6 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="Name (e.g. '30 Minutes')" value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="bg-neutral-900 border border-rp-border rounded-lg px-3 py-2 text-sm" />
            <input placeholder="Duration (minutes)" type="number" value={form.duration_minutes}
              onChange={e => setForm({ ...form, duration_minutes: e.target.value })}
              className="bg-neutral-900 border border-rp-border rounded-lg px-3 py-2 text-sm" />
            <input placeholder="Price (paise)" type="number" value={form.price_paise}
              onChange={e => setForm({ ...form, price_paise: e.target.value })}
              className="bg-neutral-900 border border-rp-border rounded-lg px-3 py-2 text-sm" />
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-neutral-400">
                <input type="checkbox" checked={form.is_trial}
                  onChange={e => setForm({ ...form, is_trial: e.target.checked })} />
                Free Trial
              </label>
              <label className="flex items-center gap-2 text-sm text-neutral-400">
                <input type="checkbox" checked={form.is_popular}
                  onChange={e => setForm({ ...form, is_popular: e.target.checked })} />
                Popular Badge
              </label>
            </div>
          </div>
          <button onClick={handleCreate} disabled={!form.name}
            className="bg-rp-red hover:bg-rp-red/90 text-white text-sm px-4 py-2 rounded-lg disabled:opacity-50">
            Create Tier
          </button>
        </div>
      )}

      {loading ? <SkeletonTable rows={5} cols={5} /> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-rp-grey border-b border-rp-border">
                <th className="pb-3 pr-4">Order</th>
                <th className="pb-3 pr-4">Name</th>
                <th className="pb-3 pr-4">Duration</th>
                <th className="pb-3 pr-4">Price</th>
                <th className="pb-3 pr-4">Flags</th>
                <th className="pb-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tiers.map(tier => (
                <tr key={tier.id} className="border-b border-rp-border/50 hover:bg-rp-card/50">
                  <td className="py-3 pr-4 text-neutral-500">{tier.sort_order}</td>
                  <td className="py-3 pr-4 font-medium">{tier.name}</td>
                  <td className="py-3 pr-4">{tier.duration_minutes}m</td>
                  <td className="py-3 pr-4 font-mono">{tier.is_trial ? 'FREE' : formatCredits(tier.price_paise)}</td>
                  <td className="py-3 pr-4">
                    <div className="flex gap-1">
                      {tier.is_trial && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-400">trial</span>}
                      {tier.is_popular && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400">popular</span>}
                      {!tier.is_active && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-400">inactive</span>}
                    </div>
                  </td>
                  <td className="py-3">
                    <button onClick={() => handleDelete(tier.id)}
                      className="text-xs text-red-400 hover:text-red-300">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {tiers.length === 0 && <div className="text-center text-rp-grey py-8">No pricing tiers configured</div>}
        </div>
      )}
    </div>
  );
}
