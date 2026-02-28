'use client';

import { useEffect, useState } from 'react';
import { formatDate, formatTime } from '@/lib/utils';

interface CalendarEvent {
  id: string;
  summary: string;
  start: string;
  end: string;
  location: string | null;
  description: string | null;
}

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/calendar');
        const data = await res.json();
        setEvents(data.events || []);
      } catch (err) {
        console.error('Failed to load calendar', err);
      }
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Calendar</h1>

      {loading ? (
        <div className="text-center text-zinc-500 py-8">Loading...</div>
      ) : events.length === 0 ? (
        <div className="text-center text-zinc-500 py-8">No upcoming events</div>
      ) : (
        <div className="space-y-3">
          {events.map((e) => {
            const start = new Date(e.start);
            const end = new Date(e.end);
            const isBooking = e.summary?.startsWith('Booking:');

            return (
              <div key={e.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      {isBooking && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-400">
                          booking
                        </span>
                      )}
                      <h3 className="font-semibold">{e.summary}</h3>
                    </div>
                    {e.description && (
                      <p className="text-sm text-zinc-400 mt-1 whitespace-pre-line">{e.description}</p>
                    )}
                    {e.location && (
                      <p className="text-xs text-zinc-500 mt-2">{e.location}</p>
                    )}
                  </div>
                  <div className="text-right text-sm">
                    <p className="text-zinc-300">{formatDate(e.start)}</p>
                    <p className="text-zinc-500">
                      {start.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                      {' - '}
                      {end.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
