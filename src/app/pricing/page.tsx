'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface PricingRule {
  id: string;
  name: string;
  day_of_week: number | null;
  start_hour: number | null;
  end_hour: number | null;
  multiplier: number;
  flat_adjustment_paise: number;
  min_group_size: number | null;
  active: boolean;
}

const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function PricingPage() {
  const [rules, setRules] = useState<PricingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '',
    day_of_week: '',
    start_hour: '',
    end_hour: '',
    multiplier: '1.0',
    flat_adjustment_paise: '0',
    min_group_size: '',
  });

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.getPricingRules();
      setRules(data.rules || []);
    } catch { setError('Failed to load pricing rules'); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    try {
      await api.createPricingRule({
        name: form.name,
        day_of_week: form.day_of_week !== '' ? Number(form.day_of_week) : null,
        start_hour: form.start_hour !== '' ? Number(form.start_hour) : null,
        end_hour: form.end_hour !== '' ? Number(form.end_hour) : null,
        multiplier: Number(form.multiplier),
        flat_adjustment_paise: Number(form.flat_adjustment_paise),
        min_group_size: form.min_group_size ? Number(form.min_group_size) : null,
      });
      setShowForm(false);
      setForm({ name: '', day_of_week: '', start_hour: '', end_hour: '', multiplier: '1.0', flat_adjustment_paise: '0', min_group_size: '' });
      load();
    } catch { alert('Failed to create rule'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this pricing rule?')) return;
    try { await api.deletePricingRule(id); load(); } catch { alert('Failed to delete'); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Pricing Rules</h1>
          <p className="text-rp-grey text-sm mt-1">Dynamic pricing multipliers applied automatically at billing start</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="bg-rp-red hover:bg-rp-red/90 text-white text-sm font-semibold px-4 py-2 rounded-lg">
          {showForm ? 'Cancel' : '+ New Rule'}
        </button>
      </div>

      {showForm && (
        <div className="bg-rp-card border border-rp-border rounded-xl p-4 mb-6 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-rp-grey">Name</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full bg-rp-black border border-rp-border rounded-lg px-3 py-2 text-sm text-white mt-1" placeholder="Weekend Peak" />
            </div>
            <div>
              <label className="text-xs text-rp-grey">Day of Week (0=Mon, 6=Sun)</label>
              <select value={form.day_of_week} onChange={e => setForm({ ...form, day_of_week: e.target.value })}
                className="w-full bg-rp-black border border-rp-border rounded-lg px-3 py-2 text-sm text-white mt-1">
                <option value="">Any Day</option>
                {days.map((d, i) => <option key={i} value={i}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-rp-grey">Multiplier</label>
              <input type="number" step="0.01" value={form.multiplier} onChange={e => setForm({ ...form, multiplier: e.target.value })}
                className="w-full bg-rp-black border border-rp-border rounded-lg px-3 py-2 text-sm text-white mt-1" />
            </div>
            <div>
              <label className="text-xs text-rp-grey">Start Hour (0-23)</label>
              <input type="number" min="0" max="23" value={form.start_hour} onChange={e => setForm({ ...form, start_hour: e.target.value })}
                className="w-full bg-rp-black border border-rp-border rounded-lg px-3 py-2 text-sm text-white mt-1" placeholder="Optional" />
            </div>
            <div>
              <label className="text-xs text-rp-grey">End Hour (0-23)</label>
              <input type="number" min="0" max="23" value={form.end_hour} onChange={e => setForm({ ...form, end_hour: e.target.value })}
                className="w-full bg-rp-black border border-rp-border rounded-lg px-3 py-2 text-sm text-white mt-1" placeholder="Optional" />
            </div>
            <div>
              <label className="text-xs text-rp-grey">Min Group Size</label>
              <input type="number" value={form.min_group_size} onChange={e => setForm({ ...form, min_group_size: e.target.value })}
                className="w-full bg-rp-black border border-rp-border rounded-lg px-3 py-2 text-sm text-white mt-1" placeholder="Optional" />
            </div>
          </div>
          <button onClick={handleCreate} className="bg-rp-red hover:bg-rp-red/90 text-white text-sm font-semibold px-6 py-2 rounded-lg">
            Create Rule
          </button>
        </div>
      )}

      {error ? (
        <div className="bg-rp-red/10 border border-rp-red/20 rounded-xl p-6 text-rp-red text-sm">{error}</div>
      ) : loading ? (
        <div className="text-center text-rp-grey py-8">Loading...</div>
      ) : rules.length === 0 ? (
        <div className="text-center text-rp-grey py-8">No pricing rules configured</div>
      ) : (
        <div className="bg-rp-card border border-rp-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-rp-border text-rp-grey text-left">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Day</th>
                <th className="px-4 py-3 font-medium">Hours</th>
                <th className="px-4 py-3 font-medium">Multiplier</th>
                <th className="px-4 py-3 font-medium">Group Size</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {rules.map(r => (
                <tr key={r.id} className="border-b border-rp-border/50 hover:bg-rp-card/30">
                  <td className="px-4 py-3 font-medium">{r.name}</td>
                  <td className="px-4 py-3 text-neutral-400">{r.day_of_week !== null ? days[r.day_of_week] : 'Any'}</td>
                  <td className="px-4 py-3 text-neutral-400">
                    {r.start_hour !== null && r.end_hour !== null ? `${r.start_hour}:00–${r.end_hour}:00` : 'All day'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`font-mono font-bold ${r.multiplier < 1 ? 'text-emerald-400' : r.multiplier > 1 ? 'text-rp-red' : 'text-white'}`}>
                      {r.multiplier.toFixed(2)}x
                    </span>
                  </td>
                  <td className="px-4 py-3 text-neutral-400">{r.min_group_size ? `${r.min_group_size}+` : '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${r.active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-neutral-500/20 text-neutral-400'}`}>
                      {r.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleDelete(r.id)} className="text-red-400 hover:text-red-300 text-xs">Delete</button>
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
