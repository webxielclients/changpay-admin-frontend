// src/lib/validations/auth.ts
import { z } from 'zod';
import { AUTH_CONSTANTS, AUTH_ERRORS } from '@/constants/auth';

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, AUTH_ERRORS.EMAIL_REQUIRED)
    .email(AUTH_ERRORS.INVALID_EMAIL),
  password: z
    .string()
    .min(1, AUTH_ERRORS.PASSWORD_REQUIRED)
    .min(AUTH_CONSTANTS.MIN_PASSWORD_LENGTH, AUTH_ERRORS.PASSWORD_TOO_SHORT),
  rememberMe: z.boolean().optional(),
});

export const registerSchema = z
  .object({
    email: z
      .string()
      .min(1, AUTH_ERRORS.EMAIL_REQUIRED)
      .email(AUTH_ERRORS.INVALID_EMAIL),
    password: z
      .string()
      .min(1, AUTH_ERRORS.PASSWORD_REQUIRED)
      .min(AUTH_CONSTANTS.MIN_PASSWORD_LENGTH, AUTH_ERRORS.PASSWORD_TOO_SHORT)
      .max(AUTH_CONSTANTS.MAX_PASSWORD_LENGTH, 'Password is too long')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Password must contain at least one uppercase letter, one lowercase letter, and one number'
      ),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: AUTH_ERRORS.PASSWORD_MISMATCH,
    path: ['confirmPassword'],
  });

export const verifyOTPSchema = z.object({
  email: z.string().email(AUTH_ERRORS.INVALID_EMAIL),
  otp: z
    .string()
    .length(AUTH_CONSTANTS.OTP_LENGTH, AUTH_ERRORS.INVALID_OTP)
    .regex(/^\d+$/, AUTH_ERRORS.INVALID_OTP),
});

export const setupPinSchema = z.object({
  email: z.string().email(AUTH_ERRORS.INVALID_EMAIL),
  pin: z
    .string()
    .length(AUTH_CONSTANTS.PIN_LENGTH, AUTH_ERRORS.INVALID_PIN)
    .regex(/^\d+$/, AUTH_ERRORS.INVALID_PIN),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type VerifyOTPInput = z.infer<typeof verifyOTPSchema>;
export type SetupPinInput = z.infer<typeof setupPinSchema>;