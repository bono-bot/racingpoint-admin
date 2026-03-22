'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface KioskExperience {
  id: string;
  name: string;
  game: string;
  track: string;
  car: string;
  car_class?: string;
  duration_minutes: number;
  start_type: string;
  ac_preset_id?: string;
  sort_order: number;
  is_active: boolean;
}

type KioskSettings = Record<string, string>;

// All toggle settings with labels and descriptions, grouped by section
const SETTING_SECTIONS = [
  {
    title: 'Assetto Corsa — Difficulty',
    description: 'Control which driving aids customers can use',
    settings: [
      { key: 'ac_difficulty_easy', label: 'Easy Mode', desc: 'ABS, TC, Stability, Auto Clutch, Ideal Line' },
      { key: 'ac_difficulty_medium', label: 'Medium Mode', desc: 'ABS, TC, Auto Clutch only' },
      { key: 'ac_difficulty_hard', label: 'Hard Mode', desc: 'No aids — full simulation' },
    ],
  },
  {
    title: 'Kiosk Behavior',
    description: 'Screen blanking, process enforcement, and lockdown',
    settings: [
      { key: 'screen_blanking_enabled', label: 'Screen Blanking', desc: 'Blank monitors when pod is idle (no active session)' },
      { key: 'kiosk_lockdown_enabled', label: 'Kiosk Lockdown', desc: 'Block unauthorized processes, hide taskbar, disable Alt+Tab' },
      { key: 'auto_launch_game', label: 'Auto-Launch Game', desc: 'Automatically launch the game when a session starts' },
    ],
  },
  {
    title: 'Spectator Display',
    description: 'Settings for the venue spectator screen',
    settings: [
      { key: 'spectator_auto_rotate', label: 'Auto-Rotate Pods', desc: 'Cycle through active pods on spectator display' },
      { key: 'spectator_show_leaderboard', label: 'Show Leaderboard', desc: 'Display live leaderboard on spectator screen' },
    ],
  },
];

const TEXT_SETTINGS = [
  { key: 'venue_name', label: 'Venue Name' },
  { key: 'tagline', label: 'Tagline' },
  { key: 'business_hours_start', label: 'Opening Time' },
  { key: 'business_hours_end', label: 'Closing Time' },
];

interface PodInfo {
  id: string;
  number: number;
  name: string;
  status: string;
}

