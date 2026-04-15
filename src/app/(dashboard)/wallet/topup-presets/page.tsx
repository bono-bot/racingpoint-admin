'use client';

import { useEffect, useState } from 'react';
import { rcFetch } from '@/lib/api/base';
import { toast } from 'sonner';

interface PresetEntry {
  paise: number;
  rupees: number;
  label: string;
}

export default function TopupPresetsPage() {
  const [presets, setPresets] = useState<PresetEntry[]>([]);
  const [source, setSource] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newAmount, setNewAmount] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const data = await rcFetch('/wallet/topup-presets');
      setPresets(data.presets || []);
      setSource(data.source || 'unknown');
    } catch { toast.error('Failed to load topup presets'); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async (updatedPaise: number[]) => {
    setSaving(true);
    try {
      const sorted = [...updatedPaise].sort((a, b) => a - b);
      await rcFetch('/wallet/topup-presets', {
        method: 'PUT',
        body: JSON.stringify({ presets_paise: sorted }),
      });
      toast.success('Presets saved');
      load();
    } catch (err) { toast.error('Failed: ' + (err as Error).message); }
    setSaving(false);
  };

  const handleAdd = () => {
    const paise = Math.round(Number(newAmount) * 100);
    if (paise < 100 || paise > 10_000_000) {
      toast.error('Amount must be 1-100,000 credits');
      return;
    }
    if (presets.some(p => p.paise === paise)) {
      toast.error('Already exists');
      return;
    }
    const updated = [...presets.map(p => p.paise), paise];
    setNewAmount('');
    save(updated);
  };

  const handleRemove = (paise: number) => {
    const updated = presets.filter(p => p.paise !== paise).map(p => p.paise);
    if (updated.length === 0) {
      toast.error('Must have at least one preset');
      return;
    }
    save(updated);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Topup Presets</h1>
          <p className="text-rp-grey text-sm mt-1">
            Quick-select amounts shown on PWA wallet topup + POS topup modal.
            Source: <span className="font-mono text-xs">{source}</span>
          </p>
        </div>
      </div>

      {loading ? (
        <div className="text-rp-grey">Loading...</div>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-3 mb-6">
            {presets.map(p => (
              <div key={p.paise}
                className="bg-rp-card border border-rp-border rounded-xl p-4 flex items-center justify-between hover:border-neutral-600 transition">
                <div>
                  <div className="text-lg font-bold">{p.rupees.toLocaleString()}</div>
                  <div className="text-xs text-rp-grey">credits</div>
                </div>
                <button onClick={() => handleRemove(p.paise)}
                  className="text-red-400 hover:text-red-300 text-sm px-2">X</button>
              </div>
            ))}
          </div>

          <div className="bg-rp-card border border-rp-border rounded-xl p-4 max-w-md">
            <h3 className="text-sm font-semibold mb-2">Add Preset</h3>
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Amount in credits (e.g. 2000)"
                value={newAmount}
                onChange={e => setNewAmount(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
                className="flex-1 bg-neutral-900 border border-rp-border rounded-lg px-3 py-2 text-sm"
              />
              <button onClick={handleAdd} disabled={saving || !newAmount}
                className="bg-rp-red hover:bg-rp-red/90 text-white text-sm px-4 py-2 rounded-lg disabled:opacity-50">
                {saving ? '...' : 'Add'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
