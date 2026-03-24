'use client';

import { useEffect, useRef, useState } from 'react';
import { useConnection } from '@/contexts/ConnectionContext';
import type { ConnectionStatus } from '@/contexts/ConnectionContext';

export function ConnectionIndicator() {
  const { status } = useConnection();
  const [visible, setVisible] = useState(false);
  const [recoveryMessage, setRecoveryMessage] = useState(false);
  const prevStatusRef = useRef<ConnectionStatus>(status);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const prevStatus = prevStatusRef.current;
    prevStatusRef.current = status;

    // Clear any pending timer on status change
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (status === 'degraded' || status === 'offline') {
      setVisible(true);
      setRecoveryMessage(false);
    } else if (status === 'connected' && (prevStatus === 'degraded' || prevStatus === 'offline')) {
      // Recovery: show "Back online" then auto-dismiss after 3s
      setVisible(true);
      setRecoveryMessage(true);
      timerRef.current = setTimeout(() => {
        setVisible(false);
        setRecoveryMessage(false);
      }, 3000);
    } else {
      setVisible(false);
      setRecoveryMessage(false);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [status]);

  if (!visible) return null;

  let bgClass = '';
  let label = '';
  let dotClass = 'w-2 h-2 rounded-full';

  if (recoveryMessage) {
    bgClass = 'bg-green-500 text-white';
    label = 'Back online';
    dotClass += ' bg-white';
  } else if (status === 'degraded') {
    bgClass = 'bg-yellow-500 text-white';
    label = 'Connection unstable';
    dotClass += ' bg-white animate-pulse';
  } else if (status === 'offline') {
    bgClass = 'bg-red-500 text-white';
    label = 'Backend offline';
    dotClass += ' bg-white';
  }

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 rounded-full px-4 py-2 shadow-lg flex items-center gap-2 text-sm font-medium transition-opacity duration-300 ${bgClass}`}
      role="status"
      aria-live="polite"
    >
      <span className={dotClass} />
      {label}
    </div>
  );
}
