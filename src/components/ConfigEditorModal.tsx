'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { configApi, HOT_RELOAD_FIELDS } from '@/lib/api/config';
import type { AgentConfig } from '@/lib/api/config';
import { podLabel } from '@/lib/utils';
import type { PodFleetStatus } from '@/lib/api/fleet';

// ── Props ────────────────────────────────────────────────────────────────────

interface ConfigEditorModalProps {
  pod: PodFleetStatus;
  initialConfig: AgentConfig;
  configHash: string;
  onClose: () => void;
  onSaved: () => void;
}

// ── Diff utilities ────────────────────────────────────────────────────────────

interface DiffEntry {
  path: string;
  oldValue: unknown;
  newValue: unknown;
  isHot: boolean;
}

function flattenConfig(obj: Record<string, unknown>, prefix = ''): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    const value = obj[key];
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      const nested = flattenConfig(value as Record<string, unknown>, fullKey);
      Object.assign(result, nested);
    } else {
      result[fullKey] = value;
    }
  }
  return result;
}

function computeDiff(original: AgentConfig, edited: AgentConfig): DiffEntry[] {
  const flatOriginal = flattenConfig(original as unknown as Record<string, unknown>);
  const flatEdited = flattenConfig(edited as unknown as Record<string, unknown>);
  const allKeys = new Set([...Object.keys(flatOriginal), ...Object.keys(flatEdited)]);
  const entries: DiffEntry[] = [];
  for (const path of allKeys) {
    const oldVal = flatOriginal[path];
    const newVal = flatEdited[path];
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      entries.push({
        path,
        oldValue: oldVal,
        newValue: newVal,
        isHot: HOT_RELOAD_FIELDS.includes(path),
      });
    }
  }
  return entries;
}

function truncate(val: unknown, max = 50): string {
  const s = JSON.stringify(val);
  if (s.length <= max) return s;
  return s.slice(0, max) + '...';
}

