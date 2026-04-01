// Domain modules
export { apiFetch, rcFetch } from './base';
export { fleetApi } from './fleet';
export { billingApi } from './billing';
export { driversApi } from './drivers';
export { eventsApi } from './events';
export { gamesApi } from './games';
export { opsApi } from './ops';
export { staffApi } from './staff';
export { presetsApi } from './presets';
export type { GamePreset, GamePresetWithReliability, CreatePresetRequest, UpdatePresetRequest } from './presets';

// Type re-exports
export type { Booking, BookingsResponse } from './events';
export type { Driver, WalletBalance } from './drivers';
export type { TranscribeSegment, TranscribeWord, TranscribeResponse } from './ops';
export type { PodFleetStatus, FleetHealthResponse } from './fleet';
export type { GameCatalogEntry, ActiveGame, LaunchGameParams } from './games';
export type { StaffMember, StaffListResponse, CreateStaffParams, UpdateStaffParams } from './staff';

// Backward-compatible unified api object
// Existing pages import { api } from '@/lib/api' and call api.getBookings(), etc.
import { fleetApi } from './fleet';
import { driversApi } from './drivers';
import { eventsApi } from './events';
import { gamesApi } from './games';
import { opsApi } from './ops';

export const api = {
  ...eventsApi,
  ...driversApi,
  ...fleetApi,
  ...gamesApi,
  ...opsApi,
};
