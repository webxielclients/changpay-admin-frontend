// src/store/authStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { clearAdminSessionToken, setAdminSessionToken } from '@/lib/auth/session';

export interface User {
  id: string | number;
  publicId?: string | null;
  email: string;
  is_admin?: boolean;
  first_name?: string | null;
  last_name?: string | null;
  phone_number?: string | null;
  email_verified_at?: string | null;
  role_id?: number | null;
  is_active?: boolean;
  last_login_at?: string | null;
  created_at?: string;
  updated_at?: string;
  google_id?: string | null;
  apple_id?: string | null;
  kyc_status?: string | null;
  kyb_status?: string | null;
  deleted_at?: string | null;
  changpay_id?: string | null;
  avatar_url?: string | null;
  permissions?: string[];
}

type UserPayload = Partial<User> & {
  id?: string | number | null;
  publicId?: string | null;
  public_id?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  avatarUrl?: string | null;
  emailVerifiedAt?: string | null;
  roleId?: number | null;
  isAdmin?: boolean;
  isActive?: boolean;
};

/** Keep the persisted store stable when API responses use camelCase resources. */
export function normalizeUser(payload: UserPayload | null | undefined): User | null {
  if (!payload || !payload.email) return null;
  const publicId = payload.publicId ?? payload.public_id ?? null;
  const id = payload.id ?? publicId;
  if (id == null) return null;

  return {
    ...payload,
    id,
    publicId,
    email: payload.email,
    first_name: payload.first_name ?? payload.firstName ?? null,
    last_name: payload.last_name ?? payload.lastName ?? null,
    avatar_url: payload.avatar_url ?? payload.avatarUrl ?? null,
    email_verified_at: payload.email_verified_at ?? payload.emailVerifiedAt ?? null,
    role_id: payload.role_id ?? payload.roleId ?? null,
    is_admin: payload.is_admin ?? payload.isAdmin,
    is_active: payload.is_active ?? payload.isActive,
  };
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  sessionExpiresAt: string | null;
  isLoading: boolean;
  error: string | null;
  _hasHydrated: boolean; // tracks whether persist has loaded from sessionStorage
}

interface AuthStore extends AuthState {
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setSessionExpiresAt: (value: string | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setAvatar: (url: string | null) => void;
  login: (user: User, token: string, sessionExpiresAt?: string | null) => void;
  logout: () => void;
  clearError: () => void;
  setHasHydrated: (val: boolean) => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      sessionExpiresAt: null,
      isLoading: false,
      error: null,
      _hasHydrated: false,

      setHasHydrated: (val) => set({ _hasHydrated: val }),

      setUser: (user) => {
        const normalized = normalizeUser(user);
        set({ user: normalized, isAuthenticated: !!normalized });
      },
      setToken: (token) => set({ token }),
      setSessionExpiresAt: (sessionExpiresAt) => set({ sessionExpiresAt }),
      setAvatar: (url) => set((state) => ({ user: state.user ? { ...state.user, avatar_url: url } : state.user })),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error, isLoading: false }),

      login: (user, token, sessionExpiresAt = null) => {
        const normalized = normalizeUser(user);
        setAdminSessionToken(token);
        set({
          user: normalized,
          token,
          isAuthenticated: !!normalized && !!token,
          sessionExpiresAt,
          isLoading: false,
          error: null,
        });
      },

      logout: () => {
        clearAdminSessionToken();
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          sessionExpiresAt: null,
          isLoading: false,
          error: null,
        });
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'changpay_admin_auth',
      storage: createJSONStorage(() => {
        if (typeof window === 'undefined') {
          return {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {},
          };
        }
        return localStorage;
      }),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
        sessionExpiresAt: state.sessionExpiresAt,
      }),
      merge: (persisted, current) => {
        const p = persisted as Partial<AuthState>;
        const token = p.token ?? null;
        return {
          ...current,
          user: normalizeUser(p.user as UserPayload | null),
          token,
          isAuthenticated: !!token,
          sessionExpiresAt: p.sessionExpiresAt ?? null,
        };
      },
      onRehydrateStorage: () => (state) => {
        // Mark hydration complete — this is the critical flag
        // Pages wait for this before deciding to redirect
        if (state) {
          state.setHasHydrated(true);
          // Keep the cross-tab token key in sync.
          if (state.token && typeof window !== 'undefined') {
            localStorage.setItem('token', state.token);
          }
        }
      },
    }
  )
);

// Temp store for register → verify email flow
interface TempAuthStore {
  email: string | null;
  setEmail: (email: string) => void;
  clear: () => void;
}

export const useTempAuthStore = create<TempAuthStore>((set) => ({
  email: null,
  setEmail: (email) => set({ email }),
  clear: () => set({ email: null }),
}));
