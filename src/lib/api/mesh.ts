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
    const res = await rcFetch(`/api/v1/mesh/solutions?limit=${limit}`);
    if (!res.ok) return [];
    return res.json();
  },

  async getSolution(id: string): Promise<MeshSolution | null> {
    const res = await rcFetch(`/api/v1/mesh/solutions/${id}`);
    if (!res.ok) return null;
    return res.json();
  },

  async listIncidents(limit = 50): Promise<MeshIncident[]> {
    const res = await rcFetch(`/api/v1/mesh/incidents?limit=${limit}`);
    if (!res.ok) return [];
    return res.json();
  },

  async getStats(): Promise<MeshStats | null> {
    const res = await rcFetch('/api/v1/mesh/stats');
    if (!res.ok) return null;
    return res.json();
  },

  async promoteSolution(id: string): Promise<boolean> {
    const res = await rcFetch(`/api/v1/mesh/solutions/${id}/promote`, { method: 'POST' });
    return res.ok;
  },

  async retireSolution(id: string): Promise<boolean> {
    const res = await rcFetch(`/api/v1/mesh/solutions/${id}/retire`, { method: 'POST' });
    return res.ok;
  },
};
