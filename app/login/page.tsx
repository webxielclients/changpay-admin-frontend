'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/store/authStore';
import { loginSchema } from '@/lib/validations/auth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Checkbox } from '@/components/ui/Checkbox';
import { SocialLoginButtons } from '@/components/auth/SocialLoginButtons';
import { AUTH_ROUTES } from '@/constants/auth';
import type { LoginInput } from '@/lib/validations/auth';

export default function LoginPage() {
  const router = useRouter();
  const { handleLogin } = useAuth();
  const { isLoading, error } = useAuthStore();

  const [formData, setFormData] = useState<LoginInput>({
    email: '',
    password: '',
    rememberMe: false,
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});

    const validation = loginSchema.safeParse(formData);

    if (!validation.success) {
      const errors: Record<string, string> = {};
      validation.error.errors.forEach((err) => {
        if (err.path[0]) {
          errors[err.path[0] as string] = err.message;
        }
      });
      setFieldErrors(errors);
      return;
    }

    try {
      await handleLogin(formData);
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  const handleSocialLogin = (provider: 'google' | 'apple') => {
    console.log(`Initiating ${provider} login`);
    // Implement OAuth flow here
  };

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

      {/* Right Section - Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-[#F5F7F9]">
        <div className="bg-white rounded-3xl p-8 md:p-12 shadow-2xl w-full max-w-[480px]">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome Back
          </h1>
          <p className="text-gray-500 mb-8">
            Please enter your credentials to access your account
          </p>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="your.email@example.com"
              error={fieldErrors.email}
              disabled={isLoading}
              autoComplete="email"
            />

            <Input
              label="Password"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter your password"
              error={fieldErrors.password}
              disabled={isLoading}
              autoComplete="current-password"
            />

            <div className="flex items-center justify-between">
              <Checkbox
                name="rememberMe"
                checked={formData.rememberMe}
                onChange={handleChange}
                label="Remember me"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => router.push(AUTH_ROUTES.FORGOT_PASSWORD)}
                className="text-sm text-[#009F51] hover:text-[#008844] font-medium transition-colors"
                disabled={isLoading}
              >
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoading}
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
                'Sign In'
              )}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500">Or continue with</span>
            </div>
          </div>

          <SocialLoginButtons
            onGoogleLogin={() => handleSocialLogin('google')}
            onAppleLogin={() => handleSocialLogin('apple')}
          />

          <p className="mt-8 text-center text-sm text-gray-600">
            Don't have an account?{' '}
            <button
              type="button"
              onClick={() => router.push(AUTH_ROUTES.REGISTER)}
              className="text-[#009F51] hover:text-[#008844] font-semibold transition-colors"
              disabled={isLoading}
            >
              Sign up now
            </button>
          </p>

          <p className="mt-6 text-xs text-center text-gray-500">
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