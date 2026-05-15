'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { banksApi } from '@/lib/api/client';
import type {
  ChineseBank,
  PaymentProviderStat,
  PayoutTransaction,
  PayoutStats,
} from '@/lib/api/client';
import { AUTH_ROUTES } from '@/constants/auth';
import Sidebar from '@/components/Sidebar';
import DashboardHeader from '@/components/DashboardHeader';

type TabType = 'bank-status' | 'payout' | 'chinese-banks';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-100 rounded-lg ${className}`} />;
}

function StatusBadge({ status }: { status: string }) {
  const s = status?.toLowerCase();
  const styles =
    s === 'online' || s === 'success' || s === 'completed' || s === 'active'
      ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
      : s === 'failed' || s === 'offline' || s === 'inactive'
      ? 'bg-red-100 text-red-700 border-red-200'
      : s === 'warning' || s === 'pending' || s === 'processing'
      ? 'bg-orange-100 text-orange-700 border-orange-200'
      : 'bg-gray-100 text-gray-600 border-gray-200';

  return (
    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold border capitalize ${styles}`}>
      {status}
    </span>
  );
}

function StatCard({
  label,
  value,
  color,
  loading,
}: {
  label: string;
  value: string | number;
  color: 'green' | 'blue' | 'yellow' | 'red';
  loading?: boolean;
}) {
  const bg = { green: 'bg-emerald-50', blue: 'bg-blue-50', yellow: 'bg-yellow-50', red: 'bg-red-50' }[color];
  const text = { green: 'text-emerald-700', blue: 'text-blue-700', yellow: 'text-yellow-700', red: 'text-red-700' }[color];
  return (
    <div className={`${bg} rounded-xl p-5`}>
      <p className="text-xs font-medium text-gray-500 mb-2">{label}</p>
      {loading ? <Skeleton className="h-9 w-24" /> : (
        <p className={`text-3xl font-bold ${text}`}>{value}</p>
      )}
    </div>
  );
}


