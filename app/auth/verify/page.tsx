'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Mail } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useTimer } from '@/hooks/useTimer';
import { useAuthStore, useTempAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';
import { OTPInput } from '@/components/auth/OTPInput';
import { AUTH_CONSTANTS, AUTH_ROUTES } from '@/constants/auth';
import { formatTime } from '@/lib/utils';
import { authApi } from '@/lib/api/client';

export default function VerifyPage() {
  const router = useRouter();
  const { handleVerifyOTP } = useAuth();
  const { isLoading, error } = useAuthStore();
  const email = useTempAuthStore((state) => state.email);

  const [otp, setOtp] = useState<string[]>(Array(AUTH_CONSTANTS.OTP_LENGTH).fill(''));
  const [canResend, setCanResend] = useState(false);

  const { timeLeft, reset } = useTimer({
    initialTime: AUTH_CONSTANTS.OTP_EXPIRY,
    onComplete: () => setCanResend(true),
  });

  useEffect(() => {
    if (!email) {
      router.push(AUTH_ROUTES.REGISTER);
    }
  }, [email, router]);

  const handleVerify = async () => {
    if (!email) return;

    const otpValue = otp.join('');
    if (otpValue.length !== AUTH_CONSTANTS.OTP_LENGTH) return;

    try {
      await handleVerifyOTP(email, otpValue);
    } catch (error) {
      console.error('Verification error:', error);
      setOtp(Array(AUTH_CONSTANTS.OTP_LENGTH).fill(''));
    }
  };

  const handleResend = async () => {
    if (!email || !canResend) return;

    try {
      await authApi.resendOTP(email);
      setCanResend(false);
      reset();
      setOtp(Array(AUTH_CONSTANTS.OTP_LENGTH).fill(''));
    } catch (error) {
      console.error('Resend error:', error);
    }
  };

  const isOTPComplete = otp.every((digit) => digit !== '');

  if (!email) {
    return null;
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Section - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#012D32] relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#012D32]/90 to-[#012D32]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.08),transparent)]" />
        
        <div className="relative z-10 flex flex-col justify-between p-12 text-white w-full">
          <div>
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                <span className="text-[#012D32] font-bold text-xl">C</span>
              </div>
              <span className="text-xl font-semibold">Changpay</span>
            </div>
          </div>

          <div className="max-w-md">
            <h2 className="text-4xl font-bold mb-4 leading-tight">
              One platform to manage conversions, payouts, wallets, and compliance in real time.
            </h2>
          </div>

          <div className="flex items-center text-sm opacity-70">
            <span>© 2025 Changpay</span>
          </div>
        </div>
      </div>

      {/* Right Section - Verify OTP Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-[#F5F7F9]">
        <div className="bg-white rounded-3xl p-8 md:p-12 shadow-2xl w-full max-w-[480px] text-center">
          <div className="w-16 h-16 bg-[#009F51]/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Mail className="w-8 h-8 text-[#009F51]" />
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Create Your Account
          </h1>
          <p className="text-gray-500 mb-2">
            We sent a {AUTH_CONSTANTS.OTP_LENGTH}-digit code to your email
          </p>
          <p className="text-gray-900 font-medium mb-8">{email}</p>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
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
                Processing...
              </span>
            ) : (
              'Login'
            )}
          </button>

          <div className="space-y-2">
            {!canResend && (
              <p className="text-sm text-gray-500">
                This code will expire in {formatTime(timeLeft)}
              </p>
            )}
            <p className="text-sm text-gray-600">
              Didn't receive code?{' '}
              <button
                onClick={handleResend}
                disabled={!canResend || isLoading}
                className="text-[#009F51] hover:text-[#008844] font-semibold transition-colors disabled:text-gray-400 disabled:cursor-not-allowed"
              >
                Resend link
              </button>
            </p>
          </div>

          <p className="mt-8 text-xs text-center text-gray-500">
            By continuing, you agree to Changpay's{' '}
            <a href="#" className="text-[#009F51] hover:underline">
              Terms of Use
            </a>{' '}
            and{' '}
            <a href="#" className="text-[#009F51] hover:underline">
              Privacy Policy
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}