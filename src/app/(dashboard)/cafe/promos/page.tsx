'use client';

import { useEffect, useState } from 'react';
import { rcFetch } from '@/lib/api/base';
import { SkeletonTable } from '@/components/Skeleton';
import { toast } from 'sonner';

interface CafePromo {
  id: string;
  name: string;
  promo_type: string;
  description: string;
  discount_percent: number | null;
  discount_flat_paise: number | null;
  combo_items: string | null;
  combo_price_paise: number | null;
  active_days: string | null;
  start_hour: number | null;
  end_hour: number | null;
  is_active: boolean;
  created_at: string;
}

const PROMO_TYPES = ['combo', 'happy_hour', 'discount', 'bogo'];
const TYPE_COLORS: Record<string, string> = {
  combo: 'bg-purple-500/10 text-purple-400',
  happy_hour: 'bg-amber-500/10 text-amber-400',
  discount: 'bg-blue-500/10 text-blue-400',
  bogo: 'bg-green-500/10 text-green-400',
};

export default function CafePromosPage() {
  const [promos, setPromos] = useState<CafePromo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '', promo_type: 'combo', description: '',
    discount_percent: '', discount_flat_paise: '',
    combo_items: '', combo_price_paise: '',
    start_hour: '', end_hour: '',
  });

  const load = async () => {
    setLoading(true);
    try {
      const data = await rcFetch('/cafe/promos');
      setPromos(data.promos || []);
    } catch { toast.error('Failed to load promos'); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    try {
      await rcFetch('/cafe/promos', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name,
          promo_type: form.promo_type,
          description: form.description,
          discount_percent: form.discount_percent ? Number(form.discount_percent) : null,
          discount_flat_paise: form.discount_flat_paise ? Number(form.discount_flat_paise) : null,
          combo_items: form.combo_items || null,
          combo_price_paise: form.combo_price_paise ? Number(form.combo_price_paise) : null,
          start_hour: form.start_hour ? Number(form.start_hour) : null,
          end_hour: form.end_hour ? Number(form.end_hour) : null,
        }),
      });
      toast.success('Promo created');
      setShowForm(false);
      load();
    } catch (err) { toast.error('Failed: ' + (err as Error).message); }
  };

  const handleToggle = async (id: string) => {
    try {
      await rcFetch(`/cafe/promos/${id}/toggle`, { method: 'POST' });
      toast.success('Toggled');
      load();
    } catch (err) { toast.error('Failed: ' + (err as Error).message); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this promo permanently?')) return;
    try {
      await rcFetch(`/cafe/promos/${id}`, { method: 'DELETE' });
      toast.success('Promo deleted');
      load();
    } catch (err) { toast.error('Failed: ' + (err as Error).message); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Cafe Promos</h1>
          <p className="text-rp-grey text-sm mt-1">Combo deals, happy hours, and discounts for the cafe menu</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="bg-rp-red hover:bg-rp-red/90 text-white text-sm font-semibold px-4 py-2 rounded-lg">
          {showForm ? 'Cancel' : '+ New Promo'}
        </button>
      </div>

      {showForm && (
        <div className="bg-rp-card border border-rp-border rounded-xl p-5 mb-6 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="Promo name" value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="bg-neutral-900 border border-rp-border rounded-lg px-3 py-2 text-sm" />
            <select value={form.promo_type} onChange={e => setForm({ ...form, promo_type: e.target.value })}
              className="bg-neutral-900 border border-rp-border rounded-lg px-3 py-2 text-sm">
              {PROMO_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <input placeholder="Description" value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              className="col-span-2 bg-neutral-900 border border-rp-border rounded-lg px-3 py-2 text-sm" />
            {form.promo_type === 'discount' && (
              <input placeholder="Discount %" type="number" value={form.discount_percent}
                onChange={e => setForm({ ...form, discount_percent: e.target.value })}
                className="bg-neutral-900 border border-rp-border rounded-lg px-3 py-2 text-sm" />
            )}
            {form.promo_type === 'combo' && (
              <>
                <input placeholder="Combo items (e.g. Burger + Fries)" value={form.combo_items}
                  onChange={e => setForm({ ...form, combo_items: e.target.value })}
                  className="bg-neutral-900 border border-rp-border rounded-lg px-3 py-2 text-sm" />
                <input placeholder="Combo price (paise)" type="number" value={form.combo_price_paise}
                  onChange={e => setForm({ ...form, combo_price_paise: e.target.value })}
                  className="bg-neutral-900 border border-rp-border rounded-lg px-3 py-2 text-sm" />
              </>
            )}
            {form.promo_type === 'happy_hour' && (
              <>
                <input placeholder="Start hour (0-23)" type="number" value={form.start_hour}
                  onChange={e => setForm({ ...form, start_hour: e.target.value })}
                  className="bg-neutral-900 border border-rp-border rounded-lg px-3 py-2 text-sm" />
                <input placeholder="End hour (0-23)" type="number" value={form.end_hour}
                  onChange={e => setForm({ ...form, end_hour: e.target.value })}
                  className="bg-neutral-900 border border-rp-border rounded-lg px-3 py-2 text-sm" />
              </>
            )}
          </div>
          <button onClick={handleCreate} disabled={!form.name}
            className="bg-rp-red hover:bg-rp-red/90 text-white text-sm px-4 py-2 rounded-lg disabled:opacity-50">
            Create Promo
          </button>
        </div>
      )}

      {loading ? <SkeletonTable rows={5} cols={4} /> : (
        <div className="space-y-2">
          {promos.map(promo => (
            <div key={promo.id} className="bg-rp-card border border-rp-border rounded-xl p-4 hover:border-neutral-600 transition">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${TYPE_COLORS[promo.promo_type] || 'bg-rp-card'}`}>
                    {promo.promo_type}
                  </span>
                  <div>
                    <span className="font-medium">{promo.name}</span>
                    {promo.description && <p className="text-xs text-rp-grey">{promo.description}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleToggle(promo.id)}
                    className={`px-3 py-1 text-xs rounded-full transition ${
                      promo.is_active ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20' : 'bg-neutral-800 text-neutral-500 hover:bg-neutral-700'
                    }`}>
                    {promo.is_active ? 'Active' : 'Inactive'}
                  </button>
                  <button onClick={() => handleDelete(promo.id)}
                    className="text-xs text-red-400 hover:text-red-300 px-2 py-1">Delete</button>
                </div>
              </div>
            </div>
          ))}
          {promos.length === 0 && <div className="text-center text-rp-grey py-8">No cafe promos configured</div>}
        </div>
      )}
    </div>
  );
}
