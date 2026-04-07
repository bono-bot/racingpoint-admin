import { rcFetch } from './base';

export interface WalletInfo {
  balance_credits: number;
  rupee_deposited: number;
  rupee_refunded: number;
  bonus_credited: number;
  max_cash_refund: number;
  total_spent: number;
  transactions_count: number;
}

export interface WalletTransaction {
  id: string;
  driver_id: string;
  amount_paise: number;
  balance_after_paise: number;
  txn_type: string;
  currency_type: 'rupee' | 'credit';
  reference_id: string | null;
  notes: string | null;
  staff_id: string | null;
  created_at: string;
  driver_name: string;
  driver_phone: string | null;
}

export interface WalletTransactionsSummary {
  total_credits_paise: number;
  total_debits_paise: number;
  total_rupee_deposits: number;
  total_bonus_credits: number;
  total_cash_refunds: number;
  net_paise: number;
  count: number;
}

export interface WalletTransactionsReport {
  transactions: WalletTransaction[];
  summary: WalletTransactionsSummary;
}

export const walletApi = {
  getInfo: (driverId: string): Promise<{ wallet: WalletInfo }> =>
    rcFetch(`/wallet/${driverId}`),

  getTransactions: (date: string, driverId?: string): Promise<WalletTransactionsReport> => {
    const params = new URLSearchParams({ date });
    if (driverId) params.set('driver_id', driverId);
    return rcFetch(`/wallet/transactions?${params.toString()}`);
  },

  topup: (driverId: string, data: { amount_paise: number; txn_type: string; notes?: string }): Promise<{ new_balance_credits: number; bonus_credits_granted: number; rupee_amount: number; max_cash_refund: number }> =>
    rcFetch(`/wallet/${driverId}/topup`, { method: 'POST', body: JSON.stringify(data) }),

  cashRefund: (driverId: string, data: { amount_paise: number; notes?: string }): Promise<{ status: string; type: string; amount: number; new_balance_credits: number; max_cash_refund_remaining: number }> =>
    rcFetch(`/wallet/${driverId}/cash-refund`, { method: 'POST', body: JSON.stringify(data) }),

  debit: (driverId: string, data: { amount_paise: number; reason: string; notes?: string }): Promise<{ new_balance_credits: number }> =>
    rcFetch(`/wallet/${driverId}/debit`, { method: 'POST', body: JSON.stringify(data) }),
};
