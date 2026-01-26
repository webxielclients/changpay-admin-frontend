'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Lock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore, useTempAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';
import { PinInput } from '@/components/auth/PinInput';
import { AUTH_CONSTANTS, AUTH_ROUTES } from '@/constants/auth';

export default function SetupPinPage() {
  const router = useRouter();
  const { handleSetupPin } = useAuth();
  const { isLoading, error } = useAuthStore();
  const email = useTempAuthStore((state) => state.email);

  const [pin, setPin] = useState<string[]>(Array(AUTH_CONSTANTS.PIN_LENGTH).fill(''));
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (!email) {
      router.push(AUTH_ROUTES.REGISTER);
    }
  }, [email, router]);

  useEffect(() => {
    const isPinComplete = pin.every((digit) => digit !== '');
    if (isPinComplete && !isLoading && !showSuccess) {
      handleSubmit();
    }
  }, [pin, isLoading, showSuccess]);

  const handleSubmit = async () => {
    if (!email) return;

    const pinValue = pin.join('');
    if (pinValue.length !== AUTH_CONSTANTS.PIN_LENGTH) return;

    try {
      setShowSuccess(true);
      await handleSetupPin(email, pinValue);
    } catch (error) {
      console.error('PIN setup error:', error);
      setPin(Array(AUTH_CONSTANTS.PIN_LENGTH).fill(''));
      setShowSuccess(false);
    }
  };

  if (!email) {
    return null;
  }

  if (showSuccess) {
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

        {/* Right Section - Success Message */}
        <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-[#F5F7F9]">
          <div className="bg-white rounded-3xl p-8 md:p-12 shadow-2xl w-full max-w-[480px] text-center">
            <div className="relative mb-6">
              <div className="w-24 h-24 bg-[#009F51]/10 rounded-full flex items-center justify-center mx-auto">
                <div className="w-20 h-20 bg-[#009F51]/20 rounded-full flex items-center justify-center">
                  <svg
                    className="w-12 h-12 text-[#009F51]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-24 h-24 border-4 border-[#009F51] rounded-full animate-ping opacity-20" />
              </div>
            </div>

            <h1 className="text-3xl font-bold text-gray-900 mb-3">
              PIN created successfully
            </h1>
            <p className="text-gray-500 mb-8">
              You will be directed to the homepage
            </p>

            <div className="flex justify-center">
              <div className="w-12 h-12 border-4 border-[#009F51] border-t-transparent rounded-full animate-spin" />
            </div>
          </div>
        </div>
      </div>
    );
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

      {/* Right Section - PIN Setup Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-[#F5F7F9]">
        <div className="bg-white rounded-3xl p-8 md:p-12 shadow-2xl w-full max-w-[480px] text-center">
          <div className="w-16 h-16 bg-[#009F51]/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock className="w-8 h-8 text-[#009F51]" />
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Set a PIN
          </h1>
          <p className="text-gray-500 mb-8">
            Use this PIN every time to authorize a transaction into your wallet.
            Keep it secure. Only you should know it.
          </p>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="mb-8">
            <PinInput
              length={AUTH_CONSTANTS.PIN_LENGTH}
              value={pin}
              onChange={setPin}
              disabled={isLoading}
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={pin.some((digit) => digit === '') || isLoading}
            className="w-full bg-[#009F51] hover:bg-[#008844] text-white font-semibold py-3.5 px-6 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#009F51]/20"
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
              'Continue'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}