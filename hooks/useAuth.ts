'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { normalizeUser, useAuthStore, useTempAuthStore } from '@/store/authStore';
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
        const result = await authApi.login({
          email: credentials.email,
          password: credentials.password,
        });
        if (result.requiresTwoFactor) {
          return { requiresTwoFactor: true as const, challengeToken: result.challengeToken, methods: result.methods };
        }
        const { token, user } = result;
        // Login returns only a token — store minimal user from credentials.
        // Replace with a /auth/me call if that endpoint becomes available.
        // Persist token to plain localStorage key as reliable fallback
        if (typeof window !== 'undefined') {
          localStorage.setItem('token', token);
        }
        // Use the real user data returned by the login response
        const normalized = normalizeUser(user);
        if (!normalized) throw new Error('Login response did not include a valid admin profile.');
        login(normalized, token);
        router.push(AUTH_ROUTES.DASHBOARD);
        return { requiresTwoFactor: false as const };
      } catch (error) {
        setError(getErrorMessage(error));
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [login, router, setError, setLoading, clearError]
  );

  const handleTwoFactorLogin = useCallback(
    async (challengeToken: string, method: 'email' | 'totp', code: string) => {
      try {
        setLoading(true);
        clearError();
        const result = await authApi.verifyTwoFactorLogin({ challenge_token: challengeToken, method, code });
        if (!result.complete || !result.token) {
          return { complete: false as const, remainingMethods: result.remainingMethods };
        }
        const { token, user } = result;
        const normalized = normalizeUser(user);
        if (!normalized) throw new Error('Two-factor response did not include a valid admin profile.');
        login(normalized, token);
        router.push(AUTH_ROUTES.DASHBOARD);
        return { complete: true as const };
      } catch (error) {
        setError(getErrorMessage(error));
        throw error;
      } finally { setLoading(false); }
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
        const normalized = normalizeUser(user);
        if (!normalized) throw new Error('Google login response did not include a valid admin profile.');
        login(normalized, ''); // replace with token if the endpoint returns one
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
    handleTwoFactorLogin,
    handleRegister,
    handleVerifyEmail,
    handleResendVerification,
    handleGoogleAuth,
    handleLogout,
  };
}
