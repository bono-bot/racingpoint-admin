const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://localhost:3100';
const API_KEY = process.env.NEXT_PUBLIC_GATEWAY_API_KEY || 'rp-gateway-2026-secure-key';
const RC_URL = process.env.NEXT_PUBLIC_RC_URL || 'http://localhost:8080';

async function apiFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${GATEWAY_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      ...options.headers,
    },
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

async function rcFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${RC_URL}/api/v1${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (!res.ok) throw new Error(`RaceControl API error: ${res.status}`);
  return res.json();
}

export interface Booking {
  id: number;
  booking_id: string;
  source: 'whatsapp' | 'discord';
  source_user_id: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  booking_type: string;
  session_date: string;
  start_time: string;
  end_time: string;
  calendar_event_id: string | null;
  status: 'confirmed' | 'cancelled';
  created_at: string;
}

export interface Customer {
  name: string;
  phone: string;
  email: string | null;
  sources: string[];
  total_bookings: number;
  confirmed_bookings: number;
  first_booking: string;
  last_booking: string;
}

export interface BookingsResponse {
  bookings: Booking[];
  total: number;
  limit: number;
  offset: number;
}

export interface CustomersResponse {
  customers: Customer[];
  total: number;
}

export interface TranscribeSegment {
  id: number;
  start: number;
  end: number;
  text: string;
  avg_logprob: number;
  no_speech_prob: number;
}

export interface TranscribeWord {
  word: string;
  start: number;
  end: number;
}

export interface TranscribeResponse {
  status?: string;
  text?: string;
  duration?: number;
  language?: string;
  model?: string;
  segments?: TranscribeSegment[];
  words?: TranscribeWord[];
  original_filename?: string;
  error?: string;
  details?: unknown;
}

export const api = {
  getBookings: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiFetch(`/api/bookings${qs}`) as Promise<BookingsResponse>;
  },
  getBooking: (id: string) => apiFetch(`/api/bookings/${id}`) as Promise<Booking>,
  cancelBooking: (id: string) => apiFetch(`/api/bookings/${id}/cancel`, { method: 'PUT' }),
  getCustomers: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiFetch(`/api/customers${qs}`) as Promise<CustomersResponse>;
  },
  getRacecontrol: (path: string) => apiFetch(`/api/racecontrol/${path}`),
  chat: (message: string, history: { role: string; content: string }[]) =>
    rcFetch('/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ message, history }),
    }) as Promise<{ reply?: string; model?: string; error?: string }>,
  health: () => apiFetch('/api/health'),

  // Marketing admin APIs (rc-core)
  getCoupons: () => rcFetch('/coupons'),
  createCoupon: (data: Record<string, unknown>) => rcFetch('/coupons', { method: 'POST', body: JSON.stringify(data) }),
  deleteCoupon: (id: string) => rcFetch(`/coupons/${id}`, { method: 'DELETE' }),
  getPricingRules: () => rcFetch('/pricing/rules'),
  createPricingRule: (data: Record<string, unknown>) => rcFetch('/pricing/rules', { method: 'POST', body: JSON.stringify(data) }),
  deletePricingRule: (id: string) => rcFetch(`/pricing/rules/${id}`, { method: 'DELETE' }),
  getPackages: () => rcFetch('/customer/packages'),
  getTournaments: () => rcFetch('/tournaments'),
  createTournament: (data: Record<string, unknown>) => rcFetch('/tournaments', { method: 'POST', body: JSON.stringify(data) }),
  getTournament: (id: string) => rcFetch(`/tournaments/${id}`),
  getTournamentRegistrations: (id: string) => rcFetch(`/tournaments/${id}/registrations`),
  getTournamentMatches: (id: string) => rcFetch(`/tournaments/${id}/matches`),
  generateBracket: (id: string) => rcFetch(`/tournaments/${id}/generate-bracket`, { method: 'POST' }),
  recordMatchResult: (tournamentId: string, matchId: string, winnerId: string) => rcFetch(`/tournaments/${tournamentId}/matches/${matchId}/result`, { method: 'POST', body: JSON.stringify({ winner_id: winnerId }) }),
  getTimeTrials: () => rcFetch('/time-trials'),
  createTimeTrial: (data: Record<string, unknown>) => rcFetch('/time-trials', { method: 'POST', body: JSON.stringify(data) }),
  // Kiosk (rc-core)
  getKioskSettings: () => rcFetch('/kiosk/settings'),
  updateKioskSettings: (data: Record<string, string>) => rcFetch('/kiosk/settings', { method: 'PUT', body: JSON.stringify(data) }),
  getKioskExperiences: () => rcFetch('/kiosk/experiences'),
  createKioskExperience: (data: Record<string, unknown>) => rcFetch('/kiosk/experiences', { method: 'POST', body: JSON.stringify(data) }),
  updateKioskExperience: (id: string, data: Record<string, unknown>) => rcFetch(`/kiosk/experiences/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteKioskExperience: (id: string) => rcFetch(`/kiosk/experiences/${id}`, { method: 'DELETE' }),

  transcribe: (file: File, options?: { model?: string; language?: string }) => {
    const formData = new FormData();
    formData.append('file', file);
    return fetch(`${GATEWAY_URL}/api/transcribe?model=${options?.model || 'whisper-large-v3-turbo'}${options?.language ? `&language=${options.language}` : ''}&response_format=verbose_json&timestamps=word,segment`, {
      method: 'POST',
      headers: { 'x-api-key': API_KEY },
      body: formData,
    }).then(r => r.json()) as Promise<TranscribeResponse>;
  },
};
