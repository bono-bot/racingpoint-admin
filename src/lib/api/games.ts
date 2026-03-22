import { rcFetch } from './base';

export const gamesApi = {
  getKioskSettings: () => rcFetch('/kiosk/settings'),
  updateKioskSettings: (data: Record<string, string>) =>
    rcFetch('/kiosk/settings', { method: 'PUT', body: JSON.stringify(data) }),
  getKioskExperiences: () => rcFetch('/kiosk/experiences'),
  createKioskExperience: (data: Record<string, unknown>) =>
    rcFetch('/kiosk/experiences', { method: 'POST', body: JSON.stringify(data) }),
  updateKioskExperience: (id: string, data: Record<string, unknown>) =>
    rcFetch(`/kiosk/experiences/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteKioskExperience: (id: string) =>
    rcFetch(`/kiosk/experiences/${id}`, { method: 'DELETE' }),
  getPackages: () => rcFetch('/customer/packages'),
  getCoupons: () => rcFetch('/coupons'),
  createCoupon: (data: Record<string, unknown>) =>
    rcFetch('/coupons', { method: 'POST', body: JSON.stringify(data) }),
  deleteCoupon: (id: string) => rcFetch(`/coupons/${id}`, { method: 'DELETE' }),
  getPricingRules: () => rcFetch('/pricing/rules'),
  createPricingRule: (data: Record<string, unknown>) =>
    rcFetch('/pricing/rules', { method: 'POST', body: JSON.stringify(data) }),
  deletePricingRule: (id: string) =>
    rcFetch(`/pricing/rules/${id}`, { method: 'DELETE' }),
};
