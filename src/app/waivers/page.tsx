'use client';

import { useEffect, useState } from 'react';

interface Waiver {
  driver_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  dob: string | null;
  waiver_signed_at: string | null;
  waiver_version: string | null;
  guardian_name: string | null;
  guardian_phone: string | null;
  has_signature: boolean;
  is_minor: boolean;
}

interface WaiverData {
  waivers: Waiver[];
  total: number;
  page: number;
  per_page: number;
  error?: string;
}

interface CheckResult {
  signed: boolean;
  driver: { id: string; name: string; phone: string | null } | null;
  error?: string;
}

export default function WaiversPage() {
  const [data, setData] = useState<WaiverData | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [checkResult, setCheckResult] = useState<CheckResult | null>(null);
  const [checking, setChecking] = useState(false);
  const [sigPopup, setSigPopup] = useState<string | null>(null);
  const [sigData, setSigData] = useState<string | null>(null);
  const [sigLoading, setSigLoading] = useState(false);

  useEffect(() => {
    fetch('/api/waivers')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function checkWaiver() {
    if (!search.trim()) return;
    setChecking(true);
    setCheckResult(null);
    const isEmail = search.includes('@');
    const params = isEmail ? `email=${encodeURIComponent(search)}` : `phone=${encodeURIComponent(search)}`;
    try {
      const res = await fetch(`/api/waivers?${params}`);
      const result = await res.json();
      setCheckResult(result);
    } catch {
      alert('Check failed');
    }
    setChecking(false);
  }

  async function viewSignature(driverId: string) {
    setSigPopup(driverId);
    setSigData(null);
    setSigLoading(true);
    try {
      const res = await fetch(`/api/waivers/${driverId}/signature`);
      const result = await res.json();
      if (result.signature_data) setSigData(result.signature_data);
    } catch { /* ignore */ }
    setSigLoading(false);
  }

  function formatDate(iso: string | null) {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return iso;
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Waiver Forms</h1>

      {/* Quick check */}
      <div className="bg-rp-card border border-rp-border rounded-xl p-5 mb-6">
        <h3 className="font-semibold mb-3">Check Waiver Status</h3>
        <div className="flex gap-3">
          <input
            placeholder="Enter phone number or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && checkWaiver()}
            className="flex-1 bg-rp-card border border-rp-border rounded-lg px-4 py-2 text-sm"
          />
          <button onClick={checkWaiver} disabled={checking}
            className="px-6 py-2 bg-rp-red hover:bg-rp-red disabled:bg-rp-card rounded-lg text-sm font-medium">
            {checking ? 'Checking...' : 'Check'}
          </button>
        </div>

        {checkResult && (
          <div className={`mt-4 p-4 rounded-lg border ${
            checkResult.signed
              ? 'bg-green-500/10 border-green-500/20'
              : 'bg-amber-500/10 border-amber-500/20'
          }`}>
            {checkResult.signed && checkResult.driver ? (
              <div>
                <p className="font-semibold text-green-400 mb-2">Waiver Signed</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-rp-grey">Name:</span> <span className="text-neutral-300">{checkResult.driver.name}</span></div>
                  <div><span className="text-rp-grey">Phone:</span> <span className="text-neutral-300">{checkResult.driver.phone}</span></div>
                </div>
              </div>
            ) : (
              <p className="font-semibold text-amber-400">No waiver found for this contact</p>
            )}
          </div>
        )}
      </div>

      {/* All waivers list */}
      {loading ? (
        <div className="text-center text-rp-grey py-8">Loading...</div>
      ) : data?.error ? (
        <div className="bg-rp-card border border-rp-border rounded-xl p-6 text-center">
          <p className="text-neutral-400 mb-2">{data.error}</p>
          <p className="text-sm text-rp-grey">Make sure RaceControl Core is running on port 8080.</p>
        </div>
      ) : !data?.waivers || data.waivers.length === 0 ? (
        <div className="text-center text-rp-grey py-8">No waiver responses found</div>
      ) : (
        <div>
          <p className="text-sm text-rp-grey mb-3">{data.total} waiver{data.total !== 1 ? 's' : ''} signed</p>
          <div className="bg-rp-card border border-rp-border rounded-xl overflow-hidden overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-rp-border text-rp-grey text-left">
                  <th className="px-4 py-3 font-medium">#</th>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Phone</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">DOB</th>
                  <th className="px-4 py-3 font-medium">Signed</th>
                  <th className="px-4 py-3 font-medium">Minor</th>
                  <th className="px-4 py-3 font-medium">Signature</th>
                  <th className="px-4 py-3 font-medium">Guardian</th>
                </tr>
              </thead>
              <tbody>
                {data.waivers.map((w, i) => (
                  <tr key={w.driver_id} className="border-b border-rp-border/50 hover:bg-rp-card/30">
                    <td className="px-4 py-3 text-rp-grey">{i + 1}</td>
                    <td className="px-4 py-3 text-neutral-300 font-medium">{w.name}</td>
                    <td className="px-4 py-3 text-neutral-300">{w.phone || '—'}</td>
                    <td className="px-4 py-3 text-neutral-300 max-w-[180px] truncate">{w.email || '—'}</td>
                    <td className="px-4 py-3 text-neutral-300">{formatDate(w.dob)}</td>
                    <td className="px-4 py-3 text-neutral-300">{formatDate(w.waiver_signed_at)}</td>
                    <td className="px-4 py-3">
                      {w.is_minor ? (
                        <span className="text-amber-400 text-xs font-medium px-2 py-0.5 rounded bg-amber-500/10">Minor</span>
                      ) : (
                        <span className="text-green-400 text-xs">Adult</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {w.has_signature ? (
                        <button onClick={() => viewSignature(w.driver_id)}
                          className="text-rp-red text-xs font-medium hover:underline cursor-pointer">View</button>
                      ) : (
                        <span className="text-rp-grey text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-neutral-300">{w.guardian_name || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Signature popup */}
      {sigPopup && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={() => setSigPopup(null)}>
          <div className="bg-rp-card border border-rp-border rounded-xl p-6 max-w-md w-full"
            onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold mb-4">Customer Signature</h3>
            {sigLoading ? (
              <div className="text-center text-rp-grey py-8">Loading...</div>
            ) : sigData ? (
              <div className="bg-white rounded-lg p-3">
                <img src={sigData} alt="Signature" className="w-full" />
              </div>
            ) : (
              <div className="text-center text-rp-grey py-8">No signature available</div>
            )}
            <button onClick={() => setSigPopup(null)}
              className="mt-4 w-full py-2 bg-rp-border hover:bg-rp-grey/20 rounded-lg text-sm font-medium">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
