import { rcFetch } from './base';
import type { PodFleetStatus, FleetHealthResponse } from '@racingpoint/types';
export type { PodFleetStatus, FleetHealthResponse };

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
  freedomMode: (podId: string) => rcFetch('/pods/' + podId + '/freedom', { method: 'POST', body: JSON.stringify({}) }),
  unrestrictPod: (podId: string) => rcFetch('/pods/' + podId + '/unrestrict', { method: 'POST' }),

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
