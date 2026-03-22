'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/Toast';

export function useSessionExpiry() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const warnedRef = useRef(false);

  useEffect(() => {
    if (!user?.exp) return;

    const check = () => {
      const remaining = user.exp - Math.floor(Date.now() / 1000);

      if (remaining <= 0) {
        logout();
      } else if (remaining <= 300 && !warnedRef.current) {
        warnedRef.current = true;
        toast('Session expiring in 5 minutes. Save your work.', 'info');
      }
    };

    check();
    const interval = setInterval(check, 30000);

    return () => clearInterval(interval);
  }, [user?.exp, logout, toast]);
}
