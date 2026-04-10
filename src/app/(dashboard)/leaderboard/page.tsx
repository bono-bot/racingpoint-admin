'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { formatLapTime } from '@/lib/utils';
import { SkeletonTable } from '@/components/Skeleton';

interface Driver {
  id: string;
  name: string;
  total_laps: number;
  total_time_ms: number;
}

interface TimeTrial {
  id: string;
  track: string;
  car: string;
  duration_minutes: number;
  status: string;
  participants_count?: number;
  best_time_ms?: number;
  created_at: string;
}

type Tab = 'leaderboard' | 'time-trials';

export default function LeaderboardPage() {
  const [tab, setTab] = useState<Tab>('leaderboard');
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [timeTrials, setTimeTrials] = useState<TimeTrial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showTrialForm, setShowTrialForm] = useState(false);
  const [trialForm, setTrialForm] = useState({ track: '', car: '', duration_minutes: '30' });

  const loadDrivers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getRacecontrol('drivers');
      setDrivers(Array.isArray(data) ? data : data.drivers || []);
    } catch {
      setError('RaceControl unavailable. Make sure the server is running on port 8080.');
    }
    setLoading(false);
  }, []);

  const loadTimeTrials = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getTimeTrials();
      setTimeTrials(data.time_trials || []);
    } catch {
      setError('Failed to load time trials.');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (tab === 'leaderboard') {
      loadDrivers();
    } else {
      loadTimeTrials();
    }
  }, [tab, loadDrivers, loadTimeTrials]);

  const handleCreateTrial = async () => {
    try {
      await api.createTimeTrial({
        track: trialForm.track,
        car: trialForm.car,
        duration_minutes: Number(trialForm.duration_minutes),
      });
      setShowTrialForm(false);
      setTrialForm({ track: '', car: '', duration_minutes: '30' });
      loadTimeTrials();
    } catch { alert('Failed to create time trial'); }
  };

  const tabClass = (value: Tab) =>
    `px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
      tab === value
        ? 'bg-rp-red text-white'
        : 'bg-rp-card border border-rp-border text-rp-grey hover:text-white'
    }`;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Leaderboard</h1>
        {tab === 'time-trials' && (
          <button
            onClick={() => setShowTrialForm(!showTrialForm)}
            className="bg-rp-red hover:bg-rp-red/90 text-white text-sm font-semibold px-4 py-2 rounded-lg"
          >
            {showTrialForm ? 'Cancel' : '+ New Time Trial'}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button onClick={() => setTab('leaderboard')} className={tabClass('leaderboard')}>Leaderboard</button>
        <button onClick={() => setTab('time-trials')} className={tabClass('time-trials')}>Time Trials</button>
      </div>

      {/* Create Time Trial Form */}
      {tab === 'time-trials' && showTrialForm && (
        <div className="bg-rp-card border border-rp-border rounded-xl p-4 mb-6">
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div>
              <label className="text-xs text-rp-grey">Track</label>
              <input value={trialForm.track} onChange={e => setTrialForm({ ...trialForm, track: e.target.value })}
                className="w-full bg-rp-black border border-rp-border rounded-lg px-3 py-2 text-sm text-white mt-1" placeholder="Monza" />
            </div>
            <div>
              <label className="text-xs text-rp-grey">Car</label>
              <input value={trialForm.car} onChange={e => setTrialForm({ ...trialForm, car: e.target.value })}
                className="w-full bg-rp-black border border-rp-border rounded-lg px-3 py-2 text-sm text-white mt-1" placeholder="Ferrari 488 GT3" />
            </div>
            <div>
              <label className="text-xs text-rp-grey">Duration (minutes)</label>
              <input type="number" value={trialForm.duration_minutes} onChange={e => setTrialForm({ ...trialForm, duration_minutes: e.target.value })}
                className="w-full bg-rp-black border border-rp-border rounded-lg px-3 py-2 text-sm text-white mt-1" />
            </div>
          </div>
          <button onClick={handleCreateTrial} className="bg-rp-red hover:bg-rp-red/90 text-white text-sm font-semibold px-6 py-2 rounded-lg">
            Create Time Trial
          </button>
        </div>
      )}

      {error ? (
        <div className="bg-rp-red/10 border border-rp-red/20 rounded-xl p-6 text-rp-red text-sm">
          {error}
        </div>
      ) : loading ? (
        <SkeletonTable rows={5} cols={4} />
      ) : tab === 'leaderboard' ? (
        /* Leaderboard Tab */
        drivers.length === 0 ? (
          <div className="text-center text-rp-grey py-8">No driver data yet</div>
        ) : (
          <div className="bg-rp-card border border-rp-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-rp-border text-rp-grey text-left">
                  <th className="px-4 py-3 font-medium">#</th>
                  <th className="px-4 py-3 font-medium">Driver</th>
                  <th className="px-4 py-3 font-medium">Total Laps</th>
                  <th className="px-4 py-3 font-medium">Total Time</th>
                </tr>
              </thead>
              <tbody>
                {drivers.map((d, i) => (
                  <tr key={d.id} className="border-b border-rp-border/50 hover:bg-rp-card/30">
                    <td className="px-4 py-3 text-rp-grey">{i + 1}</td>
                    <td className="px-4 py-3 font-medium">{d.name}</td>
                    <td className="px-4 py-3 text-neutral-400">{d.total_laps}</td>
                    <td className="px-4 py-3 font-mono text-neutral-400">
                      {d.total_time_ms ? formatLapTime(d.total_time_ms) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : (
        /* Time Trials Tab */
        timeTrials.length === 0 ? (
          <div className="text-center text-rp-grey py-8">No time trials yet</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {timeTrials.map(tt => (
              <div key={tt.id} className="bg-rp-card border border-rp-border rounded-xl p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-white font-bold">{tt.track}</h3>
                    <p className="text-sm text-rp-grey">{tt.car}</p>
                  </div>
                  <span className={`text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    tt.status === 'active'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : tt.status === 'completed'
                        ? 'bg-neutral-500/20 text-neutral-400'
                        : 'bg-blue-500/20 text-blue-400'
                  }`}>
                    {tt.status}
                  </span>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-rp-grey">Duration</span>
                    <span className="text-white">{tt.duration_minutes} min</span>
                  </div>
                  {tt.participants_count !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-rp-grey">Participants</span>
                      <span className="text-white">{tt.participants_count}</span>
                    </div>
                  )}
                  {tt.best_time_ms !== undefined && tt.best_time_ms > 0 && (
                    <div className="flex justify-between">
                      <span className="text-rp-grey">Best Time</span>
                      <span className="font-mono text-emerald-400">{formatLapTime(tt.best_time_ms)}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
