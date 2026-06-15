import type { User } from '@/store/authStore';
import { useAuthStore } from '@/store/authStore';

const BASE_URL = '/api/proxy';


interface ApiErrorResponse {
  status: false;
  success: false;
  message: string;
  errors?: Record<string, string[]>;
}

// ─── Core fetch helper ────────────────────────────────────────────────────────

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  token?: string | null
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // Handle 401 — clear auth and redirect to login
  if (response.status === 401) {
    useAuthStore.getState().logout();
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    throw new Error('Session expired. Please log in again.');
  }

  const text = await response.text();
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    if (!response.ok) {
      throw new Error(text || `Request failed (${response.status})`);
    }
    throw new Error(`Unexpected response format (${response.status})`);
  }

  if (!response.ok) {
    const err = json as ApiErrorResponse;
    if (err?.errors) {
      const firstKey = Object.keys(err.errors)[0];
      const firstMsg = err.errors[firstKey];
      throw new Error(Array.isArray(firstMsg) ? firstMsg[0] : String(firstMsg));
    }
    throw new Error(err?.message || `Request failed (${response.status})`);
  }

  return json as T;
}

// Authenticated request — always reads from Zustand in-memory store
// Falls back to raw localStorage key set during login
function authedRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const storeToken = useAuthStore.getState().token;
  const localToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const token = storeToken ?? localToken;
  return request<T>(endpoint, options, token);
}

// ─── Auth types ───────────────────────────────────────────────────────────────

interface LoginApiResponse {
  status: boolean;
  message: string;
  data: {
    id: number;
    first_name: string | null;
    last_name: string | null;
    email: string;
    email_verified_at: string | null;
    role_id: number | null;
    is_active: boolean;
    last_login_at: string | null;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
    google_id: string | null;
    token: string;
  };
}

interface RegisterApiResponse {
  status: boolean;
  message: string;
  data: User;
}

interface VerifiedUser {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  email_verified_at: string | null;
  role_id: number | null;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  google_id: string | null;
}

// ─── Auth API ─────────────────────────────────────────────────────────────────

export const authApi = {
  login: async (credentials: { email: string; password: string }) => {
    const res = await request<LoginApiResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    if (!res.status) throw new Error(res.message || 'Login failed');
    const token = res.data.token;
    if (!token) throw new Error('Login response did not include a token');
    return { token, user: res.data, message: res.message };
  },

  register: async (data: { email: string; password: string; password_confirmation: string }) => {
    const res = await request<RegisterApiResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.status) throw new Error(res.message || 'Registration failed');
    return { user: res.data, message: res.message };
  },

  verifyEmail: async (data: { email: string; otp: string }) => {
    const res = await request<{ status: boolean; message: string; data: VerifiedUser }>(
      '/auth/verify-email',
      { method: 'POST', body: JSON.stringify(data) }
    );
    if (!res.status) throw new Error(res.message || 'Email verification failed');
    return { user: res.data, message: res.message };
  },

  resendVerification: async (email: string) => {
    const res = await request<{ status: boolean; message: string; data: { email: string | null } }>(
      '/auth/resend-verification',
      { method: 'POST', body: JSON.stringify({ email }) }
    );
    if (!res.status) throw new Error(res.message || 'Failed to resend verification code');
    return { message: res.message };
  },

  googleAuth: async (idToken: string) => {
    const res = await request<{ status: boolean; message: string; data: VerifiedUser }>(
      '/auth/google',
      { method: 'POST', body: JSON.stringify({ token: idToken }) }
    );
    if (!res.status) throw new Error(res.message || 'Google authentication failed');
    return { user: res.data, message: res.message };
  },

  logout: (token: string) =>
    request<{ status: boolean; message: string }>(
      '/auth/logout',
      { method: 'POST' },
      token
    ),
};

// ─── User Management types ────────────────────────────────────────────────────

// List endpoint returns snake_case; detail endpoint returns camelCase.
// The page casts accordingly — see user-detail-page.tsx.
export interface AdminUserRecord {
  last_login_at: string;
  id: number;
  first_name: string;
  last_name: string;
  phone_number: string | null;
  dob: string | null;
  country: string | null;
  state: string | null;
  city: string | null;
  address: string | null;
  email: string;
  email_verified_at: string | null;
  created_at: string;
  updated_at: string;
  google_id: string | null;
  apple_id: string | null;
  kyc_status: string | null;
  kyb_status: string | null;
  deleted_at: string | null;
  changpay_id: string | null;
  is_active: boolean;
  // camelCase variants returned by GET /users/{id} and toggle-status
  firstName?: string;
  lastName?: string;
  phoneNumber?: string | null;
  dateOfBirth?: string | null;
  changpayId?: string | null;
  kycStatus?: string | null;
  kybStatus?: string | null;
  isActive?: boolean;
  emailVerified?: boolean;
  createdAt?: string | null;
}

export interface PaginatedResponse<T> {
  current_page: number;
  data: T[];
  first_page_url: string;
  from: number;
  last_page: number;
  last_page_url: string;
  links: { url: string | null; label: string; active: boolean }[];
  next_page_url: string | null;
  path: string;
  per_page: number;
  prev_page_url: string | null;
  to: number;
  total: number;
}

export interface MetaPaginatedResponse<T> {
  data: T[];
  links: {
    first: string | null;
    last: string | null;
    prev: string | null;
    next: string | null;
  };
  meta: {
    current_page: number;
    from: number | null;
    last_page: number;
    links: { url: string | null; label: string; page: number | null; active: boolean }[];
    path: string;
    per_page: number;
    to: number | null;
    total: number;
  };
}

export interface AdminNote {
  id: number;
  user_id: number;
  admin_id: number;
  note: string;
  created_at: string;
  updated_at: string;
}

// ─── Users API ────────────────────────────────────────────────────────────────

