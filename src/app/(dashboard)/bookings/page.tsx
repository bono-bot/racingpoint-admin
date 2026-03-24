'use client';

import { useEffect, useState, useCallback } from 'react';
import { api, type Booking } from '@/lib/api';
import { formatDate, formatTime } from '@/lib/utils';
import ConfirmDialog from '@/components/ConfirmDialog';

type SourceFilter = '' | 'whatsapp' | 'discord';
type StatusFilter = '' | 'confirmed' | 'cancelled';

interface BookingStats {
  total: number;
  confirmed: number;
  cancelled: number;
  whatsapp: number;
  discord: number;
}

function computeStats(bookings: Booking[]): BookingStats {
  return bookings.reduce<BookingStats>(
    (acc, b) => {
      acc.total++;
      if (b.status === 'confirmed') acc.confirmed++;
      if (b.status === 'cancelled') acc.cancelled++;
      if (b.source === 'whatsapp') acc.whatsapp++;
      if (b.source === 'discord') acc.discord++;
      return acc;
    },
    { total: 0, confirmed: 0, cancelled: 0, whatsapp: 0, discord: 0 }
  );
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Booking | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);

  const loadBookings = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (sourceFilter) params.source = sourceFilter;
      if (statusFilter) params.status = statusFilter;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      const data = await api.getBookings(params);
      setBookings(data.bookings);
      setTotal(data.total);
    } catch (err) {
      console.error('Failed to load bookings', err);
    }
    setLoading(false);
  }, [search, sourceFilter, statusFilter, dateFrom, dateTo]);

  useEffect(() => { loadBookings(); }, [loadBookings]);

  const handleCancel = async () => {
    if (!cancelTarget) return;
    setCancelLoading(true);
    try {
      await api.cancelBooking(cancelTarget.booking_id);
      setCancelTarget(null);
      loadBookings();
    } catch {
      alert('Failed to cancel booking');
    }
    setCancelLoading(false);
  };

  const stats = computeStats(bookings);

  const sourceTabClass = (value: SourceFilter) =>
    `px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
      sourceFilter === value
        ? 'bg-rp-red text-white'
        : 'bg-rp-card border border-rp-border text-rp-grey hover:text-white'
    }`;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Bookings</h1>
        <span className="text-sm text-rp-grey">{total} total</span>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        <div className="bg-rp-card border border-rp-border rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-white">{stats.total}</p>
          <p className="text-xs text-rp-grey">Total</p>
        </div>
        <div className="bg-rp-card border border-rp-border rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-emerald-400">{stats.confirmed}</p>
          <p className="text-xs text-rp-grey">Confirmed</p>
        </div>
        <div className="bg-rp-card border border-rp-border rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-rp-red">{stats.cancelled}</p>
          <p className="text-xs text-rp-grey">Cancelled</p>
        </div>
        <div className="bg-rp-card border border-rp-border rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-green-400">{stats.whatsapp}</p>
          <p className="text-xs text-rp-grey">WhatsApp</p>
        </div>
        <div className="bg-rp-card border border-rp-border rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-indigo-400">{stats.discord}</p>
          <p className="text-xs text-rp-grey">Discord</p>
        </div>
      </div>

      {/* Source Tabs */}
      <div className="flex gap-2 mb-4">
        <button onClick={() => setSourceFilter('')} className={sourceTabClass('')}>All Sources</button>
        <button onClick={() => setSourceFilter('whatsapp')} className={sourceTabClass('whatsapp')}>WhatsApp</button>
        <button onClick={() => setSourceFilter('discord')} className={sourceTabClass('discord')}>Discord</button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6">
        <input
          type="text"
          placeholder="Search name, phone, or ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-rp-card border border-rp-border rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-rp-red"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="bg-rp-card border border-rp-border rounded-lg px-3 py-2 text-sm"
        >
          <option value="">All Status</option>
          <option value="confirmed">Confirmed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="bg-rp-card border border-rp-border rounded-lg px-3 py-2 text-sm"
          title="From date"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="bg-rp-card border border-rp-border rounded-lg px-3 py-2 text-sm"
          title="To date"
        />
      </div>

      {/* Table */}
      <div className="bg-rp-card border border-rp-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-rp-grey">Loading...</div>
        ) : bookings.length === 0 ? (
          <div className="p-8 text-center text-rp-grey">No bookings found</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-rp-border text-rp-grey text-left">
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
                <>
                  <tr
                    key={b.booking_id}
                    className="border-b border-rp-border/50 hover:bg-rp-card/30 cursor-pointer"
                    onClick={() => setExpandedId(expandedId === b.booking_id ? null : b.booking_id)}
                  >
                    <td className="px-4 py-3 font-mono text-xs text-neutral-400">{b.booking_id}</td>
                    <td className="px-4 py-3">{b.customer_name}</td>
                    <td className="px-4 py-3 text-neutral-400">{b.customer_phone}</td>
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
                        b.status === 'confirmed' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rp-red/10 text-rp-red'
                      }`}>
                        {b.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {b.status === 'confirmed' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setCancelTarget(b); }}
                          className="text-xs text-rp-red hover:text-rp-red-light"
                        >
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                  {expandedId === b.booking_id && (
                    <tr key={`${b.booking_id}-detail`} className="border-b border-rp-border/50 bg-rp-black/30">
                      <td colSpan={9} className="px-6 py-4">
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-xs text-rp-grey uppercase tracking-wider mb-1">Customer Info</p>
                            <p className="text-white font-medium">{b.customer_name}</p>
                            <p className="text-neutral-400">{b.customer_phone}</p>
                            {b.customer_email && <p className="text-neutral-400">{b.customer_email}</p>}
                          </div>
                          <div>
                            <p className="text-xs text-rp-grey uppercase tracking-wider mb-1">Booking Details</p>
                            <p className="text-white">Type: <span className="text-neutral-300">{b.booking_type}</span></p>
                            <p className="text-white">Date: <span className="text-neutral-300">{formatDate(b.session_date)}</span></p>
                            <p className="text-white">Time: <span className="text-neutral-300">{formatTime(b.start_time)} - {formatTime(b.end_time)}</span></p>
                          </div>
                          <div>
                            <p className="text-xs text-rp-grey uppercase tracking-wider mb-1">Metadata</p>
                            <p className="text-white">Source: <span className="text-neutral-300">{b.source}</span></p>
                            <p className="text-white">Created: <span className="text-neutral-300">{formatDate(b.created_at)}</span></p>
                            {b.calendar_event_id && (
                              <p className="text-white">Calendar ID: <span className="font-mono text-xs text-neutral-400">{b.calendar_event_id}</span></p>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <ConfirmDialog
        open={cancelTarget !== null}
        title="Cancel Booking"
        message={cancelTarget ? `Cancel booking ${cancelTarget.booking_id} for ${cancelTarget.customer_name}?` : ''}
        confirmLabel="Cancel Booking"
        danger
        loading={cancelLoading}
        onConfirm={handleCancel}
        onCancel={() => setCancelTarget(null)}
      />
    </div>
  );
}
