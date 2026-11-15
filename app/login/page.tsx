'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/store/authStore';
import { loginSchema } from '@/lib/validations/auth';
import { Input } from '@/components/ui/Input';
import { SocialLoginButtons } from '@/components/auth/SocialLoginButtons';
import { AUTH_ROUTES } from '@/constants/auth';
import { AuthLayout } from '@/components/auth/AuthLayout';
import type { LoginInput } from '@/lib/validations/auth';
import { OTPInput } from '@/components/auth/OTPInput';
import { PasswordField } from '@/components/auth/PasswordField';

export default function LoginPage() {
  const router = useRouter();
  const { handleLogin, handleTwoFactorLogin } = useAuth();
  const { isLoading, error } = useAuthStore();

  const [formData, setFormData] = useState<LoginInput>({
    email: '',
    password: '',
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [twoFactorChallenge, setTwoFactorChallenge] = useState<{ token: string; methods: Array<'email' | 'totp'> } | null>(null);
  const [twoFactorMethod, setTwoFactorMethod] = useState<'email' | 'totp'>('totp');
  const [twoFactorCode, setTwoFactorCode] = useState<string[]>(Array(6).fill(''));

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
      validation.error.issues.forEach((err) => {
        if (err.path[0]) errors[err.path[0] as string] = err.message;
      });
      setFieldErrors(errors);
      return;
    }

    try {
      const result = await handleLogin(formData);
      if (result?.requiresTwoFactor && result.challengeToken) {
        const methods = result.methods ?? ['totp'];
        setTwoFactorChallenge({ token: result.challengeToken, methods });
        setTwoFactorMethod(methods[0] ?? 'email');
      }
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  const handleTwoFactorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!twoFactorChallenge || twoFactorCode.join('').length !== 6) return;
    try {
      const result = await handleTwoFactorLogin(twoFactorChallenge.token, twoFactorMethod, twoFactorCode.join(''));
      if (!result.complete) {
        const remaining = result.remainingMethods ?? [];
        setTwoFactorChallenge((current) => current ? { ...current, methods: remaining } : current);
        setTwoFactorMethod(remaining[0] ?? 'email');
        setTwoFactorCode(Array(6).fill(''));
      }
    } catch (error) {
      console.error('Two-factor login error:', error);
    }
  };

  const handleSocialLogin = (provider: 'google' | 'apple') => {
    console.log(`Initiating ${provider} login`);
  };

  return (
    <AuthLayout>
      <div className="bg-white rounded-3xl p-8 md:p-12 shadow-2xl w-full max-w-md mx-auto">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
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

        {twoFactorChallenge ? <form onSubmit={handleTwoFactorSubmit} className="space-y-7">
          <div className="text-center">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Enter 6 digit code</h1>
            <p className="text-sm text-gray-500">{twoFactorMethod === 'email' ? 'Enter the 6-digit verification code sent to your email' : 'Enter the 6-digit code from your authenticator app'}</p>
          </div>
          <div className="flex justify-center">
            <OTPInput length={6} value={twoFactorCode} onChange={setTwoFactorCode} disabled={isLoading} />
          </div>
          {twoFactorChallenge.methods.length > 1 && <p className="text-center text-xs text-gray-500">After this step, the remaining verification method will be required.</p>}
          <button type="submit" disabled={isLoading || twoFactorCode.join('').length !== 6} className="w-full bg-[#009F51] text-white font-semibold py-3.5 px-6 rounded-xl disabled:opacity-50">{isLoading ? 'Verifying...' : 'Login'}</button>
          <button type="button" onClick={() => setTwoFactorChallenge(null)} className="w-full text-sm text-gray-500">Back to sign in</button>
        </form> : <form onSubmit={handleSubmit} className="space-y-5">
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
            className="text-gray-900 placeholder-gray-400"
          />

          <PasswordField
            label="Password"
            name="password"
            value={formData.password}
            onChange={(value) => setFormData((current) => ({ ...current, password: value }))}
            placeholder="Enter your password"
            error={fieldErrors.password}
            disabled={isLoading}
            autoComplete="current-password"
          />

          <div className="flex items-center justify-end">
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
            ) : 'Sign In'}
          </button>
        </form>}

        <SocialLoginButtons
          onGoogleLogin={() => handleSocialLogin('google')}
          onAppleLogin={() => handleSocialLogin('apple')}
        />

        <p className="mt-8 text-center text-sm text-gray-600">
          Don&apos;t have an account?{' '}
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
          By continuing, you agree to Changpay&apos;s{' '}
          <a href="#" className="text-[#009F51] hover:underline">Terms of Use</a>{' '}and{' '}
          <a href="#" className="text-[#009F51] hover:underline">Privacy Policy</a>
        </p>
      </div>
    </AuthLayout>
  );
}
