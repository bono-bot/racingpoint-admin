'use client';

import { useContext } from 'react';
import { AuthContext } from '@/components/AuthProvider';
import type { AuthContextValue } from '@/components/AuthProvider';

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
