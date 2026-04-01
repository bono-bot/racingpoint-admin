'use client';

import { useState, useEffect } from 'react';
import { presetsApi } from '@/lib/api/presets';
import type { GamePresetWithReliability, CreatePresetRequest } from '@/lib/api/presets';

const SIM_LABELS: Record<string, string> = {
  assettoCorsa: 'Assetto Corsa',
  assettoCorsaEvo: 'AC EVO',
  assettoCorsaRally: 'AC Rally',
  f125: 'F1 25',
  iracing: 'iRacing',
  lemansultimate: 'Le Mans Ultimate',
  forza: 'Forza Motorsport',
  forzaHorizon5: 'Forza Horizon 5',
};

const SIM_OPTIONS = Object.entries(SIM_LABELS).map(([value, label]) => ({ value, label }));

function ReliabilityBadge({ preset }: { preset: GamePresetWithReliability }) {
  if (preset.reliability_score === null) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-neutral-700 text-neutral-400">
        No data ({preset.total_launches} launches)
      </span>
    );
  }
  const pct = Math.round(preset.reliability_score * 100);
  if (preset.flagged_unreliable) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-yellow-900/40 text-yellow-400 border border-yellow-700">
        Unreliable ({pct}%)
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-green-900/40 text-green-400 border border-green-700">
      Reliable ({pct}%)
    </span>
  );
}

const EMPTY_FORM: CreatePresetRequest = {
  name: '',
  game: 'assettoCorsa',
  car: null,
  track: null,
  session_type: null,
  notes: null,
  enabled: true,
};

export default function PresetsPage() {
  const [presets, setPresets] = useState<GamePresetWithReliability[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CreatePresetRequest>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadPresets = () => {
    setLoading(true);
    presetsApi
      .listPresets()
      .then(setPresets)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load presets'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadPresets();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.game.trim()) {
      setFormError('Name and game are required');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      await presetsApi.createPreset({
        ...form,
        car: form.car?.trim() || null,
        track: form.track?.trim() || null,
        session_type: form.session_type?.trim() || null,
        notes: form.notes?.trim() || null,
      });
      // Reload full list (to get reliability scores attached)
      const updated = await presetsApi.listPresets();
      setPresets(updated);
      setForm(EMPTY_FORM);
      setShowForm(false);
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : 'Failed to create preset');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    // Optimistic update
    setPresets((prev) => prev.filter((p) => p.id !== id));
    try {
      await presetsApi.deletePreset(id);
    } catch {
      // On failure, reload
      presetsApi.listPresets().then(setPresets).catch(() => {});
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Game Presets</h1>
          <p className="text-sm text-neutral-400 mt-1">
            Staff-managed named configurations pushed to pods on connect
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-rp-red hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          + New Preset
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <form
          onSubmit={handleCreate}
          className="mb-6 p-5 bg-[#222222] border border-[#333333] rounded-xl"
        >
          <h2 className="text-lg font-semibold text-white mb-4">New Preset</h2>
          {formError && (
            <p className="mb-3 text-sm text-red-400">{formError}</p>
          )}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs text-neutral-400 mb-1">Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Ferrari Monza Hotlap"
                className="w-full bg-neutral-800 border border-[#333333] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-rp-red"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-neutral-400 mb-1">Game *</label>
              <select
                value={form.game}
                onChange={(e) => setForm({ ...form, game: e.target.value })}
                className="w-full bg-neutral-800 border border-[#333333] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-rp-red"
              >
                {SIM_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-neutral-400 mb-1">Car (optional)</label>
              <input
                type="text"
                value={form.car ?? ''}
                onChange={(e) => setForm({ ...form, car: e.target.value || null })}
                placeholder="e.g. ks_ferrari_gte"
                className="w-full bg-neutral-800 border border-[#333333] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-rp-red"
              />
            </div>
            <div>
              <label className="block text-xs text-neutral-400 mb-1">Track (optional)</label>
              <input
                type="text"
                value={form.track ?? ''}
                onChange={(e) => setForm({ ...form, track: e.target.value || null })}
                placeholder="e.g. monza"
                className="w-full bg-neutral-800 border border-[#333333] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-rp-red"
              />
            </div>
            <div>
              <label className="block text-xs text-neutral-400 mb-1">Session Type (optional)</label>
              <select
                value={form.session_type ?? ''}
                onChange={(e) => setForm({ ...form, session_type: e.target.value || null })}
                className="w-full bg-neutral-800 border border-[#333333] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-rp-red"
              >
                <option value="">Any</option>
                <option value="hotlap">Hotlap</option>
                <option value="practice">Practice</option>
                <option value="race">Race</option>
                <option value="time_attack">Time Attack</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-neutral-400 mb-1">Notes (optional)</label>
              <input
                type="text"
                value={form.notes ?? ''}
                onChange={(e) => setForm({ ...form, notes: e.target.value || null })}
                placeholder="Staff-visible notes"
                className="w-full bg-neutral-800 border border-[#333333] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-rp-red"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-rp-red hover:bg-red-700 disabled:bg-red-900 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {saving ? 'Saving...' : 'Create Preset'}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setFormError(null); }}
              className="px-4 py-2 bg-neutral-700 hover:bg-neutral-600 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Error state */}
      {error && (
        <div className="mb-4 p-4 bg-red-900/30 border border-red-700 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="text-neutral-400 text-sm">Loading presets...</div>
      )}

      {/* Empty state */}
      {!loading && !error && presets.length === 0 && (
        <div className="text-center py-16 text-neutral-500">
          <p className="text-lg font-medium text-neutral-400">No presets yet</p>
          <p className="text-sm mt-1">
            Create a preset to allow staff to quickly select game configurations.
          </p>
        </div>
      )}

      {/* Preset grid */}
      {!loading && presets.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {presets.map((preset) => (
            <div
              key={preset.id}
              className={`p-4 bg-[#222222] border rounded-xl flex flex-col gap-3 ${
                preset.flagged_unreliable ? 'border-yellow-700/60' : 'border-[#333333]'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-white text-sm">{preset.name}</h3>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    {SIM_LABELS[preset.game] ?? preset.game}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(preset.id)}
                  className="p-1.5 text-neutral-500 hover:text-red-400 hover:bg-red-900/20 rounded transition-colors flex-shrink-0"
                  title="Delete preset"
                  aria-label="Delete preset"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5 text-xs">
                <span className="px-2 py-0.5 bg-neutral-800 text-neutral-300 rounded">
                  Car: {preset.car ?? 'Any'}
                </span>
                <span className="px-2 py-0.5 bg-neutral-800 text-neutral-300 rounded">
                  Track: {preset.track ?? 'Any'}
                </span>
                {preset.session_type && (
                  <span className="px-2 py-0.5 bg-neutral-800 text-neutral-300 rounded capitalize">
                    {preset.session_type.replace('_', ' ')}
                  </span>
                )}
              </div>

              <ReliabilityBadge preset={preset} />

              {preset.notes && (
                <p className="text-xs text-neutral-500 italic">{preset.notes}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
