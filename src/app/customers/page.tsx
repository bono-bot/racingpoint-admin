'use client';

import { useEffect, useState } from 'react';
import { api, type Customer } from '@/lib/api';
import { formatDate } from '@/lib/utils';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const params: Record<string, string> = {};
        if (search) params.search = search;
        const data = await api.getCustomers(params);
        setCustomers(data.customers);
        setTotal(data.total);
      } catch (err) {
        console.error('Failed to load customers', err);
      }
      setLoading(false);
    }
    load();
  }, [search]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Customers</h1>
        <span className="text-sm text-zinc-500">{total} total</span>
      </div>

      <input
        type="text"
        placeholder="Search by name, phone, or email..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-sm mb-6 focus:outline-none focus:border-red-500"
      />

      {loading ? (
        <div className="text-center text-zinc-500 py-8">Loading...</div>
      ) : customers.length === 0 ? (
        <div className="text-center text-zinc-500 py-8">No customers found</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {customers.map((c) => (
            <div key={c.phone} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-semibold">{c.name}</h3>
                  <p className="text-sm text-zinc-400">{c.phone}</p>
                  {c.email && <p className="text-sm text-zinc-500">{c.email}</p>}
                </div>
                <div className="flex gap-1">
                  {c.sources.map((s) => (
                    <span key={s} className={`text-xs px-2 py-0.5 rounded-full ${
                      s === 'whatsapp' ? 'bg-green-500/10 text-green-400' : 'bg-indigo-500/10 text-indigo-400'
                    }`}>
                      {s}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex justify-between text-xs text-zinc-500 border-t border-zinc-800 pt-3">
                <span>{c.total_bookings} booking{c.total_bookings !== 1 ? 's' : ''}</span>
                <span>Last: {formatDate(c.last_booking)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
