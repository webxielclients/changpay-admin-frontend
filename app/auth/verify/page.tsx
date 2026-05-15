'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Mail } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useTimer } from '@/hooks/useTimer';
import { useAuthStore, useTempAuthStore } from '@/store/authStore';
import { OTPInput } from '@/components/auth/OTPInput';
import { AUTH_CONSTANTS, AUTH_ROUTES } from '@/constants/auth';
import { formatTime } from '@/lib/utils';
import { AuthLayout } from '@/components/auth/AuthLayout';

export default function VerifyPage() {
  const router = useRouter();
  const { handleVerifyEmail, handleResendVerification } = useAuth();
  const { isLoading, error } = useAuthStore();
  const email = useTempAuthStore((state) => state.email);

  const [otp, setOtp] = useState<string[]>(Array(AUTH_CONSTANTS.OTP_LENGTH).fill(''));
  const [canResend, setCanResend] = useState(false);

  const { timeLeft, reset } = useTimer({
    initialTime: AUTH_CONSTANTS.OTP_EXPIRY,
    onComplete: () => setCanResend(true),
  });

  useEffect(() => {
    if (!email) router.push(AUTH_ROUTES.REGISTER);
  }, [email, router]);

  if (!email) return null;

  const isOTPComplete = otp.every((digit) => digit !== '');

  const handleVerify = async () => {
    const otpValue = otp.join('');
    if (otpValue.length !== AUTH_CONSTANTS.OTP_LENGTH) return;

    try {
      const { message } = await handleVerifyEmail(email, otpValue);
      toast.success(message, {
        description: 'You can now sign in to your account.',
        duration: 5000,
      });
      setTimeout(() => router.push(AUTH_ROUTES.LOGIN), 1500);
    } catch {
      // error shown in banner via store
      setOtp(Array(AUTH_CONSTANTS.OTP_LENGTH).fill(''));
    }
  };

  const handleResend = async () => {
    if (!canResend) return;
    try {
      const { message } = await handleResendVerification(email);
      toast.success(message);
      setCanResend(false);
      reset();
      setOtp(Array(AUTH_CONSTANTS.OTP_LENGTH).fill(''));
    } catch {
      // error shown in banner
    }
  };

  return (
    // <AuthLayout>
      <div className="bg-white rounded-3xl p-8 md:p-12 shadow-2xl w-full max-w-md mx-auto text-center">
        <div className="w-16 h-16 bg-[#009F51]/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <Mail className="w-8 h-8 text-[#009F51]" />
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">Verify Your Email</h1>
        <p className="text-gray-500 mb-2">
          We sent a {AUTH_CONSTANTS.OTP_LENGTH}-digit code to
        </p>
        <p className="text-gray-900 font-semibold mb-8">{email}</p>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-left">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="mb-6">
          <OTPInput
            length={AUTH_CONSTANTS.OTP_LENGTH}
            value={otp}
            onChange={setOtp}
            disabled={isLoading}
          />
        </div>

        <button
          onClick={handleVerify}
          disabled={!isOTPComplete || isLoading}
          className="w-full bg-[#009F51] hover:bg-[#008844] text-white font-semibold py-3.5 px-6 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#009F51]/20 mb-6"
        >
          {isLoading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Verifying...
            </span>
          ) : 'Verify Email'}
        </button>

        <div className="space-y-2">
          {!canResend && (
            <p className="text-sm text-gray-500">
              Code expires in <span className="font-semibold text-gray-900">{formatTime(timeLeft)}</span>
            </p>
          )}
          <p className="text-sm text-gray-600">
            Didn't receive the code?{' '}
            <button
              onClick={handleResend}
              disabled={!canResend || isLoading}
              className="text-[#009F51] hover:text-[#008844] font-semibold transition-colors disabled:text-gray-400 disabled:cursor-not-allowed"
            >
              Resend code
            </button>
          </p>
        </div>

        <p className="mt-8 text-xs text-center text-gray-500">
          By continuing, you agree to Changpay's{' '}
          <a href="#" className="text-[#009F51] hover:underline">Terms of Use</a>{' '}and{' '}
          <a href="#" className="text-[#009F51] hover:underline">Privacy Policy</a>
        </p>
      </div>
  );
}