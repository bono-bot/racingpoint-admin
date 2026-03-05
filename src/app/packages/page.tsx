'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface Package {
  id: string;
  name: string;
  description: string;
  duration_mins: number;
  price_paise: number;
  max_participants: number;
  includes: string;
  active: boolean;
}

export default function PackagesPage() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const data = await api.getPackages();
        setPackages(data.packages || []);
      } catch { setError('Failed to load packages'); }
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Packages</h1>
      <p className="text-rp-grey text-sm mb-6">Pre-configured experience packages for customers</p>

      {error ? (
        <div className="bg-rp-red/10 border border-rp-red/20 rounded-xl p-6 text-rp-red text-sm">{error}</div>
      ) : loading ? (
        <div className="text-center text-rp-grey py-8">Loading...</div>
      ) : packages.length === 0 ? (
        <div className="text-center text-rp-grey py-8">No packages configured</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {packages.map(p => (
            <div key={p.id} className="bg-rp-card border border-rp-border rounded-xl p-5">
              <div className="flex items-start justify-between mb-3">
                <h2 className="text-white font-bold text-lg">{p.name}</h2>
                <span className={`text-xs px-2 py-0.5 rounded-full ${p.active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-neutral-500/20 text-neutral-400'}`}>
                  {p.active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <p className="text-rp-grey text-sm mb-4">{p.description}</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-rp-grey">Price</span>
                  <span className="text-rp-red font-bold">{'\u20B9'}{(p.price_paise / 100).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-rp-grey">Duration</span>
                  <span className="text-white">{p.duration_mins} min</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-rp-grey">Max Participants</span>
                  <span className="text-white">{p.max_participants}</span>
                </div>
              </div>
              {p.includes && (
                <div className="mt-4 pt-3 border-t border-rp-border">
                  <p className="text-xs text-rp-grey mb-1">Includes</p>
                  <p className="text-white text-sm">{p.includes}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
