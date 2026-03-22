'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface Tournament {
  id: string;
  name: string;
  description: string;
  track: string;
  car: string;
  format: string;
  max_participants: number;
  entry_fee_paise: number;
  prize_pool_paise: number;
  status: string;
  event_date: string | null;
  registration_count?: number;
}

interface Match {
  id: string;
  round: number;
  match_order: number;
  driver1_id: string | null;
  driver2_id: string | null;
  driver1_name?: string;
  driver2_name?: string;
  winner_id: string | null;
  status: string;
}

const statusColors: Record<string, string> = {
  upcoming: 'bg-blue-500/20 text-blue-400',
  registration: 'bg-emerald-500/20 text-emerald-400',
  in_progress: 'bg-yellow-500/20 text-yellow-400',
  completed: 'bg-neutral-500/20 text-neutral-400',
};

export default function TournamentsPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [form, setForm] = useState({
    name: '', description: '', track: '', car: '', format: 'single_elimination',
    max_participants: '16', entry_fee_paise: '0', prize_pool_paise: '0', event_date: '',
  });

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.getTournaments();
      setTournaments(data.tournaments || []);
    } catch { setError('Failed to load tournaments'); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    try {
      await api.createTournament({
        name: form.name,
        description: form.description || null,
        track: form.track,
        car: form.car,
        format: form.format,
        max_participants: Number(form.max_participants),
        entry_fee_paise: Number(form.entry_fee_paise),
        prize_pool_paise: Number(form.prize_pool_paise),
        event_date: form.event_date || null,
      });
      setShowForm(false);
      setForm({ name: '', description: '', track: '', car: '', format: 'single_elimination', max_participants: '16', entry_fee_paise: '0', prize_pool_paise: '0', event_date: '' });
      load();
    } catch { alert('Failed to create tournament'); }
  };

  const handleGenerateBracket = async (id: string) => {
    try {
      await api.generateBracket(id);
      alert('Bracket generated!');
      loadMatches(id);
    } catch { alert('Failed to generate bracket'); }
  };

  const loadMatches = async (id: string) => {
    setSelected(id);
    try {
      const data = await api.getTournamentMatches(id);
      setMatches(data.matches || []);
    } catch { setMatches([]); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Tournaments</h1>
        <button onClick={() => setShowForm(!showForm)}
          className="bg-rp-red hover:bg-rp-red/90 text-white text-sm font-semibold px-4 py-2 rounded-lg">
          {showForm ? 'Cancel' : '+ New Tournament'}
        </button>
      </div>

      {showForm && (
        <div className="bg-rp-card border border-rp-border rounded-xl p-4 mb-6 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-rp-grey">Name</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full bg-rp-black border border-rp-border rounded-lg px-3 py-2 text-sm text-white mt-1" placeholder="March Madness" />
            </div>
            <div>
              <label className="text-xs text-rp-grey">Track</label>
              <input value={form.track} onChange={e => setForm({ ...form, track: e.target.value })}
                className="w-full bg-rp-black border border-rp-border rounded-lg px-3 py-2 text-sm text-white mt-1" placeholder="Monza" />
            </div>
            <div>
              <label className="text-xs text-rp-grey">Car</label>
              <input value={form.car} onChange={e => setForm({ ...form, car: e.target.value })}
                className="w-full bg-rp-black border border-rp-border rounded-lg px-3 py-2 text-sm text-white mt-1" placeholder="Ferrari 488 GT3" />
            </div>
            <div>
              <label className="text-xs text-rp-grey">Format</label>
              <select value={form.format} onChange={e => setForm({ ...form, format: e.target.value })}
                className="w-full bg-rp-black border border-rp-border rounded-lg px-3 py-2 text-sm text-white mt-1">
                <option value="single_elimination">Single Elimination</option>
                <option value="time_attack">Time Attack</option>
                <option value="round_robin">Round Robin</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-rp-grey">Max Participants</label>
              <input type="number" value={form.max_participants} onChange={e => setForm({ ...form, max_participants: e.target.value })}
                className="w-full bg-rp-black border border-rp-border rounded-lg px-3 py-2 text-sm text-white mt-1" />
            </div>
            <div>
              <label className="text-xs text-rp-grey">Event Date</label>
              <input type="date" value={form.event_date} onChange={e => setForm({ ...form, event_date: e.target.value })}
                className="w-full bg-rp-black border border-rp-border rounded-lg px-3 py-2 text-sm text-white mt-1" />
            </div>
            <div>
              <label className="text-xs text-rp-grey">Entry Fee (paise)</label>
              <input type="number" value={form.entry_fee_paise} onChange={e => setForm({ ...form, entry_fee_paise: e.target.value })}
                className="w-full bg-rp-black border border-rp-border rounded-lg px-3 py-2 text-sm text-white mt-1" />
            </div>
            <div>
              <label className="text-xs text-rp-grey">Prize Pool (paise)</label>
              <input type="number" value={form.prize_pool_paise} onChange={e => setForm({ ...form, prize_pool_paise: e.target.value })}
                className="w-full bg-rp-black border border-rp-border rounded-lg px-3 py-2 text-sm text-white mt-1" />
            </div>
            <div className="col-span-3">
              <label className="text-xs text-rp-grey">Description</label>
              <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                className="w-full bg-rp-black border border-rp-border rounded-lg px-3 py-2 text-sm text-white mt-1" placeholder="Optional description" />
            </div>
          </div>
          <button onClick={handleCreate} className="bg-rp-red hover:bg-rp-red/90 text-white text-sm font-semibold px-6 py-2 rounded-lg">
            Create Tournament
          </button>
        </div>
      )}

      {error ? (
        <div className="bg-rp-red/10 border border-rp-red/20 rounded-xl p-6 text-rp-red text-sm">{error}</div>
      ) : loading ? (
        <div className="text-center text-rp-grey py-8">Loading...</div>
      ) : tournaments.length === 0 ? (
        <div className="text-center text-rp-grey py-8">No tournaments yet</div>
      ) : (
        <div className="space-y-4">
          {tournaments.map(t => (
            <div key={t.id} className="bg-rp-card border border-rp-border rounded-xl p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h2 className="text-white font-bold text-lg">{t.name}</h2>
                  {t.description && <p className="text-rp-grey text-sm">{t.description}</p>}
                </div>
                <span className={`text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${statusColors[t.status] || statusColors.upcoming}`}>
                  {t.status.replace('_', ' ')}
                </span>
              </div>

              <div className="grid grid-cols-4 gap-3 text-sm mb-3">
                <div><span className="text-rp-grey">Track: </span><span className="text-white">{t.track}</span></div>
                <div><span className="text-rp-grey">Car: </span><span className="text-white">{t.car}</span></div>
                <div><span className="text-rp-grey">Format: </span><span className="text-white capitalize">{t.format.replace('_', ' ')}</span></div>
                <div><span className="text-rp-grey">Slots: </span><span className="text-white">{t.max_participants}</span></div>
                <div><span className="text-rp-grey">Entry: </span><span className="text-white">{t.entry_fee_paise ? `₹${(t.entry_fee_paise / 100).toFixed(0)}` : 'Free'}</span></div>
                <div><span className="text-rp-grey">Prize: </span><span className="text-rp-red font-bold">{t.prize_pool_paise ? `₹${(t.prize_pool_paise / 100).toLocaleString()}` : '-'}</span></div>
                {t.event_date && <div><span className="text-rp-grey">Date: </span><span className="text-white">{new Date(t.event_date).toLocaleDateString()}</span></div>}
              </div>

              <div className="flex gap-2">
                {(t.status === 'registration' || t.status === 'upcoming') && (
                  <button onClick={() => handleGenerateBracket(t.id)}
                    className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg">
                    Generate Bracket
                  </button>
                )}
                <button onClick={() => loadMatches(t.id)}
                  className="bg-rp-card border border-rp-border hover:border-neutral-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg">
                  {selected === t.id ? 'Refresh Matches' : 'View Matches'}
                </button>
              </div>

              {selected === t.id && matches.length > 0 && (
                <div className="mt-4 border-t border-rp-border pt-3">
                  <h3 className="text-sm font-medium text-rp-grey mb-2">Bracket</h3>
                  <div className="space-y-1">
                    {Array.from(new Set(matches.map(m => m.round))).sort().map(round => (
                      <div key={round}>
                        <p className="text-xs text-rp-grey uppercase tracking-wider mb-1">Round {round}</p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          {matches.filter(m => m.round === round).map(m => (
                            <div key={m.id} className={`bg-rp-black rounded-lg p-2 text-xs border ${m.status === 'completed' ? 'border-emerald-500/30' : 'border-rp-border'}`}>
                              <div className={`${m.winner_id === m.driver1_id ? 'text-emerald-400 font-bold' : 'text-white'}`}>
                                {m.driver1_name || m.driver1_id || 'BYE'}
                              </div>
                              <div className="text-rp-grey text-center">vs</div>
                              <div className={`${m.winner_id === m.driver2_id ? 'text-emerald-400 font-bold' : 'text-white'}`}>
                                {m.driver2_name || m.driver2_id || 'BYE'}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
