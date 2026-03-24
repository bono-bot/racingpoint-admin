import { rcFetch } from './base';

export interface Driver {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  steam_guid: string | null;
  iracing_id: string | null;
  created_at: string;
  total_sessions: number;
  total_laps: number;
  total_drive_time_secs: number;
  wallet_balance_paise: number;
}

export interface WalletBalance {
  balance_paise: number;
  driver_id: string;
}

export const driversApi = {
  getDrivers: () => rcFetch('/drivers') as Promise<Driver[]>,
  getDriver: (id: string) => rcFetch(`/drivers/${id}`) as Promise<Driver>,
  createDriver: (data: { name: string; phone?: string; email?: string }) =>
    rcFetch('/drivers', { method: 'POST', body: JSON.stringify(data) }) as Promise<Driver>,
  getDriverWallet: (id: string) =>
    rcFetch(`/wallet/${id}`) as Promise<WalletBalance>,
  topupWallet: (id: string, data: { amount_paise: number; note?: string }) =>
    rcFetch(`/wallet/${id}/topup`, { method: 'POST', body: JSON.stringify(data) }),
};
