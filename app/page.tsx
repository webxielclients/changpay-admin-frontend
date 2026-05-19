'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import Image from 'next/image';

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, _hasHydrated } = useAuthStore();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setTimedOut(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!_hasHydrated && !timedOut) return;
    if (isAuthenticated) {
      router.replace('/dashboard');
    } else {
      router.replace('/login');
    }
  }, [_hasHydrated, isAuthenticated, router, timedOut]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#012D32] via-[#012D32] to-[#012D32]">
      <div className="text-center">
        <Image src="/Group.svg" alt="Changpay Logo" width={80} height={80} className="mx-auto mb-6" />
        <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4" />
        <p className="text-white/80 text-lg">Loading...</p>
      </div>
    </div>
  );
}