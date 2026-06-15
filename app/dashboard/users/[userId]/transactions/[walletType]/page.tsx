'use client';

import { use, useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { usersApi } from '@/lib/api/client';
import Sidebar from '@/components/Sidebar';

/* ── Types ── */
interface TxItem {
  id: number | string;
  reference?: string;
  category?: string;
  type?: string;
  destination_name?: string;
  destinationName?: string;
  destination_ref?: string;
  destinationRef?: string;
  amount?: string | number;
  status?: string;
  fee?: string | number;
  created_at?: string;
  createdAt?: string;
}

interface RawUser {
  id: number;
  firstName?: string | null;  first_name?: string | null;
  lastName?: string | null;   last_name?: string | null;
  email?: string;
  isActive?: boolean;         is_active?: boolean;
  kycStatus?: string | null;  kyc_status?: string | null;
  changpayId?: string | null; changpay_id?: string | null;
}

/* ── Helpers ── */
function userFirstName(u: RawUser) { return u.firstName ?? u.first_name ?? ''; }
function userLastName(u: RawUser)  { return u.lastName  ?? u.last_name  ?? ''; }
function userFullName(u: RawUser)  {
  return [userFirstName(u), userLastName(u)].filter(Boolean).join(' ') || u.email || '—';
}
function userInitials(u: RawUser) {
  const f = userFirstName(u); const l = userLastName(u);
  return `${f[0]??''}${l[0]??''}`.toUpperCase() || (u.email??'??').slice(0,2).toUpperCase();
}
function userActive(u: RawUser) { return u.isActive ?? u.is_active ?? false; }

function fmtDateTime(d: string | null | undefined) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-US', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: true,
  }).replace(',', '');
}

function fmtAmount(v: string | number | undefined | null, symbol = '') {
  if (v == null || v === '') return '—';
  return `${symbol}${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/* ── Wallet meta ── */
const WALLET_META: Record<string, { label: string; symbol: string; flag: string; currency: 'USD' | 'NGN' | 'YAN' }> = {
  usd:  { label: 'USD',  symbol: '$',  flag: '🇺🇸', currency: 'USD' },
  ngn:  { label: 'NGN',  symbol: '₦',  flag: '🇳🇬', currency: 'NGN' },
  yuan: { label: 'YUAN', symbol: '¥',  flag: '🇨🇳', currency: 'YAN' },
};

/* ── Status Badge — Figma outlined ── */
function StatusBadge({ status }: { status: string }) {
  const s = (status ?? '').toLowerCase().replace(/\s+/g,'');
  const cfg =
    s === 'completed' || s === 'success' ? 'border-emerald-500 text-emerald-600' :
    s === 'ongoing'   || s === 'on-going' || s === 'on_going' ? 'border-blue-500 text-blue-600' :
    s === 'processing' ? 'border-orange-400 text-orange-600' :
    s === 'pending'    ? 'border-amber-500 text-amber-600' :
    s === 'failed'     ? 'border-red-500 text-red-600' :
    'border-gray-300 text-gray-500';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border bg-white whitespace-nowrap ${cfg}`}>
      {status}
    </span>
  );
}

/* ── Skeleton ── */
function Sk() { return <div className="animate-pulse bg-gray-100 rounded h-4 w-full"/>; }

/* ── Pagination ── */
function Pagination({ current, total, onChange }: { current: number; total: number; onChange: (p: number) => void }) {
  if (total <= 1) return null;
  const pages: (number | '…')[] = [];
  if (total <= 7) { for (let i = 1; i <= total; i++) pages.push(i); }
  else {
    pages.push(1);
    if (current > 3) pages.push('…');
    for (let i = Math.max(2, current-1); i <= Math.min(total-1, current+1); i++) pages.push(i);
    if (current < total-2) pages.push('…');
    pages.push(total);
  }
  return (
    <div className="flex items-center gap-1">
      <button onClick={() => onChange(current-1)} disabled={current===1}
        className="w-7 h-7 flex items-center justify-center rounded border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6"/></svg>
      </button>
      {pages.map((p, i) => p === '…'
        ? <span key={`d${i}`} className="w-7 h-7 flex items-center justify-center text-sm text-gray-400">…</span>
        : <button key={p} onClick={() => onChange(p as number)}
            className="w-7 h-7 flex items-center justify-center rounded text-sm font-medium border transition-colors"
            style={p === current ? { backgroundColor: '#012D32', color: 'white', borderColor: '#012D32' } : { borderColor: '#E5E7EB', color: '#374151' }}>
            {p}
          </button>
      )}
      <button onClick={() => onChange(current+1)} disabled={current===total}
        className="w-7 h-7 flex items-center justify-center rounded border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>
      </button>
    </div>
  );
}

