'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';
import { walletApi } from '@/lib/api/client';
import type { WalletStats, WalletRecord, CurrencyWalletData, ReconciliationStatus, TopupTransaction, SwapTransaction, LedgerEntry } from '@/lib/api/client';
import Sidebar from '@/components/Sidebar';
import DashboardHeader from '@/components/DashboardHeader';

type MainTab      = 'overview' | 'currency-wallets' | 'ledger' | 'reconciliation';
type CwSubTab     = 'wallets' | 'topup' | 'swap';
type CurrencyType = 'USD' | 'NGN' | 'YAN';


interface RecentActivityItem {
  action: 'credit' | 'debit';
  amount: string;
  currency: string;
  label: string;
  walletId: string;
  user: string;
  reference: string;
  createdAt: string;
}

function fmtDate(s?: string | null) {
  if (!s) return '—';
  return new Date(s).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
}

// ─── Skeleton ──────────────────────────────────────────────────────────────────
function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 rounded-lg ${className ?? ''}`} />;
}

// ─── Currency helpers ─────────────────────────────────────────────────────────
function currencySymbol(c: CurrencyType | string): string {
  if (c === 'USD') return '$';
  if (c === 'NGN') return '₦';
  return '¥';
}

function currencyLabel(c: CurrencyType): string {
  if (c === 'USD') return 'US Dollar Wallets';
  if (c === 'NGN') return 'Nigerian Naira Wallets';
  return 'Chinese Yuan Wallets';
}

function CurrencyFlag({ currency, className = 'w-6 h-4' }: { currency: CurrencyType; className?: string }) {
  const src =
    currency === 'USD' ? 'https://flagcdn.com/w40/us.png' :
    currency === 'NGN' ? 'https://flagcdn.com/w40/ng.png' :
    'https://flagcdn.com/w40/cn.png';
  return <img src={src} alt={currency} className={`${className} object-cover rounded-sm`} />;
}

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ isLocked, isActive }: { isLocked: boolean; isActive: boolean }) {
  if (isLocked) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border border-gray-200 text-gray-500 bg-white">
        <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
        </svg>
        Frozen
      </span>
    );
  }
  if (isActive) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border border-gray-200 text-gray-700 bg-white">
        <svg className="w-3 h-3 text-emerald-500" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
        </svg>
        Active
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border border-gray-200 text-gray-400 bg-white">
      Inactive
    </span>
  );
}

function TxBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    Processing: 'bg-amber-50 text-amber-600 border-amber-200',
    Failed:     'bg-red-50 text-red-500 border-red-200',
    Completed:  'bg-emerald-50 text-emerald-600 border-emerald-200',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${map[status] ?? 'bg-gray-50 text-gray-500 border-gray-200'}`}>
      {status}
    </span>
  );
}

