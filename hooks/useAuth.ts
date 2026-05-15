'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, useTempAuthStore } from '@/store/authStore';
import { authApi } from '@/lib/api/client';
import { AUTH_ROUTES } from '@/constants/auth';
import { getErrorMessage } from '@/lib/utils';
import type { LoginInput, RegisterInput } from '@/lib/validations/auth';

export function useAuth() {
  const router = useRouter();
  const { setLoading, setError, login, logout, clearError } = useAuthStore();
  const { setEmail: setTempEmail, clear: clearTempEmail } = useTempAuthStore();

  /**
   * POST /auth/login
   * On success stores token + minimal user, redirects to dashboard.
   */
  const handleLogin = useCallback(
    async (credentials: LoginInput) => {
      try {
        setLoading(true);
        clearError();
        const { token, user } = await authApi.login({
          email: credentials.email,
          password: credentials.password,
        });
        // Login returns only a token — store minimal user from credentials.
        // Replace with a /auth/me call if that endpoint becomes available.
        // Persist token to plain localStorage key as reliable fallback
        if (typeof window !== 'undefined') {
          localStorage.setItem('token', token);
        }
        // Use the real user data returned by the login response
        login(
          {
            id: user.id,
            email: user.email,
            is_admin: true,
            first_name: user.first_name ?? '',
            last_name: user.last_name ?? '',
            email_verified_at: user.email_verified_at,
            role_id: user.role_id,
            is_active: user.is_active,
          },
          token
        );
        router.push(AUTH_ROUTES.DASHBOARD);
      } catch (error) {
        setError(getErrorMessage(error));
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [login, router, setError, setLoading, clearError]
  );

  /**
   * POST /auth/register
   * On success stores email in temp store, redirects to OTP verify page.
   * Returns the API message so the page can show a toast.
   */
  const handleRegister = useCallback(
    async (data: RegisterInput): Promise<{ message: string }> => {
      try {
        setLoading(true);
        clearError();
        const { message } = await authApi.register({
          email: data.email,
          password: data.password,
          password_confirmation: data.confirmPassword,
        });
        // Keep email for the verify page
        setTempEmail(data.email);
        return { message };
      } catch (error) {
        setError(getErrorMessage(error));
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [setError, setLoading, setTempEmail, clearError]
  );


  const handleVerifyEmail = useCallback(
    async (email: string, otp: string): Promise<{ message: string }> => {
      try {
        setLoading(true);
        clearError();
        const { message } = await authApi.verifyEmail({ email, otp });
        clearTempEmail();
        return { message };
      } catch (error) {
        setError(getErrorMessage(error));
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [setError, setLoading, clearTempEmail, clearError]
  );

  /**
   * POST /auth/resend-verification
   * Resends the OTP to the given email.
   */
  const handleResendVerification = useCallback(
    async (email: string): Promise<{ message: string }> => {
      try {
        setLoading(true);
        clearError();
        const { message } = await authApi.resendVerification(email);
        return { message };
      } catch (error) {
        setError(getErrorMessage(error));
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [setError, setLoading, clearError]
  );

  /**
   * POST /auth/google
   * Receives the Google ID token from the client-side OAuth flow.
   * On success stores user + token, redirects to dashboard.
   */
  const handleGoogleAuth = useCallback(
    async (idToken: string) => {
      try {
        setLoading(true);
        clearError();
        const { user, message } = await authApi.googleAuth(idToken);
        // Google auth returns a user object but no separate token in the docs —
        // treat message as confirmation and redirect. Update if token is added.
        login(
          {
            id: user.id,
            email: user.email,
            is_admin: true,
            first_name: user.first_name,
            last_name: user.last_name,
          },
          '' // replace with token if the endpoint returns one
        );
        router.push(AUTH_ROUTES.DASHBOARD);
        return { message };
      } catch (error) {
        setError(getErrorMessage(error));
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [login, router, setError, setLoading, clearError]
  );

  /**
   * POST /auth/logout
   */
  const handleLogout = useCallback(async () => {
    try {
      const token = useAuthStore.getState().token;
      if (token) await authApi.logout(token);
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
      }
      logout();
      clearTempEmail();
      router.push(AUTH_ROUTES.LOGIN);
    }
  }, [logout, router, clearTempEmail]);

  return {
    handleLogin,
    handleRegister,
    handleVerifyEmail,
    handleResendVerification,
    handleGoogleAuth,
    handleLogout,
  };
}