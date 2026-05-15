'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { usersApi } from '@/lib/api/client';
import type { AdminUserRecord, PaginatedResponse } from '@/lib/api/client';
import { AUTH_ROUTES } from '@/constants/auth';
import Sidebar from '@/components/Sidebar';
import DashboardHeader from '@/components/DashboardHeader';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(first: string | null, last: string | null, email: string) {
  if (first && last) return `${first[0]}${last[0]}`.toUpperCase();
  if (first) return first.slice(0, 2).toUpperCase();
  return email.slice(0, 2).toUpperCase();
}

function getFullName(user: AdminUserRecord) {
  if (user.first_name && user.last_name) return `${user.first_name} ${user.last_name}`;
  if (user.first_name) return user.first_name;
  return user.email;
}

// ─── Badges ───────────────────────────────────────────────────────────────────

function AccountStatusBadge({ isActive }: { isActive: boolean }) {
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
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200">
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
      </svg>
      Frozen
    </span>
  );
}

function KYCStatusBadge({ status }: { status: string | null }) {
  const s = (status ?? 'pending').toLowerCase();
  const styles =
    s === 'verified' || s === 'approved'
      ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
      : s === 'rejected'
      ? 'bg-red-100 text-red-700 border-red-200'
      : 'bg-orange-100 text-orange-700 border-orange-200';
  const label = s === 'verified' || s === 'approved' ? 'Verified' : s === 'rejected' ? 'Rejected' : 'Pending';
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${styles}`}>
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m6 2.25a6 6 0 11-12 0 6 6 0 0112 0z" />
      </svg>
      {label}
    </span>
  );
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-100 rounded ${className}`} />;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function UsersPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  const [pagination, setPagination] = useState<PaginatedResponse<AdminUserRecord> | null>(null);
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');
  const [kycFilter, setKycFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchUsers = useCallback(async (page: number, q: string, kyc: string, active: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const params: Record<string, string | number | boolean> = { page, per_page: 15 };
      if (q) params.search = q;
      if (kyc) params.kyc_status = kyc;
      if (active !== '') params.is_active = active === 'active';

      const res = await usersApi.getUsers(params as Parameters<typeof usersApi.getUsers>[0]);
      if (res.status && res.data) {
        setUsers(res.data.data ?? []);
        setPagination(res.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers(currentPage, search, kycFilter, statusFilter);
  }, [currentPage, kycFilter, statusFilter]);

  // Debounce search
  const handleSearchChange = (val: string) => {
    setSearch(val);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setCurrentPage(1);
      fetchUsers(1, val, kycFilter, statusFilter);
    }, 400);
  };

  const handleToggleStatus = async (user: AdminUserRecord) => {
    try {
      setTogglingId(user.id);
      const res = await usersApi.toggleStatus(user.id);
      if (res.status) {
        setUsers((prev) => prev.map((u) => u.id === user.id ? res.data : u));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle status');
    } finally {
      setTogglingId(null);
    }
  };

  // Auth guard — after all hooks
  if (!isAuthenticated) return null;

  // Derived stats from current page (real totals come from pagination)
  const totalUsers = pagination?.total ?? 0;
  const activeCount = users.filter((u) => u.is_active).length;
  const verifiedCount = users.filter((u) => ['verified', 'approved'].includes((u.kyc_status ?? '').toLowerCase())).length;
  const pendingCount = users.filter((u) => (u.kyc_status ?? 'pending').toLowerCase() === 'pending').length;

  const totalPages = pagination?.last_page ?? 1;
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
        <header className="bg-white border-b border-gray-200 px-8 py-5">
          <DashboardHeader title="Users" subtitle="Inspect, control, and restrict user activity" />

          {/* Search + Filters */}
          <div className="mt-4 flex items-center gap-3">
            <div className="flex-1 max-w-xl relative">
              <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search by name, email or Changpay ID..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              />
            </div>
            <select
              value={kycFilter}
              onChange={(e) => { setKycFilter(e.target.value); setCurrentPage(1); }}
              className="px-4 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            >
              <option value="">All KYC</option>
              <option value="approved">Verified</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="px-4 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="frozen">Frozen</option>
            </select>
          </div>
        </header>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-4 gap-5 mb-6">
            {[
              { label: 'Total Users', value: totalUsers.toLocaleString(), color: 'text-gray-900' },
              { label: 'Active (this page)', value: String(activeCount), color: 'text-emerald-600' },
              { label: 'KYC Verified', value: String(verifiedCount), color: 'text-emerald-600' },
              { label: 'KYC Pending', value: String(pendingCount), color: 'text-orange-500' },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-5">
                <p className="text-xs font-medium text-gray-500">{s.label}</p>
                {isLoading ? (
                  <Skeleton className="h-8 w-20 mt-1" />
                ) : (
                  <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
                )}
              </div>
            ))}
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    {['User', 'Changpay ID', 'Status', 'KYC', 'Last Login', 'Action'].map((h) => (
                      <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {isLoading ? (
                    [...Array(8)].map((_, i) => (
                      <tr key={i}>
                        {[...Array(6)].map((_, j) => (
                          <td key={j} className="px-5 py-4"><Skeleton className="h-5 w-full" /></td>
                        ))}
                      </tr>
                    ))
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-12 text-center text-gray-400 text-sm">
                        No users found
                      </td>
                    </tr>
                  ) : (
                    users.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                        {/* User */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                              {getInitials(user.first_name, user.last_name, user.email)}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{getFullName(user)}</p>
                              <p className="text-xs text-gray-400">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        {/* Changpay ID */}
                        <td className="px-5 py-4 text-sm text-gray-600 whitespace-nowrap">
                          {user.changpay_id ?? '—'}
                        </td>
                        {/* Status — clickable to toggle */}
                        <td className="px-5 py-4">
                          <button
                            onClick={() => handleToggleStatus(user)}
                            disabled={togglingId === user.id}
                            className="disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Click to toggle status"
                          >
                            <AccountStatusBadge isActive={user.is_active} />
                          </button>
                        </td>
                        {/* KYC */}
                        <td className="px-5 py-4">
                          <KYCStatusBadge status={user.kyc_status} />
                        </td>
                        {/* Last Login */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          <p className="text-xs text-gray-900">
                            {user.updated_at ? new Date(user.updated_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                          </p>
                        </td>
                        {/* Action */}
                        <td className="px-5 py-4">
                          <button
                            onClick={() => router.push(`/dashboard/users/${user.id}`)}
                            className="text-sm text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1 whitespace-nowrap"
                          >
                            View Profile
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                            </svg>
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
                {pagination
                  ? `Showing ${pagination.from ?? 0}–${pagination.to ?? 0} of ${(pagination.total ?? 0).toLocaleString()} users`
                  : 'Loading...'}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1 || isLoading}
                  className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
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
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages || isLoading}
                  className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}