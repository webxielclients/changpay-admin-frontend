import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { AUTH_ERRORS } from '@/constants/auth';


export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}


export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Extracts a user-friendly message from any thrown value.
 * Works with Error instances, API response objects, and plain strings.
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof (error as { message: unknown }).message === 'string'
  ) {
    return (error as { message: string }).message;
  }
  return AUTH_ERRORS.UNKNOWN_ERROR;
}

/**
 * Formats seconds into mm:ss for the OTP countdown timer.
 */
export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}