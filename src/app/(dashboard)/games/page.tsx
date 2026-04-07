'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { gamesApi, fleetApi, driversApi } from '@/lib/api';
import type { GameCatalogEntry, ActiveGame } from '@/lib/api';
import type { FleetHealthResponse } from '@/lib/api/fleet';
import type { Driver } from '@/lib/api/drivers';
import ConfirmDialog from '@/components/ConfirmDialog';
import { podLabel } from '@/lib/utils';
import { toast } from 'sonner';

const GAME_COLORS: Record<string, string> = {
  assetto_corsa: 'bg-red-500',
  assetto_corsa_evo: 'bg-red-600',
  assetto_corsa_rally: 'bg-orange-500',
  iracing: 'bg-yellow-500',
  le_mans_ultimate: 'bg-emerald-500',
  f1_25: 'bg-blue-500',
  forza: 'bg-purple-500',
  forza_horizon_5: 'bg-violet-500',
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  return `${hours}h ${mins % 60}m ago`;
}

export default function GamesPage() {
  const { data: catalog } = useSWR('games-catalog', () => gamesApi.getGamesCatalog());
  const { data: activeGames, mutate: mutateActive } = useSWR('games-active', () => gamesApi.getActiveGames(), { refreshInterval: 5000 });
  const { data: fleet } = useSWR<FleetHealthResponse>('fleet-health', () => fleetApi.getHealth());
  const { data: drivers } = useSWR<Driver[]>('drivers-list', () => driversApi.getDrivers());

  const [launchOpen, setLaunchOpen] = useState(false);
  const [launchPodId, setLaunchPodId] = useState('');
  const [launchGame, setLaunchGame] = useState('');
  const [launchDriverId, setLaunchDriverId] = useState('');
  const [launching, setLaunching] = useState(false);

  const [stopConfirm, setStopConfirm] = useState<{ podId: string; podNum: number; game: string } | null>(null);
  const [stopping, setStopping] = useState(false);

  const games = catalog?.games || [];
  const active = activeGames || [];
  const activePodIds = new Set(active.map(g => g.pod_id));
  const idlePods = (fleet?.pods || []).filter(p => p.ws_connected && !p.in_maintenance && p.pod_id && !activePodIds.has(p.pod_id));

  async function handleLaunch() {
    if (!launchPodId || !launchGame || !launchDriverId) return;
    setLaunching(true);
    try {
      await gamesApi.launchGame({ pod_id: launchPodId, sim_type: launchGame, driver_id: launchDriverId });
      toast.success('Game launched');
      setLaunchOpen(false);
      setLaunchPodId('');
      setLaunchGame('');
      setLaunchDriverId('');
      mutateActive();
    } catch (err) {
      toast.error('Failed to launch game');
    }
    setLaunching(false);
  }

  async function handleStop() {
    if (!stopConfirm) return;
    setStopping(true);
    try {
      await gamesApi.stopGame(stopConfirm.podId);
      toast.success(`Stopped game on Pod ${stopConfirm.podNum}`);
      setStopConfirm(null);
      mutateActive();
    } catch {
      toast.error('Failed to stop game');
    }
    setStopping(false);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Games</h1>
          <p className="text-rp-grey text-sm mt-1">Game catalog and active sessions</p>
        </div>
        <button
          onClick={() => setLaunchOpen(true)}
          className="px-4 py-2 bg-rp-red text-white rounded-lg text-sm font-medium hover:bg-rp-red/90 transition-colors"
        >
          Launch Game
        </button>
      </div>

      {/* Game Catalog */}
      <h2 className="text-sm font-semibold text-rp-grey uppercase tracking-wider mb-3">Catalog</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {games.map(g => (
          <div key={g.id} className="bg-rp-card border border-rp-border rounded-xl p-4 hover:border-rp-border/80 transition-colors">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-lg ${GAME_COLORS[g.id] || 'bg-neutral-600'} flex items-center justify-center text-white text-xs font-bold`}>
                {g.abbr}
              </div>
              <div>
                <p className="text-white font-medium text-sm">{g.name}</p>
                <p className="text-rp-grey text-xs">{g.installed_pod_count}/8 pods</p>
              </div>
            </div>
            <div className="w-full h-1.5 bg-rp-border rounded-full overflow-hidden">
              <div className="h-full bg-rp-red/60 rounded-full" style={{ width: `${(g.installed_pod_count / 8) * 100}%` }} />
            </div>
          </div>
        ))}
        {games.length === 0 && (
          <div className="col-span-4 text-center text-rp-grey py-8">Loading catalog...</div>
        )}
      </div>

      {/* Active Games */}
      <h2 className="text-sm font-semibold text-rp-grey uppercase tracking-wider mb-3">
        Active Games {active.length > 0 && <span className="text-rp-red">({active.length})</span>}
      </h2>
      {active.length === 0 ? (
        <div className="bg-rp-card border border-rp-border rounded-xl p-8 text-center text-rp-grey">
          No games currently running
        </div>
      ) : (
        <div className="bg-rp-card border border-rp-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-rp-grey border-b border-rp-border">
                <th className="px-4 py-3 font-medium">Pod</th>
                <th className="px-4 py-3 font-medium">Game</th>
                <th className="px-4 py-3 font-medium">Driver</th>
                <th className="px-4 py-3 font-medium">Started</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rp-border">
              {active.map(g => (
                <tr key={g.pod_id} className="hover:bg-rp-black/30">
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-white font-medium">{podLabel(g)}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-2">
                      <span className={`w-5 h-5 rounded ${GAME_COLORS[g.sim_type] || 'bg-neutral-600'} flex items-center justify-center text-white text-[8px] font-bold`}>
                        {games.find(c => c.id === g.sim_type)?.abbr || g.sim_type.slice(0, 2).toUpperCase()}
                      </span>
                      <span className="text-neutral-300">{games.find(c => c.id === g.sim_type)?.name || g.sim_type}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3 text-neutral-300">{g.driver_name}</td>
                  <td className="px-4 py-3 text-neutral-400">{timeAgo(g.started_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setStopConfirm({ podId: g.pod_id, podNum: g.pod_number, game: games.find(c => c.id === g.sim_type)?.name || g.sim_type })}
                      className="px-3 py-1 text-xs bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors"
                    >
                      Stop
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Launch Modal */}
      {launchOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setLaunchOpen(false)}>
          <div className="bg-rp-card border border-rp-border rounded-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white mb-4">Launch Game</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-rp-grey mb-1">Pod</label>
                <select
                  value={launchPodId}
                  onChange={e => setLaunchPodId(e.target.value)}
                  className="w-full bg-rp-black border border-rp-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-rp-red"
                >
                  <option value="">Select pod...</option>
                  {idlePods.map(p => (
                    <option key={p.pod_id} value={p.pod_id}>{podLabel(p)} (idle)</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-rp-grey mb-1">Game</label>
                <select
                  value={launchGame}
                  onChange={e => setLaunchGame(e.target.value)}
                  className="w-full bg-rp-black border border-rp-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-rp-red"
                >
                  <option value="">Select game...</option>
                  {games.map(g => (
                    <option key={g.id} value={g.id}>{g.name} ({g.abbr})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-rp-grey mb-1">Driver</label>
                <select
                  value={launchDriverId}
                  onChange={e => setLaunchDriverId(e.target.value)}
                  className="w-full bg-rp-black border border-rp-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-rp-red"
                >
                  <option value="">Select driver...</option>
                  {(drivers || []).map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setLaunchOpen(false)} className="flex-1 px-4 py-2 bg-rp-black border border-rp-border rounded-lg text-sm text-neutral-400 hover:text-white transition-colors">
                Cancel
              </button>
              <button
                onClick={handleLaunch}
                disabled={!launchPodId || !launchGame || !launchDriverId || launching}
                className="flex-1 px-4 py-2 bg-rp-red text-white rounded-lg text-sm font-medium hover:bg-rp-red/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {launching ? 'Launching...' : 'Launch'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stop Confirmation */}
      <ConfirmDialog
        open={!!stopConfirm}
        title="Stop Game"
        message={`Stop ${stopConfirm?.game} on Pod ${stopConfirm?.podNum}?`}
        variant="danger"
        confirmLabel="Stop"
        loading={stopping}
        onConfirm={handleStop}
        onCancel={() => setStopConfirm(null)}
      />
    </div>
  );
}
