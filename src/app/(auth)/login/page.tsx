'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import PinPad from '@/components/PinPad';

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = useCallback(async (pin: string) => {
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Login failed');
        setLoading(false);
        return;
      }

      router.push('/');
    } catch {
      setError('Connection error. Please try again.');
      setLoading(false);
    }
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-rp-black via-neutral-950 to-rp-black">
      {/* Logo */}
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-rp-red tracking-wide">RacingPoint</h1>
        <p className="text-rp-grey text-sm mt-1">eSports and Cafe</p>
      </div>

      {/* PIN Pad */}
      <PinPad onSubmit={handleSubmit} disabled={loading} error={error} />

      {/* Footer */}
      <p className="text-rp-grey/40 text-xs mt-12">Admin Dashboard</p>
    </div>
  );
}
