import type { AuthResponse } from '@/types/auth';
import { AUTH_ERRORS } from '@/constants/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

interface RequestOptions extends RequestInit {
  token?: string;
}

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const { token, ...fetchOptions } = options;

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    };

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        ...fetchOptions,
        headers,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({
          message: AUTH_ERRORS.NETWORK_ERROR,
        }));
        throw new Error(error.message || AUTH_ERRORS.UNKNOWN_ERROR);
      }

      return response.json();
    } catch (error) {
      if (error instanceof TypeError) {
        throw new Error(AUTH_ERRORS.NETWORK_ERROR);
      }
      throw error;
    }
  }

  async post<T>(
    endpoint: string,
    data?: unknown,
    options?: RequestOptions
  ): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
      ...options,
    });
  }

  async get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'GET',
      ...options,
    });
  }
}

export const apiClient = new ApiClient(API_URL);

// Auth API functions
export const authApi = {
  login: (credentials: { email: string; password: string; rememberMe?: boolean }) =>
    apiClient.post<AuthResponse>('/auth/login', credentials),

  register: (data: { email: string; password: string }) =>
    apiClient.post<AuthResponse>('/auth/register', data),

  verifyOTP: (data: { email: string; otp: string }) =>
    apiClient.post<AuthResponse>('/auth/verify', data),

  setupPin: (data: { email: string; pin: string }) =>
    apiClient.post<AuthResponse>('/auth/setup-pin', data),

  resendOTP: (email: string) =>
    apiClient.post<AuthResponse>('/auth/resend-otp', { email }),

  logout: (token: string) =>
    apiClient.post<AuthResponse>('/auth/logout', {}, { token }),
};