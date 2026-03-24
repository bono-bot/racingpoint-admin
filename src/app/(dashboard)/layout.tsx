'use client';

import AdminLayout from '@/components/AdminLayout';
import { AuthProvider } from '@/components/AuthProvider';
import { ConnectionIndicator } from '@/components/ConnectionIndicator';
import { ConnectionProvider } from '@/contexts/ConnectionContext';
import { useSessionExpiry } from '@/hooks/useSessionExpiry';
import { SWRProvider } from '@/app/providers';

function SessionExpiryWatcher({ children }: { children: React.ReactNode }) {
  useSessionExpiry();
  return <>{children}</>;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <SWRProvider>
        <ConnectionProvider>
          <SessionExpiryWatcher>
            <AdminLayout>{children}</AdminLayout>
          </SessionExpiryWatcher>
          <ConnectionIndicator />
        </ConnectionProvider>
      </SWRProvider>
    </AuthProvider>
  );
}
