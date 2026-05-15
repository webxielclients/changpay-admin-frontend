
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTempAuthStore } from '@/store/authStore';
import { AUTH_ROUTES } from '@/constants/auth';

export default function SetupPinPage() {
  const router = useRouter();
  const email = useTempAuthStore((state) => state.email);

  useEffect(() => {
    if (!email) {
      router.push(AUTH_ROUTES.LOGIN);
    } else {
      router.push('/dashboard');
    }
  }, [email, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-400">Redirecting...</p>
      </div>
    </div>
  );
}