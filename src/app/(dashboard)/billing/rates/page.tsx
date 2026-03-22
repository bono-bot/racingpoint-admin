'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { billingApi } from '@/lib/api/billing';
import ConfirmDialog from '@/components/ConfirmDialog';
import type { BillingRate } from '@/lib/api/billing';

function fmt(paise: number) {
  return `\u20B9${(paise / 100).toLocaleString('en-IN')}`;
}

const inputClass = 'bg-rp-black border border-rp-border rounded px-2 py-1 text-sm text-white w-full focus:outline-none focus:border-rp-red';

export default function BillingRatesPage() {
  const { isAdmin } = useAuth();
  const { data: rates, error, mutate } = useSWR<BillingRate[]>(
    '/billing/rates',
    () => billingApi.getRates(),
  );

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ name: string; duration_minutes: string; price_paise: string }>({ name: '', duration_minutes: '', price_paise: '' });
  const [addingNew, setAddingNew] = useState(false);
  const [newRate, setNewRate] = useState({ name: '', duration_minutes: '', price_paise: '' });
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<BillingRate | null>(null);

  if (!isAdmin) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Billing Rates</h1>
        <p className="text-neutral-400">Admin access required to manage billing rates.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Billing Rates</h1>
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
          <p className="text-red-400 text-sm mb-2">Failed to load rates.</p>
          <button
            onClick={() => mutate()}
            className="text-sm bg-red-500/20 hover:bg-red-500/30 text-red-300 px-3 py-1 rounded transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!rates) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Billing Rates</h1>
        <div className="text-center text-rp-grey py-12">Loading rates...</div>
      </div>
    );
  }

  function startEdit(rate: BillingRate) {
    setEditingId(rate.id);
    setEditValues({
      name: rate.name,
      duration_minutes: String(rate.duration_minutes),
      price_paise: String(rate.price_paise / 100),
    });
  }

  async function saveEdit(id: string) {
    setSaving(true);
    try {
      await billingApi.updateRate(id, {
        name: editValues.name,
        duration_minutes: parseInt(editValues.duration_minutes),
        price_paise: Math.round(parseFloat(editValues.price_paise) * 100),
      });
      toast.success('Rate updated');
      mutate();
      setEditingId(null);
    } catch {
      toast.error('Failed to update rate');
    } finally {
      setSaving(false);
    }
  }

  async function handleAddNew() {
    if (!newRate.name || !newRate.duration_minutes || !newRate.price_paise) return;
    setSaving(true);
    try {
      await billingApi.createRate({
        name: newRate.name,
        duration_minutes: parseInt(newRate.duration_minutes),
        price_paise: Math.round(parseFloat(newRate.price_paise) * 100),
      });
      toast.success('Rate created');
      mutate();
      setAddingNew(false);
      setNewRate({ name: '', duration_minutes: '', price_paise: '' });
    } catch {
      toast.error('Failed to create rate');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(rate: BillingRate) {
    try {
      await billingApi.updateRate(rate.id, { active: !rate.active });
      toast.success(`Rate ${rate.active ? 'deactivated' : 'activated'}`);
      mutate();
    } catch {
      toast.error('Failed to update rate');
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Billing Rates</h1>
        <button onClick={() => setAddingNew(true)} disabled={addingNew}
          className="bg-rp-red hover:bg-rp-red-light text-white text-sm px-4 py-2 rounded-lg transition-colors disabled:opacity-50">
          Add Rate
        </button>
      </div>

      <div className="bg-rp-card border border-rp-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-rp-border text-rp-grey text-left">
              <th className="px-4 py-2.5 font-medium">Name</th>
              <th className="px-4 py-2.5 font-medium text-right">Duration</th>
              <th className="px-4 py-2.5 font-medium text-right">Price</th>
              <th className="px-4 py-2.5 font-medium text-center">Active</th>
              <th className="px-4 py-2.5 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {/* Add new rate row */}
            {addingNew && (
              <tr className="border-b border-rp-border/50">
                <td className="px-4 py-2.5">
                  <input type="text" value={newRate.name} onChange={e => setNewRate({ ...newRate, name: e.target.value })}
                    placeholder="Rate name" className={inputClass} />
                </td>
                <td className="px-4 py-2.5">
                  <input type="number" value={newRate.duration_minutes} onChange={e => setNewRate({ ...newRate, duration_minutes: e.target.value })}
                    placeholder="Minutes" className={cn(inputClass, 'text-right')} />
                </td>
                <td className="px-4 py-2.5">
                  <input type="number" step="0.01" value={newRate.price_paise} onChange={e => setNewRate({ ...newRate, price_paise: e.target.value })}
                    placeholder="Price (Rs)" className={cn(inputClass, 'text-right')} />
                </td>
                <td className="px-4 py-2.5 text-center text-neutral-500">-</td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-1">
                    <button onClick={handleAddNew} disabled={saving}
                      className="text-xs px-2 py-1 rounded text-emerald-400 hover:bg-emerald-400/10 transition-colors disabled:opacity-30">
                      Save
                    </button>
                    <button onClick={() => { setAddingNew(false); setNewRate({ name: '', duration_minutes: '', price_paise: '' }); }}
                      className="text-xs px-2 py-1 rounded text-neutral-400 hover:bg-neutral-400/10 transition-colors">
                      Cancel
                    </button>
                  </div>
                </td>
              </tr>
            )}

            {/* Existing rates */}
            {rates.map(rate => {
              const isEditing = editingId === rate.id;
              return (
                <tr key={rate.id} className={cn('border-b border-rp-border/50 last:border-0', !rate.active && 'opacity-50')}>
                  <td className="px-4 py-2.5">
                    {isEditing ? (
                      <input type="text" value={editValues.name} onChange={e => setEditValues({ ...editValues, name: e.target.value })}
                        className={inputClass} />
                    ) : rate.name}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    {isEditing ? (
                      <input type="number" value={editValues.duration_minutes} onChange={e => setEditValues({ ...editValues, duration_minutes: e.target.value })}
                        className={cn(inputClass, 'text-right')} />
                    ) : `${rate.duration_minutes}min`}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-medium">
                    {isEditing ? (
                      <input type="number" step="0.01" value={editValues.price_paise} onChange={e => setEditValues({ ...editValues, price_paise: e.target.value })}
                        className={cn(inputClass, 'text-right')} />
                    ) : fmt(rate.price_paise)}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <button
                      onClick={() => toggleActive(rate)}
                      className={cn('relative w-10 h-5 rounded-full transition-colors', rate.active ? 'bg-emerald-600' : 'bg-neutral-700')}
                    >
                      <span className={cn('absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform', rate.active ? 'left-5' : 'left-0.5')} />
                    </button>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1">
                      {isEditing ? (
                        <>
                          <button onClick={() => saveEdit(rate.id)} disabled={saving}
                            className="text-xs px-2 py-1 rounded text-emerald-400 hover:bg-emerald-400/10 transition-colors disabled:opacity-30">
                            Save
                          </button>
                          <button onClick={() => setEditingId(null)}
                            className="text-xs px-2 py-1 rounded text-neutral-400 hover:bg-neutral-400/10 transition-colors">
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => startEdit(rate)}
                            className="text-xs px-2 py-1 rounded text-blue-400 hover:bg-blue-400/10 transition-colors">
                            Edit
                          </button>
                          <button onClick={() => setDeleteTarget(rate)}
                            className="text-xs px-2 py-1 rounded text-red-400 hover:bg-red-400/10 transition-colors">
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Rate"
        message={deleteTarget ? `Deactivate "${deleteTarget.name}"? This rate will no longer be available for new sessions.` : ''}
        variant="danger"
        confirmLabel="Delete Rate"
        onConfirm={async () => {
          if (!deleteTarget) return;
          try {
            await billingApi.deleteRate(deleteTarget.id);
            toast.success('Rate deleted');
            mutate();
          } catch {
            toast.error('Failed to delete rate');
          }
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
