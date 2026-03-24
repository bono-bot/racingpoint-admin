'use client';

import { SWRConfig } from 'swr';
import type { ReactNode } from 'react';
import { circuitBreaker } from '@/lib/api/base';

export function SWRProvider({ children }: { children: ReactNode }) {
  return (
    <SWRConfig
      value={{
        shouldRetryOnError: false,
        errorRetryCount: 0,
        dedupingInterval: 5000,
        keepPreviousData: true,
        revalidateOnFocus: true,
        onErrorRetry: (_error, _key, _config, revalidate, { retryCount }) => {
          // Don't retry when circuit breaker is open (backend confirmed down)
          if (circuitBreaker.getState() === 'open') return;

          // For half-open or closed, slow-poll to detect recovery
          const delay = Math.min(retryCount * 5000, 30000);
          setTimeout(() => {
            void revalidate({ retryCount });
          }, delay);
        },
      }}
    >
      {children}
    </SWRConfig>
  );
}
