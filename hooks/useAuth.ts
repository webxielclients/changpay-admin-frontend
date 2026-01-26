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

  const handleLogin = useCallback(
    async (credentials: LoginInput) => {
      try {
        setLoading(true);
        clearError();

        const response = await authApi.login(credentials);

        if (response.success && response.data?.user && response.data?.token) {
          login(response.data.user, response.data.token);
          router.push(AUTH_ROUTES.DASHBOARD);
        } else {
          throw new Error(response.message || 'Login failed');
        }
      } catch (error) {
        const message = getErrorMessage(error);
        setError(message);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [login, router, setError, setLoading, clearError]
  );

  const handleRegister = useCallback(
    async (data: RegisterInput) => {
      try {
        setLoading(true);
        clearError();

        const response = await authApi.register({
          email: data.email,
          password: data.password,
        });

        if (response.success) {
          setTempEmail(data.email);
          router.push(AUTH_ROUTES.VERIFY);
        } else {
          throw new Error(response.message || 'Registration failed');
        }
      } catch (error) {
        const message = getErrorMessage(error);
        setError(message);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [router, setError, setLoading, setTempEmail, clearError]
  );

  const handleVerifyOTP = useCallback(
    async (email: string, otp: string) => {
      try {
        setLoading(true);
        clearError();

        const response = await authApi.verifyOTP({ email, otp });

        if (response.success) {
          router.push(AUTH_ROUTES.SETUP_PIN);
        } else {
          throw new Error(response.message || 'Verification failed');
        }
      } catch (error) {
        const message = getErrorMessage(error);
        setError(message);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [router, setError, setLoading, clearError]
  );

  const handleSetupPin = useCallback(
    async (email: string, pin: string) => {
      try {
        setLoading(true);
        clearError();

        const response = await authApi.setupPin({ email, pin });

        if (response.success && response.data?.user && response.data?.token) {
          login(response.data.user, response.data.token);
          clearTempEmail();
          router.push(AUTH_ROUTES.DASHBOARD);
        } else {
          throw new Error(response.message || 'PIN setup failed');
        }
      } catch (error) {
        const message = getErrorMessage(error);
        setError(message);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [login, router, setError, setLoading, clearTempEmail, clearError]
  );

  const handleLogout = useCallback(async () => {
    try {
      const token = useAuthStore.getState().token;
      if (token) {
        await authApi.logout(token);
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      logout();
      clearTempEmail();
      router.push(AUTH_ROUTES.LOGIN);
    }
  }, [logout, router, clearTempEmail]);

  return {
    handleLogin,
    handleRegister,
    handleVerifyOTP,
    handleSetupPin,
    handleLogout,
  };
}