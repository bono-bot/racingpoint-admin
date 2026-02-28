'use client';

import { useEffect, useState } from 'react';

interface WaiverEntry {
  _index: number;
  [key: string]: string | number;
}

interface WaiverData {
  waivers: WaiverEntry[];
  headers: string[];
  mapping: { phone: string | null; email: string | null; name: string | null; timestamp: string | null };
  total: number;
  message?: string;
}

export default function WaiversPage() {
  const [data, setData] = useState<WaiverData | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [checkResult, setCheckResult] = useState<{ signed: boolean; waiver: Record<string, string> | null } | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    fetch('/api/waivers').then(r => r.json()).then(d => { setData(d); setLoading(false); });
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

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Waiver Forms</h1>

      {/* Quick check */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-6">
        <h3 className="font-semibold mb-3">Check Waiver Status</h3>
        <div className="flex gap-3">
          <input
            placeholder="Enter phone number or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && checkWaiver()}
            className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-sm"
          />
          <button onClick={checkWaiver} disabled={checking}
            className="px-6 py-2 bg-red-600 hover:bg-red-500 disabled:bg-zinc-800 rounded-lg text-sm font-medium">
            {checking ? 'Checking...' : 'Check'}
          </button>
        </div>

        {checkResult && (
          <div className={`mt-4 p-4 rounded-lg border ${
            checkResult.signed
              ? 'bg-green-500/10 border-green-500/20'
              : 'bg-amber-500/10 border-amber-500/20'
          }`}>
            {checkResult.signed ? (
              <div>
                <p className="font-semibold text-green-400 mb-2">Waiver Signed</p>
                {checkResult.waiver && (
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {Object.entries(checkResult.waiver).map(([k, v]) => (
                      <div key={k}>
                        <span className="text-zinc-500">{k}:</span>{' '}
                        <span className="text-zinc-300">{v}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="font-semibold text-amber-400">No waiver found for this contact</p>
            )}
          </div>
        )}
      </div>

      {/* All waivers list */}
      {loading ? (
        <div className="text-center text-zinc-500 py-8">Loading...</div>
      ) : data?.message ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center">
          <p className="text-zinc-400 mb-2">{data.message}</p>
          <p className="text-sm text-zinc-600">Add WAIVER_SHEET_ID to your API gateway .env file with the Google Sheets ID where your Google Form responses are saved.</p>
        </div>
      ) : !data?.waivers || data.waivers.length === 0 ? (
        <div className="text-center text-zinc-500 py-8">No waiver responses found</div>
      ) : (
        <div>
          <p className="text-sm text-zinc-500 mb-3">{data.total} waiver{data.total !== 1 ? 's' : ''} signed</p>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-500 text-left">
                  <th className="px-4 py-3 font-medium">#</th>
                  {data.headers.slice(0, 6).map(h => (
                    <th key={h} className="px-4 py-3 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.waivers.map((w, i) => (
                  <tr key={i} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                    <td className="px-4 py-3 text-zinc-500">{w._index}</td>
                    {data.headers.slice(0, 6).map(h => (
                      <td key={h} className="px-4 py-3 text-zinc-300 max-w-[200px] truncate">
                        {String(w[h] || '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
