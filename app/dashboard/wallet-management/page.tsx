'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { walletApi } from '@/lib/api/client';
import type { WalletStats, WalletRecord, CurrencyWalletData } from '@/lib/api/client';
import { AUTH_ROUTES } from '@/constants/auth';
import Sidebar from '@/components/Sidebar';
import DashboardHeader from '@/components/DashboardHeader';

type MainTab = 'overview' | 'currency-wallets' | 'ledger' | 'reconciliation';
type CurrencyType = 'USD' | 'NGN' | 'YAN';

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-100 rounded-lg ${className}`} />;
}

function StatusBadge({ isLocked, isActive }: { isLocked: boolean; isActive: boolean }) {
  if (isLocked) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
        </svg>
        Locked
      </span>
    );
  }
  if (isActive) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
        </svg>
        Active
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-600 border border-red-200">
      Inactive
    </span>
  );
}

function currencySymbol(currency: CurrencyType) {
  if (currency === 'USD') return '$';
  if (currency === 'NGN') return '₦';
  return '¥';
}

function currencyFlag(currency: CurrencyType) {
  if (currency === 'USD') return '🇺🇸';
  if (currency === 'NGN') return '🇳🇬';
  return '🇨🇳';
}

export default function WalletManagementPage() {
  const router = useRouter();
  const { isAuthenticated, user: authUser } = useAuthStore();

  const [mainTab, setMainTab] = useState<MainTab>('overview');
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyType>('USD');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Data state
  const [stats, setStats] = useState<WalletStats | null>(null);
  const [currencyData, setCurrencyData] = useState<CurrencyWalletData | null>(null);
  const [wallets, setWallets] = useState<WalletRecord[]>([]);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  // Loading states
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingWallets, setLoadingWallets] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);


  const fetchStats = useCallback(async () => {
    try {
      setLoadingStats(true);
      setError(null);
      const res = await walletApi.getStats();
      if (res.status) setStats(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load wallet stats');
    } finally {
      setLoadingStats(false);
    }
  // walletApi is a stable module-level object — no deps needed
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch wallets for selected currency
  const fetchCurrencyWallets = useCallback(async (
    currency: CurrencyType,
    page: number,
    search: string
  ) => {
    try {
      setLoadingWallets(true);
      setError(null);
      const res = await walletApi.getWalletsByCurrency(currency, {
        page,
        per_page: 15,
        search: search || undefined,
      });
      if (res.status) {
        setCurrencyData(res.data);
        setWallets(res.data.wallets.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load wallets');
    } finally {
      setLoadingWallets(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    if (mainTab === 'currency-wallets') {
      fetchCurrencyWallets(selectedCurrency, currentPage, searchQuery);
    }
  }, [mainTab, selectedCurrency, currentPage]);

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setCurrentPage(1);
      fetchCurrencyWallets(selectedCurrency, 1, val);
    }, 400);
  };

  const handleCurrencyChange = (currency: CurrencyType) => {
    setSelectedCurrency(currency);
    setCurrentPage(1);
    setSearchQuery('');
  };

  // Auth guard AFTER all hooks — this is the correct pattern
  if (!isAuthenticated) return null;

  const handleToggleLock = async (wallet: WalletRecord) => {
    try {
      setTogglingId(wallet.id);
      const res = await walletApi.toggleLock(wallet.id);
      if (res.status) {
        setWallets((prev) => prev.map((w) => w.id === wallet.id ? res.data : w));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle wallet lock');
    } finally {
      setTogglingId(null);
    }
  };

  const totalPages = currencyData?.wallets.last_page ?? 1;
  const pageNumbers = Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
    if (totalPages <= 5) return i + 1;
    if (currentPage <= 3) return i + 1;
    if (currentPage >= totalPages - 2) return totalPages - 4 + i;
    return currentPage - 2 + i;
  });

  return (
    <div className="flex h-screen bg-gray-50 font-['DM_Sans']">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">

        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-8 py-6">
        <DashboardHeader title="Wallet Management" subtitle="Comprehensive wallet management for all users" />
        </div>
        <div className="flex-1 overflow-y-auto p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* ── OVERVIEW TAB ── */}
          {mainTab === 'overview' && (
            <div>
              {/* Top stats */}
              <div className="grid grid-cols-3 gap-6 mb-8">
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <p className="text-xs text-gray-500 mb-2">Total Wallets</p>
                  {loadingStats ? <Skeleton className="h-10 w-20" /> : (
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
                      </svg>
                      <p className="text-3xl font-bold text-gray-900">{stats?.total_wallets ?? '—'}</p>
                    </div>
                  )}
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <p className="text-xs text-gray-500 mb-2">Active Wallets</p>
                  {loadingStats ? <Skeleton className="h-10 w-20" /> : (
                    <p className="text-3xl font-bold text-emerald-600">{stats?.active_wallets ?? '—'}</p>
                  )}
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <p className="text-xs text-gray-500 mb-2">Locked Wallets</p>
                  {loadingStats ? <Skeleton className="h-10 w-20" /> : (
                    <p className="text-3xl font-bold text-red-500">{stats?.locked_wallets ?? '—'}</p>
                  )}
                </div>
              </div>

              {/* Currency balance cards */}
              <div className="grid grid-cols-3 gap-6 mb-8">
                {(['USD', 'NGN', 'YAN'] as CurrencyType[]).map((cur) => (
                  <div key={cur} className="bg-white rounded-xl border border-gray-200 p-6">
                    <p className="text-xs text-gray-500 mb-2">{cur} Wallets</p>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">{currencyFlag(cur)}</span>
                      {loadingStats ? <Skeleton className="h-9 w-32" /> : (
                        <p className="text-3xl font-bold text-gray-900">
                          {currencySymbol(cur)}{stats?.by_currency?.[cur]?.total_balance ?? '—'}
                        </p>
                      )}
                    </div>
                    {!loadingStats && (
                      <p className="text-xs text-gray-500">
                        {stats?.by_currency?.[cur]?.count ?? '0'} wallets
                      </p>
                    )}
                    <button
                      onClick={() => { setMainTab('currency-wallets'); handleCurrencyChange(cur); }}
                      className="mt-3 text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                    >
                      View All {cur} Wallets →
                    </button>
                  </div>
                ))}
              </div>

              {/* Refresh button */}
              <button
                onClick={fetchStats}
                disabled={loadingStats}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                <svg className={`w-4 h-4 ${loadingStats ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
                {loadingStats ? 'Refreshing...' : 'Refresh Stats'}
              </button>
            </div>
          )}

          {/* ── CURRENCY WALLETS TAB ── */}
          {mainTab === 'currency-wallets' && (
            <div>
              {/* Currency selector */}
              <div className="flex items-center gap-3 mb-6">
                {(['USD', 'NGN', 'YAN'] as CurrencyType[]).map((cur) => (
                  <button
                    key={cur}
                    onClick={() => handleCurrencyChange(cur)}
                    className={`flex items-center gap-2 px-6 py-2.5 text-sm font-semibold rounded-lg transition-colors ${
                      selectedCurrency === cur
                        ? 'bg-emerald-500 text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                    }`}
                  >
                    <span>{currencyFlag(cur)}</span> {cur} Wallets
                  </button>
                ))}
              </div>

              {/* Currency stats bar */}
              {currencyData && (
                <div className="grid grid-cols-4 gap-4 mb-6">
                  {[
                    { label: 'Total Wallets', value: String(currencyData.stats.total_wallets) },
                    { label: 'Total Balance', value: `${currencySymbol(selectedCurrency)}${currencyData.stats.total_balance ?? '—'}` },
                    { label: 'Active', value: String(currencyData.stats.active_wallets), color: 'text-emerald-600' },
                    { label: 'Locked', value: String(currencyData.stats.locked_wallets), color: 'text-red-500' },
                  ].map((s) => (
                    <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4">
                      <p className="text-xs text-gray-500">{s.label}</p>
                      <p className={`text-xl font-bold mt-1 ${s.color ?? 'text-gray-900'}`}>{s.value}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="bg-white rounded-xl border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <div className="relative max-w-md">
                    <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                    </svg>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      placeholder="Search by wallet UID, user name, email, or ChangPay ID..."
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        {['Wallet UID', 'User ID', 'Balance', 'Available Balance', 'Status', 'Created', 'Action'].map((h) => (
                          <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {loadingWallets ? (
                        [...Array(8)].map((_, i) => (
                          <tr key={i}>
                            {[...Array(7)].map((_, j) => (
                              <td key={j} className="px-5 py-4"><Skeleton className="h-5 w-full" /></td>
                            ))}
                          </tr>
                        ))
                      ) : wallets.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-5 py-12 text-center text-gray-400 text-sm">
                            No {selectedCurrency} wallets found
                          </td>
                        </tr>
                      ) : (
                        wallets.map((wallet) => (
                          <tr key={wallet.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-5 py-4 text-sm font-medium text-gray-900">{wallet.uid}</td>
                            <td className="px-5 py-4 text-sm text-gray-600">{wallet.user_id}</td>
                            <td className="px-5 py-4 text-sm font-bold text-gray-900">
                              {currencySymbol(wallet.currency)}{wallet.balance}
                            </td>
                            <td className="px-5 py-4 text-sm text-gray-600">
                              {currencySymbol(wallet.currency)}{wallet.available_balance}
                            </td>
                            <td className="px-5 py-4">
                              <StatusBadge isLocked={wallet.is_locked} isActive={wallet.is_active} />
                            </td>
                            <td className="px-5 py-4 text-xs text-gray-500 whitespace-nowrap">
                              {new Date(wallet.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </td>
                            <td className="px-5 py-4">
                              <button
                                onClick={() => handleToggleLock(wallet)}
                                disabled={togglingId === wallet.id}
                                className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 ${
                                  wallet.is_locked
                                    ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                                    : 'bg-red-100 text-red-600 hover:bg-red-200'
                                }`}
                              >
                                {togglingId === wallet.id ? '...' : wallet.is_locked ? 'Unlock' : 'Lock'}
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                  <p className="text-sm text-gray-500">
                    {currencyData
                      ? `Showing ${currencyData.wallets.from ?? 0}–${currencyData.wallets.to ?? 0} of ${currencyData.wallets.total} wallets`
                      : 'Loading...'}
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1 || loadingWallets}
                      className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40"
                    >
                      <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                      </svg>
                    </button>
                    {pageNumbers.map((p) => (
                      <button
                        key={p}
                        onClick={() => setCurrentPage(p)}
                        className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                          currentPage === p ? 'bg-emerald-500 text-white' : 'border border-gray-300 text-gray-600 hover:bg-gray-50'
                        }`}
                      >{p}</button>
                    ))}
                    <button
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages || loadingWallets}
                      className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40"
                    >
                      <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── LEDGER TAB — endpoint not yet mapped ── */}
          {mainTab === 'ledger' && (
            <div>
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-900">System-Wide Transaction Ledger</h2>
                <p className="text-sm text-gray-500 mt-1">Immutable record of all transactions</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <p className="text-gray-400 text-sm">Ledger endpoint not yet available.</p>
              </div>
            </div>
          )}

          {/* ── RECONCILIATION TAB ── */}
          {mainTab === 'reconciliation' && (
            <div>
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-900">System-Wide Reconciliation</h2>
                <p className="text-sm text-gray-500 mt-1">Platform wallet reconciliation status</p>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 mb-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <svg className="w-12 h-12 text-emerald-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-lg font-bold text-gray-900">All Wallets Reconciled</p>
                    <p className="text-sm text-gray-600 mt-1">Stats last refreshed: {new Date().toLocaleString()}</p>
                  </div>
                </div>
                <button
                  onClick={fetchStats}
                  className="px-6 py-2.5 bg-emerald-500 text-white rounded-lg text-sm font-semibold hover:bg-emerald-600 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                  </svg>
                  Refresh Stats
                </button>
              </div>
              {stats && (
                <div className="grid grid-cols-3 gap-6">
                  {(['USD', 'NGN', 'YAN'] as CurrencyType[]).map((cur) => (
                    <div key={cur} className="bg-white rounded-xl border border-gray-200 p-6">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-xl">{currencyFlag(cur)}</span>
                        <h3 className="text-sm font-bold text-gray-900">{cur} Wallets</h3>
                      </div>
                      <p className="text-2xl font-bold text-gray-900 mb-1">
                        {currencySymbol(cur)}{stats.by_currency[cur]?.total_balance ?? '0'}
                      </p>
                      <p className="text-xs text-gray-500">{stats.by_currency[cur]?.count ?? '0'} total wallets</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}