const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://localhost:3100';
const API_KEY = process.env.NEXT_PUBLIC_GATEWAY_API_KEY || 'rp-gateway-2026-secure-key';

export async function apiFetch(path: string, options: RequestInit = {}) {
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

export async function rcFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`/api/rc${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (!res.ok) throw new Error(`RaceControl API error: ${res.status}`);
  return res.json();
}
