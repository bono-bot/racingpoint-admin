import { CircuitBreaker } from './circuit-breaker';
import { withRetry } from './retry';

// Separate circuit breakers so gateway failures don't poison rcFetch calls
const gatewayBreaker = new CircuitBreaker({ failureThreshold: 3, cooldownMs: 60_000 });
const rcBreaker = new CircuitBreaker({ failureThreshold: 5, cooldownMs: 15_000 });

export { rcBreaker as circuitBreaker };
export type { CircuitState } from './circuit-breaker';

const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://192.168.31.23:3100';
const API_KEY = process.env.NEXT_PUBLIC_GATEWAY_API_KEY || 'rp-gateway-2026-secure-key';

export async function apiFetch(path: string, options: RequestInit = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5_000);
  try {
    return await gatewayBreaker.call(() =>
      withRetry(async () => {
        const res = await fetch(`${GATEWAY_URL}${path}`, {
          ...options,
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': API_KEY,
            ...options.headers,
          },
        });
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        return res.json();
      }, { maxRetries: 1, baseDelayMs: 500 })
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function rcFetch(path: string, options: RequestInit = {}) {
  return rcBreaker.call(() =>
    withRetry(async () => {
      const res = await fetch(`/api/rc${path}`, {
        ...options,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });
      if (!res.ok) throw new Error(`RaceControl API error: ${res.status}`);
      return res.json();
    })
  );
}
