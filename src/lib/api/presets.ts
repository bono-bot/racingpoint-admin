// Phase 298: Game Preset Library API client
// Uses rcFetch which proxies via Next.js /api/rc → racecontrol with JWT injected from cookie
import { rcFetch } from './base';

export interface GamePreset {
  id: string;
  name: string;
  game: string;          // "assettoCorsa", "f125", "iracing", etc.
  car: string | null;
  track: string | null;
  session_type: string | null;
  notes: string | null;
  enabled: boolean;
  created_at: string | null;
}

export interface GamePresetWithReliability extends GamePreset {
  reliability_score: number | null;  // 0.0-1.0, null if <5 launches
  total_launches: number;
  flagged_unreliable: boolean;       // score < threshold AND launches >= 5
}

export interface CreatePresetRequest {
  name: string;
  game: string;
  car?: string | null;
  track?: string | null;
  session_type?: string | null;
  notes?: string | null;
  enabled?: boolean;
}

export interface UpdatePresetRequest {
  name?: string;
  game?: string;
  car?: string | null;
  track?: string | null;
  session_type?: string | null;
  notes?: string | null;
  enabled?: boolean;
}

export const presetsApi = {
  listPresets: (): Promise<GamePresetWithReliability[]> =>
    rcFetch('/presets'),

  getPreset: (id: string): Promise<GamePreset> =>
    rcFetch(`/presets/${id}`),

  createPreset: (body: CreatePresetRequest): Promise<GamePreset> =>
    rcFetch('/presets', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  updatePreset: (id: string, body: UpdatePresetRequest): Promise<GamePreset> =>
    rcFetch(`/presets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  deletePreset: (id: string): Promise<{ deleted: boolean; id: string }> =>
    rcFetch(`/presets/${id}`, { method: 'DELETE' }),
};
