'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/store/authStore';
import { registerSchema, type RegisterInput } from '@/lib/validations/auth';
import { AUTH_ROUTES } from '@/constants/auth';
import { SocialLoginButtons } from '@/components/auth/SocialLoginButtons';
import { frontendConfig } from '@/config/env';

export default function RegisterPage() {
  const router = useRouter();
  const { handleRegister } = useAuth();
  const { isAuthenticated, isLoading, error } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated) router.replace('/dashboard');
  }, [isAuthenticated, router]);
  const [formData, setFormData] = useState<RegisterInput>({ registrationCode: '', email: '', password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [rememberDetails, setRememberDetails] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const update = (name: string, value: string) => {
    setFormData((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => ({ ...current, [name]: '' }));
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = registerSchema.safeParse(formData);
    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        if (issue.path[0]) errors[String(issue.path[0])] = issue.message;
      });
      setFieldErrors(errors);
      return;
    }
    try {
      const response = await handleRegister(formData);
      toast.success(response.message, { description: 'Please check your email for the 6-digit verification code.' });
      router.push(AUTH_ROUTES.VERIFY);
    } catch {
      // The shared auth store exposes the API error above the form.
    }
  };

  const inputClass = (field: string) => `w-full rounded-xl border bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-[#00a651] focus:ring-2 focus:ring-[#00a651]/15 ${fieldErrors[field] ? 'border-red-400' : 'border-gray-200'}`;

  return (
    <div className="mx-auto flex min-h-[640px] w-full max-w-[480px] flex-col rounded-[28px] bg-white px-8 py-10 shadow-2xl sm:px-12 sm:py-12">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-gray-900 sm:text-3xl">Create Your Account</h1>
          <p className="mt-2 text-xs text-gray-500 sm:text-sm">Please fill out this field to continue the registration</p>
        </div>
        {error && <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}
        <form onSubmit={submit} className="space-y-4">
          <label className="block text-xs font-medium text-gray-800">Admin registration code
            <input name="registrationCode" value={formData.registrationCode} onChange={(event) => update('registrationCode', event.target.value)} placeholder="CP-ADMIN-..." autoComplete="off" disabled={isLoading} className={`${inputClass('registrationCode')} mt-1.5`} />
            {fieldErrors.registrationCode && <span className="mt-1 block text-xs text-red-500">{fieldErrors.registrationCode}</span>}
          </label>
          <label className="block text-xs font-medium text-gray-800">Email
            <input name="email" type="email" value={formData.email} onChange={(event) => update('email', event.target.value)} placeholder="example@gmail.com" autoComplete="email" disabled={isLoading} className={`${inputClass('email')} mt-1.5`} />
            {fieldErrors.email && <span className="mt-1 block text-xs text-red-500">{fieldErrors.email}</span>}
          </label>
          <label className="block text-xs font-medium text-gray-800">Password
            <span className="relative mt-1.5 block"><input name="password" type={showPassword ? 'text' : 'password'} value={formData.password} onChange={(event) => update('password', event.target.value)} placeholder="Your Password" autoComplete="new-password" disabled={isLoading} className={`${inputClass('password')} pr-12`} /><button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></span>
            {fieldErrors.password && <span className="mt-1 block text-xs text-red-500">{fieldErrors.password}</span>}
          </label>
          <label className="block text-xs font-medium text-gray-800">Confirm Password
            <span className="relative mt-1.5 block"><input name="confirmPassword" type={showConfirm ? 'text' : 'password'} value={formData.confirmPassword} onChange={(event) => update('confirmPassword', event.target.value)} placeholder="Your Password" autoComplete="new-password" disabled={isLoading} className={`${inputClass('confirmPassword')} pr-12`} /><button type="button" aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'} onClick={() => setShowConfirm((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">{showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}</button></span>
            {fieldErrors.confirmPassword && <span className="mt-1 block text-xs text-red-500">{fieldErrors.confirmPassword}</span>}
          </label>
          <label className="flex items-center gap-2 pt-1 text-xs text-gray-700"><input type="checkbox" checked={rememberDetails} onChange={(event) => setRememberDetails(event.target.checked)} disabled={isLoading} className="h-4 w-4 rounded border-gray-300 accent-[#00a651]" />Remember device</label>
          <button type="submit" disabled={isLoading} className="w-full rounded-xl bg-[#00a651] py-3.5 text-sm font-medium text-white transition hover:bg-[#008f46] disabled:cursor-not-allowed disabled:opacity-50">{isLoading ? 'Creating account...' : 'Continue'}</button>
        </form>
        <SocialLoginButtons onGoogleLogin={() => undefined} onAppleLogin={() => undefined} />
        <p className="mt-6 text-center text-xs text-gray-500">Already have an account? <button type="button" onClick={() => router.push(AUTH_ROUTES.LOGIN)} className="font-semibold text-gray-900">Login now</button></p>
        <p className="mt-5 text-center text-[11px] text-gray-400">By continuing, you agree to ChangPay&apos;s <a href={frontendConfig.termsUrl} className="text-[#00a651]">Terms of Use</a> and <a href={frontendConfig.privacyUrl} className="text-[#00a651]">Privacy Policy</a>.</p>
    </div>
  );
}
