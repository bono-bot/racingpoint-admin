import { rcFetch } from './base';
import type { BillingSession, BillingSessionStatus } from '@racingpoint/types';
export type { BillingSessionStatus };

/** Admin-view session — extends shared BillingSession with admin-only fields */
export interface ActiveSession extends BillingSession {
  // Admin-specific fields not in the base shared type
  pod_number: number;
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

export interface SplitBillingInfo {
  total_paise: number;
  splits: Array<{
    driver_name: string;
    amount_paise: number;
    paid: boolean;
  }>;
}

export interface DailyReportSession {
  id: string;
  driver_name: string;
  pod_id: string;
  pricing_tier_name: string;
  price_paise: number;
  original_price_paise: number;
  discount_paise: number;
  allocated_seconds: number;
  driving_seconds: number;
  status: string;
  started_at: string;
  ended_at: string;
  staff_name: string | null;
}

export interface DailyReport {
  date: string;
  sessions: DailyReportSession[];
  total_revenue_paise: number;
  total_sessions: number;
  total_driving_seconds: number;
  total_discount_paise: number;
  staff_summary: Array<{
    staff_name: string;
    session_count: number;
    revenue_paise: number;
  }>;
}

export const billingApi = {
  getActive: (): Promise<ActiveSession[]> =>
    rcFetch('/billing/active').then((data: { sessions: ActiveSession[] } | ActiveSession[]) =>
      Array.isArray(data) ? data : data.sessions ?? [],
    ),

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

  refundSession: (id: string, data: { amount_paise?: number; method: 'wallet' | 'cash' | 'upi'; reason?: string }): Promise<void> =>
    rcFetch(`/billing/${id}/refund`, { method: 'POST', body: JSON.stringify(data) }),

  getHistory: (params: {
    offset?: number;
    limit?: number;
    status?: string;
    pod_id?: string;
    driver_name?: string;
    from?: string;
    to?: string;
  }): Promise<{ sessions: ActiveSession[]; total: number }> =>
    rcFetch(`/billing/sessions?${new URLSearchParams(
      Object.entries(params).filter(([, v]) => v != null && v !== '').map(([k, v]) => [k, String(v)])
    ).toString()}`),

  getSessionSplits: (id: string): Promise<SplitBillingInfo | null> =>
    rcFetch(`/billing/sessions/${id}/splits`).catch(() => null),

  getDailyReport: (date: string): Promise<DailyReport> =>
    rcFetch(`/billing/report/daily?date=${date}`),

  createRate: (data: { name: string; duration_minutes: number; price_paise: number }): Promise<BillingRate> =>
    rcFetch('/billing/rates', { method: 'POST', body: JSON.stringify(data) }),

  updateRate: (id: string, data: Partial<{ name: string; duration_minutes: number; price_paise: number; active: boolean }>): Promise<BillingRate> =>
    rcFetch(`/billing/rates/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  deleteRate: (id: string): Promise<void> =>
    rcFetch(`/billing/rates/${id}`, { method: 'DELETE' }),
};
