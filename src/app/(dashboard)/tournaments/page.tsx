'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import ConfirmDialog from '@/components/ConfirmDialog';
import { SkeletonTable } from '@/components/Skeleton';
import { toast } from 'sonner';

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

interface Registration {
  id: string;
  driver_id: string;
  driver_name: string;
  registered_at: string;
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
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [regLoading, setRegLoading] = useState(false);
  const [matchResultTarget, setMatchResultTarget] = useState<Match | null>(null);
  const [selectedWinner, setSelectedWinner] = useState<string | null>(null);
  const [resultLoading, setResultLoading] = useState(false);
  const [form, setForm] = useState({
    name: '', description: '', track: '', car: '', format: 'single_elimination',
    max_participants: '16', entry_fee_paise: '0', prize_pool_paise: '0', event_date: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getTournaments();
      setTournaments(data.tournaments || []);
    } catch { setError('Failed to load tournaments'); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

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
      toast.success('Tournament created');
      load();
    } catch (err) { toast.error('Failed to create tournament: ' + (err as Error).message); }
  };

  const handleGenerateBracket = async (id: string) => {
    try {
      await api.generateBracket(id);
      toast.success('Bracket generated');
      loadTournamentDetail(id);
    } catch (err) { toast.error('Failed to generate bracket: ' + (err as Error).message); }
  };

  const loadTournamentDetail = async (id: string) => {
    setSelected(id);
    setRegLoading(true);
    try {
      const [matchData, regData] = await Promise.all([
        api.getTournamentMatches(id),
        api.getTournamentRegistrations(id),
      ]);
      setMatches(matchData.matches || []);
      setRegistrations(regData.registrations || []);
    } catch {
      setMatches([]);
      setRegistrations([]);
    }
    setRegLoading(false);
  };

  const handleRecordResult = async () => {
    if (!matchResultTarget || !selectedWinner || !selected) return;
    setResultLoading(true);
    try {
      await api.recordMatchResult(selected, matchResultTarget.id, selectedWinner);
      toast.success('Match result recorded');
      setMatchResultTarget(null);
      setSelectedWinner(null);
      loadTournamentDetail(selected);
    } catch (err) { toast.error('Failed to record match result: ' + (err as Error).message); }
    setResultLoading(false);
  };

  const rounds = Array.from(new Set(matches.map(m => m.round))).sort((a, b) => a - b);

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
                <option value="round_robin">Round Robin</option>
                <option value="time_attack">Time Attack</option>
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
        <SkeletonTable rows={5} cols={5} />
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
                {t.registration_count !== undefined && (
                  <div><span className="text-rp-grey">Registrations: </span><span className="text-white">{t.registration_count}</span></div>
                )}
              </div>

              <div className="flex gap-2">
                {(t.status === 'registration' || t.status === 'upcoming') && (
                  <button onClick={() => handleGenerateBracket(t.id)}
                    className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg">
                    Generate Bracket
                  </button>
                )}
                <button onClick={() => loadTournamentDetail(t.id)}
                  className="bg-rp-card border border-rp-border hover:border-neutral-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg">
                  {selected === t.id ? 'Refresh' : 'View Details'}
                </button>
              </div>

              {/* Tournament Detail Panel */}
              {selected === t.id && (
                <div className="mt-4 border-t border-rp-border pt-4 space-y-4">
                  {regLoading ? (
                    <div className="text-rp-grey text-sm">Loading details...</div>
                  ) : (
                    <>
                      {/* Registration List */}
                      <div>
                        <h3 className="text-sm font-medium text-rp-grey mb-2">
                          Registrations ({registrations.length})
                        </h3>
                        {registrations.length === 0 ? (
                          <p className="text-xs text-neutral-500">No registrations yet</p>
                        ) : (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {registrations.map(r => (
                              <div key={r.id} className="bg-rp-black border border-rp-border rounded-lg px-3 py-2">
                                <p className="text-sm text-white font-medium">{r.driver_name}</p>
                                <p className="text-xs text-neutral-500">
                                  {r.registered_at ? new Date(r.registered_at).toLocaleDateString() : '--'}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Bracket / Matches */}
                      {matches.length > 0 && (
                        <div>
                          <h3 className="text-sm font-medium text-rp-grey mb-2">Bracket</h3>
                          <div className="space-y-3">
                            {rounds.map(round => (
                              <div key={round}>
                                <p className="text-xs text-rp-grey uppercase tracking-wider mb-1">Round {round}</p>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                  {matches.filter(m => m.round === round).sort((a, b) => a.match_order - b.match_order).map(m => (
                                    <div
                                      key={m.id}
                                      className={`bg-rp-black rounded-lg p-2 text-xs border transition-colors ${
                                        m.status === 'completed'
                                          ? 'border-emerald-500/30'
                                          : m.driver1_id && m.driver2_id
                                            ? 'border-yellow-500/30 cursor-pointer hover:border-yellow-400'
                                            : 'border-rp-border'
                                      }`}
                                      onClick={() => {
                                        if (m.status !== 'completed' && m.driver1_id && m.driver2_id) {
                                          setMatchResultTarget(m);
                                          setSelectedWinner(null);
                                        }
                                      }}
                                    >
                                      <div className={`${m.winner_id === m.driver1_id ? 'text-emerald-400 font-bold' : 'text-white'}`}>
                                        {m.driver1_name || m.driver1_id || 'BYE'}
                                      </div>
                                      <div className="text-rp-grey text-center">vs</div>
                                      <div className={`${m.winner_id === m.driver2_id ? 'text-emerald-400 font-bold' : 'text-white'}`}>
                                        {m.driver2_name || m.driver2_id || 'BYE'}
                                      </div>
                                      {m.status === 'completed' && (
                                        <div className="text-center mt-1 text-emerald-400 text-[10px] uppercase">Done</div>
                                      )}
                                      {m.status !== 'completed' && m.driver1_id && m.driver2_id && (
                                        <div className="text-center mt-1 text-yellow-400 text-[10px] uppercase">Click to record</div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Match Result Dialog */}
      {matchResultTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setMatchResultTarget(null)}>
          <div className="bg-rp-card border border-rp-border rounded-xl p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">Record Match Result</h3>
            <p className="text-sm text-neutral-400 mb-4">Select the winner:</p>
            <div className="space-y-2 mb-6">
              <button
                onClick={() => setSelectedWinner(matchResultTarget.driver1_id)}
                className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                  selectedWinner === matchResultTarget.driver1_id
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                    : 'border-rp-border bg-rp-black text-white hover:border-neutral-600'
                }`}
              >
                {matchResultTarget.driver1_name || matchResultTarget.driver1_id || 'Driver 1'}
              </button>
              <button
                onClick={() => setSelectedWinner(matchResultTarget.driver2_id)}
                className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                  selectedWinner === matchResultTarget.driver2_id
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                    : 'border-rp-border bg-rp-black text-white hover:border-neutral-600'
                }`}
              >
                {matchResultTarget.driver2_name || matchResultTarget.driver2_id || 'Driver 2'}
              </button>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setMatchResultTarget(null)} className="px-4 py-2 text-sm text-neutral-400 hover:text-white">
                Cancel
              </button>
              <button
                onClick={handleRecordResult}
                disabled={!selectedWinner || resultLoading}
                className="px-4 py-2 text-sm font-medium bg-rp-red hover:bg-rp-red/90 text-white rounded-lg disabled:opacity-50"
              >
                {resultLoading ? 'Saving...' : 'Record Result'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
