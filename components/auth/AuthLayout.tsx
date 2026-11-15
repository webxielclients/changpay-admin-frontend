'use client';

import { ReactNode } from 'react';
import Image from 'next/image';

interface AuthLayoutProps {
  children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#063b3e] p-4 lg:p-8">
      <div className="absolute inset-0 opacity-30 pointer-events-none" aria-hidden="true">
        <div className="absolute -left-24 -top-20 h-[120%] w-[42%] rotate-[28deg] bg-[#0b5455]" />
        <div className="absolute left-[22%] -top-24 h-[120%] w-[20%] rotate-[28deg] bg-[#022f33]" />
        <div className="absolute left-[34%] -bottom-32 h-[100%] w-[16%] rotate-[28deg] bg-[#0b5455]" />
      </div>
      <div className="relative grid w-full max-w-[940px] grid-cols-1 items-center gap-8 lg:grid-cols-[430px_480px] lg:gap-8">

        <div className="hidden w-full flex-col justify-center space-y-8 px-2 text-white lg:flex">
          <Image src="/Group.svg" alt="Changpay Logo" width={170} height={39} className="mb-1 object-contain object-left" style={{ width: '170px', height: '39px' }} />

          <div className="h-64 w-full max-w-[430px] rounded-[28px] bg-white" aria-hidden="true" />

          <h2 className="max-w-[430px] text-center text-2xl font-normal leading-tight xl:text-[25px]">
            One platform to manage conversions, payouts, wallets, and compliance in real time.
          </h2>

          <div className="flex items-center text-xs opacity-70">
            <span>© 2025 Changpay</span>
          </div>
        </div>

        {/* Mobile-only logo — shown above the form on small screens */}
        <div className="flex lg:hidden items-center space-x-2 self-start">
          <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center shrink-0">
            <span className="text-[#012D32] font-bold text-lg">C</span>
          </div>
          <span className="text-xl font-bold text-white">Changpay</span>
        </div>

        {/* Right Section — the form, centred and full-width on mobile */}
        <div className="w-full">
          {children}
        </div>

      </div>
    </div>
  );
}
