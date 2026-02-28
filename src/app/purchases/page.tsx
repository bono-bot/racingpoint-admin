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

interface ScannedData {
  vendor: string;
  invoice_number: string | null;
  purchase_date: string;
  category: string;
  items: { item_name: string; quantity: number; unit_price: number; total: number }[];
  total_amount: number;
}

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showScan, setShowScan] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned] = useState<ScannedData | null>(null);
  const [ocrText, setOcrText] = useState('');
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

  async function handleScan(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setScanning(true);
    setScanned(null);
    setOcrText('');

    const fd = new FormData();
    fd.append('receipt', file);

    try {
      const res = await fetch('/api/scan/receipt', { method: 'POST', body: fd });
      const data = await res.json();
      if (data.error) {
        alert(data.error);
      } else {
        setOcrText(data.ocr_text || '');
        setScanned(data.extracted);
      }
    } catch {
      alert('Scan failed');
    }
    setScanning(false);
  }

  async function saveScanResult() {
    if (!scanned) return;
    await fetch('/api/purchases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vendor: scanned.vendor,
        invoice_number: scanned.invoice_number,
        total_amount: scanned.total_amount,
        purchase_date: scanned.purchase_date,
        category: scanned.category,
        items: scanned.items,
      }),
    });
    setScanned(null);
    setShowScan(false);
    setOcrText('');
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
        <div className="flex gap-2">
          <button onClick={() => { setShowScan(!showScan); setShowAdd(false); }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium">
            {showScan ? 'Cancel Scan' : 'Scan Receipt'}
          </button>
          <button onClick={() => { setShowAdd(!showAdd); setShowScan(false); }}
            className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg text-sm font-medium">
            {showAdd ? 'Cancel' : '+ Add Manual'}
          </button>
        </div>
      </div>

      {/* Receipt Scanner */}
      {showScan && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-6">
          <h3 className="font-semibold mb-3">Scan Receipt</h3>
          <p className="text-sm text-zinc-400 mb-4">Upload a receipt image. AI will extract vendor, items, and amounts.</p>

          <input type="file" accept="image/*" onChange={handleScan}
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm w-full mb-4" />

          {scanning && (
            <div className="text-sm text-zinc-400 py-4 text-center">Scanning receipt... This may take a moment.</div>
          )}

          {scanned && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-zinc-500">Vendor</label>
                  <input value={scanned.vendor} onChange={e => setScanned({...scanned, vendor: e.target.value})}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm mt-1" />
                </div>
                <div>
                  <label className="text-xs text-zinc-500">Invoice #</label>
                  <input value={scanned.invoice_number || ''} onChange={e => setScanned({...scanned, invoice_number: e.target.value})}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm mt-1" />
                </div>
                <div>
                  <label className="text-xs text-zinc-500">Date</label>
                  <input type="date" value={scanned.purchase_date} onChange={e => setScanned({...scanned, purchase_date: e.target.value})}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm mt-1" />
                </div>
                <div>
                  <label className="text-xs text-zinc-500">Total Amount</label>
                  <input type="number" value={scanned.total_amount} onChange={e => setScanned({...scanned, total_amount: parseFloat(e.target.value) || 0})}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm mt-1" />
                </div>
                <div>
                  <label className="text-xs text-zinc-500">Category</label>
                  <select value={scanned.category} onChange={e => setScanned({...scanned, category: e.target.value})}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm mt-1">
                    <option>Kitchen Supplies</option><option>Beverages</option><option>Equipment</option>
                    <option>Maintenance</option><option>Utilities</option><option>Other</option>
                  </select>
                </div>
              </div>

              {scanned.items.length > 0 && (
                <div>
                  <label className="text-xs text-zinc-500">Extracted Items</label>
                  <div className="border border-zinc-800 rounded-lg overflow-hidden mt-1">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-zinc-800 text-zinc-500">
                          <th className="px-3 py-2 text-left font-medium">Item</th>
                          <th className="px-3 py-2 text-right font-medium">Qty</th>
                          <th className="px-3 py-2 text-right font-medium">Price</th>
                          <th className="px-3 py-2 text-right font-medium">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {scanned.items.map((item, i) => (
                          <tr key={i} className="border-b border-zinc-800/50">
                            <td className="px-3 py-2">{item.item_name}</td>
                            <td className="px-3 py-2 text-right">{item.quantity}</td>
                            <td className="px-3 py-2 text-right font-mono">₹{item.unit_price}</td>
                            <td className="px-3 py-2 text-right font-mono">₹{item.total}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {ocrText && (
                <details className="text-xs">
                  <summary className="text-zinc-500 cursor-pointer">View raw OCR text</summary>
                  <pre className="bg-zinc-800 rounded p-3 mt-2 whitespace-pre-wrap text-zinc-400 max-h-40 overflow-auto">{ocrText}</pre>
                </details>
              )}

              <div className="flex gap-2">
                <button onClick={saveScanResult} className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-sm font-medium">
                  Save Purchase
                </button>
                <button onClick={() => { setScanned(null); setOcrText(''); }} className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-sm font-medium">
                  Discard
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Manual Add */}
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
