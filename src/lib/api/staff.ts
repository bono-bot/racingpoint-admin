import { rcFetch } from './base';

export interface StaffMember {
  id: string;
  name: string;
  phone: string;
  pin: string;
  is_active: boolean;
  last_login_at: string | null;
  role: string;
}

export interface StaffListResponse {
  staff: StaffMember[];
}

export interface CreateStaffParams {
  name: string;
  phone: string;
  pin: string;
}

export interface UpdateStaffParams {
  name?: string;
  phone?: string;
  pin?: string;
  role?: string;
  is_active?: boolean;
}

export interface ChangePinParams {
  new_pin: string;
}

export interface ChangePinResponse {
  status: string;
  cloud_verified: boolean;
  venue_verified: boolean;
  latency_ms: number;
  correlation_id: string;
}

export const staffApi = {
  list: () => rcFetch('/staff') as Promise<StaffListResponse>,

  create: (data: CreateStaffParams) =>
    rcFetch('/staff', {
      method: 'POST',
      body: JSON.stringify(data),
    }) as Promise<{ status: string; id: string; name: string }>,

  update: (id: string, data: UpdateStaffParams) =>
    rcFetch(`/staff/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }) as Promise<{ status: string; id: string }>,

  deactivate: (id: string) =>
    rcFetch(`/staff/${id}`, {
      method: 'DELETE',
    }) as Promise<{ status: string; id: string }>,

  changePin: (id: string, data: ChangePinParams) =>
    rcFetch(`/admin/staff/${id}/change-pin`, {
      method: 'POST',
      body: JSON.stringify(data),
    }) as Promise<ChangePinResponse>,
};