export const usersApi = {
  getUsers: (params?: {
    search?: string;
    kyc_status?: string;
    is_active?: boolean;
    per_page?: number;
    page?: number;
  }) => {
    const entries = Object.entries(params ?? {})
      .filter(([, v]) => v != null)
      .map(([k, v]) => [k, String(v)]) as [string, string][];
    const query = entries.length ? '?' + new URLSearchParams(entries).toString() : '';
    return authedRequest<{ status: boolean; message: string; data: PaginatedResponse<AdminUserRecord> }>(
      `/users${query}`
    );
  },

  getUser: (id: number) =>
    authedRequest<{ status: boolean; message: string; data: AdminUserRecord }>(`/users/${id}`),

  toggleStatus: (id: number) =>
    authedRequest<{ status: boolean; message: string; data: AdminUserRecord }>(
      `/users/${id}/toggle-status`,
      { method: 'POST' }
    ),

  getNotes: (id: number, page = 1) =>
    authedRequest<{ status: boolean; message: string; data: PaginatedResponse<AdminNote> }>(
      `/users/${id}/notes?page=${page}`
    ),

  addNote: (id: number, note: string) =>
    authedRequest<{ status: boolean; message: string; data: AdminNote }>(
      `/users/${id}/notes`,
      { method: 'POST', body: JSON.stringify({ note }) }
    ),

  getTransactions: (
    userId: number,
    params?: {
      currency?: 'USD' | 'NGN' | 'YAN';
      type?: 'deposit' | 'withdrawal' | 'transfer';
      status?: string;
      search?: string;
      per_page?: number;
      page?: number;
    }
  ) => {
    const entries = Object.entries(params ?? {})
      .filter(([, v]) => v != null)
      .map(([k, v]) => [k, String(v)]) as [string, string][];
    const query = entries.length ? '?' + new URLSearchParams(entries).toString() : '';
    return authedRequest<{ status: boolean; message: string; data: MetaPaginatedResponse<UserTransactionItem> }>(
      `/users/${userId}/transactions${query}`
    );
  },
};

export interface UserTransactionItem {
  id: number | string;
  type: string;
  category?: string;
  amount: string | number;
  currency: string;
  status: string;
  reference?: string;
  channel?: string;
  fee?: string;
  created_at?: string;
  createdAt?: string;
  dateTime?: string;
  risk?: string;
}

// ─── Dashboard types ──────────────────────────────────────────────────────────

export interface CurrencyBalance {
  count: number;
  total_balance: number;
  last_period_balance: number;
  change_percent: number;
  change_direction: 'up' | 'down';
}

export interface FxExposureRate {
  from_currency: string;
  to_currency: string;
  rate: string;
}

export interface DashboardOverviewData {
  users: {
    total: number;
    active: number;
    verified: number;
    new_in_period: number;
    change_percent: number;
    change_direction: 'up' | 'down';
  };
  by_currency: {
    USD: CurrencyBalance;
    NGN: CurrencyBalance;
    YAN: CurrencyBalance;
  };
  alerts: { failed_transactions: number; fraud_alerts: number };
  pending_actions: {
    kyc_approvals: number;
    failed_payouts: number;
    flagged_transactions: number;
    open_disputes: number;
    open_tickets: number;
  };
  fx_exposure: FxExposureRate[];
  fx_exposure_summary: { USD: string; NGN: string; YAN: string };
}

export interface ChartDataPoint {
  id: number;
  user_id: number;
  wallet_id: number;
  type: string;
  amount: string;
  currency: string;
  status: string;
  reference: string;
  provider: string;
  provider_reference: string;
  description: string;
  metadata: unknown[];
  created_at: string;
  updated_at: string;
  fee: string;
  idempotency_key: string;
  completed_at: string;
  category: string;
}

export interface ChartData {
  interval: string;
  date_from: string;
  date_to: string;
  total_volume: number;
  total_count: string;
  data: ChartDataPoint[];
}

export interface RecentTransaction {
  id: string;
  sourceType: string;
  sourceId: number;
  client: {
    name: string;
    changpayId: string | null;
    avatar: string | null;
  };
  type: string;
  channel: string;
  amount: number;
  currency: string;
  status: string;
  dateTime: string;
  risk: string;
}

// ─── Dashboard API ────────────────────────────────────────────────────────────

export const dashboardApi = {
  getOverview: (params?: { date_from?: string; date_to?: string; interval?: string }) => {
    const entries = Object.entries(params ?? {})
      .filter(([, v]) => v != null)
      .map(([k, v]) => [k, String(v)]) as [string, string][];
    const query = entries.length ? '?' + new URLSearchParams(entries).toString() : '';
    return authedRequest<{ status: boolean; message: string; data: DashboardOverviewData }>(
      `/dashboard${query}`
    );
  },

  getChart: (params?: {
    date_from?: string;
    date_to?: string;
    interval?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  }) => {
    const entries = Object.entries(params ?? {})
      .filter(([, v]) => v != null)
      .map(([k, v]) => [k, String(v)]) as [string, string][];
    const query = entries.length ? '?' + new URLSearchParams(entries).toString() : '';
    return authedRequest<{ status: boolean; message: string; data: ChartData }>(
      `/dashboard/chart${query}`
    );
  },

  getRecentTransactions: (limit?: number) => {
    const query = limit ? `?limit=${limit}` : '';
    return authedRequest<{ status: boolean; message: string; data: RecentTransaction[] }>(
      `/dashboard/recent-transactions${query}`
    );
  },
};

// ─── FX Engine types ──────────────────────────────────────────────────────────

export interface ConversionRate {
  id: number;
  type: 'conversion';
  pair: string;
  from_currency: string;
  to_currency: string;
  rate: string;
  buy_rate?: string;
  sell_rate?: string;
  is_active: boolean;
  is_manually_overridden?: boolean;
  updated_at: string;
}

export interface SpreadConfig {
  id: number;
  pair: string;
  fromCurrency: string;
  toCurrency: string;
  baseSpread: number;
  dynamicSpread: number;
  totalSpread: number;
  minSpread: number;
  maxSpread: number;
  isActive: boolean;
  updatedAt: string;
}

export interface CryptoRateMarkup {
  id: number;
  cryptoCurrency: string;
  ratePercentage: string;
  isActive: boolean;
  updatedAt: string;
}

