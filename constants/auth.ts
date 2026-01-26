export const AUTH_CONSTANTS = {
  OTP_LENGTH: 6,
  PIN_LENGTH: 4,
  OTP_EXPIRY: 120,
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
  REGISTER: '/auth/register',
  VERIFY: '/auth/verify',
  SETUP_PIN: '/auth/setup-pin',
  DASHBOARD: '/dashboard',
  FORGOT_PASSWORD: '/forgot-password',
} as const;