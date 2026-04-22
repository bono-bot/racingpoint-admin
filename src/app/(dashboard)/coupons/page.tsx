'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { SkeletonTable } from '@/components/Skeleton';
import { toast } from 'sonner';

interface Coupon {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  max_uses: number | null;
  times_used: number;
  min_amount_paise: number | null;
  valid_from: string | null;
  valid_until: string | null;
  active: boolean;
}

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    code: '',
    discount_type: 'percent',
    discount_value: 10,
    max_uses: '',
    min_amount_paise: '',
    valid_until: '',
  });

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.getCoupons();
      setCoupons(data.coupons || []);
    } catch { setError('Failed to load coupons'); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const validate = (): string | null => {
    const code = form.code.trim().toUpperCase();
    if (!code) return 'Code is required';
    if (!/^[A-Z0-9_-]{3,20}$/.test(code)) return 'Code must be 3-20 chars: A-Z, 0-9, _ or -';
    const v = Number(form.discount_value);
    if (!Number.isFinite(v) || v <= 0) return 'Value must be a positive number';
    if (form.discount_type === 'percent' && (v < 1 || v > 100)) return 'Percent must be 1-100';
    if (form.discount_type === 'flat' && v < 100) return 'Flat discount must be at least 100 paise (\u20B91)';
    if (form.discount_type === 'free_minutes' && (v < 1 || v > 120)) return 'Free minutes must be 1-120';
    if (form.max_uses && Number(form.max_uses) <= 0) return 'Max uses must be positive';
    if (form.min_amount_paise && Number(form.min_amount_paise) < 0) return 'Min amount cannot be negative';
    if (form.valid_until) {
      const d = new Date(form.valid_until);
      if (isNaN(d.getTime())) return 'Valid-until date is invalid';
      if (d.getTime() < Date.now()) return 'Valid-until must be a future date';
    }
    return null;
  };

  const handleCreate = async () => {
    const err = validate();
    if (err) { toast.error(err); return; }
    try {
      await api.createCoupon({
        code: form.code.trim().toUpperCase(),
        discount_type: form.discount_type,
        discount_value: Number(form.discount_value),
        max_uses: form.max_uses ? Number(form.max_uses) : null,
        min_amount_paise: form.min_amount_paise ? Number(form.min_amount_paise) * 100 : null,
        valid_until: form.valid_until || null,
      });
      setShowForm(false);
      setForm({ code: '', discount_type: 'percent', discount_value: 10, max_uses: '', min_amount_paise: '', valid_until: '' });
      toast.success('Coupon created');
      load();
    } catch (err) { toast.error('Failed to create coupon: ' + (err as Error).message); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this coupon?')) return;
    try {
      await api.deleteCoupon(id);
      toast.success('Coupon deleted');
      load();
    } catch (err) { toast.error('Failed to delete coupon: ' + (err as Error).message); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Coupons</h1>
        <button onClick={() => setShowForm(!showForm)}
          className="bg-rp-red hover:bg-rp-red/90 text-white text-sm font-semibold px-4 py-2 rounded-lg">
          {showForm ? 'Cancel' : '+ New Coupon'}
        </button>
      </div>

      {showForm && (
        <div className="bg-rp-card border border-rp-border rounded-xl p-4 mb-6 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-rp-grey">Code</label>
              <input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })}
                className="w-full bg-rp-black border border-rp-border rounded-lg px-3 py-2 text-sm text-white mt-1" placeholder="WELCOME20" />
            </div>
            <div>
              <label className="text-xs text-rp-grey">Type</label>
              <select value={form.discount_type} onChange={e => setForm({ ...form, discount_type: e.target.value })}
                className="w-full bg-rp-black border border-rp-border rounded-lg px-3 py-2 text-sm text-white mt-1">
                <option value="percent">Percent Off</option>
                <option value="flat">Flat (paise)</option>
                <option value="free_minutes">Free Minutes</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-rp-grey">Value</label>
              <input type="number" value={form.discount_value} onChange={e => setForm({ ...form, discount_value: Number(e.target.value) })}
                className="w-full bg-rp-black border border-rp-border rounded-lg px-3 py-2 text-sm text-white mt-1" />
            </div>
            <div>
              <label className="text-xs text-rp-grey">Max Uses (blank = unlimited)</label>
              <input type="number" value={form.max_uses} onChange={e => setForm({ ...form, max_uses: e.target.value })}
                className="w-full bg-rp-black border border-rp-border rounded-lg px-3 py-2 text-sm text-white mt-1" />
            </div>
            <div>
              <label className="text-xs text-rp-grey">Min Amount (INR)</label>
              <input type="number" value={form.min_amount_paise} onChange={e => setForm({ ...form, min_amount_paise: e.target.value })}
                className="w-full bg-rp-black border border-rp-border rounded-lg px-3 py-2 text-sm text-white mt-1" />
            </div>
            <div>
              <label className="text-xs text-rp-grey">Valid Until</label>
              <input type="date" value={form.valid_until} onChange={e => setForm({ ...form, valid_until: e.target.value })}
                className="w-full bg-rp-black border border-rp-border rounded-lg px-3 py-2 text-sm text-white mt-1" />
            </div>
          </div>
          <button onClick={handleCreate} className="bg-rp-red hover:bg-rp-red/90 text-white text-sm font-semibold px-6 py-2 rounded-lg">
            Create Coupon
          </button>
        </div>
      )}

      {error ? (
        <div className="bg-rp-red/10 border border-rp-red/20 rounded-xl p-6 text-rp-red text-sm">{error}</div>
      ) : loading ? (
        <SkeletonTable rows={5} cols={7} />
      ) : coupons.length === 0 ? (
        <div className="text-center text-rp-grey py-8">No coupons yet</div>
      ) : (
        <div className="bg-rp-card border border-rp-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-rp-border text-rp-grey text-left">
                <th className="px-4 py-3 font-medium">Code</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Value</th>
                <th className="px-4 py-3 font-medium">Uses</th>
                <th className="px-4 py-3 font-medium">Valid Until</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {coupons.map(c => (
                <tr key={c.id} className="border-b border-rp-border/50 hover:bg-rp-card/30">
                  <td className="px-4 py-3 font-mono font-bold text-rp-red">{c.code}</td>
                  <td className="px-4 py-3 capitalize text-neutral-400">{c.discount_type.replace('_', ' ')}</td>
                  <td className="px-4 py-3 text-white">
                    {c.discount_type === 'percent' ? `${c.discount_value}%` : c.discount_type === 'free_minutes' ? `${c.discount_value} min` : `₹${(c.discount_value / 100).toFixed(0)}`}
                  </td>
                  <td className="px-4 py-3 text-neutral-400">{c.times_used}{c.max_uses ? `/${c.max_uses}` : ''}</td>
                  <td className="px-4 py-3 text-neutral-400">{c.valid_until ? new Date(c.valid_until).toLocaleDateString() : 'No expiry'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${c.active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-neutral-500/20 text-neutral-400'}`}>
                      {c.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleDelete(c.id)} className="text-red-400 hover:text-red-300 text-xs">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