export interface FxOverrideResult {
  id: number;
  pair: string;
  fromCurrency: string;
  toCurrency: string;
  rate: string;
  buyRate: string;
  sellRate: string;
  spreadPercent: number;
  source: string;
  isActive: boolean;
  isManuallyOverridden: boolean;
  isDerived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CryptoRate {
  id: number;
  type: 'crypto';
  pair: string;
  crypto_currency: string;
  rate_percentage: string;
  is_active: boolean;
  updated_at: string;
}

export interface FxOverviewSummary {
  total_conversion_pairs: number;
  active_conversion_pairs: number;
  total_crypto_rates: number;
  active_crypto_rates: number;
}

export interface FxOverviewData {
  conversion_rates: ConversionRate[];
  crypto_rates: CryptoRate[];
  summary: FxOverviewSummary;
}

// ─── FX API ───────────────────────────────────────────────────────────────────

export const fxApi = {
  getOverview: () =>
    authedRequest<{ status: boolean; message: string; data: FxOverviewData }>('/fx/overview'),

  getConversionRates: () =>
    authedRequest<{ status: boolean; message: string; data: ConversionRate[] }>('/conversion-rates'),

  getSpreads: () =>
    authedRequest<{ status: boolean; message: string; data: SpreadConfig[] }>('/fx/spreads'),

  getCryptoRateMarkups: () =>
    authedRequest<{ status: boolean; message: string; data: CryptoRateMarkup[] }>('/crypto-rates'),

  applyOverride: (body: { from_currency: string; to_currency: string; buy_rate: number; sell_rate: number; reason: string }) =>
    authedRequest<{ status: boolean; message: string; data: FxOverrideResult }>('/fx/override', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  releaseOverride: (rateId: number) =>
    authedRequest<{ status: boolean; message: string; data: FxOverrideResult }>(`/fx/override/${rateId}`, {
      method: 'DELETE',
    }),
};

// ─── Wallet types ─────────────────────────────────────────────────────────────

export interface WalletRecord {
  id: string;
  currency: 'USD' | 'NGN' | 'YAN';
  balance: string;
  availableBalance: string;
  isActive: boolean;
  isLocked: boolean;
  isVerified: boolean;
  user: {
    firstName: string;
    lastName: string;
    email: string;
    changpayId: string | null;
    avatar: string | null;
  } | null;
  lastActivityAt: string | null;
  createdAt: string;
}

export interface WalletStats {
  total_wallets: number;
  active_wallets: number;
  locked_wallets: number;
  by_currency: {
    USD: { count: number; total_balance: string };
    NGN: { count: number; total_balance: string };
    YAN: { count: number; total_balance: string };
  };
  today: {
    transactions_count: number;
    topups_total: Record<string, number>;
    conversions_total: Record<string, number>;
  };
  recent_activity: {
    action: 'credit' | 'debit';
    amount: string;
    currency: string;
    label: string;
    walletId: string;
    user: string;
    reference: string;
    createdAt: string;
  }[];
}

export interface CurrencyWalletData {
  stats: {
    total_wallets: number;
    total_balance: string | number | null;
    active_wallets: number;
    locked_wallets: number;
  };
  wallets: MetaPaginatedResponse<WalletRecord>;
}

export interface TopupTransaction {
  id: string | number;
  reference: string;
  amount: string;
  currency: string;
  status: string;
  provider: string;
  createdAt: string;
  user?: { firstName: string; lastName: string; email: string; changpayId: string | null; avatar: string | null } | null;
  wallet?: { id: string; currency: string } | null;
}

export interface SwapTransaction {
  id: string | number;
  reference: string;
  fromCurrency: string;
  toCurrency: string;
  fromAmount: string;
  toAmount: string;
  rate: string;
  status: string;
  createdAt: string;
  user?: { firstName: string; lastName: string; email: string; changpayId: string | null; avatar: string | null } | null;
}

export interface LedgerEntry {
  action: 'debit' | 'credit' | 'hold' | 'release';
  amount: string;
  balanceBefore: string;
  balanceAfter: string;
  wallet: {
    id: string;
    currency: string;
    user: { firstName: string; lastName: string };
  };
  transaction: {
    reference: string;
    type: string;
    status: string;
  };
  createdAt: string;
}

// ─── Wallet API ───────────────────────────────────────────────────────────────

export const walletApi = {
  getStats: () =>
    authedRequest<{ status: boolean; message: string; data: WalletStats }>('/wallets/stats'),

  getWallets: (params?: {
    currency?: 'USD' | 'NGN' | 'YAN';
    is_active?: boolean;
    is_locked?: boolean;
    per_page?: number;
    page?: number;
    search?: string;
  }) => {
    const entries = Object.entries(params ?? {})
      .filter(([, v]) => v != null)
      .map(([k, v]) => [k, String(v)]) as [string, string][];
    const query = entries.length ? '?' + new URLSearchParams(entries).toString() : '';
    return authedRequest<{ status: boolean; message: string; data: PaginatedResponse<WalletRecord> }>(
      `/wallets${query}`
    );
  },

  getWalletsByCurrency: (
    currency: 'USD' | 'NGN' | 'YAN',
    params?: { is_locked?: boolean; per_page?: number; page?: number; search?: string }
  ) => {
    const entries = Object.entries(params ?? {})
      .filter(([, v]) => v != null)
      .map(([k, v]) => [k, String(v)]) as [string, string][];
    const query = entries.length ? '?' + new URLSearchParams(entries).toString() : '';
    return authedRequest<{ status: boolean; message: string; data: CurrencyWalletData }>(
      `/wallets/currency/${currency}${query}`
    );
  },

  toggleLock: (walletId: string) =>
    authedRequest<{ status: boolean; message: string; data: WalletRecord }>(
      `/wallets/${walletId}/toggle-lock`,
      { method: 'POST' }
    ),

  getLedger: (params?: { action?: string; date_from?: string; date_to?: string; page?: number; per_page?: number; search?: string; wallet_id?: string }) => {
    const entries = Object.entries(params ?? {})
      .filter(([, v]) => v != null)
      .map(([k, v]) => [k, String(v)]) as [string, string][];
    const query = entries.length ? '?' + new URLSearchParams(entries).toString() : '';
    return authedRequest<{ status: boolean; message: string; data: MetaPaginatedResponse<LedgerEntry> | null }>(`/wallets/ledger${query}`);
  },

  getTopups: (params?: { currency?: string; date_from?: string; date_to?: string; per_page?: number; provider?: string; search?: string; status?: string; page?: number }) => {
    const entries = Object.entries(params ?? {})
      .filter(([, v]) => v != null)
      .map(([k, v]) => [k, String(v)]) as [string, string][];
    const query = entries.length ? '?' + new URLSearchParams(entries).toString() : '';
    return authedRequest<{ status: boolean; message: string; data: MetaPaginatedResponse<TopupTransaction> | null }>(`/wallets/topups${query}`);
  },

  getSwaps: (params?: { currency?: string; date_from?: string; date_to?: string; from_currency?: string; to_currency?: string; per_page?: number; search?: string; status?: string; page?: number }) => {
    const entries = Object.entries(params ?? {})
      .filter(([, v]) => v != null)
      .map(([k, v]) => [k, String(v)]) as [string, string][];
    const query = entries.length ? '?' + new URLSearchParams(entries).toString() : '';
    return authedRequest<{ status: boolean; message: string; data: MetaPaginatedResponse<SwapTransaction> | null }>(`/wallets/swaps${query}`);
  },

  getReconciliation: () =>
    authedRequest<{ status: boolean; message: string; data: ReconciliationStatus }>('/wallets/reconciliation'),

  runReconciliation: () =>
    authedRequest<{ status: boolean; message: string; data: ReconciliationStatus }>(
      '/wallets/reconciliation/run',
      { method: 'POST' }
    ),
};

export interface ReconciliationStatus {
  is_reconciled: boolean;
  total_wallets_checked: number;
  discrepancies_count: number;
  discrepancies: unknown[];
  checked_at: string;
  auto_job: {
    schedule: string;
    schedule_cron: string;
    last_run_at: string;
    last_status: string;
    last_triggered_by: string;
    next_run_at: string;
  };
}

// ─── Roles types ──────────────────────────────────────────────────────────────

export interface Role {
  id: number;
  name: string;
  slug: string;
  description: string;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface RoleAdminUser {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  email_verified_at: string | null;
  role_id: number | null;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  google_id: string | null;
}

// ─── Roles API ────────────────────────────────────────────────────────────────

export const rolesApi = {
  getRoles: () =>
    authedRequest<{ status: boolean; message: string; data: Role[] }>('/roles'),

  getPermissions: () =>
    authedRequest<{ status: boolean; message: string; data: string[] }>('/roles/permissions'),

  getAdmins: (page = 1) =>
    authedRequest<{ status: boolean; message: string; data: PaginatedResponse<RoleAdminUser> }>(
      `/roles/admins?page=${page}`
    ),

  createRole: (data: { name: string; description: string; permissions?: number[] }) =>
    authedRequest<{ status: boolean; message: string; data: Role }>('/roles', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateRole: (id: number, data: { name: string; description: string; permissions?: number[] }) =>
    authedRequest<{ status: boolean; message: string; data: Role }>(`/roles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteRole: (id: number) =>
    authedRequest<{ status: boolean; message: string; data: null }>(`/roles/${id}`, {
      method: 'DELETE',
    }),

  assignRole: (adminId: number, roleId: number) =>
    authedRequest<{ status: boolean; message: string; data: RoleAdminUser }>(
      `/roles/admins/${adminId}/assign-role`,
      { method: 'POST', body: JSON.stringify({ role_id: roleId }) }
    ),
};

// ─── Banks & Payouts types ────────────────────────────────────────────────────

export interface ChineseBank {
  id: number;
  name: string;
  code: string;
  iconUrl: string | null;
  isActive: boolean;
}

export interface PaymentProviderStat {
  provider: string;
  total_accounts: string;
  active_accounts: string;
  total_transactions: number;
  completed_transactions: number;
  success_rate: number;
}

export interface PayoutTransaction {
  id: number;
  sourceType: string;
  sourceId: number;
  reference: string;
  timestamp: string;
  amount: string;
  fee: string;
  currency: string;
  status: string;
  provider: string;
  user: { id: number; firstName: string; lastName: string; email: string; changpayId: string | null } | null;
  bank: { code: string | null; name: string | null } | null;
  account: { number: string | null; name: string | null } | null;
  completedAt: string | null;
}

export interface HandshakeRecord {
  id: number;
  provider: string;
  status: string;
  responseTime: number | null;
  message: string | null;
  timestamp: string;
}

export interface PayoutStats {
  total: string;
  completed: string;
  pending: string;
  failed: string;
  total_amount: string;
}

// ─── Banks & Payouts API ──────────────────────────────────────────────────────

export const banksApi = {
  // ── Chinese banks ──

  /** GET /chinese-banks — all Chinese banks for PayToChina */
  getChineseBanks: () =>
    authedRequest<{ status: boolean; message: string; data: ChineseBank[] }>('/chinese-banks'),

  /** POST /chinese-banks — add a new Chinese bank */
  addChineseBank: (data: { name: string; code: string; is_active?: boolean }) =>
    authedRequest<{ status: boolean; message: string; data: ChineseBank }>('/chinese-banks', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /** PUT /chinese-banks/{id} — update a Chinese bank */
  updateChineseBank: (id: number, data: { name: string; code: string; is_active?: boolean }) =>
    authedRequest<{ status: boolean; message: string; data: ChineseBank }>(`/chinese-banks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  /** DELETE /chinese-banks/{id} — soft-delete (sets is_active = false) */
  deactivateChineseBank: (id: number) =>
    authedRequest<{ status: boolean; message: string; data: null }>(`/chinese-banks/${id}`, {
      method: 'DELETE',
    }),

  // ── Payment providers & bank stats ──

  /** GET /banks/providers — stats per provider (Paystack, Paga, Fincra, Bridge) */
  getProviderStats: () =>
    authedRequest<{ status: boolean; message: string; data: PaymentProviderStat[] }>('/banks/providers'),

  /** GET /banks/stats — DVA account counts grouped by bank name and provider */
  getBankStats: () =>
    authedRequest<{ status: boolean; message: string; data: unknown[] }>('/banks/stats'),

  // ── Payout transactions ──

  /** GET /banks/payouts — paginated withdrawal/payout transactions */
  getPayouts: (params?: {
    currency?: string;
    status?: string;
    provider?: string;
    search?: string;
    date_from?: string;
    date_to?: string;
    per_page?: number;
    page?: number;
  }) => {
    const entries = Object.entries(params ?? {})
      .filter(([, v]) => v != null && v !== '')
      .map(([k, v]) => [k, String(v)]) as [string, string][];
    const query = entries.length ? '?' + new URLSearchParams(entries).toString() : '';
    return authedRequest<{ status: boolean; message: string; data: PaginatedResponse<PayoutTransaction> | null }>(
      `/banks/payouts${query}`
    );
  },

  /** GET /banks/payouts/stats — aggregate payout stats */
  getPayoutStats: () =>
    authedRequest<{ status: boolean; message: string; data: PayoutStats }>('/banks/payouts/stats'),

  /** GET /banks/handshakes — bank health-check / handshake log */
  getHandshakes: (params?: { provider?: string; status?: string; date_from?: string; date_to?: string; per_page?: number }) => {
    const entries = Object.entries(params ?? {})
      .filter(([, v]) => v != null && v !== '')
      .map(([k, v]) => [k, String(v)]) as [string, string][];
    const query = entries.length ? '?' + new URLSearchParams(entries).toString() : '';
    return authedRequest<{ status: boolean; message: string; data: HandshakeRecord[] | null }>(`/banks/handshakes${query}`);
  },
};

// ─── KYC/KYB types ────────────────────────────────────────────────────────────

export interface VerificationUser {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string | null;
  changpayId: string | null;
}

export interface KYCVerification {
  id: number;
  type: 'kyc';
  status: 'pending' | 'approved' | 'rejected' | 'not_started';
  documents: unknown[];
  verificationData: unknown[];
  rejectionReason: string | null;
  verifiedAt: string | null;
  submittedAt: string | null;
  user: VerificationUser;
}

export interface KYBDirector {
  id: number;
  name: string;
  email: string;
  phoneNumber: string | null;
  address: string | null;
}

export interface KYBVerification {
  id: number;
  type: 'kyb';
  status: 'pending' | 'approved' | 'rejected' | 'not_started';
  businessName: string;
  businessType: string;
  businessNature: string;
  registrationNumber: string | null;
  registrationDate: string | null;
  address: string | null;
  country: string | null;
  state: string | null;
  documents: unknown[];
  verificationData: unknown[];
  rejectionReason: string | null;
  verifiedAt: string | null;
  submittedAt: string | null;
  user: VerificationUser;
  directors: KYBDirector[];
}

export type AnyVerification = KYCVerification | KYBVerification;

export interface VerificationStats {
  kyc: { total: number; pending: number; approved: number; rejected: number };
  kyb: { total: number; pending: number; approved: number; rejected: number };
}

// ─── KYC/KYB API ─────────────────────────────────────────────────────────────

export const kycApi = {
  /** GET /verifications — unified paginated list of all KYC + KYB */
  getAll: (params?: {
    type?: 'kyc' | 'kyb';
    status?: string;
    search?: string;
    date_from?: string;
    date_to?: string;
    page?: number;
    per_page?: number;
  }) => {
    const entries = Object.entries(params ?? {})
      .filter(([, v]) => v != null && v !== '')
      .map(([k, v]) => [k, String(v)]) as [string, string][];
    const query = entries.length ? '?' + new URLSearchParams(entries).toString() : '';
    return authedRequest<{ status: boolean; message: string; data: PaginatedResponse<AnyVerification> | null }>(
      `/verifications${query}`
    );
  },

  /** GET /verifications/stats */
  getStats: () =>
    authedRequest<{ status: boolean; message: string; data: VerificationStats }>(
      '/verifications/stats'
    ),

  /** GET /verifications/kyc/{id} */
  getKYCDetail: (id: number) =>
    authedRequest<{ status: boolean; message: string; data: KYCVerification }>(
      `/verifications/kyc/${id}`
    ),

  /** GET /verifications/kyb/{id} */
  getKYBDetail: (id: number) =>
    authedRequest<{ status: boolean; message: string; data: KYBVerification }>(
      `/verifications/kyb/${id}`
    ),

  /** GET /kyb/pending */
  getPendingKYB: () =>
    authedRequest<{ status: boolean; message: string; data: KYBVerification[] | null }>(
      '/kyb/pending'
    ),

  /** POST /kyb/{id}/approve */
  approveKYB: (id: number) =>
    authedRequest<{ status: boolean; message: string; data: KYBVerification }>(
      `/kyb/${id}/approve`,
      { method: 'POST' }
    ),

  /** POST /kyb/{id}/reject — body: { reason } */
  rejectKYB: (id: number, reason: string) =>
    authedRequest<{ status: boolean; message: string; data: KYBVerification }>(
      `/kyb/${id}/reject`,
      { method: 'POST', body: JSON.stringify({ reason }) }
    ),

  /** POST /kyb/{id}/request-resubmit — body: { reason } */
  requestResubmit: (id: number, reason: string) =>
    authedRequest<{ status: boolean; message: string; data: KYBVerification }>(
      `/kyb/${id}/request-resubmit`,
      { method: 'POST', body: JSON.stringify({ reason }) }
    ),

  /** POST /kyc/{kycId}/approve */
  approveKYC: (kycId: number) =>
    authedRequest<{ status: boolean; message: string; data: KYCVerification }>(
      `/kyc/${kycId}/approve`,
      { method: 'POST' }
    ),

  /** POST /kyc/{kycId}/reject — body: { reason } */
  rejectKYC: (kycId: number, reason: string) =>
    authedRequest<{ status: boolean; message: string; data: KYCVerification }>(
      `/kyc/${kycId}/reject`,
      { method: 'POST', body: JSON.stringify({ reason }) }
    ),
};

// ─── Promotions types ─────────────────────────────────────────────────────────

export interface PromotionCreator {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string | null;
  changpayId: string | null;
}

export interface Promotion {
  id: number;
  title: string;
  description: string | null;
  type: string;
  status: string;
  code: string | null;
  discountValue: string;
  minOrderAmount: string | null;
  maxDiscount: string | null;
  targetAudience: string | null;
  bannerImage: string | null;
  startDate: string | null;
  endDate: string | null;
  usageCount: number;
  usageLimit: number | null;
  redemptions: number;
  revenue: number;
  createdAt: string;
  creator: PromotionCreator | null;
}

export interface PromotionStats {
  total: number;
  active: number;
  draft: number;
  expired: number;
  paused: number;
  total_discount_value: number;
  active_rate: number;
}

export type CreatePromotionPayload = {
  title: string;
  description?: string;
  type: string;
  discount_value: number;
  min_order_amount?: number;
  max_discount?: number;
  target_audience?: string;
  start_date: string;
  end_date: string;
  usage_limit?: number;
  banner_image?: File;
};

// ─── Promotions API ───────────────────────────────────────────────────────────

export const promotionsApi = {
  /** GET /promotions — paginated list, filterable by status, type, search, date range */
  getAll: (params?: {
    status?: string;
    type?: string;
    search?: string;
    date_from?: string;
    date_to?: string;
    page?: number;
    per_page?: number;
  }) => {
    const entries = Object.entries(params ?? {})
      .filter(([, v]) => v != null && v !== '')
      .map(([k, v]) => [k, String(v)]) as [string, string][];
    const query = entries.length ? '?' + new URLSearchParams(entries).toString() : '';
    return authedRequest<{ status: boolean; message: string; data: PaginatedResponse<Promotion> | null }>(
      `/promotions${query}`
    );
  },

  /** GET /promotions/stats */
  getStats: () =>
    authedRequest<{ status: boolean; message: string; data: PromotionStats }>(
      '/promotions/stats'
    ),

  /** GET /promotions/{id} */
  getOne: (id: number) =>
    authedRequest<{ status: boolean; message: string; data: Promotion }>(
      `/promotions/${id}`
    ),

  /**
   * POST /promotions — multipart/form-data (supports banner_image file upload)
   * We build FormData here so the file is sent correctly.
   */
  create: (payload: CreatePromotionPayload) => {
    const stored = localStorage.getItem('changpay-auth');
    const parsed = stored ? (JSON.parse(stored) as { state?: { token?: string } }) : null;
    const storeToken = useAuthStore.getState().token;
    const token = storeToken ?? parsed?.state?.token ?? localStorage.getItem('token') ?? '';

    const form = new FormData();
    Object.entries(payload).forEach(([k, v]) => {
      if (v == null) return;
      if (v instanceof File) form.append(k, v);
      else form.append(k, String(v));
    });

    return fetch(`${BASE_URL}/promotions`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
        // Note: do NOT set Content-Type for multipart — browser sets it with boundary
      },
      body: form,
    }).then(async (res) => {
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || `Request failed (${res.status})`);
      return json as { status: boolean; message: string; data: Promotion };
    });
  },

  /**
   * PUT /promotions/{id} — multipart/form-data
   */
  update: (id: number, payload: Partial<CreatePromotionPayload>) => {
    const storeToken = useAuthStore.getState().token;
    const token = storeToken ?? localStorage.getItem('token') ?? '';

    const form = new FormData();
    Object.entries(payload).forEach(([k, v]) => {
      if (v == null) return;
      if (v instanceof File) form.append(k, v);
      else form.append(k, String(v));
    });

    return fetch(`${BASE_URL}/promotions/${id}`, {
      method: 'PUT',
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
      body: form,
    }).then(async (res) => {
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || `Request failed (${res.status})`);
      return json as { status: boolean; message: string; data: Promotion };
    });
  },

  /** DELETE /promotions/{id} */
  delete: (id: number) =>
    authedRequest<{ status: boolean; message: string; data: null }>(
      `/promotions/${id}`,
      { method: 'DELETE' }
    ),
};

// ─── Roles & Permissions types ────────────────────────────────────────────────

export interface Permission {
  id: number;
  module: string;
  action: string;
}

export interface RoleRecord {
  id: number;
  name: string;
  slug: string;
  description: string;
  isSystem: boolean;
  permissionsCount: number;
  adminsCount: number;
  permissions: Permission[];
}

export interface AdminUserRecord2 {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  isActive: boolean;
  lastLoginAt: string | null;
  role: RoleRecord | null;
  createdAt: string;
}

// ─── Roles API ────────────────────────────────────────────────────────────────

export const rolesApi2 = {
  /** GET /roles — all roles with permission and user counts */
  getRoles: () =>
    authedRequest<{ status: boolean; message: string; data: RoleRecord[] }>('/roles'),

  /** POST /roles — create a role */
  createRole: (data: { name: string; description: string; permissions: number[] }) =>
    authedRequest<{ status: boolean; message: string; data: RoleRecord }>('/roles', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /** GET /roles/permissions — all available permissions grouped by module */
  getPermissions: () =>
    authedRequest<{ status: boolean; message: string; data: Permission[] }>('/roles/permissions'),

  /** GET /roles/admins — paginated admin users with assigned roles */
  getAdmins: (params?: { search?: string; role?: string; page?: number }) => {
    const entries = Object.entries(params ?? {})
      .filter(([, v]) => v != null && v !== '')
      .map(([k, v]) => [k, String(v)]) as [string, string][];
    const query = entries.length ? '?' + new URLSearchParams(entries).toString() : '';
    return authedRequest<{ status: boolean; message: string; data: PaginatedResponse<AdminUserRecord2> | null }>(
      `/roles/admins${query}`
    );
  },

  /** GET /roles/{id} — single role details */
  getRole: (id: number) =>
    authedRequest<{ status: boolean; message: string; data: RoleRecord }>(`/roles/${id}`),

  /** PUT /roles/{id} — update a role */
  updateRole: (id: number, data: { name: string; description: string; permissions: number[] }) =>
    authedRequest<{ status: boolean; message: string; data: RoleRecord }>(`/roles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  /** DELETE /roles/{id} — permanently delete (system roles cannot be deleted) */
  deleteRole: (id: number) =>
    authedRequest<{ status: boolean; message: string; data: null }>(`/roles/${id}`, {
      method: 'DELETE',
    }),

  /** POST /roles/admins/{id}/assign-role — assign a role to an admin user */
  assignRole: (adminId: number, roleId: number) =>
    authedRequest<{ status: boolean; message: string; data: AdminUserRecord2 }>(
      `/roles/admins/${adminId}/assign-role`,
      { method: 'POST', body: JSON.stringify({ role_id: roleId }) }
    ),
};

// ─── Support & Disputes types ─────────────────────────────────────────────────

export interface TicketResponse {
  message: string;
  fromAdmin: boolean;
  createdAt: string;
}

export interface SupportTicket {
  id: number;
  subject: string;
  message: string;
  category: string | null;
  priority: string;
  status: string;
  closedAt: string | null;
  createdAt: string;
  responses: TicketResponse[];
  // user info may be nested depending on backend
  user?: { id: number; firstName: string; lastName: string; email: string; changpayId: string | null } | null;
}

export interface TicketStats {
  total: number;
  open: number;
  in_progress: number;
  resolved: number;
  closed: number;
}

export interface Dispute {
  id: number;
  type: string;
  subject: string;
  description: string;
  status: string;
  resolution: string | null;
  resolvedAt: string | null;
  createdAt: string;
  user?: { id: number; firstName: string; lastName: string; email: string; changpayId: string | null } | null;
}

export interface DisputeStats {
  total: number;
  open: number;
  under_review: number;
  resolved: number;
  rejected: number;
}

// ─── Support API ──────────────────────────────────────────────────────────────

export const supportApi = {
  // ── Tickets ──

  /** GET /support/tickets — filterable by status, category, priority, search, date range */
  getTickets: (params?: {
    status?: string;
    category?: string;
    priority?: string;
    search?: string;
    date_from?: string;
    date_to?: string;
    page?: number;
    per_page?: number;
  }) => {
    const entries = Object.entries(params ?? {})
      .filter(([, v]) => v != null && v !== '')
      .map(([k, v]) => [k, String(v)]) as [string, string][];
    const query = entries.length ? '?' + new URLSearchParams(entries).toString() : '';
    return authedRequest<{ status: boolean; message: string; data: PaginatedResponse<SupportTicket> | null }>(
      `/support/tickets${query}`
    );
  },

  /** GET /support/tickets/stats */
  getTicketStats: () =>
    authedRequest<{ status: boolean; message: string; data: TicketStats }>(
      '/support/tickets/stats'
    ),

  /** GET /support/tickets/{id} — full ticket with conversation thread */
  getTicket: (id: number) =>
    authedRequest<{ status: boolean; message: string; data: SupportTicket }>(
      `/support/tickets/${id}`
    ),

  /** POST /support/tickets/{id}/respond — body: { message } */
  respondToTicket: (id: number, message: string) =>
    authedRequest<{ status: boolean; message: string; data: TicketResponse }>(
      `/support/tickets/${id}/respond`,
      { method: 'POST', body: JSON.stringify({ message }) }
    ),

  /** PATCH /support/tickets/{id}/status — body: { status } */
  updateTicketStatus: (id: number, status: string) =>
    authedRequest<{ status: boolean; message: string; data: SupportTicket }>(
      `/support/tickets/${id}/status`,
      { method: 'PATCH', body: JSON.stringify({ status }) }
    ),

  // ── Disputes ──

  /** GET /support/disputes — filterable by status, type, search, date range */
  getDisputes: (params?: {
    status?: string;
    type?: string;
    search?: string;
    date_from?: string;
    date_to?: string;
    page?: number;
    per_page?: number;
  }) => {
    const entries = Object.entries(params ?? {})
      .filter(([, v]) => v != null && v !== '')
      .map(([k, v]) => [k, String(v)]) as [string, string][];
    const query = entries.length ? '?' + new URLSearchParams(entries).toString() : '';
    return authedRequest<{ status: boolean; message: string; data: PaginatedResponse<Dispute> | null }>(
      `/support/disputes${query}`
    );
  },

  /** GET /support/disputes/stats */
  getDisputeStats: () =>
    authedRequest<{ status: boolean; message: string; data: DisputeStats }>(
      '/support/disputes/stats'
    ),

  /** GET /support/disputes/{id} */
  getDispute: (id: number) =>
    authedRequest<{ status: boolean; message: string; data: Dispute }>(
      `/support/disputes/${id}`
    ),

  /** POST /support/disputes/{id}/resolve — body: { status: 'resolved'|'rejected', resolution } */
  resolveDispute: (id: number, status: 'resolved' | 'rejected', resolution: string) =>
    authedRequest<{ status: boolean; message: string; data: Dispute }>(
      `/support/disputes/${id}/resolve`,
      { method: 'POST', body: JSON.stringify({ status, resolution }) }
    ),
};

// ─── Transactions types ───────────────────────────────────────────────────────

export interface Transaction {
  id: number;
  reference: string;
  type: string;
  category: string;
  status: string;
  amount: string;
  fee: string;
  currency: string;
  description: string | null;
  completedAt: string | null;
  createdAt: string;
  // user/wallet info may be present on detail endpoint
  user?: { id: number; firstName: string; lastName: string; email: string; changpayId: string | null } | null;
  wallet?: { id: number; currency: string; uid: string } | null;
}

export interface TransactionStats {
  total: number;
  completed: number;
  pending: number;
  failed: number;
}

export interface SellCryptoTransaction {
  reference: number;
  id: number;
  status: string;
  cryptoCurrency: string;
  cryptoNetwork: string;
  cryptoAmount: string;
  fiatCurrency: string;
  fiatAmount: string;
  rate: string;
  fee: string;
  destinationType: string;
  targetCurrency: string;
  targetAmount: string;
  depositAddress: string;
  depositNetwork: string;
  depositExpiresAt: string | null;
  estimatedPayoutSeconds: number;
  completedAt: string | null;
  createdAt: string;
}

export interface SellCryptoStats {
  total: number;
  completed: number;
  pending: number;
  total_fiat_amount: string | null;
}

export interface PayToChinaSupplierBank {
  id: number;
  name: string;
  code: string;
  iconUrl: string | null;
  isActive: boolean;
}

export interface PayToChinaSupplier {
  id: number;
  name: string;
  accountNumber: string;
  phoneNumber: string;
  payoutMethod: string;
  bank: PayToChinaSupplierBank | null;
  createdAt: string;
}

export interface PayToChinaTransaction {
  id: number;
  reference: string;
  direction?: string;
  status: string;
  amount: string;
  amountReceived: string;
  fee: string;
  currency: string;
  exchangeRate: string;
  payoutMethod: string;
  completedAt: string | null;
  createdAt: string;
  supplier: PayToChinaSupplier | null;
}

export interface PayToChinaStats {
  total: number;
  completed: number;
  pending: number;
  failed: number;
}

export interface ConversionStats {
  total_count: string;
  total_volume: string;
  by_source_currency: { USD: string; NGN: string; YAN: string };
}

// ─── Transactions API ─────────────────────────────────────────────────────────

export const transactionsApi = {
  // ── Platform transactions ──

  /** GET /transactions — all wallet transactions (deposits, withdrawals, transfers) */
  getAll: (params?: {
    status?: string;
    type?: string;
    currency?: string;
    search?: string;
    date_from?: string;
    date_to?: string;
    page?: number;
    per_page?: number;
  }) => {
    const entries = Object.entries(params ?? {})
      .filter(([, v]) => v != null && v !== '')
      .map(([k, v]) => [k, String(v)]) as [string, string][];
    const query = entries.length ? '?' + new URLSearchParams(entries).toString() : '';
    return authedRequest<{ status: boolean; message: string; data: PaginatedResponse<Transaction> | null }>(
      `/transactions${query}`
    );
  },

  /** GET /transactions/stats */
  getStats: () =>
    authedRequest<{ status: boolean; message: string; data: TransactionStats }>(
      '/transactions/stats'
    ),

  /** GET /transactions/{id} */
  getOne: (id: number) =>
    authedRequest<{ status: boolean; message: string; data: Transaction }>(
      `/transactions/${id}`
    ),

  /** POST /transactions/{id}/approve */
  approve: (id: number) =>
    authedRequest<{ status: boolean; message: string; data: Transaction }>(
      `/transactions/${id}/approve`,
      { method: 'POST' }
    ),

  /** POST /transactions/{id}/reject */
  reject: (id: number) =>
    authedRequest<{ status: boolean; message: string; data: Transaction }>(
      `/transactions/${id}/reject`,
      { method: 'POST' }
    ),

  // ── Sell Crypto ──

  /** GET /sell-crypto */
  getSellCrypto: (params?: {
    status?: string;
    search?: string;
    date_from?: string;
    date_to?: string;
    page?: number;
    per_page?: number;
  }) => {
    const entries = Object.entries(params ?? {})
      .filter(([, v]) => v != null && v !== '')
      .map(([k, v]) => [k, String(v)]) as [string, string][];
    const query = entries.length ? '?' + new URLSearchParams(entries).toString() : '';
    return authedRequest<{ status: boolean; message: string; data: PaginatedResponse<SellCryptoTransaction> | null }>(
      `/sell-crypto${query}`
    );
  },

  /** GET /sell-crypto/stats */
  getSellCryptoStats: () =>
    authedRequest<{ status: boolean; message: string; data: SellCryptoStats }>(
      '/sell-crypto/stats'
    ),

  /** GET /sell-crypto/{id} */
  getSellCryptoOne: (id: number) =>
    authedRequest<{ status: boolean; message: string; data: SellCryptoTransaction }>(
      `/sell-crypto/${id}`
    ),

  // ── Pay to China ──

  /** GET /pay-to-china */
  getPayToChina: (params?: {
    status?: string;
    search?: string;
    date_from?: string;
    date_to?: string;
    page?: number;
    per_page?: number;
  }) => {
    const entries = Object.entries(params ?? {})
      .filter(([, v]) => v != null && v !== '')
      .map(([k, v]) => [k, String(v)]) as [string, string][];
    const query = entries.length ? '?' + new URLSearchParams(entries).toString() : '';
    return authedRequest<{ status: boolean; message: string; data: PaginatedResponse<PayToChinaTransaction> | null }>(
      `/pay-to-china${query}`
    );
  },

  /** GET /pay-to-china/stats */
  getPayToChinaStats: () =>
    authedRequest<{ status: boolean; message: string; data: PayToChinaStats }>(
      '/pay-to-china/stats'
    ),

  /** GET /pay-to-china/{id} */
  getPayToChinaOne: (id: number) =>
    authedRequest<{ status: boolean; message: string; data: PayToChinaTransaction }>(
      `/pay-to-china/${id}`
    ),

  // ── Conversions ──

  /** GET /conversions */
  getConversions: (params?: {
    status?: string;
    search?: string;
    date_from?: string;
    date_to?: string;
    page?: number;
    per_page?: number;
  }) => {
    const entries = Object.entries(params ?? {})
      .filter(([, v]) => v != null && v !== '')
      .map(([k, v]) => [k, String(v)]) as [string, string][];
    const query = entries.length ? '?' + new URLSearchParams(entries).toString() : '';
    return authedRequest<{ status: boolean; message: string; data: PaginatedResponse<Transaction> | null }>(
      `/conversions${query}`
    );
  },

  /** GET /conversions/stats */
  getConversionStats: () =>
    authedRequest<{ status: boolean; message: string; data: ConversionStats }>(
      '/conversions/stats'
    ),

  /** GET /conversions/{id} */
  getConversionOne: (id: number) =>
    authedRequest<{ status: boolean; message: string; data: Transaction }>(
      `/conversions/${id}`
    ),
};