export default function KioskControlPage() {
  const [settings, setSettings] = useState<KioskSettings>({});
  const [experiences, setExperiences] = useState<KioskExperience[]>([]);
  const [pods, setPods] = useState<PodInfo[]>([]);
  const [podBlanking, setPodBlanking] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    game: 'assetto_corsa',
    track: '',
    car: '',
    car_class: '',
    duration_minutes: 30,
    start_type: 'pitlane',
  });

  const load = async () => {
    setLoading(true);
    try {
      const [settingsRes, expRes, podsRes] = await Promise.all([
        api.getKioskSettings(),
        api.getKioskExperiences(),
        api.listPods(),
      ]);
      setSettings(settingsRes.settings || {});
      setExperiences(expRes.experiences || []);
      const podList = (podsRes as { pods: PodInfo[] }).pods || [];
      setPods(podList.sort((a: PodInfo, b: PodInfo) => a.number - b.number));
    } catch {
      setError('Failed to load kiosk data. Is rc-core running?');
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleToggle = async (key: string) => {
    const current = settings[key] === 'true';
    const newValue = current ? 'false' : 'true';
    setSaving(key);
    try {
      await api.updateKioskSettings({ [key]: newValue });
      setSettings(prev => ({ ...prev, [key]: newValue }));
    } catch { alert('Failed to update setting'); }
    setSaving(null);
  };

  const handlePodBlank = async (podId: string, blank: boolean) => {
    setSaving(`pod-${podId}`);
    try {
      await api.setPodScreen(podId, blank);
      setPodBlanking(prev => ({ ...prev, [podId]: blank }));
    } catch { alert('Failed to update pod screen'); }
    setSaving(null);
  };

  const handleTextChange = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleTextBlur = async (key: string) => {
    setSaving(key);
    try {
      await api.updateKioskSettings({ [key]: settings[key] || '' });
    } catch { alert('Failed to save'); }
    setSaving(null);
  };

  const handleCreateExperience = async () => {
    try {
      await api.createKioskExperience({
        name: form.name,
        game: form.game,
        track: form.track,
        car: form.car,
        car_class: form.car_class || null,
        duration_minutes: form.duration_minutes,
        start_type: form.start_type,
      });
      setShowForm(false);
      setForm({ name: '', game: 'assetto_corsa', track: '', car: '', car_class: '', duration_minutes: 30, start_type: 'pitlane' });
      load();
    } catch { alert('Failed to create experience'); }
  };

  const handleDeleteExperience = async (id: string) => {
    if (!confirm('Remove this experience?')) return;
    try {
      await api.deleteKioskExperience(id);
      load();
    } catch { alert('Failed to delete'); }
  };

  if (loading) return <div className="text-center text-rp-grey py-12">Loading kiosk settings...</div>;
  if (error) return <div className="bg-rp-red/10 border border-rp-red/20 rounded-xl p-6 text-rp-red text-sm">{error}</div>;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Kiosk Control</h1>
        <p className="text-sm text-rp-grey mt-1">Manage pod settings, difficulty presets, screen blanking, and kiosk experiences</p>
      </div>

      {/* Venue Settings */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-rp-grey mb-3">Venue</h2>
        <div className="bg-rp-card border border-rp-border rounded-xl p-4">
          <div className="grid grid-cols-2 gap-4">
            {TEXT_SETTINGS.map(({ key, label }) => (
              <div key={key} className="space-y-1">
                <label className="text-xs text-rp-grey">{label}</label>
                <input
                  type={key.includes('hours') ? 'time' : 'text'}
                  value={settings[key] || ''}
                  onChange={e => handleTextChange(key, e.target.value)}
                  onBlur={() => handleTextBlur(key)}
                  className={`w-full bg-rp-black border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-rp-red ${saving === key ? 'border-rp-red/50' : 'border-rp-border'}`}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Toggle Settings by Section */}
      {SETTING_SECTIONS.map(section => (
        <section key={section.title} className="mb-8">
          <div className="mb-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-rp-grey">{section.title}</h2>
            <p className="text-xs text-neutral-500 mt-0.5">{section.description}</p>
          </div>
          <div className="bg-rp-card border border-rp-border rounded-xl divide-y divide-rp-border">
            {section.settings.map(({ key, label, desc }) => (
              <div key={key} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-white">{label}</p>
                  <p className="text-xs text-neutral-500">{desc}</p>
                </div>
                <button
                  onClick={() => handleToggle(key)}
                  disabled={saving === key}
                  className={`w-12 h-6 rounded-full relative transition-colors shrink-0 ml-4 ${
                    settings[key] === 'true' ? 'bg-rp-red' : 'bg-zinc-700'
                  } ${saving === key ? 'opacity-50' : ''}`}
                >
                  <span
                    className={`absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                      settings[key] === 'true' ? 'translate-x-[22px]' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </section>
      ))}

      {/* Per-Pod Screen Control */}
      {pods.length > 0 && (
        <section className="mb-8">
          <div className="mb-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-rp-grey">Pod Screen Control</h2>
            <p className="text-xs text-neutral-500 mt-0.5">Blank or unblank individual pod screens</p>
          </div>
          <div className="bg-rp-card border border-rp-border rounded-xl overflow-hidden">
            <div className="grid grid-cols-4 gap-0 divide-x divide-y divide-rp-border">
              {pods.map(pod => {
                const blanked = podBlanking[pod.id] ?? false;
                const isSaving = saving === `pod-${pod.id}`;
                const isOffline = pod.status === 'offline' || pod.status === 'disabled';
                return (
                  <div key={pod.id} className={`flex items-center justify-between px-4 py-3 ${isOffline ? 'opacity-40' : ''}`}>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white">Pod {pod.number}</p>
                      <p className="text-xs text-neutral-500 truncate">{pod.name}</p>
                    </div>
                    <label className={`flex items-center gap-2 cursor-pointer shrink-0 ml-3 ${isSaving ? 'opacity-50' : ''}`}>
                      <input
                        type="checkbox"
                        checked={blanked}
                        disabled={isOffline || isSaving}
                        onChange={e => handlePodBlank(pod.id, e.target.checked)}
                        className="sr-only peer"
                      />
                      <span className={`w-10 h-5 rounded-full relative transition-colors ${blanked ? 'bg-rp-red' : 'bg-zinc-700'} peer-focus-visible:ring-2 peer-focus-visible:ring-rp-red/50`}>
                        <span className={`absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${blanked ? 'translate-x-[18px]' : 'translate-x-0'}`} />
                      </span>
                      <span className="text-xs text-neutral-500">{blanked ? 'Blanked' : 'Active'}</span>
                    </label>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Kiosk Experiences */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-rp-grey">Kiosk Experiences</h2>
            <p className="text-xs text-neutral-500 mt-0.5">Pre-configured game setups customers can choose from</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-rp-red hover:bg-rp-red/90 text-white text-sm font-semibold px-4 py-2 rounded-lg"
          >
            {showForm ? 'Cancel' : '+ New Experience'}
          </button>
        </div>

        {showForm && (
          <div className="bg-rp-card border border-rp-border rounded-xl p-4 mb-4 space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-rp-grey">Name</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-rp-black border border-rp-border rounded-lg px-3 py-2 text-sm text-white mt-1" placeholder="Spa Hot Lap — F1" />
              </div>
              <div>
                <label className="text-xs text-rp-grey">Game</label>
                <select value={form.game} onChange={e => setForm({ ...form, game: e.target.value })}
                  className="w-full bg-rp-black border border-rp-border rounded-lg px-3 py-2 text-sm text-white mt-1">
                  <option value="assetto_corsa">Assetto Corsa</option>
                  <option value="f1_25">F1 25</option>
                  <option value="iracing">iRacing</option>
                  <option value="forza">Forza</option>
                  <option value="lmu">Le Mans Ultimate</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-rp-grey">Track</label>
                <input value={form.track} onChange={e => setForm({ ...form, track: e.target.value })}
                  className="w-full bg-rp-black border border-rp-border rounded-lg px-3 py-2 text-sm text-white mt-1" placeholder="spa" />
              </div>
              <div>
                <label className="text-xs text-rp-grey">Car</label>
                <input value={form.car} onChange={e => setForm({ ...form, car: e.target.value })}
                  className="w-full bg-rp-black border border-rp-border rounded-lg px-3 py-2 text-sm text-white mt-1" placeholder="ferrari_sf15t" />
              </div>
              <div>
                <label className="text-xs text-rp-grey">Car Class</label>
                <input value={form.car_class} onChange={e => setForm({ ...form, car_class: e.target.value })}
                  className="w-full bg-rp-black border border-rp-border rounded-lg px-3 py-2 text-sm text-white mt-1" placeholder="A" />
              </div>
              <div>
                <label className="text-xs text-rp-grey">Duration (min)</label>
                <input type="number" value={form.duration_minutes} onChange={e => setForm({ ...form, duration_minutes: Number(e.target.value) })}
                  className="w-full bg-rp-black border border-rp-border rounded-lg px-3 py-2 text-sm text-white mt-1" />
              </div>
              <div>
                <label className="text-xs text-rp-grey">Start Type</label>
                <select value={form.start_type} onChange={e => setForm({ ...form, start_type: e.target.value })}
                  className="w-full bg-rp-black border border-rp-border rounded-lg px-3 py-2 text-sm text-white mt-1">
                  <option value="pitlane">Pit Lane</option>
                  <option value="grid">Grid</option>
                  <option value="hotlap">Hot Lap</option>
                </select>
              </div>
            </div>
            <button onClick={handleCreateExperience} disabled={!form.name || !form.track || !form.car}
              className="bg-rp-red hover:bg-rp-red/90 text-white text-sm font-semibold px-6 py-2 rounded-lg disabled:opacity-50">
              Create Experience
            </button>
          </div>
        )}

        {experiences.length === 0 ? (
          <div className="text-center text-rp-grey py-8 bg-rp-card border border-rp-border rounded-xl">No experiences configured</div>
        ) : (
          <div className="bg-rp-card border border-rp-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-rp-border text-rp-grey text-left">
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Game</th>
                  <th className="px-4 py-3 font-medium">Track</th>
                  <th className="px-4 py-3 font-medium">Car</th>
                  <th className="px-4 py-3 font-medium">Class</th>
                  <th className="px-4 py-3 font-medium">Duration</th>
                  <th className="px-4 py-3 font-medium">Start</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {experiences.map(exp => (
                  <tr key={exp.id} className="border-b border-rp-border/50 hover:bg-rp-card/30">
                    <td className="px-4 py-3 font-semibold text-white">{exp.name}</td>
                    <td className="px-4 py-3 text-neutral-400">{exp.game.replace('_', ' ')}</td>
                    <td className="px-4 py-3 text-neutral-400">{exp.track}</td>
                    <td className="px-4 py-3 text-neutral-400 font-mono text-xs">{exp.car}</td>
                    <td className="px-4 py-3">
                      {exp.car_class && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-rp-red/10 text-rp-red">{exp.car_class}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-neutral-400">{exp.duration_minutes}min</td>
                    <td className="px-4 py-3 text-neutral-400 capitalize">{exp.start_type}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleDeleteExperience(exp.id)} className="text-red-400 hover:text-red-300 text-xs">Remove</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
