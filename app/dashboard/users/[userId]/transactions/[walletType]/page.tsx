'use client';

import { use, useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { usersApi } from '@/lib/api/client';
import type { AdminUserRecord } from '@/lib/api/client';
import { AUTH_ROUTES } from '@/constants/auth';
import Sidebar from '@/components/Sidebar';

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-100 rounded-lg ${className}`} />;
}

function formatDate(s: string | null) {
  if (!s) return '—';
  try { return new Date(s).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }); }
  catch { return s; }
}

function StatusBadge({ status }: { status: string }) {
  const s = status?.toLowerCase();
  const styles: Record<string, string> = {
    completed: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    pending: 'bg-orange-100 text-orange-700 border-orange-200',
    processing: 'bg-orange-100 text-orange-700 border-orange-200',
    failed: 'bg-red-100 text-red-700 border-red-200',
    'on-going': 'bg-teal-100 text-teal-700 border-teal-200',
  };
  return (
    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold border capitalize ${styles[s] ?? 'bg-gray-100 text-gray-600 border-gray-200'}`}>
      {status}
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function UserTransactionsPage({
  params,
}: {
  params: Promise<{ userId: string; walletType: string }>;
}) {
  const { userId, walletType } = use(params);
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  const [user, setUser] = useState<AdminUserRecord | null>(null);
  const [transactions, setTransactions] = useState<unknown[]>([]);
  const [pagination, setPagination] = useState<{ total: number; last_page: number; from: number; to: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingUser, setLoadingUser] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [error, setError] = useState<string | null>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);


  const fetchUser = useCallback(async () => {
    try {
      setLoadingUser(true);
      const res = await usersApi.getUser(Number(userId));
      if (res.status && res.data) setUser(res.data);
    } catch { /* silent */ }
    finally { setLoadingUser(false); }
  }, [userId]);

  const fetchTransactions = useCallback(async (
    pg: number, q: string, status: string, type: string
  ) => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await usersApi.getTransactions(Number(userId), {
        currency: walletType.toUpperCase() as 'USD' | 'NGN' | 'YAN',
        page: pg,
        per_page: 15,
        status: status || undefined,
        type: type as 'deposit' | 'withdrawal' | 'transfer' | undefined || undefined,
      });
      if (res.status && res.data) {
        const d = res.data as any;
        setTransactions(d?.data ?? []);
        if (d?.total) setPagination({ total: d.total, last_page: d.last_page, from: d.from, to: d.to });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load transactions');
    } finally { setIsLoading(false); }
  }, [userId, walletType]);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchUser();
    fetchTransactions(page, search, statusFilter, typeFilter);
  }, [isAuthenticated, fetchUser, fetchTransactions]);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchTransactions(page, search, statusFilter, typeFilter);
  }, [page, statusFilter, typeFilter]);

  // ── 2. Auth guard after all hooks ──
  if (!isAuthenticated) return null;

  // ── 3. Handlers ──
  const handleSearch = (val: string) => {
    setSearch(val);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setPage(1);
      fetchTransactions(1, val, statusFilter, typeFilter);
    }, 400);
  };

  const walletLabel = walletType.toUpperCase();
  const currencySymbol = walletLabel === 'USD' ? '$' : walletLabel === 'NGN' ? '₦' : '¥';

  // User display name from camelCase (detail endpoint) or snake_case (list endpoint)
  const firstName = (user as any)?.firstName ?? user?.first_name ?? '';
  const lastName = (user as any)?.lastName ?? user?.last_name ?? '';
  const email = user?.email ?? '';
  const displayName = [firstName, lastName].filter(Boolean).join(' ') || email;
  const initials = `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase() || email?.slice(0, 2).toUpperCase();

  const totalPages = pagination?.last_page ?? 1;
  const pageNumbers = Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
    if (totalPages <= 5) return i + 1;
    if (page <= 3) return i + 1;
    if (page >= totalPages - 2) return totalPages - 4 + i;
    return page - 2 + i;
  });

  return (
    <div className="flex h-screen bg-gray-50 font-['DM_Sans']">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">

          {/* Header */}
          <div className="bg-white border-b border-gray-200 px-8 py-6">
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => router.push(`/dashboard/users/${userId}`)}
                className="flex items-center gap-2 text-gray-700 hover:text-gray-900 transition-colors">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-800 text-white">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                  </svg>
                </span>
                <span className="text-sm font-semibold">Back to User Profile</span>
              </button>

              {loadingUser ? <Skeleton className="h-10 w-48" /> : (
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-sm font-bold">
                    {initials}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{displayName}</p>
                    <p className="text-xs text-gray-500">{email}</p>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                      </svg>
                      {((user as any)?.isActive ?? user?.is_active) ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <h2 className="text-xl font-bold text-gray-900 mb-0.5">
              All {walletLabel} Wallet Transactions
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Complete transaction history for this user's {walletLabel} wallet
            </p>

            {/* Filters */}
            <div className="flex items-center gap-3">
              <div className="flex-1 relative">
                <svg className="w-4 h-4 text-gray-400 absolute left-3 top-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                <input type="text" value={search} onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Search by name, wallet ID or transaction ID..."
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
                className="px-4 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white">
                <option value="">All Types</option>
                <option value="deposit">Deposit</option>
                <option value="withdrawal">Withdrawal</option>
                <option value="transfer">Transfer</option>
              </select>
              <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                className="px-4 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white">
                <option value="">All Status</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </select>
              <button className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-500 text-white rounded-xl text-sm font-semibold hover:bg-emerald-600 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Export
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="p-8">
            {error && <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl"><p className="text-sm text-red-600">{error}</p></div>}

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-sm font-bold text-gray-900">
                  All {walletLabel} Transactions
                  {pagination && <span className="text-gray-400 font-normal ml-2">({pagination.total.toLocaleString()} total)</span>}
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      {['Txn. ID', 'Type', 'Category', 'Amount', 'Status', 'Fee', 'Date/Time', 'Action'].map((h) => (
                        <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {isLoading ? (
                      [...Array(8)].map((_, i) => (
                        <tr key={i}>{[...Array(8)].map((_, j) => (
                          <td key={j} className="px-6 py-4"><Skeleton className="h-5 w-full" /></td>
                        ))}</tr>
                      ))
                    ) : transactions.length === 0 ? (
                      <tr><td colSpan={8} className="px-6 py-12 text-center text-gray-400 text-sm">
                        No transactions found for this {walletLabel} wallet
                      </td></tr>
                    ) : (
                      (transactions as any[]).map((tx: any, i: number) => (
                        <tr key={tx.id ?? i} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 text-xs text-gray-600 font-mono whitespace-nowrap">
                            {tx.reference ?? tx.id ?? '—'}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900 capitalize whitespace-nowrap">
                            {tx.type ?? '—'}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600 capitalize whitespace-nowrap">
                            {tx.category ?? '—'}
                          </td>
                          <td className={`px-6 py-4 text-sm font-bold whitespace-nowrap ${
                            tx.category === 'credit' || tx.type === 'deposit'
                              ? 'text-emerald-600'
                              : 'text-red-600'
                          }`}>
                            {tx.category === 'credit' || tx.type === 'deposit' ? '+' : ''}{tx.amount ?? '—'}
                          </td>
                          <td className="px-6 py-4">
                            <StatusBadge status={tx.status ?? 'unknown'} />
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                            {tx.fee ?? '—'}
                          </td>
                          <td className="px-6 py-4 text-xs text-gray-500 whitespace-nowrap">
                            {formatDate(tx.createdAt ?? tx.created_at)}
                          </td>
                          <td className="px-6 py-4">
                            <button className="text-sm text-emerald-600 hover:text-emerald-700 font-medium">
                              View
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
                  {pagination ? `Showing ${pagination.from ?? 0}–${pagination.to ?? 0} of ${pagination.total.toLocaleString()} results` : ''}
                </p>
                <div className="flex items-center gap-1">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                    className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40">
                    <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                    </svg>
                  </button>
                  {pageNumbers.map((p) => (
                    <button key={p} onClick={() => setPage(p)}
                      className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium ${
                        page === p ? 'bg-emerald-500 text-white' : 'border border-gray-300 text-gray-600 hover:bg-gray-50'
                      }`}>{p}</button>
                  ))}
                  <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                    className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40">
                    <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}