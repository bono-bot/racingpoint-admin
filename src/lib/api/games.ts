import { rcFetch } from './base';

export interface GameCatalogEntry {
  id: string; // SimType enum value
  name: string;
  abbr: string;
  installed_pod_count: number;
}

export interface ActiveGame {
  pod_id: string;
  pod_number: number;
  sim_type: string;
  driver_id: string;
  driver_name: string;
  started_at: string;
}

export interface LaunchGameParams {
  pod_id: string;
  sim_type: string;
  driver_id: string;
  session_id?: string;
}

export const gamesApi = {
  getKioskSettings: () => rcFetch('/kiosk/settings'),
  updateKioskSettings: (data: Record<string, string>) =>
    rcFetch('/kiosk/settings', { method: 'PUT', body: JSON.stringify(data) }),
  getKioskExperiences: () => rcFetch('/kiosk/experiences'),
  createKioskExperience: (data: Record<string, unknown>) =>
    rcFetch('/kiosk/experiences', { method: 'POST', body: JSON.stringify(data) }),
  updateKioskExperience: (id: string, data: Record<string, unknown>) =>
    rcFetch(`/kiosk/experiences/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteKioskExperience: (id: string) =>
    rcFetch(`/kiosk/experiences/${id}`, { method: 'DELETE' }),
  getPackages: () => rcFetch('/customer/packages'),
  getCoupons: () => rcFetch('/coupons'),
  createCoupon: (data: Record<string, unknown>) =>
    rcFetch('/coupons', { method: 'POST', body: JSON.stringify(data) }),
  deleteCoupon: (id: string) => rcFetch(`/coupons/${id}`, { method: 'DELETE' }),
  getPricingRules: () => rcFetch('/pricing/rules'),
  createPricingRule: (data: Record<string, unknown>) =>
    rcFetch('/pricing/rules', { method: 'POST', body: JSON.stringify(data) }),
  deletePricingRule: (id: string) =>
    rcFetch(`/pricing/rules/${id}`, { method: 'DELETE' }),
  getGamesCatalog: () => rcFetch('/games/catalog') as Promise<{ games: GameCatalogEntry[] }>,
  launchGame: (data: LaunchGameParams) =>
    rcFetch('/games/launch', { method: 'POST', body: JSON.stringify(data) }),
  stopGame: (podId: string) =>
    rcFetch('/games/stop', { method: 'POST', body: JSON.stringify({ pod_id: podId }) }),
  getActiveGames: (): Promise<ActiveGame[]> =>
    rcFetch('/games/active').then((data: { games: ActiveGame[] } | ActiveGame[]) =>
      Array.isArray(data) ? data : data.games ?? [],
    ),
};
