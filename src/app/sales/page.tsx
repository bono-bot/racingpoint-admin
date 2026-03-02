'use client';

import { useEffect, useState } from 'react';
import { formatDate } from '@/lib/utils';

interface MenuItem {
  id: number;
  category: string;
  name: string;
  price: number;
  veg: number;
  available: number;
}

interface SaleItem {
  menu_item_id: number | null;
  item_name: string;
  quantity: number;
  unit_price: number;
  total: number;
}

interface Sale {
  id: number;
  bill_number: string;
  customer_name: string | null;
  total_amount: number;
  payment_method: string;
  sale_date: string;
  notes: string | null;
  item_count: number;
}

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    customer_name: '', payment_method: 'cash', sale_date: new Date().toISOString().slice(0, 10), notes: '',
  });
  const [cart, setCart] = useState<SaleItem[]>([]);

  async function load() {
    const [salesRes, menuRes] = await Promise.all([
      fetch('/api/sales').then(r => r.json()),
      fetch('/api/cafe/menu').then(r => r.json()),
    ]);
    setSales(salesRes.sales || []);
    setMenuItems((menuRes.items || []).filter((i: MenuItem) => i.available));
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function addToCart(item: MenuItem) {
    const existing = cart.find(c => c.menu_item_id === item.id);
    if (existing) {
      setCart(cart.map(c => c.menu_item_id === item.id
        ? { ...c, quantity: c.quantity + 1, total: (c.quantity + 1) * c.unit_price }
        : c
      ));
    } else {
      setCart([...cart, { menu_item_id: item.id, item_name: item.name, quantity: 1, unit_price: item.price, total: item.price }]);
    }
  }

  function removeFromCart(index: number) {
    setCart(cart.filter((_, i) => i !== index));
  }

  const cartTotal = cart.reduce((sum, item) => sum + item.total, 0);

  async function createSale() {
    if (cart.length === 0) return;
    await fetch('/api/sales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, total_amount: cartTotal, items: cart }),
    });
    setCart([]);
    setForm({ customer_name: '', payment_method: 'cash', sale_date: new Date().toISOString().slice(0, 10), notes: '' });
    setShowAdd(false);
    load();
  }

  const todaySales = sales.filter(s => s.sale_date === new Date().toISOString().slice(0, 10));
  const todayTotal = todaySales.reduce((sum, s) => sum + s.total_amount, 0);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Sales</h1>
          <p className="text-sm text-rp-grey mt-1">Today: ₹{todayTotal.toLocaleString('en-IN')} ({todaySales.length} bills)</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="px-4 py-2 bg-rp-red hover:bg-rp-red rounded-lg text-sm font-medium">
          {showAdd ? 'Cancel' : '+ New Bill'}
        </button>
      </div>

      {showAdd && (
        <div className="bg-rp-card border border-rp-border rounded-xl p-5 mb-6">
          <div className="grid grid-cols-3 gap-4 mb-4">
            <input placeholder="Customer name (optional)" value={form.customer_name}
              onChange={e => setForm({...form, customer_name: e.target.value})}
              className="bg-rp-card border border-rp-border rounded-lg px-3 py-2 text-sm" />
            <select value={form.payment_method} onChange={e => setForm({...form, payment_method: e.target.value})}
              className="bg-rp-card border border-rp-border rounded-lg px-3 py-2 text-sm">
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="card">Card</option>
            </select>
            <input type="date" value={form.sale_date} onChange={e => setForm({...form, sale_date: e.target.value})}
              className="bg-rp-card border border-rp-border rounded-lg px-3 py-2 text-sm" />
          </div>

          {/* Menu items grid */}
          <div className="mb-4">
            <p className="text-xs text-rp-grey mb-2">Quick add from menu:</p>
            <div className="flex flex-wrap gap-2">
              {menuItems.map(item => (
                <button key={item.id} onClick={() => addToCart(item)}
                  className="px-3 py-1.5 bg-rp-card hover:bg-rp-card border border-rp-border rounded-lg text-xs">
                  {item.name} - ₹{item.price}
                </button>
              ))}
            </div>
          </div>

          {/* Cart */}
          {cart.length > 0 && (
            <div className="border border-rp-border rounded-lg overflow-hidden mb-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-rp-border text-rp-grey text-left">
                    <th className="px-3 py-2 font-medium">Item</th>
                    <th className="px-3 py-2 font-medium text-center">Qty</th>
                    <th className="px-3 py-2 font-medium text-right">Price</th>
                    <th className="px-3 py-2 font-medium text-right">Total</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {cart.map((item, i) => (
                    <tr key={i} className="border-b border-rp-border/50">
                      <td className="px-3 py-2">{item.item_name}</td>
                      <td className="px-3 py-2 text-center">{item.quantity}</td>
                      <td className="px-3 py-2 text-right font-mono">₹{item.unit_price}</td>
                      <td className="px-3 py-2 text-right font-mono">₹{item.total}</td>
                      <td className="px-3 py-2 text-right">
                        <button onClick={() => removeFromCart(i)} className="text-rp-red hover:text-rp-red-light text-xs">Remove</button>
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-rp-card/30">
                    <td colSpan={3} className="px-3 py-2 font-semibold text-right">Total</td>
                    <td className="px-3 py-2 text-right font-mono font-semibold text-rp-red">₹{cartTotal}</td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          <button onClick={createSale} disabled={cart.length === 0}
            className="px-6 py-2 bg-green-600 hover:bg-green-500 disabled:bg-rp-card disabled:text-rp-grey rounded-lg text-sm font-medium">
            Generate Bill
          </button>
        </div>
      )}

      {loading ? (
        <div className="text-center text-rp-grey py-8">Loading...</div>
      ) : sales.length === 0 ? (
        <div className="text-center text-rp-grey py-8">No sales recorded yet</div>
      ) : (
        <div className="bg-rp-card border border-rp-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-rp-border text-rp-grey text-left">
                <th className="px-4 py-3 font-medium">Bill #</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Payment</th>
                <th className="px-4 py-3 font-medium text-center">Items</th>
                <th className="px-4 py-3 font-medium text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {sales.map(s => (
                <tr key={s.id} className="border-b border-rp-border/50 hover:bg-rp-card/30">
                  <td className="px-4 py-3 font-mono text-xs text-rp-red">{s.bill_number}</td>
                  <td className="px-4 py-3 text-neutral-400">{formatDate(s.sale_date)}</td>
                  <td className="px-4 py-3">{s.customer_name || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      s.payment_method === 'upi' ? 'bg-blue-500/10 text-blue-400' :
                      s.payment_method === 'card' ? 'bg-purple-500/10 text-purple-400' :
                      'bg-green-500/10 text-green-400'
                    }`}>{s.payment_method.toUpperCase()}</span>
                  </td>
                  <td className="px-4 py-3 text-center text-neutral-400">{s.item_count}</td>
                  <td className="px-4 py-3 text-right font-mono text-neutral-300">₹{s.total_amount.toLocaleString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
