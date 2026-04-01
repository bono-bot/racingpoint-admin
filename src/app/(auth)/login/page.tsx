'use client';

import { Suspense, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import PinPad from '@/components/PinPad';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = useCallback(async (pin: string) => {
    setError(null);
    setLoading(true);

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10_000);

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!res.ok) {
        let message = 'Login failed';
        try {
          const data = await res.json();
          message = data.error || message;
        } catch { /* non-JSON response */ }
        setError(message);
        return;
      }

      const redirect = searchParams.get('redirect') || '/';
      router.push(redirect);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setError('Request timed out. Please try again.');
      } else {
        setError('Connection error. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [router, searchParams]);

  return <PinPad onSubmit={handleSubmit} disabled={loading} error={error} />;
}

export default function LoginPage() {
  const mainSiteUrl = process.env.NEXT_PUBLIC_CUSTOMER_APP_URL
    ?? (typeof window !== 'undefined'
      ? `${window.location.protocol}//${window.location.hostname}:3200`
      : '/');

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-rp-black via-neutral-950 to-rp-black">
      {/* Back to main site */}
      <a
        href={mainSiteUrl}
        className="absolute top-4 left-4 inline-flex items-center gap-1.5 text-sm text-rp-grey hover:text-white transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5" />
          <path d="m12 19-7-7 7-7" />
        </svg>
        Back to Racing Point
      </a>

      {/* Logo */}
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-rp-red tracking-wide">RacingPoint</h1>
        <p className="text-rp-grey text-sm mt-1">eSports and Cafe</p>
      </div>

      {/* PIN Pad */}
      <Suspense>
        <LoginForm />
      </Suspense>

      {/* Footer */}
      <p className="text-rp-grey/40 text-xs mt-12">Admin Dashboard</p>
    </div>
  );
}
