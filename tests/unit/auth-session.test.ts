import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authApi } from '@/lib/api/client';
import { normalizeUser } from '@/store/authStore';
import { isProtectedRoute, isPublicRoute } from '@/lib/auth/route-policy';
import { ADMIN_SESSION_TOKEN_KEY, clearAdminSessionToken, getAdminSessionToken, setAdminSessionToken } from '@/lib/auth/session';

function createStorage() {
  const values = new Map<string, string>();
  return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key) };
}

describe('admin authentication session', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'window', { configurable: true, value: { localStorage: createStorage() } });
  });

  it('uses one admin session token key for set, read and clear', () => {
    expect(ADMIN_SESSION_TOKEN_KEY).toBe('token');
    expect(getAdminSessionToken()).toBeNull();
    setAdminSessionToken('admin-token');
    expect(getAdminSessionToken()).toBe('admin-token');
    clearAdminSessionToken();
    expect(getAdminSessionToken()).toBeNull();
  });

  it('uses shared browser storage so a second admin tab keeps the session', () => {
    const sharedStorage = createStorage();
    Object.defineProperty(globalThis, 'window', { configurable: true, value: { localStorage: sharedStorage } });
    setAdminSessionToken('shared-admin-token');
    expect(getAdminSessionToken()).toBe('shared-admin-token');
    expect(sharedStorage.getItem(ADMIN_SESSION_TOKEN_KEY)).toBe('shared-admin-token');
  });

  it('classifies authentication routes explicitly', () => {
    expect(isPublicRoute('/login')).toBe(true);
    expect(isPublicRoute('/auth/register')).toBe(true);
    expect(isProtectedRoute('/dashboard')).toBe(true);
    expect(isProtectedRoute('/dashboard/users/opaque-id')).toBe(true);
    expect(isProtectedRoute('/login')).toBe(false);
  });

  it('uses the explicit login token when validating the profile', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ status: true, message: 'Authenticated', data: { id: 'admin-public-id', email: 'admin@example.com', firstName: 'Admin', lastName: 'User' } }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    await authApi.me('fresh-login-token');
    expect(fetchMock).toHaveBeenCalledWith('/api/proxy/auth/me', expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer fresh-login-token' }) }));
    fetchMock.mockRestore();
  });

  it('does not send a remember-me field to the backend', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      status: true,
      message: 'Login successful',
      data: {
        publicId: 'admin-public-id',
        email: 'admin@example.com',
        token: 'issued-token',
        sessionExpiresAt: '2030-01-01T00:15:00+00:00',
      },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));

    await authApi.login({ email: 'admin@example.com', password: 'password' });
    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(String(options.body))).toEqual({ email: 'admin@example.com', password: 'password' });
    fetchMock.mockRestore();
  });

  it('accepts the backend publicId profile without requiring an internal id', () => {
    const user = normalizeUser({ publicId: 'admin-public-id', email: 'admin@example.com', firstName: 'Admin' });
    expect(user?.id).toBe('admin-public-id');
    expect(user?.publicId).toBe('admin-public-id');
  });
});