// ─── UserCell ─────────────────────────────────────────────────────────────────
function UserCell({ name, email, initials }: { name: string; email?: string; initials?: string | null }) {
  const COLORS = [
    'bg-emerald-100 text-emerald-700',
    'bg-violet-100 text-violet-700',
    'bg-amber-100 text-amber-700',
    'bg-blue-100 text-blue-700',
    'bg-pink-100 text-pink-700',
  ];
  const nameStr = typeof name === 'string' ? name : '';
  const color   = COLORS[nameStr.length > 0 ? nameStr.charCodeAt(0) % COLORS.length : 0];
  const display = initials ?? (nameStr.length >= 2 ? nameStr.slice(0, 2).toUpperCase() : nameStr.toUpperCase() || 'U');
  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${color}`}>
        {display}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{nameStr || '—'}</p>
        {email && <p className="text-xs text-gray-400 truncate">{email}</p>}
      </div>
    </div>
  );
}

// ─── Direction icons ───────────────────────────────────────────────────────────
function CreditIcon() {
  return (
    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
      <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
      </svg>
    </div>
  );
}
function DebitIcon() {
  return (
    <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
      <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3" />
      </svg>
    </div>
  );
}

// ─── Search bar ───────────────────────────────────────────────────────────────
function SearchBar({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="relative flex-1">
      <svg className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
      </svg>
      <input
        type="text" value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-full text-sm text-gray-700 placeholder-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
      />
    </div>
  );
}

// ─── Export button ────────────────────────────────────────────────────────────
function ExportBtn() {
  return (
    <button className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 text-white rounded-full text-sm font-medium hover:bg-emerald-600 transition-colors flex-shrink-0">
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
      </svg>
      Export
    </button>
  );
}

// ─── Status filter dropdown ────────────────────────────────────────────────────
function StatusFilter({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative flex-shrink-0">
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="appearance-none bg-white border border-gray-200 rounded-lg pl-3 pr-8 py-2.5 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-400 cursor-pointer">
        {['All Status', 'Processing', 'Failed', 'Completed'].map((s) => <option key={s}>{s}</option>)}
      </select>
      <svg className="w-4 h-4 text-gray-500 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
      </svg>
    </div>
  );
}

// ─── Pagination ───────────────────────────────────────────────────────────────
function Pagination({ currentPage, totalPages, onChange, loading, from, to, total }: {
  currentPage: number; totalPages: number; onChange: (p: number) => void;
  loading?: boolean; from?: number; to?: number; total?: number;
}) {
  const pages = Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
    if (totalPages <= 5) return i + 1;
    if (currentPage <= 3) return i + 1;
    if (currentPage >= totalPages - 2) return totalPages - 4 + i;
    return currentPage - 2 + i;
  });
  return (
    <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
      <p className="text-xs text-gray-500">
        {total != null ? `Showing ${from ?? 1}–${to ?? 0} of ${total} wallets` : ''}
      </p>
      <div className="flex items-center gap-1">
        <button onClick={() => onChange(Math.max(1, currentPage - 1))} disabled={currentPage === 1 || loading}
          className="w-7 h-7 flex items-center justify-center border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 text-gray-500">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
        </button>
        {pages.map((p) => (
          <button key={p} onClick={() => onChange(p)}
            className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-medium transition-colors ${currentPage === p ? 'bg-emerald-500 text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            {p}
          </button>
        ))}
        <button onClick={() => onChange(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages || loading}
          className="w-7 h-7 flex items-center justify-center border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 text-gray-500">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
        </button>
      </div>
    </div>
  );
}


function buildMockWallets(currency: CurrencyType): WalletRecord[] {
  const prefix = currency === 'USD' ? 'USD' : currency === 'NGN' ? 'NGN' : 'RMB';
  return Array.from({ length: 6 }, (_, i) => ({
    id: `${prefix}00${i + 1}`,
    currency,
    balance: '15420.50',
    availableBalance: '15420.50',
    isLocked: i === 1 || i === 2,
    isActive: !(i === 1 || i === 2),
    isVerified: true,
    user: { firstName: 'James', lastName: 'Smith', email: 'john.doe@example.com', changpayId: null, avatar: null },
    lastActivityAt: '2026-01-05T10:30:00+00:00',
    createdAt: '2026-01-05T10:30:00+00:00',
  }));
}

// ═════════════════════════════════════════════════════════════════════════════
//  PAGE
// ═════════════════════════════════════════════════════════════════════════════
export default function WalletManagementPage() {
  const { isAuthenticated } = useAuthStore();

  const [mainTab,          setMainTab]          = useState<MainTab>('overview');
  const [cwSubTab,         setCwSubTab]          = useState<CwSubTab>('wallets');
  const [selectedCurrency, setSelectedCurrency]  = useState<CurrencyType>('USD');
  const [walletSearch,     setWalletSearch]      = useState('');
  const [ledgerSearch,     setLedgerSearch]      = useState('');
  const [topupSearch,      setTopupSearch]       = useState('');
  const [swapSearch,       setSwapSearch]        = useState('');
  const [topupFilter,      setTopupFilter]       = useState('All Status');
  const [swapFilter,       setSwapFilter]        = useState('All Status');
  const [currentPage,      setCurrentPage]       = useState(1);

  const [stats,          setStats]          = useState<WalletStats | null>(null);
  const [currencyData,   setCurrencyData]   = useState<CurrencyWalletData | null>(null);
  const [wallets,        setWallets]        = useState<WalletRecord[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivityItem[]>([]);
  const [togglingId,          setTogglingId]          = useState<string | null>(null);
  const [reconciliation,      setReconciliation]      = useState<ReconciliationStatus | null>(null);
  const [loadingStats,        setLoadingStats]        = useState(true);
  const [loadingWallets,      setLoadingWallets]      = useState(false);
  const [loadingRecon,        setLoadingRecon]        = useState(false);
  const [runningRecon,        setRunningRecon]        = useState(false);
  const [topups,              setTopups]              = useState<TopupTransaction[] | null>(null);
  const [swaps,               setSwaps]               = useState<SwapTransaction[] | null>(null);
  const [ledger,              setLedger]              = useState<LedgerEntry[] | null>(null);
  const [ledgerPage,          setLedgerPage]          = useState(1);
  const [ledgerMeta,          setLedgerMeta]          = useState<{ current_page: number; last_page: number; from: number | null; to: number | null; total: number } | null>(null);
  const [loadingTopups,       setLoadingTopups]       = useState(false);
  const [loadingSwaps,        setLoadingSwaps]        = useState(false);
  const [loadingLedger,       setLoadingLedger]       = useState(false);
  const [error,               setError]               = useState<string | null>(null);

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoadingStats(true);
      setError(null);
      const res = await walletApi.getStats();
      if (res.status) {
        setStats(res.data);
        if (Array.isArray(res.data?.recent_activity)) {
          setRecentActivity(res.data.recent_activity);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load wallet stats');
    } finally {
      setLoadingStats(false);
    }
  }, []);

  const fetchCurrencyWallets = useCallback(async (currency: CurrencyType, page: number, search: string) => {
    try {
      setLoadingWallets(true);
      setError(null);
      const res = await walletApi.getWalletsByCurrency(currency, { page, per_page: 15, search: search || undefined });
      if (res.status) {
        setCurrencyData(res.data);
        setWallets(res.data.wallets.data ?? []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load wallets');
    } finally {
      setLoadingWallets(false);
    }
  }, []);

  const fetchReconciliation = useCallback(async () => {
    try {
      setLoadingRecon(true);
      const res = await walletApi.getReconciliation();
      if (res.status && res.data) setReconciliation(res.data);
    } catch { /* silent */ } finally {
      setLoadingRecon(false);
    }
  }, []);

  const handleRunReconciliation = async () => {
    try {
      setRunningRecon(true);
      const res = await walletApi.runReconciliation();
      if (res.status && res.data) setReconciliation(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reconciliation failed');
    } finally {
      setRunningRecon(false);
    }
  };

  const fetchTopups = useCallback(async (search = '', status = '') => {
    try {
      setLoadingTopups(true);
      const res = await walletApi.getTopups({ search: search || undefined, status: status && status !== 'All Status' ? status.toLowerCase() : undefined, per_page: 15 });
      setTopups(res.data?.data ?? []);
    } catch { /* silent */ } finally { setLoadingTopups(false); }
  }, []);

  const fetchSwaps = useCallback(async (search = '', status = '') => {
    try {
      setLoadingSwaps(true);
      const res = await walletApi.getSwaps({ search: search || undefined, status: status && status !== 'All Status' ? status.toLowerCase() : undefined, per_page: 15 });
      setSwaps(res.data?.data ?? []);
    } catch { /* silent */ } finally { setLoadingSwaps(false); }
  }, []);

  const fetchLedger = useCallback(async (search = '', page = 1) => {
    try {
      setLoadingLedger(true);
      const res = await walletApi.getLedger({ search: search || undefined, per_page: 15, page } as Parameters<typeof walletApi.getLedger>[0]);
      setLedger(res.data?.data ?? []);
      if (res.data?.meta) setLedgerMeta(res.data.meta);
    } catch { /* silent */ } finally { setLoadingLedger(false); }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  useEffect(() => {
    if (mainTab === 'currency-wallets' && cwSubTab === 'wallets') fetchCurrencyWallets(selectedCurrency, currentPage, walletSearch);
    if (mainTab === 'currency-wallets' && cwSubTab === 'topup') fetchTopups(topupSearch, topupFilter);
    if (mainTab === 'currency-wallets' && cwSubTab === 'swap') fetchSwaps(swapSearch, swapFilter);
    if (mainTab === 'ledger') fetchLedger(ledgerSearch, ledgerPage);
    if (mainTab === 'reconciliation') fetchReconciliation();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mainTab, cwSubTab, selectedCurrency, currentPage, topupSearch, topupFilter, swapSearch, swapFilter, ledgerSearch, ledgerPage]);

  const handleWalletSearch = (val: string) => {
    setWalletSearch(val);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setCurrentPage(1);
      fetchCurrencyWallets(selectedCurrency, 1, val);
    }, 400);
  };

  const handleCurrencyChange = (currency: CurrencyType) => {
    setSelectedCurrency(currency);
    setCurrentPage(1);
    setWalletSearch('');
    setCurrencyData(null);
    setWallets([]);
  };

  const handleToggleLock = async (wallet: WalletRecord) => {
    try {
      setTogglingId(wallet.id);
      const res = await walletApi.toggleLock(wallet.id);
      if (res.status) setWallets((prev) => prev.map((w) => w.id === wallet.id ? res.data : w));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle wallet lock');
    } finally {
      setTogglingId(null);
    }
  };

  if (!isAuthenticated) return null;

  const displayWallets: WalletRecord[] = wallets.length > 0
    ? wallets
    : currencyData === null
      ? buildMockWallets(selectedCurrency)
      : [];
  const totalPages = currencyData?.wallets?.meta?.last_page ?? 3;

  const goToCurrencyWallets = (currency: CurrencyType) => {
    setMainTab('currency-wallets');
    setCwSubTab('wallets');
    handleCurrencyChange(currency);
  };


  const MAIN_TABS: { id: MainTab; label: string }[] = [
    { id: 'overview',         label: 'Overview' },
    { id: 'currency-wallets', label: 'Currency Wallets' },
    { id: 'ledger',           label: 'Ledger' },
    { id: 'reconciliation',   label: 'Reconciliation' },
  ];

  const CW_TABS: CwSubTab[] = ['wallets', 'topup', 'swap'];

  return (
    <div className="flex h-screen bg-[#F8F9FA] font-['DM_Sans',sans-serif]">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        <div className="bg-white border-b border-gray-200 px-8 py-5 flex-shrink-0">
          <DashboardHeader title="Wallet Management System" subtitle="Comprehensive wallet management for all users" />
        </div>

        {/* Main tab bar */}
        <div className="bg-white border-b border-gray-200 flex-shrink-0">
          <nav className="flex w-full">
            {MAIN_TABS.map((tab) => (
              <button key={tab.id} onClick={() => setMainTab(tab.id)}
                className={`relative px-10 py-4 text-sm font-medium transition-colors whitespace-nowrap flex-1 text-center ${
                  mainTab === tab.id ? 'text-emerald-600' : 'text-gray-500 hover:text-gray-700'
                }`}>
                {tab.label}
                {mainTab === tab.id && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500" />}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex-1 overflow-y-auto">
          {error && (
            <div className="mx-8 mt-5 p-3 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* ── OVERVIEW ── */}
          {mainTab === 'overview' && (
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-3 gap-5">
                <div className="bg-[#F8F9FA] rounded-2xl border border-gray-200 p-6">
                  <p className="text-xs text-gray-500 mb-3">Total Wallets</p>
                  {loadingStats ? <Skeleton className="h-10 w-16" /> : (
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
                      </svg>
                      <p className="text-4xl font-bold text-gray-900">{stats?.total_wallets ?? '—'}</p>
                    </div>
                  )}
                </div>

                <div className="bg-[#F8F9FA] rounded-2xl border border-gray-200 p-6">
                  <p className="text-xs text-gray-500 mb-3">Today's Transactions</p>
                  {loadingStats ? <Skeleton className="h-10 w-28" /> : (
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
                      </svg>
                      <p className="text-4xl font-bold text-gray-900">{stats?.today?.transactions_count ?? '—'}</p>
                    </div>
                  )}
                </div>

                <div className="bg-[#F8F9FA] rounded-2xl border border-gray-200 p-6">
                  <p className="text-xs text-gray-500 mb-3">Transaction Volume</p>
                  {loadingStats ? <Skeleton className="h-10 w-28" /> : (
                    stats?.transaction_volume?.total != null ? (
                      <>
                        <p className="text-4xl font-bold text-gray-900">
                          ${Number(stats.transaction_volume.total).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                        {stats.transaction_volume.by_currency && (
                          <div className="mt-3 space-y-1.5">
                            {Object.entries(stats.transaction_volume.by_currency).map(([cur, amt]) => (
                              <div key={cur} className="flex items-center justify-between">
                                <span className="text-xs text-gray-400">{cur}</span>
                                <span className="text-xs font-semibold text-gray-700">
                                  {currencySymbol(cur)}{Number(amt).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    ) : <p className="text-4xl font-bold text-gray-400">—</p>
                  )}
                </div>
              </div>

              {/* Currency cards */}
              <div className="grid grid-cols-3 gap-5">
                {(['USD', 'NGN', 'YAN'] as CurrencyType[]).map((cur) => {
                  const curData = stats?.by_currency?.[cur];
                  const labels: Record<CurrencyType, string>  = { USD: 'USD Wallets', NGN: 'NGN Wallets', YAN: 'YUAN Wallet Balance' };
                  const links:  Record<CurrencyType, string>  = { USD: 'View All USD Wallets', NGN: 'View All NGN Wallets', YAN: 'View All YUAN Wallets' };
                  return (
                    <div key={cur} className="bg-[#F8F9FA] rounded-2xl border border-gray-200 p-6">
                      <p className="text-xs text-gray-500 mb-3">{labels[cur]}</p>
                      {loadingStats ? <Skeleton className="h-10 w-36" /> : (
                        <div>
                          <div className="flex items-center gap-2.5 mb-1">
                            <CurrencyFlag currency={cur} className="w-7 h-5" />
                            <p className="text-3xl font-bold text-gray-900">
                              {curData ? `${currencySymbol(cur)}${curData.total_balance}` : '—'}
                            </p>
                          </div>
                          {curData && <p className="text-xs text-gray-400 mt-1">Last 5 secs</p>}
                        </div>
                      )}
                      <button onClick={() => goToCurrencyWallets(cur)} className="mt-3 text-xs font-medium hover:underline" style={{ color: '#1248A4' }}>
                        {links[cur]} →
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Recent Activity — API data only */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-base font-semibold text-gray-900">Recent System Activity</h3>
                  <button onClick={() => setMainTab('ledger')} className="text-sm font-medium hover:underline" style={{ color: '#1248A4' }}>
                    View Full Ledger →
                  </button>
                </div>
                {loadingStats ? (
                  <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
                ) : recentActivity.length === 0 ? (
                  <div className="py-10 text-center text-sm text-gray-400">No recent activity data available</div>
                ) : (
                  <div className="space-y-3">
                    {recentActivity.map((item, i) => (
                      <div key={i} className="flex items-center justify-between bg-[#F8F9FA] rounded-xl px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          {item.action === 'credit' ? <CreditIcon /> : <DebitIcon />}
                          <div>
                            <p className="text-sm font-medium text-gray-900">{item.user}</p>
                            <p className="text-xs text-gray-400">{item.walletId.slice(0, 8).toUpperCase()} • {item.label}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-semibold ${item.action === 'credit' ? 'text-emerald-500' : 'text-red-500'}`}>
                            {item.action === 'debit' ? '-' : '+'}{currencySymbol(item.currency)}{Number(item.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                          <p className="text-xs text-gray-400">{fmtDate(item.createdAt)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── CURRENCY WALLETS ── */}
          {mainTab === 'currency-wallets' && (
            <div className="p-8 space-y-5">
              <div className="grid grid-cols-3 bg-white rounded-xl border border-gray-200 overflow-hidden">
                {CW_TABS.map((tab) => (
                  <button key={tab} onClick={() => setCwSubTab(tab)}
                    className={`py-3 text-sm font-semibold capitalize transition-colors ${cwSubTab === tab ? 'bg-emerald-500 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>

              {/* Wallets */}
              {cwSubTab === 'wallets' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="relative flex-shrink-0">
                      <select value={selectedCurrency} onChange={(e) => handleCurrencyChange(e.target.value as CurrencyType)}
                        className="appearance-none bg-white border border-gray-200 rounded-lg pl-3 pr-8 py-2 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 cursor-pointer">
                        <option value="USD">USD Wallets</option>
                        <option value="NGN">NGN Wallets</option>
                        <option value="YUAN">YUAN Wallets</option>
                      </select>
                      <svg className="w-4 h-4 text-gray-500 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
                    </div>
                    <div className="flex items-center gap-2">
                      <CurrencyFlag currency={selectedCurrency} className="w-7 h-5" />
                      <span className="text-base font-semibold text-gray-800">{currencyLabel(selectedCurrency)}</span>
                      <span className="text-base font-semibold text-gray-800">
                        Total Balance:{' '}
                        {currencyData?.stats?.total_balance != null
                          ? `${currencySymbol(selectedCurrency)}${Number(currencyData.stats.total_balance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                          : stats?.by_currency?.[selectedCurrency]?.total_balance
                            ? `${currencySymbol(selectedCurrency)}${stats.by_currency[selectedCurrency].total_balance}`
                            : '—'}
                      </span>
                    </div>
                  </div>
                  <div className="max-w-lg">
                    <SearchBar value={walletSearch} onChange={handleWalletSearch} placeholder="Search by name, wallet ID or transaction ID..." />
                  </div>
                  <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-100">
                            {['Wallet ID','User','Balance','Status','Last activity','Action'].map((h) => (
                              <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {loadingWallets ? [...Array(6)].map((_, i) => (
                            <tr key={i}>{[...Array(6)].map((_, j) => <td key={j} className="px-5 py-4"><Skeleton className="h-5 w-full" /></td>)}</tr>
                          )) : displayWallets.length === 0 ? (
                            <tr><td colSpan={6} className="px-5 py-12 text-center text-sm text-gray-400">No {selectedCurrency} wallets found</td></tr>
                          ) : (
                            displayWallets.map((wallet, idx) => {
                              const userName = wallet.user
                                ? [wallet.user.firstName, wallet.user.lastName].filter(Boolean).join(' ')
                                : '—';
                              const lastActivity = wallet.lastActivityAt
                                ? new Date(wallet.lastActivityAt).toLocaleString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).replace(',', '')
                                : '—';
                              return (
                                <tr key={wallet.id ?? idx} className="hover:bg-gray-50/50 transition-colors">
                                  <td className="px-5 py-4 text-sm font-medium text-gray-900 font-mono">{wallet.id.slice(0, 8).toUpperCase()}</td>
                                  <td className="px-5 py-4">
                                    <UserCell
                                      name={userName}
                                      email={wallet.user?.changpayId ?? wallet.user?.email ?? ''}
                                      initials={null}
                                    />
                                  </td>
                                  <td className="px-5 py-4 text-sm font-semibold text-gray-900">
                                    {currencySymbol(wallet.currency)}{Number(wallet.balance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </td>
                                  <td className="px-5 py-4"><StatusBadge isLocked={wallet.isLocked} isActive={wallet.isActive} /></td>
                                  <td className="px-5 py-4">
                                    <p className="text-xs text-gray-500 whitespace-nowrap">{lastActivity}</p>
                                  </td>
                                  <td className="px-5 py-4">
                                    <div className="relative group inline-block">
                                      <button className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 transition-colors text-gray-500">
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                          <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
                                        </svg>
                                      </button>
                                      <div className="absolute right-0 top-full mt-1 w-36 bg-white rounded-xl shadow-lg border border-gray-100 py-1 hidden group-hover:block z-10">
                                        <button className="w-full px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2 text-left">View wallet</button>
                                        <button className="w-full px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2 text-left">Credit user</button>
                                        <button className="w-full px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2 text-left">Debit user</button>
                                        <button
                                          onClick={() => handleToggleLock(wallet)}
                                          disabled={togglingId === wallet.id}
                                          className="w-full px-3 py-2 text-xs text-red-500 hover:bg-red-50 flex items-center gap-2 text-left disabled:opacity-50">
                                          {togglingId === wallet.id ? '...' : wallet.isLocked ? 'Unfreeze' : 'Freeze wallet'}
                                        </button>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                    <Pagination currentPage={currentPage} totalPages={totalPages} onChange={setCurrentPage} loading={loadingWallets} from={currencyData?.wallets?.meta?.from ?? undefined} to={currencyData?.wallets?.meta?.to ?? undefined} total={currencyData?.wallets?.meta?.total} />
                  </div>
                </div>
              )}

              {/* Topup */}
              {cwSubTab === 'topup' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <SearchBar value={topupSearch} onChange={setTopupSearch} placeholder="Search..." />
                    <StatusFilter value={topupFilter} onChange={setTopupFilter} />
                    <ExportBtn />
                  </div>
                  <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead><tr className="border-b border-gray-100">{['Transaction ID','User','Wallet ID','Amount','Method','Status','Timestamp','Reference'].map((h) => <th key={h} className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">{h}</th>)}</tr></thead>
                        <tbody className="divide-y divide-gray-50">
                          {loadingTopups
                            ? [...Array(4)].map((_, i) => (
                                <tr key={i}>{[...Array(8)].map((_, j) => <td key={j} className="px-4 py-4"><Skeleton className="h-5 w-full" /></td>)}</tr>
                              ))
                            : !topups || topups.length === 0
                              ? <tr><td colSpan={8} className="px-4 py-16 text-center text-sm text-gray-400">No topup transactions available</td></tr>
                              : topups.map((row) => (
                                  <tr key={String(row.id)} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-4 py-4 text-sm font-medium text-gray-900">{String(row.reference ?? row.id).slice(0, 12)}</td>
                                    <td className="px-4 py-4"><UserCell name={row.user ? `${row.user.firstName} ${row.user.lastName}`.trim() : '—'} email={row.user?.changpayId ?? row.user?.email ?? ''} initials={null} /></td>
                                    <td className="px-4 py-4 text-sm text-gray-600">{row.wallet?.id?.slice(0, 8).toUpperCase() ?? '—'}</td>
                                    <td className="px-4 py-4"><p className="text-sm font-semibold text-gray-900">{currencySymbol(row.currency)}{Number(row.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p><p className="text-xs text-gray-400">{row.currency}</p></td>
                                    <td className="px-4 py-4 text-sm text-gray-600 capitalize">{row.provider}</td>
                                    <td className="px-4 py-4"><TxBadge status={row.status} /></td>
                                    <td className="px-4 py-4 text-xs text-gray-500 whitespace-nowrap">{fmtDate(row.createdAt)}</td>
                                    <td className="px-4 py-4 text-xs text-gray-500">{row.reference}</td>
                                  </tr>
                                ))
                          }
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Swap */}
              {cwSubTab === 'swap' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <SearchBar value={swapSearch} onChange={setSwapSearch} placeholder="Search..." />
                    <StatusFilter value={swapFilter} onChange={setSwapFilter} />
                    <ExportBtn />
                  </div>
                  <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead><tr className="border-b border-gray-100">{['Transaction ID','User','Wallet ID','From','To','Rate','Status','Timestamp','Reference'].map((h) => <th key={h} className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">{h}</th>)}</tr></thead>
                        <tbody className="divide-y divide-gray-50">
                          {loadingSwaps
                            ? [...Array(4)].map((_, i) => (
                                <tr key={i}>{[...Array(9)].map((_, j) => <td key={j} className="px-4 py-4"><Skeleton className="h-5 w-full" /></td>)}</tr>
                              ))
                            : !swaps || swaps.length === 0
                              ? <tr><td colSpan={9} className="px-4 py-16 text-center text-sm text-gray-400">No swap transactions available</td></tr>
                              : swaps.map((row) => (
                                  <tr key={String(row.id)} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-4 py-4 text-sm font-medium text-gray-900">{String(row.reference ?? row.id).slice(0, 12)}</td>
                                    <td className="px-4 py-4"><UserCell name={row.user ? `${row.user.firstName} ${row.user.lastName}`.trim() : '—'} email={row.user?.changpayId ?? row.user?.email ?? ''} initials={null} /></td>
                                    <td className="px-4 py-4 text-sm text-gray-600">—</td>
                                    <td className="px-4 py-4 text-sm font-medium text-gray-900"><p>{currencySymbol(row.fromCurrency)}{Number(row.fromAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p><p className="text-xs text-gray-400">{row.fromCurrency}</p></td>
                                    <td className="px-4 py-4 text-sm font-semibold text-emerald-600"><p>{currencySymbol(row.toCurrency)}{Number(row.toAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p><p className="text-xs text-gray-400">{row.toCurrency}</p></td>
                                    <td className="px-4 py-4 text-sm text-gray-600">{row.rate}</td>
                                    <td className="px-4 py-4"><TxBadge status={row.status} /></td>
                                    <td className="px-4 py-4 text-xs text-gray-500 whitespace-nowrap">{fmtDate(row.createdAt)}</td>
                                    <td className="px-4 py-4 text-xs text-gray-500">{row.reference}</td>
                                  </tr>
                                ))
                          }
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── LEDGER ── */}
          {mainTab === 'ledger' && (
            <div className="p-8 space-y-5">
              <div><h2 className="text-lg font-bold text-gray-900">System-Wide Transaction Ledger</h2><p className="text-sm text-gray-500 mt-0.5">Immutable record of all wallet balance changes</p></div>
              <div className="flex items-center gap-3">
                <SearchBar value={ledgerSearch} onChange={setLedgerSearch} placeholder="Search by wallet, user, reference, or description..." />
                <ExportBtn />
              </div>
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100">
                        {['Time','User','Wallet','Action','Amount','Balance Before','Balance After','Tx Type','Status','Reference'].map((h) => (
                          <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {loadingLedger
                        ? [...Array(5)].map((_, i) => (
                            <tr key={i}>{[...Array(10)].map((_, j) => <td key={j} className="px-5 py-4"><Skeleton className="h-5 w-full" /></td>)}</tr>
                          ))
                        : !ledger || ledger.length === 0
                          ? <tr><td colSpan={10} className="px-5 py-16 text-center text-sm text-gray-400">No ledger entries available</td></tr>
                          : ledger.map((row, idx) => {
                              const sym = currencySymbol(row.wallet.currency);
                              const txStatus = row.transaction.status;
                              const statusClass =
                                txStatus === 'completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                                txStatus === 'failed'    ? 'bg-red-50 text-red-500 border-red-200' :
                                                          'bg-amber-50 text-amber-600 border-amber-200';
                              return (
                                <tr key={`${row.transaction.reference}-${idx}`} className="hover:bg-gray-50/50 transition-colors">
                                  <td className="px-5 py-4 text-xs text-gray-500 whitespace-nowrap">{fmtDate(row.createdAt)}</td>
                                  <td className="px-5 py-4">
                                    <UserCell
                                      name={`${row.wallet.user.firstName} ${row.wallet.user.lastName}`.trim()}
                                      initials={null}
                                    />
                                  </td>
                                  <td className="px-5 py-4">
                                    <p className="text-xs font-mono text-gray-700">{row.wallet.id.slice(0, 8).toUpperCase()}</p>
                                    <p className="text-xs text-gray-400">{row.wallet.currency}</p>
                                  </td>
                                  <td className="px-5 py-4">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold capitalize ${row.action === 'credit' || row.action === 'release' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                                      {row.action}
                                    </span>
                                  </td>
                                  <td className="px-5 py-4 text-sm font-semibold text-gray-900 whitespace-nowrap">
                                    {sym}{Number(row.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                  </td>
                                  <td className="px-5 py-4 text-xs text-gray-500 whitespace-nowrap">
                                    {sym}{Number(row.balanceBefore).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                  </td>
                                  <td className="px-5 py-4 text-xs text-gray-500 whitespace-nowrap">
                                    {sym}{Number(row.balanceAfter).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                  </td>
                                  <td className="px-5 py-4 text-xs text-gray-600 capitalize">{row.transaction.type}</td>
                                  <td className="px-5 py-4">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize ${statusClass}`}>
                                      {txStatus}
                                    </span>
                                  </td>
                                  <td className="px-5 py-4 text-xs text-gray-500 font-mono">{row.transaction.reference}</td>
                                </tr>
                              );
                            })
                      }
                    </tbody>
                  </table>
                </div>
                <Pagination
                  currentPage={ledgerPage}
                  totalPages={ledgerMeta?.last_page ?? 1}
                  onChange={(p) => setLedgerPage(p)}
                  loading={loadingLedger}
                  from={ledgerMeta?.from ?? undefined}
                  to={ledgerMeta?.to ?? undefined}
                  total={ledgerMeta?.total}
                />
              </div>
            </div>
          )}

          {/* ── RECONCILIATION ── */}
          {mainTab === 'reconciliation' && (
            <div className="p-8 space-y-5">
              <div><h2 className="text-lg font-bold text-gray-900">System-Wide Reconciliation</h2><p className="text-sm text-gray-500 mt-0.5">Wallet balance audit against ledger entries</p></div>

              {/* Status banner */}
              {loadingRecon ? (
                <Skeleton className="h-20 w-full" />
              ) : (
                <div className={`${reconciliation?.is_reconciled !== false ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'} border rounded-2xl p-5 flex items-center justify-between`}>
                  <div className="flex items-center gap-4">
                    <div className={`w-11 h-11 rounded-full bg-white border flex items-center justify-center flex-shrink-0 ${reconciliation?.is_reconciled !== false ? 'border-emerald-200' : 'border-red-200'}`}>
                      {reconciliation?.is_reconciled !== false ? (
                        <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">
                        {reconciliation
                          ? reconciliation.is_reconciled ? 'All Wallets Reconciled' : `${reconciliation.discrepancies_count} Discrepanc${reconciliation.discrepancies_count === 1 ? 'y' : 'ies'} Found`
                          : 'Reconciliation status unavailable'}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {reconciliation?.total_wallets_checked != null ? `${reconciliation.total_wallets_checked} wallets checked` : '—'}
                        {reconciliation?.auto_job?.last_run_at ? ` · Last run: ${fmtDate(reconciliation.auto_job.last_run_at)}` : ''}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleRunReconciliation}
                    disabled={runningRecon}
                    className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 text-white rounded-lg text-sm font-semibold hover:bg-emerald-600 transition-colors disabled:opacity-60">
                    <svg className={`w-4 h-4 ${runningRecon ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                    </svg>
                    {runningRecon ? 'Running…' : 'Manual Reconcile'}
                  </button>
                </div>
              )}

              {/* Auto-job info */}
              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Automated Reconciliation</h3>
                {loadingRecon ? <Skeleton className="h-14 w-full" /> : (
                  <div className="flex items-center justify-between bg-[#F8F9FA] rounded-xl px-4 py-4">
                    <div className="flex items-center gap-3">
                      <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Auto-Reconciliation Job</p>
                        <p className="text-xs text-gray-400 mt-0.5">{reconciliation?.auto_job?.schedule ?? '—'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs font-semibold ${reconciliation?.auto_job?.last_status === 'reconciled' ? 'text-emerald-500' : 'text-gray-400'}`}>
                        {reconciliation?.auto_job?.last_status ? reconciliation.auto_job.last_status.charAt(0).toUpperCase() + reconciliation.auto_job.last_status.slice(1) : 'Active'}
                      </span>
                      {reconciliation?.auto_job?.next_run_at && (
                        <p className="text-[10px] text-gray-400 mt-0.5">Next: {fmtDate(reconciliation.auto_job.next_run_at)}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}