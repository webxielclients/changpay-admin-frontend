// src/components/auth/AuthLayout.tsx
'use client';

import { ReactNode } from 'react';

interface AuthLayoutProps {
  children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-900 via-teal-800 to-teal-900 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 items-center">
        <div className="hidden lg:flex flex-col justify-center text-white space-y-6 px-12">
          <div className="flex items-center space-x-2 mb-8">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
              <div className="w-6 h-6 bg-teal-600 rounded" />
            </div>
            <span className="text-2xl font-bold">Changpay</span>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-12 h-64" />
          <h2 className="text-3xl font-bold leading-tight">
            One platform to manage conversions,
            <br />
            payouts, wallets, and compliance in real
            <br />
            time.
          </h2>
        </div>
        {children}
      </div>
    </div>
  );
}
