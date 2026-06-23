'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { usersApi } from '@/lib/api/client';
import type { AdminUserRecord, MetaPaginatedResponse } from '@/lib/api/client';
import Sidebar from '@/components/Sidebar';
import DashboardHeader from '@/components/DashboardHeader';

/* ── Helpers ── */
function getInitials(first: string | null, last: string | null, email: string) {
  if (first && last) return `${first[0]}${last[0]}`.toUpperCase();
  if (first) return first.slice(0, 2).toUpperCase();
  return email.slice(0, 2).toUpperCase();
}
function getFullName(u: AdminUserRecord) {
  const first = u.firstName ?? u.first_name;
  const last  = u.lastName  ?? u.last_name;
  if (first && last) return `${first} ${last}`;
  if (first) return first;
  return u.email;
}
function timeAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? '' : 's'} ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
  return `${Math.floor(days / 30)} month${Math.floor(days / 30) === 1 ? '' : 's'} ago`;
}
function formatLoginDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-US', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: true,
  }).replace(',', '');
}

/* ── Avatar ── */
const COLORS = ['from-teal-400 to-teal-600','from-blue-400 to-blue-600','from-purple-400 to-purple-600','from-orange-400 to-orange-600','from-rose-400 to-rose-600','from-emerald-400 to-emerald-600'];
function Avatar({ user }: { user: AdminUserRecord }) {
  if (user.avatarUrl) {
    return <img src={user.avatarUrl} alt={user.firstName ?? user.email} className="w-8 h-8 rounded-full object-cover shrink-0" />;
  }
  return (
    <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${COLORS[user.id % COLORS.length]} flex items-center justify-center text-white text-[11px] font-bold shrink-0`}>
      {getInitials(user.firstName ?? user.first_name, user.lastName ?? user.last_name, user.email)}
    </div>
  );
}

/* ── Status Badge — Figma: Active=#0274D8 outlined ── */
function StatusBadge({ isActive }: { isActive: boolean }) {
  return isActive ? (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border whitespace-nowrap" style={{ borderColor: '#0274D8', color: '#0274D8', backgroundColor: 'white' }}>
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
      Active
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border border-gray-300 text-gray-500 bg-white whitespace-nowrap">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
      Frozen
    </span>
  );
}

/* ── KYC / KYB Badge ── */
function VerifBadge({ status, label: forceLabel }: { status: string | null; label?: string }) {
  const s = (status ?? '').toLowerCase();
  const isVerified = s === 'verified' || s === 'approved';
  const isRejected = s === 'rejected';
  const isAction   = s === 'action_required';
  const color = isVerified ? '#339D88' : isRejected ? '#FF756B' : isAction ? '#DC6803' : '#9E4300';
  const label = forceLabel ?? (isVerified ? 'Verified' : isRejected ? 'Rejected' : isAction ? 'Action Req.' : s === 'not_started' ? 'Not Started' : 'Pending');
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border whitespace-nowrap bg-white" style={{ borderColor: color, color }}>
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <circle cx="12" cy="12" r="10"/>
        {isVerified && <path d="m9 12 2 2 4-4"/>}
        {!isVerified && <path d="M12 8v4m0 4h.01"/>}
      </svg>
      {label}
    </span>
  );
}

/* ── Balance cell ── */
function Bal({ value, flag, symbol }: { value?: string | number | null; flag: string; symbol: string }) {
  if (value == null) return <span className="text-gray-400 text-sm">—</span>;
  return (
    <span className="flex items-center gap-1 text-sm text-gray-800 whitespace-nowrap">
      <span className="text-base leading-none">{flag}</span>
      {symbol}{Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
    </span>
  );
}

/* ── Skeleton ── */
function Sk() { return <div className="animate-pulse bg-gray-100 rounded h-4 w-full"/>; }

/* ── Pagination — matches Figma ← 1 2 3 … 5 → ── */
function Pagination({ current, total, onChange }: { current: number; total: number; onChange: (p: number) => void }) {
  if (total <= 1) return null;
  const pages: (number | '…')[] = [];
  if (total <= 7) { for (let i = 1; i <= total; i++) pages.push(i); }
  else {
    pages.push(1);
    if (current > 3) pages.push('…');
    for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i);
    if (current < total - 2) pages.push('…');
    pages.push(total);
  }
  const navBtn = (icon: React.ReactNode, page: number, disabled: boolean) => (
    <button key={page} onClick={() => !disabled && onChange(page)} disabled={disabled}
      className="w-7 h-7 flex items-center justify-center rounded border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
      {icon}
    </button>
  );
  return (
    <div className="flex items-center gap-1">
      {navBtn(<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6"/></svg>, current - 1, current === 1)}
      {pages.map((p, i) => p === '…'
        ? <span key={`d${i}`} className="w-7 h-7 flex items-center justify-center text-sm text-gray-400">…</span>
        : <button key={p} onClick={() => onChange(p as number)}
            className="w-7 h-7 flex items-center justify-center rounded text-sm font-medium border transition-colors"
            style={p === current ? { backgroundColor: '#012D32', color: 'white', borderColor: '#012D32' } : { borderColor: '#E5E7EB', color: '#374151' }}>
            {p}
          </button>
      )}
      {navBtn(<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>, current + 1, current === total)}
    </div>
  );
}

/* ── CSV export ── */
function exportUsersCSV(users: AdminUserRecord[]) {
  const headers = ['Name','Email','Changpay ID','Status','KYC','KYB','Email Verified','USD Balance','NGN Balance','YUAN Balance','Joined','Last Login'];
  const rows = users.map(u => [
    [u.firstName ?? u.first_name, u.lastName ?? u.last_name].filter(Boolean).join(' ') || u.email,
    u.email,
    u.changpayId ?? '',
    (u.isActive ?? u.is_active) ? 'Active' : 'Frozen',
    u.kycStatus ?? u.kyc_status ?? '',
    u.kybStatus ?? '',
    u.emailVerified ? 'Yes' : 'No',
    u.balances?.USD ?? '',
    u.balances?.NGN ?? '',
    u.balances?.YAN ?? '',
    u.createdAt ?? u.created_at ?? '',
    u.lastLoginAt ?? '',
  ]);
  const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = `users-${new Date().toISOString().slice(0,10)}.csv`; a.click();
  URL.revokeObjectURL(url);
}

/* ── Page ── */
export default function UsersPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [pagination, setPagination] = useState<MetaPaginatedResponse<AdminUserRecord> | null>(null);
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [kycFilter, setKycFilter] = useState('');
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchUsers = useCallback(async (page: number, q: string, status: string, kyc: string) => {
    try {
      setIsLoading(true); setError(null);
      const params: Parameters<typeof usersApi.getUsers>[0] = { page, per_page: 10 };
      if (q) params.search = q;
      if (status) params.is_active = status === 'active';
      if (kyc) params.kyc_status = kyc;
      const res = await usersApi.getUsers(params);
      if (res.status && res.data) { setUsers(res.data.data ?? []); setPagination(res.data); }
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed'); }
    finally { setIsLoading(false); }
  }, []);

  useEffect(() => { fetchUsers(currentPage, search, statusFilter, kycFilter); }, [currentPage, statusFilter, kycFilter]);

  const handleSearch = (val: string) => {
    setSearch(val);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => { setCurrentPage(1); fetchUsers(1, val, statusFilter, kycFilter); }, 400);
  };

  const handleStatusFilter = (val: string) => { setStatusFilter(val); setCurrentPage(1); };
  const handleKycFilter = (val: string) => { setKycFilter(val); setCurrentPage(1); };

  const handleToggle = async (user: AdminUserRecord) => {
    try {
      setTogglingId(user.id);
      const res = await usersApi.toggleStatus(user.id);
      if (res.status) setUsers(prev => prev.map(u => u.id === user.id ? res.data : u));
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed'); }
    finally { setTogglingId(null); }
  };

  if (!isAuthenticated) return null;

  const totalUsers = pagination?.meta?.total ?? 0;
  const activeCount = users.filter(u => u.isActive ?? u.is_active).length;
  const verifiedCount = users.filter(u => ['verified','approved'].includes(((u.kycStatus ?? u.kyc_status) ?? '').toLowerCase())).length;
  const pendingCount = users.filter(u => !['verified','approved','rejected'].includes(((u.kycStatus ?? u.kyc_status) ?? 'pending').toLowerCase())).length;
  const totalPages = pagination?.meta?.last_page ?? 1;

  return (
    <div className="flex h-screen bg-white font-['DM_Sans']">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Header */}
        <div className="bg-white border-b border-gray-100 px-8 py-5 shrink-0">
          <DashboardHeader title="Users" subtitle="Inspect, control, and restrict user activity" />
        </div>

        <div className="flex-1 overflow-y-auto px-8 py-5 space-y-5 bg-white">
          {error && <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">{error}</div>}

          {/* Filters row */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-lg">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input type="text" value={search} onChange={e => handleSearch(e.target.value)}
                placeholder="Search by name, email or Changpay ID..."
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-[#F8F9FA] border border-gray-200 rounded-full text-gray-700 placeholder-gray-400 focus:outline-none focus:border-gray-400 shadow-sm"/>
            </div>
            <select value={statusFilter} onChange={e => handleStatusFilter(e.target.value)}
              className="px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 shrink-0">
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Frozen</option>
            </select>
            <select value={kycFilter} onChange={e => handleKycFilter(e.target.value)}
              className="px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 shrink-0">
              <option value="">All KYC</option>
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
              <option value="not_started">Not Started</option>
            </select>
            <button onClick={() => exportUsersCSV(users)}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white rounded-xl shrink-0"
              style={{ backgroundColor: '#009F51' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Export
            </button>
          </div>

          {/* Stat cards — match Figma exactly */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: 'Total Users', val: totalUsers.toLocaleString(), cls: 'text-gray-900' },
              { label: 'Active', val: String(activeCount || (pagination?.meta?.total ?? 0)), cls: 'text-emerald-500' },
              { label: 'KYC Verified', val: String(verifiedCount), cls: 'text-emerald-500' },
              { label: 'KYC Pending', val: String(pendingCount), cls: 'text-orange-500' },
            ].map(s => (
              <div key={s.label} className="bg-[#F8F9FA] rounded-xl border border-gray-200 p-5">
                <p className="text-xs text-gray-500 font-medium mb-2">{s.label}</p>
                {isLoading ? <div className="animate-pulse bg-gray-100 h-9 w-24 rounded"/> :
                  <p className={`text-3xl font-bold ${s.cls}`}>{s.val}</p>}
              </div>
            ))}
          </div>

          {/* Table — Figma: gray thead bg, border, rounded container */}
          <div className="rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[1300px]">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    {['User','Changpay ID','Status','KYC','KYB','Email Verified','USD Balance','NGN Balance','YUAN Balance','Joined','Last Login','Action'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap first:pl-6 last:pr-6">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                
                <tbody className="bg-white divide-y divide-gray-100">
                  {isLoading ? (
                    [...Array(8)].map((_, i) => (
                      <tr key={i}>
                        {[...Array(12)].map((_, j) => <td key={j} className="px-4 py-3.5"><Sk/></td>)}
                      </tr>
                    ))
                  ) : users.length === 0 ? (
                    <tr><td colSpan={12} className="px-4 py-12 text-center text-sm text-gray-400">No users found</td></tr>
                  ) : users.map(user => {
                    const emailVerified = user.emailVerified;
                    const joined = user.createdAt ?? user.created_at;
                    return (
                    <tr key={user.id} className="hover:bg-gray-50/60 transition-colors">
                      {/* User */}
                      <td className="px-4 py-3.5 pl-6 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <Avatar user={user}/>
                          <div>
                            <p className="text-sm font-semibold text-gray-900 leading-tight">
                              {[user.firstName ?? user.first_name, user.lastName ?? user.last_name].filter(Boolean).join(' ') || '—'}
                            </p>
                            <p className="text-[11px] text-gray-400">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      {/* Changpay ID */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="text-xs font-mono font-medium text-gray-700">{user.changpayId ?? user.changpay_id ?? '—'}</span>
                      </td>
                      {/* Status */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <button onClick={() => handleToggle(user)} disabled={togglingId === user.id} className="disabled:opacity-50">
                          <StatusBadge isActive={user.isActive ?? user.is_active}/>
                        </button>
                      </td>
                      {/* KYC */}
                      <td className="px-4 py-3.5 whitespace-nowrap"><VerifBadge status={user.kycStatus ?? user.kyc_status}/></td>
                      {/* KYB */}
                      <td className="px-4 py-3.5 whitespace-nowrap"><VerifBadge status={user.kybStatus ?? user.kyb_status}/></td>
                      {/* Email Verified */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {emailVerified == null
                          ? <span className="text-gray-400 text-sm">—</span>
                          : emailVerified
                            ? <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6 9 17l-5-5"/></svg>Verified</span>
                            : <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 8v4m0 4h.01"/><circle cx="12" cy="12" r="10"/></svg>Unverified</span>
                        }
                      </td>
                      {/* Balances */}
                      <td className="px-4 py-3.5 whitespace-nowrap"><Bal value={user.balances?.USD} flag="🇺🇸" symbol="$"/></td>
                      <td className="px-4 py-3.5 whitespace-nowrap"><Bal value={user.balances?.NGN} flag="🇳🇬" symbol="₦"/></td>
                      <td className="px-4 py-3.5 whitespace-nowrap"><Bal value={user.balances?.YAN} flag="🇨🇳" symbol="¥"/></td>
                      {/* Joined */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {joined
                          ? <div>
                              <p className="text-xs text-gray-800 font-medium">{new Date(joined).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                              <p className="text-[11px] text-gray-400">{timeAgo(joined)}</p>
                            </div>
                          : <span className="text-gray-400 text-sm">—</span>}
                      </td>
                      {/* Last Login */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {(user.lastLoginAt ?? user.last_login_at)
                          ? <div>
                              <p className="text-xs text-gray-800 font-medium">{formatLoginDate(user.lastLoginAt ?? user.last_login_at)}</p>
                              <p className="text-[11px] text-gray-400">{timeAgo(user.lastLoginAt ?? user.last_login_at)}</p>
                            </div>
                          : <span className="text-gray-400 text-sm">—</span>}
                      </td>
                      {/* Action */}
                      <td className="px-4 py-3.5 pr-6 whitespace-nowrap">
                        <button onClick={() => router.push(`/dashboard/users/${user.id}`)}
                          className="flex items-center gap-1 text-sm font-semibold whitespace-nowrap" style={{ color: '#339D88' }}>
                          View Profile
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                        </button>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination row — Figma style */}
            <div className="px-6 py-3.5 border-t border-gray-200 bg-white flex items-center justify-between">
              <p className="text-xs text-gray-500">
                {pagination ? `Showing ${pagination.meta?.from ?? 1} to ${pagination.meta?.to ?? users.length} of ${totalUsers.toLocaleString()} results` : ''}
              </p>
              <Pagination current={currentPage} total={totalPages} onChange={p => setCurrentPage(p)}/>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}