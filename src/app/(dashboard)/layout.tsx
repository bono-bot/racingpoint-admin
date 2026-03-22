'use client';

import AdminLayout from '@/components/AdminLayout';
import { AuthProvider } from '@/components/AuthProvider';
import { useSessionExpiry } from '@/hooks/useSessionExpiry';

function SessionExpiryWatcher({ children }: { children: React.ReactNode }) {
  useSessionExpiry();
  return <>{children}</>;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <SessionExpiryWatcher>
        <AdminLayout>{children}</AdminLayout>
      </SessionExpiryWatcher>
    </AuthProvider>
  );
}
