// src/components/auth/AuthLayout.tsx
'use client';

import { ReactNode } from 'react';

interface AuthLayoutProps {
  children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-[#012D32] flex items-center justify-center p-4">
      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 items-center">
        {/* Left Section - Branding */}
        <div className="hidden lg:flex flex-col justify-center text-white space-y-6 px-12">
          <div className="flex items-center space-x-2 mb-8">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
              <span className="text-[#012D32] font-bold text-xl">C</span>
            </div>
            <span className="text-2xl font-bold">Changpay</span>
          </div>
          
          {/* WHITE BOX - This is what you want to keep */}
          <div className="bg-white rounded-3xl p-12 h-64 flex items-center justify-center">
            {/* You can add any content/illustration here */}
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-4 bg-[#012D32]/10 rounded-full flex items-center justify-center">
                <svg className="w-10 h-10 text-[#012D32]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <p className="text-[#012D32] font-medium text-lg">Secure Authentication</p>
            </div>
          </div>
          
          <h2 className="text-3xl font-bold leading-tight">
            One platform to manage conversions,
            <br />
            payouts, wallets, and compliance in real
            <br />
            time.
          </h2>
          
          <div className="mt-8 flex items-center text-sm opacity-70">
            <span>© 2025 Changpay</span>
          </div>
        </div>
        
        {/* Right Section - Form (passed as children) */}
        {children}
      </div>
    </div>
  );
}