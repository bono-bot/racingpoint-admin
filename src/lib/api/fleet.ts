import { rcFetch } from './base';

export interface DeployStatus {
  status: string;
  pods: Array<{ pod_id: string; pod_number?: number; status: string }>;
  started_at?: string;
  completed_at?: string;
}

export interface ExecResult {
  stdout: string;
  stderr: string;
  exit_code: number;
}

export interface PodFleetStatus {
  pod_number: number;
  pod_id: string | null;
  ws_connected: boolean;
  http_reachable: boolean;
  version: string | null;
  build_id: string | null;
  uptime_secs: number | null;
  crash_recovery: boolean | null;
  ip_address: string | null;
  last_seen: string | null;
  last_http_check: string | null;
  in_maintenance: boolean;
  maintenance_failures: string[];
  violation_count_24h: number;
  last_violation_at: string | null;
  idle_health_fail_count: number;
  idle_health_failures: string[];
}

export interface FleetHealthResponse {
  pods: PodFleetStatus[];
  timestamp: string;
}

export interface ActivityEntry {
  id: string;
  pod_id: string;
  pod_number: number;
  timestamp: string;
  category: string;
  action: string;
  details: string;
  source: string;
}

export const fleetApi = {
  listPods: () => rcFetch('/pods'),
  setPodScreen: (podId: string, blank: boolean) =>
    rcFetch(`/pods/${podId}/screen`, { method: 'POST', body: JSON.stringify({ blank }) }),
  getHealth: (): Promise<FleetHealthResponse> => rcFetch('/fleet/health'),
  getActivity: (limit = 100): Promise<ActivityEntry[]> => rcFetch('/activity?limit=' + limit),
  getPodActivity: (podId: string, limit = 100): Promise<ActivityEntry[]> =>
    rcFetch('/pods/' + podId + '/activity?limit=' + limit),

  // Pod actions
  wakePod: (podId: string) => rcFetch('/pods/' + podId + '/wake', { method: 'POST' }),
  shutdownPod: (podId: string) => rcFetch('/pods/' + podId + '/shutdown', { method: 'POST' }),
  restartPod: (podId: string) => rcFetch('/pods/' + podId + '/restart', { method: 'POST' }),
  lockdownPod: (podId: string) => rcFetch('/pods/' + podId + '/lockdown', { method: 'POST' }),
  unlockPod: (podId: string) => rcFetch('/pods/' + podId + '/lockdown', { method: 'DELETE' }),
  enablePod: (podId: string) => rcFetch('/pods/' + podId + '/enable', { method: 'POST' }),
  disablePod: (podId: string) => rcFetch('/pods/' + podId + '/disable', { method: 'POST' }),
  clearMaintenance: (podId: string) => rcFetch('/pods/' + podId + '/clear-maintenance', { method: 'POST' }),

  // Bulk actions
  wakeAll: () => rcFetch('/pods/wake-all', { method: 'POST' }),
  shutdownAll: () => rcFetch('/pods/shutdown-all', { method: 'POST' }),
  restartAll: () => rcFetch('/pods/restart-all', { method: 'POST' }),
  lockdownAll: () => rcFetch('/pods/lockdown-all', { method: 'POST' }),

  // Deploy
  rollingDeploy: () => rcFetch('/deploy/rolling', { method: 'POST' }),
  deployStatus: (): Promise<DeployStatus> => rcFetch('/deploy/status'),
  deployPod: (podId: string) => rcFetch('/deploy/' + podId, { method: 'POST' }),

  // Remote exec
  execOnPod: (podId: string, command: string): Promise<ExecResult> =>
    rcFetch('/pods/' + podId + '/exec', { method: 'POST', body: JSON.stringify({ command }) }),
};
