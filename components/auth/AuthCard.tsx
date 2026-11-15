import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function AuthCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('mx-auto w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl sm:p-10', className)}>
      {children}
    </div>
  );
}
