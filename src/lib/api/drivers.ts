import { apiFetch } from './base';

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

export interface CustomersResponse {
  customers: Customer[];
  total: number;
}

export const driversApi = {
  getCustomers: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiFetch(`/api/customers${qs}`) as Promise<CustomersResponse>;
  },
};
