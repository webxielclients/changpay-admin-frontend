'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { authApi } from '@/lib/api/client';

function formatRemaining(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${remainder.toString().padStart(2, '0')}`;
}

export default function SessionFooter() {
  const router = useRouter();
  const { isAuthenticated, sessionExpiresAt, logout, setSessionExpiresAt } = useAuthStore();
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !sessionExpiresAt) {
      setRemaining(null);
      return;
    }

    const tick = () => {
      const seconds = Math.max(0, Math.ceil((Date.parse(sessionExpiresAt) - Date.now()) / 1000));
      setRemaining(seconds);
      if (seconds === 0) {
        logout();
        router.replace('/login');
      }
    };

    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [isAuthenticated, sessionExpiresAt, logout, router]);

  useEffect(() => {
    if (!isAuthenticated) return;

    let lastRefresh = 0;
    let refreshing = false;

    const refreshOnActivity = () => {
      const now = Date.now();
      if (refreshing || now - lastRefresh < 30_000) return;
      lastRefresh = now;
      refreshing = true;
      void authApi.refreshSession()
        .then(({ sessionExpiresAt: nextExpiry }) => {
          if (nextExpiry) setSessionExpiresAt(nextExpiry);
        })
        .catch(() => {
          // The normal 401 handler clears the session if the token has expired.
        })
        .finally(() => { refreshing = false; });
    };

    const events: (keyof WindowEventMap)[] = ['pointerdown', 'keydown', 'scroll', 'touchstart'];
    events.forEach((event) => window.addEventListener(event, refreshOnActivity, { passive: true }));
    return () => events.forEach((event) => window.removeEventListener(event, refreshOnActivity));
  }, [isAuthenticated, setSessionExpiresAt]);

  if (remaining === null) return null;

  return (
    <footer className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 px-4 py-1.5 text-center text-xs text-gray-500 backdrop-blur">
      Admin session expires in <span className={remaining <= 60 ? 'font-semibold text-red-600' : 'font-semibold text-gray-700'}>{formatRemaining(remaining)}</span>
    </footer>
  );
}
