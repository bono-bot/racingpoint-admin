'use client';

import useSWR from 'swr';
import { useState } from 'react';
import { toast } from 'sonner';
import { configApi } from '@/lib/api/config';
import type { PodConfigResponse, ConfigStatus } from '@/lib/api/config';
import { fleetApi } from '@/lib/api/fleet';
import type { PodFleetStatus } from '@/lib/api/fleet';
import { podLabel } from '@/lib/utils';
import ConfigEditorModal from '@/components/ConfigEditorModal';
import { useAuth } from '@/hooks/useAuth';

// ── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: ConfigStatus }) {
  const styles: Record<ConfigStatus, string> = {
    'in-sync': 'bg-emerald-400/10 text-emerald-400 border border-emerald-400/30',
    'pending-restart': 'bg-yellow-400/10 text-yellow-400 border border-yellow-400/30',
    'unknown': 'bg-neutral-500/10 text-neutral-400 border border-neutral-500/30',
  };
  const labels: Record<ConfigStatus, string> = {
    'in-sync': 'In Sync',
    'pending-restart': 'Pending Restart',
    'unknown': 'Unknown',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

// ── Config status derivation ─────────────────────────────────────────────────

function getConfigStatus(podId: string | undefined, wsConnected: boolean, podConfigs: PodConfigEntry[] | undefined): ConfigStatus {
  if (!podId) return 'unknown';
  if (!podConfigs) return 'unknown';
  const entry = podConfigs.find(c => c.pod_id === podId);
  if (!entry || !entry.config) return 'unknown';
  if (wsConnected) return 'in-sync';
  return 'pending-restart';
}

// ── Pod config card ───────────────────────────────────────────────────────────

interface PodConfigEntry {
  pod_id: string;
  config: PodConfigResponse | null;
}

interface SelectedPod {
  fleet: PodFleetStatus;
  configData: PodConfigResponse;
}

function PodConfigCard({
  pod,
  configEntry,
  onEdit,
}: {
  pod: PodFleetStatus;
  configEntry: PodConfigEntry | undefined;
  onEdit: (pod: PodFleetStatus, cfg: PodConfigResponse) => void;
}) {
  const status = getConfigStatus(pod.pod_id, pod.ws_connected, configEntry ? [configEntry] : undefined);
  const cfg = configEntry?.config ?? null;
  const hasConfig = cfg !== null;

  const formatIST = (ts: string | null | undefined): string => {
    if (!ts) return '-';
    try {
      return new Date(ts.endsWith('Z') ? ts : ts + 'Z').toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    } catch {
      return ts;
    }
  };

  return (
    <div className="bg-rp-card border border-rp-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold">{podLabel(pod)}</span>
        <StatusBadge status={status} />
      </div>
      <div className="space-y-1 text-xs text-neutral-400 mb-3">
        {pod.pod_id && <p>ID: {pod.pod_id}</p>}
        {hasConfig && cfg && (
          <>
            <p>Hash: {cfg.config_hash.slice(0, 8)}</p>
            <p>Modified: {formatIST(cfg.last_modified)}</p>
          </>
        )}
        {!hasConfig && <p className="text-neutral-500 italic">No config stored</p>}
      </div>
      <div className="pt-3 border-t border-rp-border">
        <button
          disabled={!pod.pod_id || !hasConfig}
          onClick={() => {
            if (pod.pod_id && cfg) onEdit(pod, cfg);
          }}
          className="text-xs px-3 py-1.5 rounded bg-neutral-700 hover:bg-neutral-600 text-neutral-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed font-medium"
        >
          Edit Config
        </button>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ConfigPage() {
  useAuth();
  const [selectedPod, setSelectedPod] = useState<SelectedPod | null>(null);
  const [bulkPushing, setBulkPushing] = useState(false);

  const { data: fleetData } = useSWR(
    'fleet-health',
    () => fleetApi.getHealth(),
    { refreshInterval: 10000 }
  );

  const { data: podConfigs, mutate: mutateConfigs } = useSWR<PodConfigEntry[]>(
    fleetData ? 'pod-configs' : null,
    async () => {
      const results = await Promise.all(
        (fleetData?.pods ?? []).map(async (p) => {
          if (!p.pod_id) return { pod_id: p.pod_id ?? '', config: null };
          try {
            const cfg = await configApi.getPodConfig(p.pod_id);
            return { pod_id: p.pod_id, config: cfg };
          } catch {
            return { pod_id: p.pod_id, config: null };
          }
        })
      );
      return results;
    },
    { refreshInterval: 10000 }
  );

  const { data: auditData, mutate: mutateAudit } = useSWR(
    'config-audit',
    () => configApi.getAuditLog(),
    { refreshInterval: 10000 }
  );

  const handleBulkPush = async () => {
    if (!fleetData || !podConfigs) return;
    setBulkPushing(true);
    try {
      const pushable = podConfigs.filter(e => e.pod_id && e.config !== null);
      if (pushable.length === 0) {
        toast.error('No pods with stored configs to push');
        return;
      }
      await Promise.all(
        pushable.map(async (entry) => {
          if (!entry.config) return;
          return configApi.setPodConfig(entry.pod_id, entry.config.config);
        })
      );
      await mutateConfigs();
      toast.success(`Pushed config to ${pushable.length} pod${pushable.length !== 1 ? 's' : ''}`);
    } catch (err) {
      toast.error('Bulk push failed: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setBulkPushing(false);
    }
  };

  const handleSaved = async () => {
    await mutateConfigs();
    await mutateAudit();
  };

  const formatIST = (ts: string | null | undefined): string => {
    if (!ts) return '-';
    try {
      return new Date(ts.endsWith('Z') ? ts : ts + 'Z').toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    } catch {
      return ts ?? '-';
    }
  };

  const formatAction = (action: string): string => {
    if (action === 'full_config_set') return 'Config Saved';
    if (action === 'config_push') return 'Field Push';
    return action;
  };

  const pods = fleetData?.pods ?? [];
  const recentAudit = (auditData ?? []).slice(0, 20);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Config Editor</h1>
          <p className="text-sm text-neutral-400 mt-0.5">Manage and push pod agent configurations</p>
        </div>
        <button
          onClick={handleBulkPush}
          disabled={bulkPushing}
          className="px-4 py-2 rounded bg-[#E10600] hover:bg-[#c50500] text-white text-sm font-medium disabled:opacity-50 transition-colors"
        >
          {bulkPushing ? 'Pushing...' : 'Bulk Push All'}
        </button>
      </div>

      {/* Pod grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {pods.length === 0 && (
          <p className="text-neutral-400 text-sm col-span-4">Loading pod fleet...</p>
        )}
        {pods.map((pod) => {
          const entry = podConfigs?.find(c => c.pod_id === pod.pod_id);
          return (
            <PodConfigCard
              key={pod.pod_number}
              pod={pod}
              configEntry={entry}
              onEdit={(p, cfg) => setSelectedPod({ fleet: p, configData: cfg })}
            />
          );
        })}
      </div>

      {/* Audit log */}
      <div className="bg-rp-card border border-rp-border rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-4">Audit Log</h2>
        {recentAudit.length === 0 ? (
          <p className="text-neutral-400 text-sm">No audit entries yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-neutral-500 border-b border-rp-border">
                  <th className="pb-2 pr-4">Time (IST)</th>
                  <th className="pb-2 pr-4">Action</th>
                  <th className="pb-2 pr-4">Target</th>
                  <th className="pb-2 pr-4">Changed By</th>
                  <th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rp-border">
                {recentAudit.map((entry) => {
                  let ackedPods: string[] = [];
                  try {
                    ackedPods = JSON.parse(entry.pods_acked) as string[];
                  } catch {
                    ackedPods = [];
                  }
                  return (
                    <tr key={entry.id} className="text-neutral-300">
                      <td className="py-2 pr-4 text-neutral-400 whitespace-nowrap text-xs">
                        {formatIST(entry.created_at)}
                      </td>
                      <td className="py-2 pr-4 font-medium">
                        {formatAction(entry.action)}
                      </td>
                      <td className="py-2 pr-4 text-neutral-400 max-w-[160px] truncate" title={entry.entity_name}>
                        {entry.entity_name}
                      </td>
                      <td className="py-2 pr-4 text-neutral-400">{entry.pushed_by}</td>
                      <td className="py-2">
                        {ackedPods.length > 0 ? (
                          <span className="text-xs text-emerald-400">
                            Pushed ({ackedPods.length})
                          </span>
                        ) : (
                          <span className="text-xs text-yellow-400">Queued</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {selectedPod && (
        <ConfigEditorModal
          pod={selectedPod.fleet}
          initialConfig={selectedPod.configData.config}
          configHash={selectedPod.configData.config_hash}
          onClose={() => setSelectedPod(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
