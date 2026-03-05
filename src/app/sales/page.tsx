'use client';

import { useEffect, useState } from 'react';
import { formatDate } from '@/lib/utils';
import { useToast } from '@/components/Toast';
import { SkeletonTable } from '@/components/Skeleton';

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

const paymentColors: Record<string, string> = {
  cash: 'bg-emerald-500/10 text-emerald-400',
  upi: 'bg-blue-500/10 text-blue-400',
  card: 'bg-purple-500/10 text-purple-400',
};

export default function SalesPage() {
  const { toast } = useToast();
  const [sales, setSales] = useState<Sale[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState('');
  const [menuSearch, setMenuSearch] = useState('');
  const [form, setForm] = useState({
    customer_name: '', payment_method: 'cash', sale_date: new Date().toISOString().slice(0, 10), notes: '',
  });
  const [cart, setCart] = useState<SaleItem[]>([]);

  async function load() {
    try {
      const [salesRes, menuRes] = await Promise.all([
        fetch('/api/sales').then(r => r.json()),
        fetch('/api/cafe/menu').then(r => r.json()),
      ]);
      setSales(salesRes.sales || []);
      setMenuItems((menuRes.items || []).filter((i: MenuItem) => i.available));
    } catch {
      toast('Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
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

  function updateQty(index: number, delta: number) {
    setCart(cart.map((item, i) => {
      if (i !== index) return item;
      const newQty = Math.max(1, item.quantity + delta);
      return { ...item, quantity: newQty, total: newQty * item.unit_price };
    }));
  }

  const cartTotal = cart.reduce((sum, item) => sum + item.total, 0);

  async function createSale() {
    if (cart.length === 0) { toast('Cart is empty', 'error'); return; }
    setCreating(true);
    try {
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, total_amount: cartTotal, items: cart }),
      });
      const data = await res.json();
      toast(`Bill ${data.sale?.bill_number || ''} created`, 'success');
      setCart([]);
      setForm({ customer_name: '', payment_method: 'cash', sale_date: new Date().toISOString().slice(0, 10), notes: '' });
      setShowAdd(false);
      load();
    } catch {
      toast('Failed to create sale', 'error');
    } finally {
      setCreating(false);
    }
  }

  const todaySales = sales.filter(s => s.sale_date === new Date().toISOString().slice(0, 10));
  const todayTotal = todaySales.reduce((sum, s) => sum + s.total_amount, 0);

  const filteredSales = sales.filter(s => {
    if (!search) return true;
    return s.bill_number.toLowerCase().includes(search.toLowerCase())
      || (s.customer_name || '').toLowerCase().includes(search.toLowerCase());
  });

  const filteredMenu = menuItems.filter(m =>
    !menuSearch || m.name.toLowerCase().includes(menuSearch.toLowerCase()) || m.category.toLowerCase().includes(menuSearch.toLowerCase())
  );

  const menuCategories = Array.from(new Set(menuItems.map(m => m.category)));

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Sales</h1>
          <p className="text-sm text-rp-grey mt-1">
            Today: <span className="text-white font-medium">{'\u20B9'}{todayTotal.toLocaleString('en-IN')}</span>
            <span className="text-rp-grey ml-1">({todaySales.length} bills)</span>
          </p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)}
          className="px-4 py-2 bg-rp-red hover:bg-rp-red-light rounded-lg text-sm font-medium transition-colors cursor-pointer">
          {showAdd ? 'Cancel' : '+ New Bill'}
        </button>
      </div>

      {/* New Bill Form */}
      {showAdd && (
        <div className="bg-rp-card border border-rp-border rounded-xl p-5 mb-6 animate-scale-in">
          <h3 className="text-sm font-medium text-rp-grey mb-4">New Bill</h3>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <label htmlFor="sale-cust" className="block text-xs text-rp-grey mb-1">Customer Name</label>
              <input id="sale-cust" placeholder="Optional" value={form.customer_name}
                onChange={e => setForm({...form, customer_name: e.target.value})}
                className="w-full bg-rp-black border border-rp-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-rp-red transition-colors" />
            </div>
            <div>
              <label htmlFor="sale-pay" className="block text-xs text-rp-grey mb-1">Payment Method</label>
              <select id="sale-pay" value={form.payment_method} onChange={e => setForm({...form, payment_method: e.target.value})}
                className="w-full bg-rp-black border border-rp-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-rp-red transition-colors cursor-pointer">
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
                <option value="card">Card</option>
              </select>
            </div>
            <div>
              <label htmlFor="sale-date" className="block text-xs text-rp-grey mb-1">Date</label>
              <input id="sale-date" type="date" value={form.sale_date} onChange={e => setForm({...form, sale_date: e.target.value})}
                className="w-full bg-rp-black border border-rp-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-rp-red transition-colors cursor-pointer" />
            </div>
          </div>

          {/* Menu items - searchable */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-rp-grey">Quick add from menu:</p>
              <input placeholder="Search menu..." value={menuSearch} onChange={e => setMenuSearch(e.target.value)}
                className="bg-rp-black border border-rp-border rounded-lg px-3 py-1 text-xs w-40 focus:outline-none focus:border-rp-red transition-colors" />
            </div>
            {menuCategories.map(cat => {
              const items = filteredMenu.filter(m => m.category === cat);
              if (items.length === 0) return null;
              return (
                <div key={cat} className="mb-2">
                  <p className="text-[10px] text-rp-grey uppercase tracking-wider mb-1">{cat}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {items.map(item => (
                      <button key={item.id} onClick={() => addToCart(item)}
                        className="px-2.5 py-1 bg-rp-black border border-rp-border hover:border-rp-red/50 rounded-lg text-xs transition-colors cursor-pointer group">
                        <span className="text-neutral-300 group-hover:text-white">{item.name}</span>
                        <span className="text-rp-grey ml-1.5 font-mono">{'\u20B9'}{item.price}</span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Cart */}
          {cart.length > 0 && (
            <div className="border border-rp-border rounded-lg overflow-hidden mb-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-rp-border text-rp-grey text-left bg-rp-black/50">
                    <th className="px-3 py-2 font-medium">Item</th>
                    <th className="px-3 py-2 font-medium text-center">Qty</th>
                    <th className="px-3 py-2 font-medium text-right">Price</th>
                    <th className="px-3 py-2 font-medium text-right">Total</th>
                    <th className="px-3 py-2 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {cart.map((item, i) => (
                    <tr key={i} className="border-b border-rp-border/50">
                      <td className="px-3 py-2 text-neutral-300">{item.item_name}</td>
                      <td className="px-3 py-2 text-center">
                        <div className="inline-flex items-center gap-1">
                          <button onClick={() => updateQty(i, -1)} className="w-5 h-5 rounded bg-rp-black text-rp-grey hover:text-white text-xs cursor-pointer transition-colors">-</button>
                          <span className="w-6 text-center font-mono">{item.quantity}</span>
                          <button onClick={() => updateQty(i, 1)} className="w-5 h-5 rounded bg-rp-black text-rp-grey hover:text-white text-xs cursor-pointer transition-colors">+</button>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-neutral-400">{'\u20B9'}{item.unit_price}</td>
                      <td className="px-3 py-2 text-right font-mono text-white">{'\u20B9'}{item.total}</td>
                      <td className="px-3 py-2 text-right">
                        <button onClick={() => removeFromCart(i)} className="text-red-400 hover:text-red-300 cursor-pointer transition-colors">
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                            <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-rp-black/50">
                    <td colSpan={3} className="px-3 py-2.5 font-semibold text-right text-neutral-300">Total</td>
                    <td className="px-3 py-2.5 text-right font-mono font-bold text-rp-red text-lg">{'\u20B9'}{cartTotal}</td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          <button onClick={createSale} disabled={cart.length === 0 || creating}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-rp-card disabled:text-rp-grey rounded-lg text-sm font-medium transition-colors cursor-pointer">
            {creating ? 'Creating...' : `Generate Bill \u2014 \u20B9${cartTotal}`}
          </button>
        </div>
      )}

      {/* Search */}
      {!loading && sales.length > 0 && (
        <div className="mb-4">
          <div className="relative max-w-xs">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-rp-grey" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" strokeLinecap="round" />
            </svg>
            <input placeholder="Search bill # or customer..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full bg-rp-card border border-rp-border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-rp-red transition-colors" />
          </div>
        </div>
      )}

      {/* Sales table */}
      {loading ? (
        <SkeletonTable rows={6} cols={6} />
      ) : sales.length === 0 ? (
        <div className="text-center py-16 bg-rp-card border border-rp-border rounded-xl">
          <svg className="w-12 h-12 mx-auto text-rp-grey/50 mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <p className="text-rp-grey font-medium">No sales recorded yet</p>
          <p className="text-rp-grey/70 text-xs mt-1">Click "+ New Bill" to create your first sale</p>
        </div>
      ) : (
        <div className="bg-rp-card border border-rp-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
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
                {filteredSales.map(s => (
                  <tr key={s.id} className="border-b border-rp-border/50 hover:bg-rp-black/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-rp-red">{s.bill_number}</td>
                    <td className="px-4 py-3 text-neutral-400 text-xs">{formatDate(s.sale_date)}</td>
                    <td className="px-4 py-3">{s.customer_name || '\u2014'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${paymentColors[s.payment_method] || paymentColors.cash}`}>
                        {s.payment_method.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-mono text-neutral-400 bg-rp-black px-2 py-0.5 rounded text-xs">{s.item_count}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-neutral-300">{'\u20B9'}{s.total_amount.toLocaleString('en-IN')}</td>
                  </tr>
                ))}
                {filteredSales.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-rp-grey text-sm">No matching sales</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
