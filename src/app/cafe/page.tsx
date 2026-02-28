'use client';

import { useEffect, useState } from 'react';

interface MenuItem {
  id: number;
  category: string;
  name: string;
  price: number;
  veg: number;
  available: number;
}

export default function CafePage() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [showAdd, setShowAdd] = useState(false);
  const [newItem, setNewItem] = useState({ category: '', name: '', price: '', veg: true });

  async function load() {
    const res = await fetch('/api/cafe/menu');
    const data = await res.json();
    setItems(data.items || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const categories = [...new Set(items.map(i => i.category))];
  const filtered = filter === 'all' ? items : items.filter(i => i.category === filter);
  const grouped = filtered.reduce((acc, item) => {
    (acc[item.category] = acc[item.category] || []).push(item);
    return acc;
  }, {} as Record<string, MenuItem[]>);

  async function toggleAvailable(id: number, available: number) {
    await fetch('/api/cafe/menu', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, available: available ? 0 : 1 }),
    });
    load();
  }

  async function addItem() {
    if (!newItem.category || !newItem.name || !newItem.price) return;
    await fetch('/api/cafe/menu', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newItem, price: parseInt(newItem.price) }),
    });
    setNewItem({ category: '', name: '', price: '', veg: true });
    setShowAdd(false);
    load();
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Cafe Menu</h1>
        <button onClick={() => setShowAdd(!showAdd)} className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg text-sm font-medium">
          {showAdd ? 'Cancel' : '+ Add Item'}
        </button>
      </div>

      {showAdd && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-6 grid grid-cols-2 gap-4">
          <select value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value})}
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm">
            <option value="">Category</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
            <option value="Other">Other</option>
          </select>
          <input placeholder="Item name" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})}
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm" />
          <input placeholder="Price (INR)" type="number" value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})}
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm" />
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={newItem.veg} onChange={e => setNewItem({...newItem, veg: e.target.checked})} />
              Vegetarian
            </label>
            <button onClick={addItem} className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-sm font-medium">Save</button>
          </div>
        </div>
      )}

      {/* Category filter */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <button onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium ${filter === 'all' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-zinc-900 border border-zinc-800 text-zinc-400'}`}>
          All ({items.length})
        </button>
        {categories.map(c => (
          <button key={c} onClick={() => setFilter(c)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium ${filter === c ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-zinc-900 border border-zinc-800 text-zinc-400'}`}>
            {c}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center text-zinc-500 py-8">Loading...</div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([cat, catItems]) => (
            <div key={cat}>
              <h2 className="text-lg font-semibold mb-3 text-zinc-300">{cat}</h2>
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-500 text-left">
                      <th className="px-4 py-3 font-medium">Item</th>
                      <th className="px-4 py-3 font-medium">Type</th>
                      <th className="px-4 py-3 font-medium text-right">Price</th>
                      <th className="px-4 py-3 font-medium text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {catItems.map(item => (
                      <tr key={item.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                        <td className="px-4 py-3 font-medium">{item.name}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${item.veg ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                            {item.veg ? 'Veg' : 'Non-Veg'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-zinc-300">₹{item.price}</td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => toggleAvailable(item.id, item.available)}
                            className={`text-xs px-3 py-1 rounded-full ${item.available ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20' : 'bg-zinc-700 text-zinc-500 hover:bg-zinc-600'}`}>
                            {item.available ? 'Available' : 'Unavailable'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
