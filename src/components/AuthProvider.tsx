'use client';

import { createContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

export interface AuthUser {
  sub: string;
  role: string;
  exp: number;
  iat: number;
}

export interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue>({
  user: null,
  isAuthenticated: false,
  isAdmin: false,
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    let cancelled = false;
    let retries = 2;

    const fetchUser = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (cancelled) return;
        if (res.ok) {
          const data = await res.json();
          if (data && data.sub) {
            setUser(data);
            return;
          }
        }
        if (res.status === 401) {
          // Token invalid — middleware will handle on next navigation
          setUser(null);
          return;
        }
        throw new Error('Failed to fetch user');
      } catch {
        if (cancelled) return;
        if (retries > 0) {
          retries--;
          setTimeout(fetchUser, 1000);
        } else {
          setUser(null);
          router.push('/login');
        }
      }
    };

    fetchUser();
    return () => { cancelled = true; };
  }, [router]);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Logout failed — still clear local state
    }
    setUser(null);
    router.push('/login');
  }, [router]);

  const isAdmin = user?.sub === 'admin' && (user?.role === 'superadmin' || user?.role === 'staff');

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isAdmin, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
