'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/store/authStore';
import { registerSchema } from '@/lib/validations/auth';
import { Input } from '@/components/ui/Input';
import { Checkbox } from '@/components/ui/Checkbox';
import { SocialLoginButtons } from '@/components/auth/SocialLoginButtons';
import { AUTH_ROUTES } from '@/constants/auth';
import { AuthLayout } from '@/components/auth/AuthLayout';
import type { RegisterInput } from '@/lib/validations/auth';

export default function RegisterPage() {
  const router = useRouter();
  const { handleRegister } = useAuth();
  const { isLoading, error } = useAuthStore();

  const [formData, setFormData] = useState<RegisterInput>({
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [rememberDetails, setRememberDetails] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});

    const validation = registerSchema.safeParse(formData);

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
      await handleRegister(formData);
    } catch (error) {
      console.error('Registration error:', error);
    }
  };

  const handleSocialLogin = (provider: 'google' | 'apple') => {
    console.log(`Initiating ${provider} registration`);
    // Implement OAuth flow here
  };

  return (
    <AuthLayout>
      <div className="bg-white rounded-3xl p-8 md:p-12 shadow-2xl w-full max-w-md mx-auto">
        <div className="max-w-md mx-auto">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
            Create Your Account
          </h1>
          <p className="text-gray-500 mb-8">
            Please fill in this form to complete the registration
          </p>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="space-y-5">
            <Input
              label="Email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="example@gmail.com"
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
              placeholder="Create a strong password"
              error={fieldErrors.password}
              disabled={isLoading}
              autoComplete="new-password"
              helperText="Must be at least 8 characters with uppercase, lowercase, and number"
            />

            <Input
              label="Confirm Password"
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Re-enter your password"
              error={fieldErrors.confirmPassword}
              disabled={isLoading}
              autoComplete="new-password"
            />

            <Checkbox
              checked={rememberDetails}
              onChange={(e) => setRememberDetails(e.target.checked)}
              label="Remember details"
              disabled={isLoading}
            />

            <button
              onClick={handleSubmit}
              type="button"
              disabled={isLoading}
              className="w-full bg-[#012D32] hover:bg-[#011a1d] text-white font-semibold py-3.5 px-6 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
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

          <p className="mt-6 text-center text-sm text-gray-600">
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => router.push(AUTH_ROUTES.LOGIN)}
              className="text-[#012D32] hover:text-[#011a1d] font-semibold transition-colors"
              disabled={isLoading}
            >
              Sign in now
            </button>
          </p>

          <p className="mt-4 text-xs text-center text-gray-500">
            By continuing, you agree to Changpay's{' '}
            <a href="#" className="text-[#012D32] hover:underline">
              Terms of Use
            </a>{' '}
            and{' '}
            <a href="#" className="text-[#012D32] hover:underline">
              Privacy Policy
            </a>
          </p>
        </div>
      </div>
    </AuthLayout>
  );
}