export default function BanksPayoutsPage() {
  const router = useRouter();
  const { isAuthenticated, user: authUser } = useAuthStore();

  const [activeTab, setActiveTab] = useState<TabType>('bank-status');

  // Bank Status tab
  const [providers, setProviders] = useState<PaymentProviderStat[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(true);

  // Payout tab
  const [payouts, setPayouts] = useState<PayoutTransaction[]>([]);
  const [payoutStats, setPayoutStats] = useState<PayoutStats | null>(null);
  const [payoutPagination, setPayoutPagination] = useState<{ total: number; last_page: number; from: number; to: number } | null>(null);
  const [loadingPayouts, setLoadingPayouts] = useState(false);
  const [loadingPayoutStats, setLoadingPayoutStats] = useState(true);
  const [payoutPage, setPayoutPage] = useState(1);
  const [payoutSearch, setPayoutSearch] = useState('');
  const [payoutStatus, setPayoutStatus] = useState('');
  const [payoutCurrency, setPayoutCurrency] = useState('');
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Chinese Banks tab
  const [chineseBanks, setChineseBanks] = useState<ChineseBank[]>([]);
  const [loadingChineseBanks, setLoadingChineseBanks] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingBank, setEditingBank] = useState<ChineseBank | null>(null);
  const [bankForm, setBankForm] = useState({ name: '', code: '', is_active: true });
  const [savingBank, setSavingBank] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [error, setError] = useState<string | null>(null);


  const fetchProviders = useCallback(async () => {
    try {
      setLoadingProviders(true);
      setError(null);
      const res = await banksApi.getProviderStats();
      if (res.status) setProviders(res.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load provider stats');
    } finally {
      setLoadingProviders(false);
    }
  }, []);

  // Fetch payout stats
  const fetchPayoutStats = useCallback(async () => {
    try {
      setLoadingPayoutStats(true);
      const res = await banksApi.getPayoutStats();
      if (res.status) setPayoutStats(res.data);
    } catch { /* silent */ } finally {
      setLoadingPayoutStats(false);
    }
  }, []);

  // Fetch payout transactions
  const fetchPayouts = useCallback(async (
    page: number, search: string, status: string, currency: string
  ) => {
    try {
      setLoadingPayouts(true);
      setError(null);
      const res = await banksApi.getPayouts({
        page,
        per_page: 15,
        search: search || undefined,
        status: status || undefined,
        currency: currency || undefined,
      });
      if (res.status) {
        const d = res.data;
        if (d && typeof d === 'object' && 'data' in d) {
          const paginated = d as { data: PayoutTransaction[]; total: number; last_page: number; from: number; to: number };
          setPayouts(paginated.data ?? []);
          setPayoutPagination({ total: paginated.total, last_page: paginated.last_page, from: paginated.from, to: paginated.to });
        } else {
          setPayouts([]);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load payouts');
    } finally {
      setLoadingPayouts(false);
    }
  }, []);

  // Fetch Chinese banks
  const fetchChineseBanks = useCallback(async () => {
    try {
      setLoadingChineseBanks(true);
      setError(null);
      const res = await banksApi.getChineseBanks();
      if (res.status) setChineseBanks(res.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load Chinese banks');
    } finally {
      setLoadingChineseBanks(false);
    }
  }, []);

  // Tab change effects — MUST be before the auth guard
  useEffect(() => {
    if (!isAuthenticated) return;
    if (activeTab === 'bank-status') fetchProviders();
    if (activeTab === 'payout') {
      fetchPayoutStats();
      fetchPayouts(payoutPage, payoutSearch, payoutStatus, payoutCurrency);
    }
    if (activeTab === 'chinese-banks') fetchChineseBanks();
  }, [activeTab, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (activeTab === 'payout') {
      fetchPayouts(payoutPage, payoutSearch, payoutStatus, payoutCurrency);
    }
  }, [payoutPage, payoutStatus, payoutCurrency]);

  // Auth guard — ALWAYS after every hook and useEffect
  if (!isAuthenticated) return null;

  const handleSearchChange = (val: string) => {
    setPayoutSearch(val);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setPayoutPage(1);
      fetchPayouts(1, val, payoutStatus, payoutCurrency);
    }, 400);
  };

  const handleSaveBank = async () => {
    if (!bankForm.name.trim() || !bankForm.code.trim()) return;
    try {
      setSavingBank(true);
      if (editingBank) {
        const res = await banksApi.updateChineseBank(editingBank.id, bankForm);
        if (res.status) setChineseBanks((prev) => prev.map((b) => b.id === editingBank.id ? res.data : b));
      } else {
        const res = await banksApi.addChineseBank(bankForm);
        if (res.status) setChineseBanks((prev) => [res.data, ...prev]);
      }
      setShowAddModal(false);
      setEditingBank(null);
      setBankForm({ name: '', code: '', is_active: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save bank');
    } finally {
      setSavingBank(false);
    }
  };

  const handleDeactivateBank = async (bank: ChineseBank) => {
    try {
      setDeletingId(bank.id);
      const res = await banksApi.deactivateChineseBank(bank.id);
      if (res.status) setChineseBanks((prev) => prev.filter((b) => b.id !== bank.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to deactivate bank');
    } finally {
      setDeletingId(null);
    }
  };

  const totalPayoutPages = payoutPagination?.last_page ?? 1;
  const payoutPageNumbers = Array.from({ length: Math.min(totalPayoutPages, 5) }, (_, i) => {
    if (totalPayoutPages <= 5) return i + 1;
    if (payoutPage <= 3) return i + 1;
    if (payoutPage >= totalPayoutPages - 2) return totalPayoutPages - 4 + i;
    return payoutPage - 2 + i;
  });

  return (
    <div className="flex h-screen bg-gray-50 font-['DM_Sans']">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">

          {/* Header */}
          <div className="bg-white border-b border-gray-200 px-8 py-6">
            {/* <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Banks & Payouts</h1>
                <p className="text-sm text-gray-500 mt-0.5">Monitor bank status, payouts, and Chinese banks</p>
              </div>
              <div className="flex items-center gap-4">
                <button className="relative p-2 hover:bg-gray-100 rounded-xl">
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312.665" />
                  </svg>
                </button>
                <div className="flex items-center gap-3 cursor-pointer">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white text-xs font-bold">
                    {((authUser?.first_name?.[0] ?? '') + (authUser?.last_name?.[0] ?? '')) || 'A'}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{authUser?.first_name ?? authUser?.email ?? 'Admin'}</p>
                    <p className="text-xs text-gray-500">Admin</p>
                  </div>
                </div>
              </div>
            </div> */}
          <DashboardHeader title="Banks & Payouts" subtitle="Monitor bank status, payouts, and Chinese banks" />

            {/* Tabs */}
            <div className="flex items-center gap-3 mt-4">
              {[
                { id: 'bank-status', label: 'Bank Status' },
                { id: 'payout', label: 'Payout' },
                { id: 'chinese-banks', label: 'Chinese Banks' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`px-8 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                    activeTab === tab.id
                      ? 'bg-emerald-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
          <div className="p-8">
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* ── BANK STATUS TAB ── */}
            {activeTab === 'bank-status' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Payment Provider Stats</h2>
                    <p className="text-sm text-gray-500 mt-0.5">DVA accounts, transactions and success rates per provider</p>
                  </div>
                  <button
                    onClick={fetchProviders}
                    disabled={loadingProviders}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-500 text-white rounded-lg text-sm font-semibold hover:bg-emerald-600 disabled:opacity-50 transition-colors"
                  >
                    <svg className={`w-4 h-4 ${loadingProviders ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                    </svg>
                    Refresh
                  </button>
                </div>

                {loadingProviders ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-40 w-full" />)}
                  </div>
                ) : providers.length === 0 ? (
                  <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                    <p className="text-gray-400 text-sm">No provider data available</p>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {providers.map((p) => (
                      <div key={p.provider} className="bg-white rounded-xl border border-gray-200 p-6">
                        <div className="flex items-start justify-between mb-5">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
                              {p.provider?.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <h3 className="text-base font-bold text-gray-900 capitalize">{p.provider}</h3>
                              <p className="text-sm text-gray-500">Payment Provider</p>
                            </div>
                          </div>
                          <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold border ${
                            p.success_rate >= 95
                              ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                              : p.success_rate >= 80
                              ? 'bg-yellow-100 text-yellow-700 border-yellow-200'
                              : 'bg-red-100 text-red-700 border-red-200'
                          }`}>
                            {p.success_rate >= 95 ? 'HEALTHY' : p.success_rate >= 80 ? 'DEGRADED' : 'CRITICAL'}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-6 mb-5">
                          <div>
                            <p className="text-sm text-gray-600 mb-1">Success Rate</p>
                            <div className="flex items-center gap-3">
                              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className={`h-full ${p.success_rate >= 95 ? 'bg-emerald-500' : p.success_rate >= 80 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                  style={{ width: `${Math.min(p.success_rate, 100)}%` }}
                                />
                              </div>
                              <span className="text-sm font-bold text-gray-900">{p.success_rate}%</span>
                            </div>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Active Accounts</p>
                            <p className="text-sm font-bold text-gray-900 mt-1">{p.active_accounts}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-6">
                          <div>
                            <p className="text-sm text-gray-600">Total Accounts</p>
                            <p className="text-base font-bold text-gray-900 mt-1">{p.total_accounts}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Total Transactions</p>
                            <p className="text-base font-bold text-gray-900 mt-1">{p.total_transactions.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Completed</p>
                            <p className="text-base font-bold text-emerald-600 mt-1">{p.completed_transactions.toLocaleString()}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── PAYOUT TAB ── */}
            {activeTab === 'payout' && (
              <div>
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-gray-900">Payout Transactions</h2>
                  <p className="text-sm text-gray-500 mt-0.5">All withdrawal payout transactions</p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-4 gap-5 mb-8">
                  <StatCard label="Total Payouts" value={payoutStats?.total ?? '—'} color="green" loading={loadingPayoutStats} />
                  <StatCard label="Completed" value={payoutStats?.completed ?? '—'} color="blue" loading={loadingPayoutStats} />
                  <StatCard label="Pending" value={payoutStats?.pending ?? '—'} color="yellow" loading={loadingPayoutStats} />
                  <StatCard label="Failed" value={payoutStats?.failed ?? '—'} color="red" loading={loadingPayoutStats} />
                </div>

                {/* Filters */}
                <div className="flex items-center gap-3 mb-6">
                  <div className="flex-1 relative">
                    <svg className="w-4 h-4 text-gray-400 absolute left-3 top-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                    </svg>
                    <input
                      type="text"
                      value={payoutSearch}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      placeholder="Search by user, bank or reference..."
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <select
                    value={payoutStatus}
                    onChange={(e) => { setPayoutStatus(e.target.value); setPayoutPage(1); }}
                    className="px-4 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    <option value="">All Status</option>
                    <option value="completed">Completed</option>
                    <option value="pending">Pending</option>
                    <option value="processing">Processing</option>
                    <option value="failed">Failed</option>
                  </select>
                  <select
                    value={payoutCurrency}
                    onChange={(e) => { setPayoutCurrency(e.target.value); setPayoutPage(1); }}
                    className="px-4 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    <option value="">All Currencies</option>
                    <option value="NGN">NGN</option>
                    <option value="USD">USD</option>
                    <option value="YAN">YAN</option>
                  </select>
                  <button className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-500 text-white rounded-xl text-sm font-semibold hover:bg-emerald-600 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                    Export
                  </button>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          {['Reference', 'User', 'Bank', 'Amount', 'Currency', 'Status', 'Provider', 'Date'].map((h) => (
                            <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {loadingPayouts ? (
                          [...Array(6)].map((_, i) => (
                            <tr key={i}>{[...Array(8)].map((_, j) => (
                              <td key={j} className="px-6 py-4"><Skeleton className="h-5 w-full" /></td>
                            ))}</tr>
                          ))
                        ) : payouts.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="px-6 py-12 text-center text-gray-400 text-sm">
                              No payout transactions found
                            </td>
                          </tr>
                        ) : (
                          payouts.map((tx, i) => (
                            <tr key={tx.id ?? i} className="hover:bg-gray-50 transition-colors">
                              <td className="px-6 py-4 text-xs text-gray-600 whitespace-nowrap">{String(tx.reference ?? '—')}</td>
                              <td className="px-6 py-4">
                                <div>
                                  <p className="text-sm font-medium text-gray-900">{String(tx.user ?? '—')}</p>
                                  <p className="text-xs text-gray-400">{String(tx.email ?? '')}</p>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">{String(tx.bank ?? '—')}</td>
                              <td className="px-6 py-4 text-sm font-bold text-gray-900">{String(tx.amount ?? '—')}</td>
                              <td className="px-6 py-4 text-sm text-gray-600">{String(tx.currency ?? '—')}</td>
                              <td className="px-6 py-4"><StatusBadge status={String(tx.status ?? 'unknown')} /></td>
                              <td className="px-6 py-4 text-sm text-gray-600 capitalize">{String(tx.provider ?? '—')}</td>
                              <td className="px-6 py-4 text-xs text-gray-500 whitespace-nowrap">
                                {tx.created_at ? new Date(String(tx.created_at)).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
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
                      {payoutPagination
                        ? `Showing ${payoutPagination.from ?? 0}–${payoutPagination.to ?? 0} of ${(payoutPagination.total ?? 0).toLocaleString()}`
                        : 'Loading...'}
                    </p>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setPayoutPage((p) => Math.max(1, p - 1))} disabled={payoutPage === 1 || loadingPayouts}
                        className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40">
                        <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                        </svg>
                      </button>
                      {payoutPageNumbers.map((p) => (
                        <button key={p} onClick={() => setPayoutPage(p)}
                          className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium ${payoutPage === p ? 'bg-emerald-500 text-white' : 'border border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
                          {p}
                        </button>
                      ))}
                      <button onClick={() => setPayoutPage((p) => Math.min(totalPayoutPages, p + 1))} disabled={payoutPage === totalPayoutPages || loadingPayouts}
                        className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40">
                        <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── CHINESE BANKS TAB ── */}
            {activeTab === 'chinese-banks' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Chinese Banks</h2>
                    <p className="text-sm text-gray-500 mt-0.5">Banks available for PayToChina transfers</p>
                  </div>
                  <button
                    onClick={() => { setEditingBank(null); setBankForm({ name: '', code: '', is_active: true }); setShowAddModal(true); }}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-500 text-white rounded-lg text-sm font-semibold hover:bg-emerald-600 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    Add Bank
                  </button>
                </div>

                {loadingChineseBanks ? (
                  <div className="grid grid-cols-3 gap-4">
                    {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-28" />)}
                  </div>
                ) : chineseBanks.length === 0 ? (
                  <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                    <p className="text-gray-400 text-sm">No Chinese banks found</p>
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          {['Bank Name', 'Code', 'Status', 'Actions'].map((h) => (
                            <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {chineseBanks.map((bank) => (
                          <tr key={bank.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center text-red-700 font-bold text-xs">
                                  {bank.name.slice(0, 2).toUpperCase()}
                                </div>
                                <p className="text-sm font-medium text-gray-900">{bank.name}</p>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600">{bank.code}</td>
                            <td className="px-6 py-4">
                              <StatusBadge status={bank.isActive ? 'Active' : 'Inactive'} />
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => { setEditingBank(bank); setBankForm({ name: bank.name, code: bank.code, is_active: bank.isActive }); setShowAddModal(true); }}
                                  className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeactivateBank(bank)}
                                  disabled={deletingId === bank.id}
                                  className="text-sm text-red-500 hover:text-red-600 font-medium disabled:opacity-50"
                                >
                                  {deletingId === bank.id ? '...' : 'Deactivate'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Add/Edit Chinese Bank Modal */}
      {showAddModal && (
        <>
          <div className="fixed inset-0 bg-gray-900 bg-opacity-50 z-40" onClick={() => setShowAddModal(false)} />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-none">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 pointer-events-auto shadow-2xl">
              <h3 className="text-xl font-bold text-gray-900 mb-6">
                {editingBank ? 'Edit Chinese Bank' : 'Add Chinese Bank'}
              </h3>
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name *</label>
                  <input
                    type="text"
                    value={bankForm.name}
                    onChange={(e) => setBankForm((p) => ({ ...p, name: e.target.value }))}
                    placeholder="e.g. Industrial and Commercial Bank of China"
                    maxLength={255}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bank Code *</label>
                  <input
                    type="text"
                    value={bankForm.code}
                    onChange={(e) => setBankForm((p) => ({ ...p, code: e.target.value }))}
                    placeholder="e.g. ICBC"
                    maxLength={20}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={bankForm.is_active}
                      onChange={(e) => setBankForm((p) => ({ ...p, is_active: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500" />
                  </label>
                  <span className="text-sm font-medium text-gray-700">Active</span>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowAddModal(false)} className="flex-1 px-6 py-2.5 border border-gray-300 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50">
                  Cancel
                </button>
                <button
                  onClick={handleSaveBank}
                  disabled={savingBank || !bankForm.name.trim() || !bankForm.code.trim()}
                  className="flex-1 px-6 py-2.5 bg-emerald-500 text-white rounded-xl text-sm font-semibold hover:bg-emerald-600 disabled:opacity-50"
                >
                  {savingBank ? 'Saving...' : editingBank ? 'Update Bank' : 'Add Bank'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}