// ── Toggle button ─────────────────────────────────────────────────────────────

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
        value
          ? 'bg-emerald-400 text-black'
          : 'bg-neutral-700 text-neutral-400 hover:bg-neutral-600'
      }`}
    >
      {value ? 'Enabled' : 'Disabled'}
    </button>
  );
}

// ── Input helper ──────────────────────────────────────────────────────────────

const inputCls = 'w-full bg-neutral-800 border border-rp-border rounded px-3 py-1.5 text-sm focus:outline-none focus:border-neutral-500 text-white';
const labelCls = 'block text-xs text-neutral-400 mb-1';

// ── Section heading ───────────────────────────────────────────────────────────

function SectionHeading({ title, hot }: { title: string; hot?: boolean }) {
  return (
    <div className="flex items-center gap-2 mb-3 mt-5 first:mt-0">
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      {hot && (
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 font-medium">
          hot-reload
        </span>
      )}
    </div>
  );
}

// ── Main modal ────────────────────────────────────────────────────────────────

export default function ConfigEditorModal({
  pod,
  initialConfig,
  configHash,
  onClose,
  onSaved,
}: ConfigEditorModalProps) {
  const [editedConfig, setEditedConfig] = useState<AgentConfig>(() => ({
    ...initialConfig,
    pod: { ...initialConfig.pod },
    core: { ...initialConfig.core },
    kiosk: { ...initialConfig.kiosk },
    lock_screen: { ...initialConfig.lock_screen },
    process_guard: { ...initialConfig.process_guard },
  }));
  const [pushing, setPushing] = useState(false);
  const [showDiff, setShowDiff] = useState(false);

  const diff = computeDiff(initialConfig, editedConfig);

  // Escape key to close
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const handlePush = useCallback(async () => {
    if (!pod.pod_id) return;
    setPushing(true);
    try {
      const result = await configApi.setPodConfig(pod.pod_id, editedConfig);
      if (result.pushed) {
        toast.success(`Config pushed to ${podLabel(pod)}`);
      } else {
        toast.success(`Config saved for ${podLabel(pod)} — will push on next connect`);
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error('Push failed: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setPushing(false);
    }
  }, [pod, editedConfig, onSaved, onClose]);

  // ── Edit form ──────────────────────────────────────────────────────────────

  const editForm = (
    <div className="space-y-1">

      {/* Pod Identity */}
      <SectionHeading title="Pod Identity" />
      <p className="text-[10px] text-neutral-500 mb-3">Cold fields — pod restart required</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Pod Number</label>
          <input
            type="number"
            min={1}
            max={8}
            value={editedConfig.pod.number}
            onChange={e => setEditedConfig(prev => ({ ...prev, pod: { ...prev.pod, number: Number(e.target.value) } }))}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Pod Name</label>
          <input
            type="text"
            value={editedConfig.pod.name}
            onChange={e => setEditedConfig(prev => ({ ...prev, pod: { ...prev.pod, name: e.target.value } }))}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Simulator</label>
          <input
            type="text"
            value={editedConfig.pod.sim}
            placeholder="assetto_corsa"
            onChange={e => setEditedConfig(prev => ({ ...prev, pod: { ...prev.pod, sim: e.target.value } }))}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Sim IP</label>
          <input
            type="text"
            value={editedConfig.pod.sim_ip}
            onChange={e => setEditedConfig(prev => ({ ...prev, pod: { ...prev.pod, sim_ip: e.target.value } }))}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Sim Port</label>
          <input
            type="number"
            value={editedConfig.pod.sim_port}
            onChange={e => setEditedConfig(prev => ({ ...prev, pod: { ...prev.pod, sim_port: Number(e.target.value) } }))}
            className={inputCls}
          />
        </div>
      </div>

      {/* Server Connection */}
      <SectionHeading title="Server Connection" />
      <p className="text-[10px] text-neutral-500 mb-3">Cold fields — pod restart required</p>
      <div>
        <label className={labelCls}>Core URL</label>
        <input
          type="text"
          value={editedConfig.core.url}
          placeholder="ws://192.168.31.23:8080/ws/agent"
          onChange={e => setEditedConfig(prev => ({ ...prev, core: { ...prev.core, url: e.target.value } }))}
          className={inputCls}
        />
      </div>

      {/* Kiosk & Lock Screen */}
      <SectionHeading title="Kiosk & Lock Screen" hot />
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm text-neutral-300">Kiosk Enabled</label>
          <Toggle
            value={editedConfig.kiosk.enabled}
            onChange={val => setEditedConfig(prev => ({ ...prev, kiosk: { ...prev.kiosk, enabled: val } }))}
          />
        </div>
        <div className="flex items-center justify-between">
          <label className="text-sm text-neutral-300">Lock Screen Enabled</label>
          <Toggle
            value={editedConfig.lock_screen.enabled}
            onChange={val => setEditedConfig(prev => ({ ...prev, lock_screen: { ...prev.lock_screen, enabled: val } }))}
          />
        </div>
      </div>

      {/* Session Settings */}
      <SectionHeading title="Session Settings" hot />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Auto-end orphan session (secs)</label>
          <input
            type="number"
            min={60}
            max={3600}
            value={editedConfig.auto_end_orphan_session_secs}
            onChange={e => setEditedConfig(prev => ({ ...prev, auto_end_orphan_session_secs: Number(e.target.value) }))}
            className={inputCls}
          />
        </div>
        <div className="flex flex-col justify-end">
          <label className="text-sm text-neutral-300 mb-2">AC Evo Telemetry</label>
          <Toggle
            value={editedConfig.ac_evo_telemetry_enabled}
            onChange={val => setEditedConfig(prev => ({ ...prev, ac_evo_telemetry_enabled: val }))}
          />
        </div>
      </div>

      {/* Process Guard */}
      <SectionHeading title="Process Guard" />
      <p className="text-[10px] text-neutral-500 mb-3">enabled is cold (restart) — scan_interval_secs is hot-reload</p>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm text-neutral-300">Process Guard Enabled</label>
          <Toggle
            value={editedConfig.process_guard.enabled}
            onChange={val => setEditedConfig(prev => ({ ...prev, process_guard: { ...prev.process_guard, enabled: val } }))}
          />
        </div>
        <div>
          <label className={labelCls}>Scan Interval (secs) <span className="text-emerald-400">(hot-reload)</span></label>
          <input
            type="number"
            min={10}
            max={3600}
            value={editedConfig.process_guard.scan_interval_secs}
            onChange={e => setEditedConfig(prev => ({
              ...prev,
              process_guard: { ...prev.process_guard, scan_interval_secs: Number(e.target.value) },
            }))}
            className={inputCls}
          />
        </div>
      </div>
    </div>
  );

  // ── Diff view ──────────────────────────────────────────────────────────────

  const diffView = (
    <div>
      {diff.length === 0 ? (
        <p className="text-neutral-400 text-sm py-4 text-center">No changes</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-neutral-500 border-b border-rp-border">
                <th className="pb-2 pr-3">Field</th>
                <th className="pb-2 pr-3">Old Value</th>
                <th className="pb-2 pr-3">New Value</th>
                <th className="pb-2">Reload Type</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rp-border">
              {diff.map((entry) => (
                <tr key={entry.path}>
                  <td className="py-2 pr-3 font-mono text-xs text-neutral-300">{entry.path}</td>
                  <td className="py-2 pr-3 text-xs text-neutral-400">{truncate(entry.oldValue)}</td>
                  <td className="py-2 pr-3 text-xs text-white">{truncate(entry.newValue)}</td>
                  <td className="py-2">
                    {entry.isHot ? (
                      <span className="text-xs text-emerald-400 font-medium">Hot (immediate)</span>
                    ) : (
                      <span className="text-xs text-yellow-400 font-medium">Cold (restart)</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-neutral-900 border border-rp-border rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-rp-border shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-semibold">Edit Config — {podLabel(pod)}</h2>
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
              pod.ws_connected
                ? 'bg-emerald-400/10 text-emerald-400 border-emerald-400/30'
                : 'bg-neutral-500/10 text-neutral-400 border-neutral-500/30'
            }`}>
              {pod.ws_connected ? 'WS Connected' : 'WS Offline'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white text-sm px-2 py-1 rounded hover:bg-neutral-700 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Sub-header: hash + tabs */}
        <div className="flex items-center justify-between px-5 py-2 border-b border-rp-border shrink-0 bg-neutral-900/50">
          <span className="text-xs text-neutral-500">Hash: {configHash.slice(0, 8)}</span>
          <div className="flex gap-1">
            <button
              onClick={() => setShowDiff(false)}
              className={`text-xs px-3 py-1 rounded transition-colors ${
                !showDiff ? 'bg-neutral-700 text-white' : 'text-neutral-400 hover:text-white'
              }`}
            >
              Edit
            </button>
            <button
              onClick={() => setShowDiff(true)}
              className={`text-xs px-3 py-1 rounded transition-colors ${
                showDiff ? 'bg-neutral-700 text-white' : 'text-neutral-400 hover:text-white'
              }`}
            >
              Diff Preview {diff.length > 0 && `(${diff.length})`}
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {showDiff ? diffView : editForm}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-rp-border shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-neutral-400 hover:text-white rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handlePush}
            disabled={pushing || diff.length === 0 || !pod.pod_id}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-[#E10600] hover:bg-[#c50500] text-white disabled:opacity-50 transition-colors"
          >
            {pushing ? 'Pushing...' : `Push to ${podLabel(pod)}`}
          </button>
        </div>
      </div>
    </div>
  );
}