/* ── Page ── */
export default function WalletTransactionsPage({
  params,
}: {
  params: Promise<{ userId: string; walletType: string }>;
}) {
  const { userId, walletType } = use(params);
  const router  = useRouter();
  const { isAuthenticated } = useAuthStore();

  const meta = WALLET_META[walletType.toLowerCase()] ?? WALLET_META.usd;

  const [user, setUser]   = useState<RawUser | null>(null);
  const [txs,  setTxs]    = useState<TxItem[]>([]);
  const [pagination, setPagination] = useState<{ total: number; last_page: number; from: number; to: number } | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [isLoading, setIsLoading]         = useState(true);
  const [error, setError]                 = useState<string | null>(null);
  const [page, setPage]           = useState(1);
  const [search, setSearch]       = useState('');
  const [typeFilter, setTypeFilter]   = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const id = Number(userId);

  /* Fetch user */
  const fetchUser = useCallback(async () => {
    try {
      setIsLoadingUser(true);
      const res = await usersApi.getUser(id);
      if (res.status && res.data) setUser(res.data as unknown as RawUser);
    } catch { /* silent */ }
    finally { setIsLoadingUser(false); }
  }, [id]);

  /* Fetch transactions */
  const fetchTxs = useCallback(async (pg: number, q: string, type: string, status: string) => {
    try {
      setIsLoading(true); setError(null);
      const res = await usersApi.getTransactions(id, {
        currency: meta.currency,
        page: pg,
        per_page: 15,
        ...(q      ? { search: q }           : {}),
        ...(type   ? { type: type as any }   : {}),
        ...(status ? { status }              : {}),
      });
      if (res.status && res.data) {
        const d = res.data as any;
        const items: TxItem[] = d?.data ?? [];
        setTxs(items);
        // handle new { data, links, meta } format and old flat { current_page, data, total } format
        const pg = d?.meta ?? d;
        if (pg?.total != null) {
          setPagination({
            total: pg.total,
            last_page: pg.last_page ?? 1,
            from: pg.from ?? 1,
            to: pg.to ?? items.length,
          });
        }
      }
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to load transactions'); }
    finally { setIsLoading(false); }
  }, [id, meta.currency]);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchUser();
    fetchTxs(page, search, typeFilter, statusFilter);
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchTxs(page, search, typeFilter, statusFilter);
  }, [page, typeFilter, statusFilter]);

  if (!isAuthenticated) return null;

  const handleSearch = (val: string) => {
    setSearch(val);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => { setPage(1); fetchTxs(1, val, typeFilter, statusFilter); }, 400);
  };

  const totalPages = pagination?.last_page ?? 1;

  return (
    <div className="flex h-screen bg-white font-['DM_Sans']">
      <Sidebar/>
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        <div className="flex-1 overflow-y-auto">

          {/* ── Back + User info ── */}
          <div className="bg-white border-b border-gray-100 px-8 py-5 sticky top-0 z-10">
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => router.push(`/dashboard/users/${userId}`)}
                className="flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-gray-900">
                <span className="w-5 h-5 rounded-full flex items-center justify-center bg-gray-900 text-white">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M15 18l-6-6 6-6"/></svg>
                </span>
                Back to User Profile
              </button>

              {/* User pill */}
              {!isLoadingUser && user && (
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                    style={{ background: 'linear-gradient(135deg, #339D88, #0274D8)' }}>
                    {userInitials(user)}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900 leading-tight">{userFullName(user)}</p>
                    <p className="text-[11px] text-gray-400">{user.email}</p>
                  </div>
                  <span className="ml-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border"
                    style={userActive(user)
                      ? { borderColor: '#0274D8', color: '#0274D8', backgroundColor: '#EFF7FF' }
                      : { borderColor: '#9CA3AF', color: '#6B7280', backgroundColor: '#F9FAFB' }}>
                    {userActive(user) ? 'Active' : 'Frozen'}
                  </span>
                </div>
              )}
            </div>

            {/* Title + subtitle */}
            <div className="mb-4">
              <h1 className="text-xl font-bold text-gray-900">All {meta.flag} {meta.label} Wallet Transactions</h1>
              <p className="text-sm text-gray-500">Complete transaction history for this user's {meta.label} wallet</p>
            </div>

            {/* Filters bar */}
            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="flex-1 relative max-w-md">
                <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                <input type="text" value={search} onChange={e => handleSearch(e.target.value)}
                  placeholder="Search by name, wallet ID or transaction ID..."
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-[#F9FAFB] border border-gray-200 rounded-full text-gray-700 placeholder-gray-400 focus:outline-none focus:border-gray-400"/>
              </div>

              {/* All Types */}
              <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1); }}
                className="pl-3 pr-8 py-2.5 text-sm border border-gray-200 rounded-xl text-gray-600 bg-white focus:outline-none focus:border-gray-400 appearance-none cursor-pointer"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2.5'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center' }}>
                <option value="">All Types</option>
                <option value="deposit">Deposit</option>
                <option value="withdrawal">Withdrawal</option>
                <option value="transfer">Transfer</option>
              </select>

              {/* All Status */}
              <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
                className="pl-3 pr-8 py-2.5 text-sm border border-gray-200 rounded-xl text-gray-600 bg-white focus:outline-none focus:border-gray-400 appearance-none cursor-pointer"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2.5'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center' }}>
                <option value="">All Status</option>
                <option value="completed">Completed</option>
                <option value="processing">Processing</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
                <option value="on-going">On Going</option>
              </select>

              {/* Export */}
              <button className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white rounded-xl transition-colors shrink-0"
                style={{ backgroundColor: '#339D88' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Export
              </button>
            </div>
          </div>

          {/* ── Table area ── */}
          <div className="px-8 py-6">
            {error && <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">{error}</div>}

            <div className="rounded-xl border border-gray-200 overflow-hidden">
              {/* Table title */}
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white">
                <h3 className="text-sm font-bold text-gray-900">
                  All Transactions
                  {pagination && <span className="text-gray-400 font-normal ml-2 text-xs">({pagination.total.toLocaleString()} total)</span>}
                </h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      {['Txn ID', 'Category', 'Type', 'Destination', 'Amount', 'Status', 'Fee', 'Date/time', 'Action'].map(h => (
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
                          {[...Array(9)].map((_, j) => <td key={j} className="px-4 py-4"><Sk/></td>)}
                        </tr>
                      ))
                    ) : txs.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-4 py-14 text-center text-sm text-gray-400">
                          No transactions found for this {meta.label} wallet
                        </td>
                      </tr>
                    ) : txs.map((tx, i) => {
                      const isIncome = (tx.category ?? '').toLowerCase() === 'income' || (tx.type ?? '').toLowerCase() === 'deposit';
                      const destName = tx.destination_name ?? tx.destinationName ?? '—';
                      const destRef  = tx.destination_ref  ?? tx.destinationRef  ?? '';
                      const date     = (tx as any).dateTime ?? tx.created_at ?? tx.createdAt ?? null;
                      const ref      = tx.reference ?? String(tx.id);
                      return (
                        <tr key={tx.id ?? i} className="hover:bg-gray-50/60 transition-colors">
                          {/* Txn ID */}
                          <td className="px-4 py-4 pl-6 font-mono text-xs text-gray-700 whitespace-nowrap">
                            {ref.slice(0, 9)}
                          </td>
                          {/* Category */}
                          <td className="px-4 py-4 text-sm text-gray-600 capitalize whitespace-nowrap">
                            {tx.category ?? '—'}
                          </td>
                          {/* Type */}
                          <td className="px-4 py-4 text-sm text-gray-600 whitespace-nowrap capitalize">
                            {tx.type ?? '—'}
                          </td>
                          {/* Destination */}
                          <td className="px-4 py-4 whitespace-nowrap">
                            <p className="text-sm text-gray-800 font-medium">{destName}</p>
                            {destRef && <p className="text-[11px] text-gray-400">{destRef}</p>}
                          </td>
                          {/* Amount */}
                          <td className="px-4 py-4 whitespace-nowrap">
                            <span className="text-sm font-bold" style={{ color: isIncome ? '#339D88' : '#FF756B' }}>
                              {isIncome ? '+' : ''}{fmtAmount(tx.amount, meta.symbol)}
                            </span>
                          </td>
                          {/* Status */}
                          <td className="px-4 py-4 whitespace-nowrap">
                            <StatusBadge status={tx.status ?? 'Unknown'}/>
                          </td>
                          {/* Fee */}
                          <td className="px-4 py-4 text-sm text-gray-600 whitespace-nowrap">
                            {tx.fee != null ? fmtAmount(tx.fee, meta.symbol) : '—'}
                          </td>
                          {/* Date */}
                          <td className="px-4 py-4 text-xs text-gray-500 whitespace-nowrap">
                            {fmtDateTime(date)}
                          </td>
                          {/* Action */}
                          <td className="px-4 py-4 pr-6 whitespace-nowrap">
                            <button className="text-sm font-semibold" style={{ color: '#339D88' }}>View</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="px-6 py-3.5 border-t border-gray-100 bg-white flex items-center justify-between">
                <p className="text-xs text-gray-500">
                  {pagination
                    ? `Showing ${pagination.from} to ${pagination.to} of ${pagination.total.toLocaleString()} results`
                    : ''}
                </p>
                <Pagination current={page} total={totalPages} onChange={p => setPage(p)}/>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}