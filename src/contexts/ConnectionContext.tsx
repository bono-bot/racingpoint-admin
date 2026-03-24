'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { circuitBreaker } from '@/lib/api/base';
import type { CircuitState } from '@/lib/api/base';

export type ConnectionStatus = 'connected' | 'degraded' | 'offline';

interface ConnectionContextValue {
  status: ConnectionStatus;
}

const ConnectionContext = createContext<ConnectionContextValue | null>(null);

function mapCircuitState(state: CircuitState): ConnectionStatus {
  switch (state) {
    case 'closed':
      return 'connected';
    case 'half-open':
      return 'degraded';
    case 'open':
      return 'offline';
  }
}

export function ConnectionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<ConnectionStatus>('connected');
  const recoveryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Set initial state from circuit breaker (not in useState initializer per hydration rule)
    setStatus(mapCircuitState(circuitBreaker.getState()));

    // Subscribe to state changes
    circuitBreaker.setOnStateChange((state: CircuitState) => {
      const mapped = mapCircuitState(state);
      setStatus(mapped);

      // Clear any pending recovery timer when state changes again
      if (recoveryTimerRef.current) {
        clearTimeout(recoveryTimerRef.current);
        recoveryTimerRef.current = null;
      }
    });

    return () => {
      circuitBreaker.setOnStateChange(undefined);
      if (recoveryTimerRef.current) {
        clearTimeout(recoveryTimerRef.current);
      }
    };
  }, []);

  return (
    <ConnectionContext.Provider value={{ status }}>
      {children}
    </ConnectionContext.Provider>
  );
}

export function useConnection(): ConnectionContextValue {
  const context = useContext(ConnectionContext);
  if (!context) {
    throw new Error('useConnection must be used within a ConnectionProvider');
  }
  return context;
}
