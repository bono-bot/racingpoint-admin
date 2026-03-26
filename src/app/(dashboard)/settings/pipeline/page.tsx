'use client';

import { useState, useEffect } from 'react';
import useSWR, { mutate } from 'swr';

interface PipelineConfig {
  auto_fix_enabled: boolean;
  self_patch_enabled: boolean;
  wol_enabled: boolean;
  [key: string]: unknown;
}

interface PipelineStatus {
  config: PipelineConfig | null;
  last_run: { completed_ts?: number; agent?: string; verdict?: string; bugs_found?: number } | null;
  recent_findings: Array<{ bug_type?: string; pod_ip?: string; severity?: string; fix_applied?: boolean; run_ts?: string }>;
  proposals: Array<{ category?: string; bug_type?: string; status?: string; confidence?: number; created_ts?: string }>;
  finding_count: number;
  proposal_count: number;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://192.168.31.23:8080';

function fetcher<T>(url: string): Promise<T> {
  return fetch(url, { headers: { 'Content-Type': 'application/json' } }).then(r => r.json() as Promise<T>);
}

function relativeTime(ts: number): string {
  if (!ts) return 'never';
  const diff = Math.floor(Date.now() / 1000) - ts;
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function severityColor(sev: string): string {
  if (sev === 'P1') return 'text-red-400';
  if (sev === 'P2') return 'text-yellow-400';
  return 'text-neutral-400';
}

function statusBadge(status: string): string {
  switch (status) {
    case 'pending': return 'bg-yellow-500/10 text-yellow-400';
    case 'approved': return 'bg-green-500/10 text-green-400';
    case 'applied': return 'bg-blue-500/10 text-blue-400';
    case 'rejected': return 'bg-red-500/10 text-red-400';
    default: return 'bg-neutral-500/10 text-neutral-400';
  }
}

export default function PipelinePage() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  const { data: status, error } = useSWR<PipelineStatus>(
    hydrated ? `${API_BASE}/api/v1/pipeline/status` : null,
    fetcher,
    { refreshInterval: 30000 }
  );

  const [toggling, setToggling] = useState<string | null>(null);

  async function toggleConfig(key: string, currentValue: boolean) {
    setToggling(key);
    try {
      await fetch(`${API_BASE}/api/v1/pipeline/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: !currentValue }),
      });
      mutate(`${API_BASE}/api/v1/pipeline/status`);
    } finally {
      setToggling(null);
    }
  }

  if (!hydrated) return <div className="h-screen bg-neutral-950" />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Autonomous Pipeline</h1>
        <p className="text-neutral-400 text-sm mt-1">v26.0 Detection, Healing & Intelligence</p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-4 text-red-400 text-sm">
          Failed to load pipeline status. Server may be offline.
        </div>
      )}

      {/* Config Toggles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { key: 'auto_fix_enabled', label: 'Auto-Fix', desc: 'Apply fixes automatically when issues detected' },
          { key: 'self_patch_enabled', label: 'Self-Patch', desc: 'Allow pipeline to modify its own scripts' },
          { key: 'wol_enabled', label: 'Wake-on-LAN', desc: 'Send WoL packets to powered-off pods' },
        ].map(({ key, label, desc }) => {
          const value = status?.config?.[key] as boolean | undefined;
          return (
            <div key={key} className="rounded-xl bg-neutral-900 border border-neutral-800 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white font-medium">{label}</span>
                <button
                  onClick={() => value !== undefined && toggleConfig(key, value)}
                  disabled={toggling === key || value === undefined}
                  className={`relative w-11 h-6 rounded-full transition-colors ${
                    value ? 'bg-green-500' : 'bg-neutral-700'
                  } ${toggling === key ? 'opacity-50' : ''}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                    value ? 'translate-x-5' : ''
                  }`} />
                </button>
              </div>
              <p className="text-neutral-500 text-xs">{desc}</p>
            </div>
          );
        })}
      </div>

      {/* Last Run */}
      {status?.last_run && (
        <div className="rounded-xl bg-neutral-900 border border-neutral-800 p-4">
          <h2 className="text-white font-medium mb-3">Last Run</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-neutral-500">When</span>
              <p className="text-white">{relativeTime(status.last_run.completed_ts || 0)}</p>
            </div>
            <div>
              <span className="text-neutral-500">Agent</span>
              <p className="text-white">{status.last_run.agent || 'unknown'}</p>
            </div>
            <div>
              <span className="text-neutral-500">Verdict</span>
              <p className={status.last_run.verdict === 'CLEAN' ? 'text-green-400' : 'text-yellow-400'}>
                {status.last_run.verdict || '-'}
              </p>
            </div>
            <div>
              <span className="text-neutral-500">Bugs Found</span>
              <p className={status.last_run.bugs_found ? 'text-red-400' : 'text-green-400'}>
                {status.last_run.bugs_found ?? 0}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl bg-neutral-900 border border-neutral-800 p-4 text-center">
          <p className="text-3xl font-bold text-white">{status?.finding_count ?? '-'}</p>
          <p className="text-neutral-500 text-sm">Recent Findings</p>
        </div>
        <div className="rounded-xl bg-neutral-900 border border-neutral-800 p-4 text-center">
          <p className="text-3xl font-bold text-white">{status?.proposal_count ?? '-'}</p>
          <p className="text-neutral-500 text-sm">Proposals</p>
        </div>
      </div>

      {/* Recent Findings */}
      {status?.recent_findings && status.recent_findings.length > 0 && (
        <div className="rounded-xl bg-neutral-900 border border-neutral-800 p-4">
          <h2 className="text-white font-medium mb-3">Recent Findings</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-neutral-500 border-b border-neutral-800">
                  <th className="text-left py-2 pr-4">Type</th>
                  <th className="text-left py-2 pr-4">Pod</th>
                  <th className="text-left py-2 pr-4">Severity</th>
                  <th className="text-left py-2 pr-4">Fixed</th>
                  <th className="text-left py-2">Time</th>
                </tr>
              </thead>
              <tbody>
                {status.recent_findings.slice(0, 20).map((f, i) => (
                  <tr key={i} className="border-b border-neutral-800/50">
                    <td className="py-2 pr-4 text-white">{f.bug_type || '-'}</td>
                    <td className="py-2 pr-4 text-neutral-400">{f.pod_ip || '-'}</td>
                    <td className={`py-2 pr-4 ${severityColor(f.severity || '')}`}>{f.severity || '-'}</td>
                    <td className="py-2 pr-4">{f.fix_applied ? <span className="text-green-400">Yes</span> : <span className="text-neutral-500">No</span>}</td>
                    <td className="py-2 text-neutral-500">{f.run_ts ? new Date(f.run_ts).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Proposals */}
      {status?.proposals && status.proposals.length > 0 && (
        <div className="rounded-xl bg-neutral-900 border border-neutral-800 p-4">
          <h2 className="text-white font-medium mb-3">Improvement Proposals</h2>
          <div className="space-y-2">
            {status.proposals.map((p, i) => (
              <div key={i} className="flex items-center justify-between bg-neutral-800/50 rounded-lg px-3 py-2">
                <div>
                  <span className="text-white text-sm">{p.bug_type || 'unknown'}</span>
                  <span className="text-neutral-500 text-xs ml-2">{p.category || ''}</span>
                </div>
                <div className="flex items-center gap-2">
                  {p.confidence !== undefined && (
                    <span className="text-neutral-500 text-xs">{Math.round(p.confidence * 100)}%</span>
                  )}
                  <span className={`px-2 py-0.5 rounded text-xs ${statusBadge(p.status || 'pending')}`}>
                    {p.status || 'pending'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
