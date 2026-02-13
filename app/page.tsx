'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { AUTH_ROUTES } from '@/constants/auth';

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated) {
      router.push(AUTH_ROUTES.DASHBOARD);
    } else {
      router.push(AUTH_ROUTES.LOGIN);
    }
  }, [isAuthenticated, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#012D32] via-[#012D32] to-[#012D32]">
      <div className="text-center">
        <div className="flex items-center justify-center space-x-2 mb-8">
          <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center">
            <div className="w-8 h-8 bg-[#012D32]-600 rounded"></div>
          </div>
          <span className="text-3xl font-bold text-white">Changpay</span>
        </div>

        <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
        
        <p className="text-white/80 text-lg">...</p>
      </div>
    </div>
  );
}