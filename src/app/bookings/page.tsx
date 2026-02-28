'use client';

import { useEffect, useState } from 'react';
import { api, type Booking } from '@/lib/api';
import { formatDate, formatTime } from '@/lib/utils';

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  async function loadBookings() {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (sourceFilter) params.source = sourceFilter;
      if (statusFilter) params.status = statusFilter;
      const data = await api.getBookings(params);
      setBookings(data.bookings);
      setTotal(data.total);
    } catch (err) {
      console.error('Failed to load bookings', err);
    }
    setLoading(false);
  }

  useEffect(() => { loadBookings(); }, [search, sourceFilter, statusFilter]);

  async function handleCancel(bookingId: string) {
    if (!confirm(`Cancel booking ${bookingId}?`)) return;
    try {
      await api.cancelBooking(bookingId);
      loadBookings();
    } catch (err) {
      alert('Failed to cancel booking');
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Bookings</h1>
        <span className="text-sm text-zinc-500">{total} total</span>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6">
        <input
          type="text"
          placeholder="Search name, phone, or ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-red-500"
        />
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">All Sources</option>
          <option value="whatsapp">WhatsApp</option>
          <option value="discord">Discord</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">All Status</option>
          <option value="confirmed">Confirmed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-zinc-500">Loading...</div>
        ) : bookings.length === 0 ? (
          <div className="p-8 text-center text-zinc-500">No bookings found</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-500 text-left">
                <th className="px-4 py-3 font-medium">ID</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Time</th>
                <th className="px-4 py-3 font-medium">Source</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.booking_id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                  <td className="px-4 py-3 font-mono text-xs text-zinc-400">{b.booking_id}</td>
                  <td className="px-4 py-3">{b.customer_name}</td>
                  <td className="px-4 py-3 text-zinc-400">{b.customer_phone}</td>
                  <td className="px-4 py-3">{b.booking_type}</td>
                  <td className="px-4 py-3">{formatDate(b.session_date)}</td>
                  <td className="px-4 py-3">{formatTime(b.start_time)} - {formatTime(b.end_time)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      b.source === 'whatsapp' ? 'bg-green-500/10 text-green-400' : 'bg-indigo-500/10 text-indigo-400'
                    }`}>
                      {b.source}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      b.status === 'confirmed' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                    }`}>
                      {b.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {b.status === 'confirmed' && (
                      <button
                        onClick={() => handleCancel(b.booking_id)}
                        className="text-xs text-red-400 hover:text-red-300"
                      >
                        Cancel
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
