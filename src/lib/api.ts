const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://localhost:3100';
const API_KEY = process.env.NEXT_PUBLIC_GATEWAY_API_KEY || 'rp-gateway-2026-secure-key';

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
  chat: (messages: { role: string; content: string }[]) =>
    apiFetch('/api/ollama/chat', { method: 'POST', body: JSON.stringify({ messages }) }),
  health: () => apiFetch('/api/health'),
};
