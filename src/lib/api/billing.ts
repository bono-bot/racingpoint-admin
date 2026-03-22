import { rcFetch } from './base';

export interface ActiveSession {
  id: string;
  driver_id: string;
  driver_name: string;
  pod_id: string;
  pod_number: number;
  pricing_tier_name: string;
  allocated_seconds: number;
  driving_seconds: number;
  remaining_seconds: number;
  status: 'active' | 'paused_manual' | 'completed' | 'cancelled' | 'expired';
  price_paise: number;
  started_at: string;
  paused_at: string | null;
  ended_at: string | null;
  staff_id: string | null;
  staff_name: string | null;
}

export interface SessionEvent {
  id: string;
  session_id: string;
  event_type: string; // 'start' | 'pause' | 'resume' | 'extend' | 'stop'
  timestamp: string;
  details: string | null;
  staff_name: string | null;
}

export interface BillingRate {
  id: string;
  name: string;
  duration_minutes: number;
  price_paise: number;
  active: boolean;
}

export const billingApi = {
  getActive: (): Promise<ActiveSession[]> =>
    rcFetch('/billing/active'),

  getSession: (id: string): Promise<ActiveSession> =>
    rcFetch(`/billing/sessions/${id}`),

  startSession: (data: { pod_id: string; driver_id?: string; rate_id: string }): Promise<ActiveSession> =>
    rcFetch('/billing/start', { method: 'POST', body: JSON.stringify(data) }),

  stopSession: (id: string): Promise<void> =>
    rcFetch(`/billing/${id}/stop`, { method: 'POST' }),

  pauseSession: (id: string): Promise<void> =>
    rcFetch(`/billing/${id}/pause`, { method: 'POST' }),

  resumeSession: (id: string): Promise<void> =>
    rcFetch(`/billing/${id}/resume`, { method: 'POST' }),

  extendSession: (id: string, minutes: number): Promise<void> =>
    rcFetch(`/billing/${id}/extend`, { method: 'POST', body: JSON.stringify({ minutes }) }),

  getSessionEvents: (id: string): Promise<SessionEvent[]> =>
    rcFetch(`/billing/sessions/${id}/events`),

  getRates: (): Promise<BillingRate[]> =>
    rcFetch('/billing/rates'),
};
