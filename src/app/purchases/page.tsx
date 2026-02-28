'use client';

import { useEffect, useState } from 'react';
import { formatDate } from '@/lib/utils';

interface Purchase {
  id: number;
  vendor: string;
  invoice_number: string | null;
  total_amount: number;
  purchase_date: string;
  category: string;
  notes: string | null;
  item_count: number;
  created_at: string;
}

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    vendor: '', invoice_number: '', total_amount: '', purchase_date: new Date().toISOString().slice(0, 10),
    category: 'Kitchen Supplies', notes: '',
  });

  async function load() {
    const res = await fetch('/api/purchases');
    const data = await res.json();
    setPurchases(data.purchases || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function addPurchase() {
    if (!form.vendor || !form.total_amount) return;
    await fetch('/api/purchases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, total_amount: parseFloat(form.total_amount) }),
    });
    setForm({ vendor: '', invoice_number: '', total_amount: '', purchase_date: new Date().toISOString().slice(0, 10), category: 'Kitchen Supplies', notes: '' });
    setShowAdd(false);
    load();
  }

  const totalSpent = purchases.reduce((sum, p) => sum + p.total_amount, 0);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Purchases</h1>
          <p className="text-sm text-zinc-500 mt-1">Total: ₹{totalSpent.toLocaleString('en-IN')}</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg text-sm font-medium">
          {showAdd ? 'Cancel' : '+ Add Purchase'}
        </button>
      </div>

      {showAdd && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-6 grid grid-cols-2 gap-4">
          <input placeholder="Vendor name" value={form.vendor} onChange={e => setForm({...form, vendor: e.target.value})}
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm" />
          <input placeholder="Invoice number" value={form.invoice_number} onChange={e => setForm({...form, invoice_number: e.target.value})}
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm" />
          <input placeholder="Total amount (INR)" type="number" value={form.total_amount} onChange={e => setForm({...form, total_amount: e.target.value})}
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm" />
          <input type="date" value={form.purchase_date} onChange={e => setForm({...form, purchase_date: e.target.value})}
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm" />
          <select value={form.category} onChange={e => setForm({...form, category: e.target.value})}
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm">
            <option>Kitchen Supplies</option><option>Beverages</option><option>Equipment</option>
            <option>Maintenance</option><option>Utilities</option><option>Other</option>
          </select>
          <div className="flex items-center gap-2">
            <input placeholder="Notes" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})}
              className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm flex-1" />
            <button onClick={addPurchase} className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-sm font-medium">Save</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center text-zinc-500 py-8">Loading...</div>
      ) : purchases.length === 0 ? (
        <div className="text-center text-zinc-500 py-8">No purchases recorded yet</div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-500 text-left">
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Vendor</th>
                <th className="px-4 py-3 font-medium">Invoice</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {purchases.map(p => (
                <tr key={p.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                  <td className="px-4 py-3 text-zinc-400">{formatDate(p.purchase_date)}</td>
                  <td className="px-4 py-3 font-medium">{p.vendor}</td>
                  <td className="px-4 py-3 text-zinc-500 font-mono text-xs">{p.invoice_number || '-'}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">{p.category}</span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-zinc-300">₹{p.total_amount.toLocaleString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
