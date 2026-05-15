'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { AUTH_ROUTES } from '@/constants/auth';
import Image from 'next/image';

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthStore();


  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#012D32] via-[#012D32] to-[#012D32]">
      <div className="text-center">
        <Image src="/Group.svg" alt="Changpay Logo" width={80} height={80} className="mx-auto mb-6" />

        <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
        
        <p className="text-white/80 text-lg">...</p>
      </div>
    </div>
  );
}