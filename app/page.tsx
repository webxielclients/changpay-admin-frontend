'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { AUTH_ROUTES } from '@/constants/auth';

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    // Check if user is authenticated
    if (isAuthenticated) {
      // Redirect to dashboard if logged in
      router.push(AUTH_ROUTES.DASHBOARD);
    } else {
      // Redirect to login if not authenticated
      router.push(AUTH_ROUTES.LOGIN);
    }
  }, [isAuthenticated, router]);

  // Show loading state while checking authentication
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-900 via-teal-800 to-teal-900">
      <div className="text-center">
        {/* Changpay Logo */}
        <div className="flex items-center justify-center space-x-2 mb-8">
          <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center">
            <div className="w-8 h-8 bg-teal-600 rounded"></div>
          </div>
          <span className="text-3xl font-bold text-white">Changpay</span>
        </div>

        {/* Loading Spinner */}
        <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
        
        <p className="text-white/80 text-lg">Loading your dashboard...</p>
      </div>
    </div>
  );
}