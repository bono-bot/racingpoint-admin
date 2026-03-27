'use client';

import useSWR from 'swr';
import { useState } from 'react';
import { toast } from 'sonner';
import { meshApi } from '@/lib/api/mesh';
import type { MeshSolution, MeshIncident, MeshStats } from '@/lib/api/mesh';

const STATUS_COLORS: Record<string, string> = {
  candidate: 'bg-yellow-500/20 text-yellow-400',
  fleet_verified: 'bg-emerald-500/20 text-emerald-400',
  hardened: 'bg-blue-500/20 text-blue-400',
};

const SEVERITY_COLORS: Record<string, string> = {
  P1: 'text-red-400',
  P2: 'text-yellow-400',
  P3: 'text-gray-400',
};

export default function MeshIntelligencePage() {
  const [activeTab, setActiveTab] = useState<'solutions' | 'incidents' | 'stats'>('solutions');

  const { data: stats } = useSWR('mesh-stats', () => meshApi.getStats(), { refreshInterval: 10000 });
  const { data: solutions, mutate: mutateSolutions } = useSWR('mesh-solutions', () => meshApi.listSolutions(), { refreshInterval: 5000 });
  const { data: incidents } = useSWR('mesh-incidents', () => meshApi.listIncidents(), { refreshInterval: 10000 });

  async function handlePromote(id: string) {
    const ok = await meshApi.promoteSolution(id);
    if (ok) {
      toast.success('Solution promoted to fleet-verified');
      mutateSolutions();
    } else {
      toast.error('Failed to promote solution');
    }
  }

  async function handleRetire(id: string) {
    const ok = await meshApi.retireSolution(id);
    if (ok) {
      toast.success('Solution retired');
      mutateSolutions();
    } else {
      toast.error('Failed to retire solution');
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Mesh Intelligence</h1>
        <p className="text-gray-400 mt-1">Fleet-wide self-healing knowledge base and diagnostic system</p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Solutions" value={stats.total_solutions} sub={`${stats.hardened} hardened`} />
          <StatCard label="Fleet Verified" value={stats.fleet_verified} sub={`${stats.candidates} candidates`} />
          <StatCard label="Incidents Today" value={stats.incidents_today} sub={`${stats.auto_resolved} auto-resolved`} />
          <StatCard label="Total Cost" value={`$${stats.total_cost.toFixed(2)}`} sub="OpenRouter spend" />
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-gray-700 pb-1">
        {(['solutions', 'incidents', 'stats'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === tab
                ? 'bg-[#222222] text-white border-b-2 border-[#E10600]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Solutions Tab */}
      {activeTab === 'solutions' && (
        <div className="bg-[#222222] rounded-lg border border-[#333333] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#333333] text-gray-400">
                <th className="px-4 py-3 text-left">Problem</th>
                <th className="px-4 py-3 text-left">Root Cause</th>
                <th className="px-4 py-3 text-center">Confidence</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-center">Success</th>
                <th className="px-4 py-3 text-left">Source</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {solutions?.map((sol: MeshSolution) => (
                <tr key={sol.id} className="border-b border-[#333333]/50 hover:bg-[#2a2a2a]">
                  <td className="px-4 py-3 font-mono text-xs text-gray-300">{sol.problem_key}</td>
                  <td className="px-4 py-3 text-white max-w-xs truncate">{sol.root_cause}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={sol.confidence >= 0.8 ? 'text-emerald-400' : 'text-yellow-400'}>
                      {(sol.confidence * 100).toFixed(0)}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 rounded text-xs ${STATUS_COLORS[sol.promotion_status] || 'text-gray-400'}`}>
                      {sol.promotion_status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-gray-300">
                    {sol.success_count}/{sol.success_count + sol.fail_count}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{sol.source_node}</td>
                  <td className="px-4 py-3 text-right space-x-2">
                    {sol.promotion_status === 'candidate' && (
                      <button onClick={() => handlePromote(sol.id)} className="text-emerald-400 hover:text-emerald-300 text-xs">
                        Promote
                      </button>
                    )}
                    <button onClick={() => handleRetire(sol.id)} className="text-red-400 hover:text-red-300 text-xs">
                      Retire
                    </button>
                  </td>
                </tr>
              ))}
              {(!solutions || solutions.length === 0) && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    No solutions in fleet KB yet. Diagnostic engine will populate as issues are resolved.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Incidents Tab */}
      {activeTab === 'incidents' && (
        <div className="bg-[#222222] rounded-lg border border-[#333333] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#333333] text-gray-400">
                <th className="px-4 py-3 text-left">Time</th>
                <th className="px-4 py-3 text-left">Node</th>
                <th className="px-4 py-3 text-left">Problem</th>
                <th className="px-4 py-3 text-center">Severity</th>
                <th className="px-4 py-3 text-center">Tier</th>
                <th className="px-4 py-3 text-center">Cost</th>
                <th className="px-4 py-3 text-left">Resolution</th>
                <th className="px-4 py-3 text-center">MTTR</th>
              </tr>
            </thead>
            <tbody>
              {incidents?.map((inc: MeshIncident) => (
                <tr key={inc.id} className="border-b border-[#333333]/50 hover:bg-[#2a2a2a]">
                  <td className="px-4 py-3 text-gray-400 text-xs">{new Date(inc.timestamp).toLocaleTimeString()}</td>
                  <td className="px-4 py-3 text-white text-xs">{inc.node}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-300">{inc.problem_key}</td>
                  <td className={`px-4 py-3 text-center text-xs ${SEVERITY_COLORS[inc.severity] || 'text-gray-400'}`}>
                    {inc.severity}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-300">T{inc.diagnosis_tier}</td>
                  <td className="px-4 py-3 text-center text-gray-300">${inc.cost.toFixed(2)}</td>
                  <td className="px-4 py-3 text-emerald-400 text-xs">{inc.resolution}</td>
                  <td className="px-4 py-3 text-center text-gray-300">{inc.time_to_resolve_ms}ms</td>
                </tr>
              ))}
              {(!incidents || incidents.length === 0) && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    No incidents logged yet. Will populate as diagnostic events are processed.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Stats Tab */}
      {activeTab === 'stats' && stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[#222222] rounded-lg border border-[#333333] p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Knowledge Base</h3>
            <div className="space-y-3">
              <StatRow label="Total Solutions" value={stats.total_solutions} />
              <StatRow label="Hardened (Tier 1)" value={stats.hardened} />
              <StatRow label="Fleet Verified" value={stats.fleet_verified} />
              <StatRow label="Candidates" value={stats.candidates} />
            </div>
          </div>
          <div className="bg-[#222222] rounded-lg border border-[#333333] p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Incidents</h3>
            <div className="space-y-3">
              <StatRow label="Total Incidents" value={stats.total_incidents} />
              <StatRow label="Today" value={stats.incidents_today} />
              <StatRow label="Auto-Resolved" value={stats.auto_resolved} />
              <StatRow label="OpenRouter Cost" value={`$${stats.total_cost.toFixed(2)}`} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub: string }) {
  return (
    <div className="bg-[#222222] rounded-lg border border-[#333333] p-4">
      <p className="text-gray-400 text-xs">{label}</p>
      <p className="text-2xl font-bold text-white mt-1">{value}</p>
      <p className="text-gray-500 text-xs mt-1">{sub}</p>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-400">{label}</span>
      <span className="text-white font-medium">{value}</span>
    </div>
  );
}
