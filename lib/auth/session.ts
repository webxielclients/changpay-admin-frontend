export const ADMIN_SESSION_TOKEN_KEY = 'token';

export function getAdminSessionToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(ADMIN_SESSION_TOKEN_KEY);
}

export function setAdminSessionToken(token: string): void {
  if (typeof window !== 'undefined') window.localStorage.setItem(ADMIN_SESSION_TOKEN_KEY, token);
}

export function clearAdminSessionToken(): void {
  if (typeof window !== 'undefined') window.localStorage.removeItem(ADMIN_SESSION_TOKEN_KEY);
}
