'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatLapTime } from '@/lib/utils';

interface LeaderboardEntry {
  driver_name: string;
  car: string;
  best_lap_ms: number;
  achieved_at: string;
}

interface Driver {
  id: string;
  name: string;
  total_laps: number;
  total_time_ms: number;
}

export default function LeaderboardPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const data = await api.getRacecontrol('drivers');
        setDrivers(Array.isArray(data) ? data : data.drivers || []);
      } catch (err) {
        setError('RaceControl unavailable. Make sure the server is running on port 8080.');
      }
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Leaderboard</h1>

      {error ? (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-red-400 text-sm">
          {error}
        </div>
      ) : loading ? (
        <div className="text-center text-zinc-500 py-8">Loading...</div>
      ) : drivers.length === 0 ? (
        <div className="text-center text-zinc-500 py-8">No driver data yet</div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-500 text-left">
                <th className="px-4 py-3 font-medium">#</th>
                <th className="px-4 py-3 font-medium">Driver</th>
                <th className="px-4 py-3 font-medium">Total Laps</th>
                <th className="px-4 py-3 font-medium">Total Time</th>
              </tr>
            </thead>
            <tbody>
              {drivers.map((d, i) => (
                <tr key={d.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                  <td className="px-4 py-3 text-zinc-500">{i + 1}</td>
                  <td className="px-4 py-3 font-medium">{d.name}</td>
                  <td className="px-4 py-3 text-zinc-400">{d.total_laps}</td>
                  <td className="px-4 py-3 font-mono text-zinc-400">
                    {d.total_time_ms ? formatLapTime(d.total_time_ms) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
