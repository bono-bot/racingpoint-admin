'use client';

import { useEffect, useState } from 'react';

interface InventoryItem {
  id: number;
  item_name: string;
  category: string;
  quantity: number;
  unit: string;
  min_stock: number;
  cost_per_unit: number;
  low_stock: number;
  updated_at: string;
}

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newItem, setNewItem] = useState({ item_name: '', category: 'Kitchen', quantity: '0', unit: 'pcs', min_stock: '5', cost_per_unit: '0' });
  const [adjusting, setAdjusting] = useState<number | null>(null);
  const [adjustment, setAdjustment] = useState({ quantity: '', type: 'in' as 'in' | 'out', notes: '' });

  async function load() {
    const res = await fetch('/api/cafe/inventory');
    const data = await res.json();
    setItems(data.items || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function addItem() {
    if (!newItem.item_name) return;
    await fetch('/api/cafe/inventory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...newItem,
        quantity: parseFloat(newItem.quantity),
        min_stock: parseFloat(newItem.min_stock),
        cost_per_unit: parseFloat(newItem.cost_per_unit),
      }),
    });
    setNewItem({ item_name: '', category: 'Kitchen', quantity: '0', unit: 'pcs', min_stock: '5', cost_per_unit: '0' });
    setShowAdd(false);
    load();
  }

  async function submitAdjustment(id: number) {
    if (!adjustment.quantity) return;
    await fetch('/api/cafe/inventory', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, adjustment: parseFloat(adjustment.quantity), type: adjustment.type, notes: adjustment.notes }),
    });
    setAdjusting(null);
    setAdjustment({ quantity: '', type: 'in', notes: '' });
    load();
  }

  const lowStockCount = items.filter(i => i.low_stock).length;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Inventory</h1>
          {lowStockCount > 0 && (
            <p className="text-sm text-amber-400 mt-1">{lowStockCount} item{lowStockCount > 1 ? 's' : ''} running low</p>
          )}
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg text-sm font-medium">
          {showAdd ? 'Cancel' : '+ Add Item'}
        </button>
      </div>

      {showAdd && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-6 grid grid-cols-3 gap-4">
          <input placeholder="Item name" value={newItem.item_name} onChange={e => setNewItem({...newItem, item_name: e.target.value})}
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm" />
          <select value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value})}
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm">
            <option>Kitchen</option><option>Beverages</option><option>Cleaning</option><option>Packaging</option><option>Other</option>
          </select>
          <input placeholder="Unit (pcs, kg, L)" value={newItem.unit} onChange={e => setNewItem({...newItem, unit: e.target.value})}
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm" />
          <input placeholder="Quantity" type="number" value={newItem.quantity} onChange={e => setNewItem({...newItem, quantity: e.target.value})}
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm" />
          <input placeholder="Min stock alert" type="number" value={newItem.min_stock} onChange={e => setNewItem({...newItem, min_stock: e.target.value})}
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm" />
          <div className="flex items-center gap-2">
            <input placeholder="Cost/unit" type="number" value={newItem.cost_per_unit} onChange={e => setNewItem({...newItem, cost_per_unit: e.target.value})}
              className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm flex-1" />
            <button onClick={addItem} className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-sm font-medium">Save</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center text-zinc-500 py-8">Loading...</div>
      ) : items.length === 0 ? (
        <div className="text-center text-zinc-500 py-8">No inventory items yet. Add your first item above.</div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-500 text-left">
                <th className="px-4 py-3 font-medium">Item</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium text-right">Stock</th>
                <th className="px-4 py-3 font-medium text-right">Min</th>
                <th className="px-4 py-3 font-medium text-right">Cost/Unit</th>
                <th className="px-4 py-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} className={`border-b border-zinc-800/50 ${item.low_stock ? 'bg-amber-500/5' : 'hover:bg-zinc-800/30'}`}>
                  <td className="px-4 py-3 font-medium">
                    {item.item_name}
                    {item.low_stock ? <span className="ml-2 text-xs text-amber-400">LOW</span> : null}
                  </td>
                  <td className="px-4 py-3 text-zinc-400">{item.category}</td>
                  <td className={`px-4 py-3 text-right font-mono ${item.low_stock ? 'text-amber-400' : 'text-zinc-300'}`}>
                    {item.quantity} {item.unit}
                  </td>
                  <td className="px-4 py-3 text-right text-zinc-500">{item.min_stock} {item.unit}</td>
                  <td className="px-4 py-3 text-right font-mono text-zinc-400">₹{item.cost_per_unit}</td>
                  <td className="px-4 py-3 text-right">
                    {adjusting === item.id ? (
                      <div className="flex gap-2 items-center justify-end">
                        <select value={adjustment.type} onChange={e => setAdjustment({...adjustment, type: e.target.value as 'in' | 'out'})}
                          className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs">
                          <option value="in">Stock In</option>
                          <option value="out">Stock Out</option>
                        </select>
                        <input type="number" placeholder="Qty" value={adjustment.quantity}
                          onChange={e => setAdjustment({...adjustment, quantity: e.target.value})}
                          className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs w-16" />
                        <button onClick={() => submitAdjustment(item.id)}
                          className="px-2 py-1 bg-green-600 rounded text-xs">Go</button>
                        <button onClick={() => setAdjusting(null)}
                          className="px-2 py-1 bg-zinc-700 rounded text-xs">X</button>
                      </div>
                    ) : (
                      <button onClick={() => setAdjusting(item.id)}
                        className="text-xs text-zinc-400 hover:text-zinc-100">Adjust</button>
                    )}
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
