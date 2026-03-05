'use client';

import { useEffect, useState } from 'react';
import { formatDate } from '@/lib/utils';
import { useToast } from '@/components/Toast';
import { SkeletonTable } from '@/components/Skeleton';

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

const categories = ['Kitchen Supplies', 'Beverages', 'Equipment', 'Maintenance', 'Utilities', 'Other'];

const categoryColors: Record<string, string> = {
  'Kitchen Supplies': 'bg-orange-500/10 text-orange-400',
  'Beverages': 'bg-blue-500/10 text-blue-400',
  'Equipment': 'bg-purple-500/10 text-purple-400',
  'Maintenance': 'bg-yellow-500/10 text-yellow-400',
  'Utilities': 'bg-cyan-500/10 text-cyan-400',
  'Other': 'bg-rp-card text-neutral-400',
};

export default function PurchasesPage() {
  const { toast } = useToast();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showScan, setShowScan] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [scanned, setScanned] = useState<ScannedData | null>(null);
  const [ocrText, setOcrText] = useState('');
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [form, setForm] = useState({
    vendor: '', invoice_number: '', total_amount: '', purchase_date: new Date().toISOString().slice(0, 10),
    category: 'Kitchen Supplies', notes: '',
  });

  async function load() {
    try {
      const res = await fetch('/api/purchases');
      const data = await res.json();
      setPurchases(data.purchases || []);
    } catch {
      toast('Failed to load purchases', 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function addPurchase() {
    if (!form.vendor.trim()) { toast('Vendor name is required', 'error'); return; }
    if (!form.total_amount) { toast('Amount is required', 'error'); return; }

    setSaving(true);
    try {
      await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, total_amount: parseFloat(form.total_amount) }),
      });
      toast('Purchase added', 'success');
      setForm({ vendor: '', invoice_number: '', total_amount: '', purchase_date: new Date().toISOString().slice(0, 10), category: 'Kitchen Supplies', notes: '' });
      setShowAdd(false);
      load();
    } catch {
      toast('Failed to add purchase', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleScan(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast('File too large (max 10MB)', 'error');
      return;
    }

    setScanning(true);
    setScanned(null);
    setOcrText('');

    const fd = new FormData();
    fd.append('receipt', file);

    try {
      const res = await fetch('/api/scan/receipt', { method: 'POST', body: fd });
      const data = await res.json();
      if (data.error) {
        toast(data.error, 'error');
      } else {
        setOcrText(data.ocr_text || '');
        setScanned(data.extracted);
        toast('Receipt scanned successfully', 'success');
      }
    } catch {
      toast('Scan failed. Try again.', 'error');
    }
    setScanning(false);
  }

  async function saveScanResult() {
    if (!scanned) return;
    setSaving(true);
    try {
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
      toast('Scanned purchase saved', 'success');
      setScanned(null);
      setShowScan(false);
      setOcrText('');
      load();
    } catch {
      toast('Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  }

  const totalSpent = purchases.reduce((sum, p) => sum + p.total_amount, 0);
  const usedCategories = Array.from(new Set(purchases.map(p => p.category)));

  const filtered = purchases.filter(p => {
    const matchSearch = !search || p.vendor.toLowerCase().includes(search.toLowerCase())
      || (p.invoice_number || '').toLowerCase().includes(search.toLowerCase());
    const matchCat = catFilter === 'all' || p.category === catFilter;
    return matchSearch && matchCat;
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Purchases</h1>
          <p className="text-sm text-rp-grey mt-1">
            Total spent: <span className="text-white font-medium">{'\u20B9'}{totalSpent.toLocaleString('en-IN')}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setShowScan(!showScan); setShowAdd(false); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
              showScan ? 'bg-rp-card border border-rp-border text-neutral-400' : 'bg-blue-600 hover:bg-blue-500 text-white'
            }`}>
            {showScan ? 'Cancel Scan' : (
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
                Scan Receipt
              </span>
            )}
          </button>
          <button onClick={() => { setShowAdd(!showAdd); setShowScan(false); }}
            className="px-4 py-2 bg-rp-red hover:bg-rp-red-light rounded-lg text-sm font-medium transition-colors cursor-pointer">
            {showAdd ? 'Cancel' : '+ Add Manual'}
          </button>
        </div>
      </div>

      {/* Receipt Scanner */}
      {showScan && (
        <div className="bg-rp-card border border-rp-border rounded-xl p-5 mb-6 animate-scale-in">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <svg className="w-4 h-4 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-sm">AI Receipt Scanner</h3>
              <p className="text-xs text-neutral-400">Upload a receipt image. AI will extract vendor, items, and amounts.</p>
            </div>
          </div>

          <label htmlFor="receipt-file" className="block">
            <div className="border-2 border-dashed border-rp-border rounded-xl p-8 text-center cursor-pointer hover:border-rp-red/50 transition-colors">
              {scanning ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-neutral-400">Scanning receipt... This may take a moment.</p>
                </div>
              ) : (
                <>
                  <svg className="w-8 h-8 mx-auto text-rp-grey mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <p className="text-sm text-neutral-400">Click to upload or drag a receipt image</p>
                  <p className="text-xs text-rp-grey mt-1">JPG, PNG up to 10MB</p>
                </>
              )}
            </div>
            <input id="receipt-file" type="file" accept="image/*" onChange={handleScan} className="hidden" />
          </label>

          {scanned && (
            <div className="mt-4 space-y-4 animate-fade-in">
              <div className="flex items-center gap-2 text-xs text-emerald-400">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Extracted successfully. Review and edit before saving.
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-rp-grey mb-1">Vendor</label>
                  <input value={scanned.vendor} onChange={e => setScanned({...scanned, vendor: e.target.value})}
                    className="w-full bg-rp-black border border-rp-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-rp-red transition-colors" />
                </div>
                <div>
                  <label className="block text-xs text-rp-grey mb-1">Invoice #</label>
                  <input value={scanned.invoice_number || ''} onChange={e => setScanned({...scanned, invoice_number: e.target.value})}
                    className="w-full bg-rp-black border border-rp-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-rp-red transition-colors" />
                </div>
                <div>
                  <label className="block text-xs text-rp-grey mb-1">Date</label>
                  <input type="date" value={scanned.purchase_date} onChange={e => setScanned({...scanned, purchase_date: e.target.value})}
                    className="w-full bg-rp-black border border-rp-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-rp-red transition-colors cursor-pointer" />
                </div>
                <div>
                  <label className="block text-xs text-rp-grey mb-1">Total Amount</label>
                  <input type="number" value={scanned.total_amount} onChange={e => setScanned({...scanned, total_amount: parseFloat(e.target.value) || 0})}
                    className="w-full bg-rp-black border border-rp-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-rp-red transition-colors font-mono" />
                </div>
                <div>
                  <label className="block text-xs text-rp-grey mb-1">Category</label>
                  <select value={scanned.category} onChange={e => setScanned({...scanned, category: e.target.value})}
                    className="w-full bg-rp-black border border-rp-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-rp-red transition-colors cursor-pointer">
                    {categories.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              {scanned.items.length > 0 && (
                <div>
                  <label className="block text-xs text-rp-grey mb-2">Extracted Items ({scanned.items.length})</label>
                  <div className="border border-rp-border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-rp-border text-rp-grey bg-rp-black/50">
                          <th className="px-3 py-2 text-left font-medium">Item</th>
                          <th className="px-3 py-2 text-right font-medium">Qty</th>
                          <th className="px-3 py-2 text-right font-medium">Price</th>
                          <th className="px-3 py-2 text-right font-medium">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {scanned.items.map((item, i) => (
                          <tr key={i} className="border-b border-rp-border/50">
                            <td className="px-3 py-2 text-neutral-300">{item.item_name}</td>
                            <td className="px-3 py-2 text-right text-neutral-400">{item.quantity}</td>
                            <td className="px-3 py-2 text-right font-mono text-neutral-400">{'\u20B9'}{item.unit_price}</td>
                            <td className="px-3 py-2 text-right font-mono text-white">{'\u20B9'}{item.total}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {ocrText && (
                <details className="text-xs">
                  <summary className="text-rp-grey cursor-pointer hover:text-neutral-300 transition-colors">View raw OCR text</summary>
                  <pre className="bg-rp-black border border-rp-border rounded-lg p-3 mt-2 whitespace-pre-wrap text-neutral-500 max-h-40 overflow-auto font-mono text-[11px]">{ocrText}</pre>
                </details>
              )}

              <div className="flex gap-3 pt-2">
                <button onClick={saveScanResult} disabled={saving}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm font-medium transition-colors cursor-pointer disabled:opacity-50">
                  {saving ? 'Saving...' : 'Save Purchase'}
                </button>
                <button onClick={() => { setScanned(null); setOcrText(''); }}
                  className="px-5 py-2 bg-rp-card border border-rp-border hover:bg-rp-black rounded-lg text-sm transition-colors cursor-pointer text-neutral-400">
                  Discard
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Manual Add */}
      {showAdd && (
        <div className="bg-rp-card border border-rp-border rounded-xl p-5 mb-6 animate-scale-in">
          <h3 className="text-sm font-medium text-rp-grey mb-4">Add Purchase Manually</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="purch-vendor" className="block text-xs text-rp-grey mb-1">Vendor *</label>
              <input id="purch-vendor" placeholder="e.g. Metro Foods" value={form.vendor} onChange={e => setForm({...form, vendor: e.target.value})}
                className="w-full bg-rp-black border border-rp-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-rp-red transition-colors" />
            </div>
            <div>
              <label htmlFor="purch-inv" className="block text-xs text-rp-grey mb-1">Invoice #</label>
              <input id="purch-inv" placeholder="Optional" value={form.invoice_number} onChange={e => setForm({...form, invoice_number: e.target.value})}
                className="w-full bg-rp-black border border-rp-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-rp-red transition-colors" />
            </div>
            <div>
              <label htmlFor="purch-amt" className="block text-xs text-rp-grey mb-1">Amount (INR) *</label>
              <input id="purch-amt" type="number" placeholder="0" value={form.total_amount} onChange={e => setForm({...form, total_amount: e.target.value})}
                className="w-full bg-rp-black border border-rp-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-rp-red transition-colors font-mono" />
            </div>
            <div>
              <label htmlFor="purch-date" className="block text-xs text-rp-grey mb-1">Date</label>
              <input id="purch-date" type="date" value={form.purchase_date} onChange={e => setForm({...form, purchase_date: e.target.value})}
                className="w-full bg-rp-black border border-rp-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-rp-red transition-colors cursor-pointer" />
            </div>
            <div>
              <label htmlFor="purch-cat" className="block text-xs text-rp-grey mb-1">Category</label>
              <select id="purch-cat" value={form.category} onChange={e => setForm({...form, category: e.target.value})}
                className="w-full bg-rp-black border border-rp-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-rp-red transition-colors cursor-pointer">
                {categories.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="purch-notes" className="block text-xs text-rp-grey mb-1">Notes</label>
              <div className="flex gap-2">
                <input id="purch-notes" placeholder="Optional" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})}
                  className="w-full bg-rp-black border border-rp-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-rp-red transition-colors" />
                <button onClick={addPurchase} disabled={saving}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm font-medium transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50">
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search + filter */}
      {!loading && purchases.length > 0 && (
        <div className="flex gap-3 mb-4">
          <div className="relative flex-1 max-w-xs">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-rp-grey" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" strokeLinecap="round" />
            </svg>
            <input placeholder="Search vendor or invoice..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full bg-rp-card border border-rp-border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-rp-red transition-colors" />
          </div>
          <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
            className="bg-rp-card border border-rp-border rounded-lg px-3 py-2 text-sm cursor-pointer focus:outline-none focus:border-rp-red transition-colors">
            <option value="all">All Categories</option>
            {usedCategories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <SkeletonTable rows={6} cols={5} />
      ) : purchases.length === 0 ? (
        <div className="text-center py-16 bg-rp-card border border-rp-border rounded-xl">
          <svg className="w-12 h-12 mx-auto text-rp-grey/50 mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <p className="text-rp-grey font-medium">No purchases recorded yet</p>
          <p className="text-rp-grey/70 text-xs mt-1">Scan a receipt or add one manually</p>
        </div>
      ) : (
        <div className="bg-rp-card border border-rp-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-rp-border text-rp-grey text-left">
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Vendor</th>
                  <th className="px-4 py-3 font-medium">Invoice</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id} className="border-b border-rp-border/50 hover:bg-rp-black/30 transition-colors">
                    <td className="px-4 py-3 text-neutral-400 text-xs">{formatDate(p.purchase_date)}</td>
                    <td className="px-4 py-3 font-medium">{p.vendor}</td>
                    <td className="px-4 py-3 text-rp-grey font-mono text-xs">{p.invoice_number || '\u2014'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${categoryColors[p.category] || categoryColors['Other']}`}>{p.category}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-neutral-300">{'\u20B9'}{p.total_amount.toLocaleString('en-IN')}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-rp-grey text-sm">No matching purchases</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
