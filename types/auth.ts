// src/types/auth.ts
export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: 'admin' | 'user' | 'super_admin';
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data?: {
    user?: User;
    token?: string;
    refreshToken?: string;
  };
  error?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  confirmPassword: string;
}

export interface VerifyOTPPayload {
  email: string;
  otp: string;
}

export interface SetupPinPayload {
  email: string;
  pin: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// src/constants/auth.ts
export const AUTH_CONSTANTS = {
  OTP_LENGTH: 6,
  PIN_LENGTH: 4,
  OTP_EXPIRY: 120, // 2 minutes in seconds
  MIN_PASSWORD_LENGTH: 8,
  MAX_PASSWORD_LENGTH: 128,
  TOKEN_KEY: 'changpay_token',
  REFRESH_TOKEN_KEY: 'changpay_refresh_token',
  USER_KEY: 'changpay_user',
} as const;

export const AUTH_ERRORS = {
  INVALID_EMAIL: 'Please enter a valid email address',
  EMAIL_REQUIRED: 'Email is required',
  PASSWORD_REQUIRED: 'Password is required',
  PASSWORD_TOO_SHORT: `Password must be at least ${AUTH_CONSTANTS.MIN_PASSWORD_LENGTH} characters`,
  PASSWORD_MISMATCH: 'Passwords do not match',
  INVALID_OTP: 'Please enter a valid OTP',
  INVALID_PIN: 'Please enter a valid PIN',
  NETWORK_ERROR: 'Network error. Please try again.',
  UNKNOWN_ERROR: 'An unexpected error occurred',
} as const;

export const AUTH_ROUTES = {
  LOGIN: '/login',
  REGISTER: '/register',
  VERIFY: '/verify',
  SETUP_PIN: '/setup-pin',
  DASHBOARD: '/dashboard',
  FORGOT_PASSWORD: '/forgot-password',
} as const;