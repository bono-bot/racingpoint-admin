import { rcFetch } from './base';

export const fleetApi = {
  listPods: () => rcFetch('/pods'),
  setPodScreen: (podId: string, blank: boolean) =>
    rcFetch(`/pods/${podId}/screen`, { method: 'POST', body: JSON.stringify({ blank }) }),
};
