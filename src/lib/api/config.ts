import { rcFetch } from './base';

// ── Section types ────────────────────────────────────────────────────────────

interface PodSection {
  number: number;
  name: string;
  sim: string;
  sim_ip: string;
  sim_port: number;
}

interface CoreSection {
  url: string;
  failover_url?: string;
}

interface KioskSection {
  enabled: boolean;
}

interface LockScreenSection {
  enabled: boolean;
}

interface ProcessGuardSection {
  enabled: boolean;
  scan_interval_secs: number;
}

// ── Top-level config type ────────────────────────────────────────────────────

export interface AgentConfig {
  schema_version: number;
  pod: PodSection;
  core: CoreSection;
  kiosk: KioskSection;
  lock_screen: LockScreenSection;
  process_guard: ProcessGuardSection;
  auto_end_orphan_session_secs: number;
  ac_evo_telemetry_enabled: boolean;
  // Remaining sections are complex and not directly edited by the config UI
  wheelbase: Record<string, unknown>;
  telemetry_ports: Record<string, unknown>;
  games: Record<string, unknown>;
  ai_debugger: Record<string, unknown>;
  preflight: Record<string, unknown>;
  mma: Record<string, unknown>;
}

// ── Response types ───────────────────────────────────────────────────────────

export type ConfigStatus = 'in-sync' | 'pending-restart' | 'unknown';

export interface PodConfigResponse {
  pod_id: string;
  config: AgentConfig;
  config_hash: string;
  last_modified: string | null;
}

export interface SetPodConfigResponse {
  stored: boolean;
  /** true if pod was connected at time of save and received the push immediately */
  pushed: boolean;
  config_hash: string;
  pod_id: string;
}

export interface AuditLogEntry {
  id: number;
  action: string;
  entity_type: string;
  /** pod_id for full_config_set; comma-joined field names for config_push */
  entity_name: string;
  old_value: string | null;
  /** config_hash for full_config_set */
  new_value: string | null;
  /** staff sub from JWT (staff username) */
  pushed_by: string;
  /** JSON array string from DB e.g. '[]' or '["pod-1","pod-2"]' */
  pods_acked: string;
  seq_num: number | null;
  created_at: string | null;
}

export interface ConfigPushRequest {
  fields: Record<string, unknown>;
  schema_version?: number;
  target_pods?: string[];
}

export interface ConfigPushResponse {
  queued: number;
  delivered: number;
  seq_nums: number[];
}

// ── Hot-reload field list ────────────────────────────────────────────────────
// These fields are applied immediately by rc-agent without a restart.
// All other fields are COLD (require agent restart to take effect).

export const HOT_RELOAD_FIELDS: string[] = [
  'kiosk.enabled',
  'lock_screen.enabled',
  'ai_debugger.enabled',
  'process_guard.scan_interval_secs',
  'mma.training_mode',
  'auto_end_orphan_session_secs',
  'ac_evo_telemetry_enabled',
];

// ── API client ───────────────────────────────────────────────────────────────

export const configApi = {
  /** GET /api/v1/config/pod/{pod_id} — fetch stored config for a single pod */
  getPodConfig: (podId: string): Promise<PodConfigResponse> =>
    rcFetch('/config/pod/' + podId),

  /** POST /api/v1/config/pod/{pod_id} — store and push full config to a pod */
  setPodConfig: (podId: string, config: AgentConfig): Promise<SetPodConfigResponse> =>
    rcFetch('/config/pod/' + podId, {
      method: 'POST',
      body: JSON.stringify(config),
    }),

  /** POST /api/v1/config/push — field-level push to one or more pods */
  pushConfig: (req: ConfigPushRequest): Promise<ConfigPushResponse> =>
    rcFetch('/config/push', {
      method: 'POST',
      body: JSON.stringify(req),
    }),

  /** GET /api/v1/config/audit — fetch config change audit log */
  getAuditLog: (): Promise<AuditLogEntry[]> =>
    rcFetch('/config/audit'),
};
