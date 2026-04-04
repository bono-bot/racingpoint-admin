import { rcFetch } from './base';

export interface MeshSolution {
  id: string;
  problem_hash: string;
  problem_key: string;
  root_cause: string;
  fix_action: string;
  fix_type: string;
  confidence: number;
  source_node: string;
  promotion_status: string;
  success_count: number;
  fail_count: number;
  applied_on: string;
  success_on: string;
  created_at: string;
  updated_at: string;
}

export interface MeshIncident {
  id: string;
  timestamp: string;
  node: string;
  problem_key: string;
  severity: string;
  diagnosis_tier: number;
  cost: number;
  resolution: string;
  time_to_resolve_ms: number;
  customer_impact: boolean;
  solution_id: string | null;
}

export interface MeshStats {
  total_solutions: number;
  fleet_verified: number;
  hardened: number;
  candidates: number;
  total_incidents: number;
  incidents_today: number;
  auto_resolved: number;
  total_cost: number;
}

export const meshApi = {
  async listSolutions(limit = 50): Promise<MeshSolution[]> {
    try {
      return await rcFetch(`/mesh/solutions?limit=${limit}`);
    } catch { return []; }
  },

  async getSolution(id: string): Promise<MeshSolution | null> {
    try {
      return await rcFetch(`/mesh/solutions/${id}`);
    } catch { return null; }
  },

  async listIncidents(limit = 50): Promise<MeshIncident[]> {
    try {
      return await rcFetch(`/mesh/incidents?limit=${limit}`);
    } catch { return []; }
  },

  async getStats(): Promise<MeshStats | null> {
    try {
      return await rcFetch('/mesh/stats');
    } catch { return null; }
  },

  async promoteSolution(id: string): Promise<boolean> {
    try {
      await rcFetch(`/mesh/solutions/${id}/promote`, { method: 'POST' });
      return true;
    } catch { return false; }
  },

  async retireSolution(id: string): Promise<boolean> {
    try {
      await rcFetch(`/mesh/solutions/${id}/retire`, { method: 'POST' });
      return true;
    } catch { return false; }
  },
};
