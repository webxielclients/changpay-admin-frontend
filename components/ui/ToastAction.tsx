'use client';

import { toast } from 'sonner';

export const ToastAction = {
  success: (message: string, description?: string) => toast.success(message, description ? { description } : undefined),
  error: (message: string, description?: string) => toast.error(message, description ? { description } : undefined),
  promise: <T,>(promise: Promise<T>, messages: { loading: string; success: string; error: string }) => toast.promise(promise, messages),
};

export function errorMessage(error: unknown, fallback = 'Something went wrong. Please try again.') {
  return error instanceof Error ? error.message : fallback;
}
