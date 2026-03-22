import { rcFetch } from './base';

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

export const fleetApi = {
  listPods: () => rcFetch('/pods'),
  setPodScreen: (podId: string, blank: boolean) =>
    rcFetch(`/pods/${podId}/screen`, { method: 'POST', body: JSON.stringify({ blank }) }),
  getHealth: (): Promise<FleetHealthResponse> => rcFetch('/fleet/health'),
};
