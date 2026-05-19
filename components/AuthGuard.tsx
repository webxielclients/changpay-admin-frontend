'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { AUTH_ROUTES } from '@/constants/auth';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, _hasHydrated } = useAuthStore();
  const [timedOut, setTimedOut] = useState(false);

  // Safety net: if hydration takes more than 1 second something is wrong.
  // Treat it as unauthenticated and go to login.
  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), 1000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!_hasHydrated && !timedOut) return;
    if (!isAuthenticated) {
      router.push(AUTH_ROUTES.LOGIN);
    }
  }, [_hasHydrated, timedOut, isAuthenticated, router]);

  // Not yet hydrated and not timed out — show brief spinner
  if (!_hasHydrated && !timedOut) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return <>{children}</>;
}