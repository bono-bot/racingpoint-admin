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
    fetch('/api/auth/me')
      .then(res => {
        if (res.ok) return res.json();
        return null;
      })
      .then(data => {
        if (data && data.sub) {
          setUser(data);
        }
      })
      .catch(() => {
        // Not authenticated — user stays null
      });
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Logout failed — still clear local state
    }
    setUser(null);
    router.push('/login');
  }, [router]);

  const isAdmin = user?.sub === 'admin' && user?.role === 'staff';

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isAdmin, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
