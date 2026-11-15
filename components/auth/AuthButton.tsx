'use client';

import type { ButtonHTMLAttributes } from 'react';
import { Button } from '@/components/ui/Button';

export function AuthButton({ children, className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { isLoading?: boolean }) {
  return <Button {...props} className={`w-full ${className}`}>{children}</Button>;
}
