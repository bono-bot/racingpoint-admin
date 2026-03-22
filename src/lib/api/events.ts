import { apiFetch, rcFetch } from './base';

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

export interface BookingsResponse {
  bookings: Booking[];
  total: number;
  limit: number;
  offset: number;
}

export const eventsApi = {
  getBookings: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiFetch(`/api/bookings${qs}`) as Promise<BookingsResponse>;
  },
  getBooking: (id: string) => apiFetch(`/api/bookings/${id}`) as Promise<Booking>,
  cancelBooking: (id: string) => apiFetch(`/api/bookings/${id}/cancel`, { method: 'PUT' }),
  getTournaments: () => rcFetch('/tournaments'),
  createTournament: (data: Record<string, unknown>) =>
    rcFetch('/tournaments', { method: 'POST', body: JSON.stringify(data) }),
  getTournament: (id: string) => rcFetch(`/tournaments/${id}`),
  getTournamentRegistrations: (id: string) => rcFetch(`/tournaments/${id}/registrations`),
  getTournamentMatches: (id: string) => rcFetch(`/tournaments/${id}/matches`),
  generateBracket: (id: string) =>
    rcFetch(`/tournaments/${id}/generate-bracket`, { method: 'POST' }),
  recordMatchResult: (tournamentId: string, matchId: string, winnerId: string) =>
    rcFetch(`/tournaments/${tournamentId}/matches/${matchId}/result`, {
      method: 'POST',
      body: JSON.stringify({ winner_id: winnerId }),
    }),
  getTimeTrials: () => rcFetch('/time-trials'),
  createTimeTrial: (data: Record<string, unknown>) =>
    rcFetch('/time-trials', { method: 'POST', body: JSON.stringify(data) }),
};
