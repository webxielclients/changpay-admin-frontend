'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';
import { banksApi } from '@/lib/api/client';
import type {
  ChineseBank,
  PaymentProviderStat,
  PayoutTransaction,
  PayoutStats,
  HandshakeRecord,
} from '@/lib/api/client';
import Sidebar from '@/components/Sidebar';
import DashboardHeader from '@/components/DashboardHeader';

type TabType = 'bank-status' | 'payout' | 'handshake';

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-100 rounded-lg ${className ?? ''}`} />;
}

// ─── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const s = status?.toLowerCase();
  const styles =
    s === 'online' || s === 'success' || s === 'completed' || s === 'active'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
      : s === 'failed' || s === 'offline' || s === 'inactive'
      ? 'bg-red-50 text-red-600 border-red-300'
      : s === 'warning' || s === 'pending' || s === 'processing'
      ? 'bg-orange-50 text-orange-600 border-orange-300'
      : s === 'degraded'
      ? 'bg-yellow-50 text-yellow-700 border-yellow-300'
      : 'bg-gray-100 text-gray-600 border-gray-200';

  return (
    <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold border capitalize ${styles}`}>
      {status}
    </span>
  );
}

// ─── Connectivity status badge (with icon) ────────────────────────────────────
function ConnectivityBadge({ status }: { status: string }) {
  const s = status?.toLowerCase();
  const isOnline   = s === 'online';
  const isDegraded = s === 'degraded';
  const isOffline  = s === 'offline';

  if (isOnline) return (
    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600">
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z" />
      </svg>
      ONLINE
    </span>
  );
  if (isDegraded) return (
    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-yellow-600">
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
      </svg>
      DEGRADED
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-red-500">
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18M10.584 10.587a2.25 2.25 0 003.226 3.226M6.75 6.75a9.75 9.75 0 01.128-.14m9.244 9.244c-2.617 2.617-6.624 3.154-9.802 1.617M3.532 3.532A12.75 12.75 0 0112 1.5c7.036 0 12.75 5.714 12.75 12.75 0 2.915-.977 5.607-2.616 7.757" />
      </svg>
      OFFLINE
    </span>
  );
}

// ─── User cell ─────────────────────────────────────────────────────────────────
function UserCell({ name, email, initials }: { name: string; email?: string; initials?: string }) {
  const COLORS = ['bg-emerald-100 text-emerald-700', 'bg-violet-100 text-violet-700', 'bg-amber-100 text-amber-700', 'bg-blue-100 text-blue-700'];
  const nameStr = typeof name === 'string' ? name : '';
  const color   = COLORS[nameStr.length > 0 ? nameStr.charCodeAt(0) % COLORS.length : 0];
  const display = initials ?? (nameStr.length >= 2 ? nameStr.slice(0, 2).toUpperCase() : 'U');
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

// ─── Table header ──────────────────────────────────────────────────────────────
function TableHead({ cols }: { cols: string[] }) {
  return (
    <thead>
      <tr className="bg-[#F8F9FA]">
        {cols.map((h, idx) => (
          <th key={h} className={`px-5 py-4 text-left text-xs font-semibold text-gray-500 whitespace-nowrap ${idx === 0 ? 'rounded-tl-xl' : ''} ${idx === cols.length - 1 ? 'rounded-tr-xl' : ''}`}>
            {h}
          </th>
        ))}
      </tr>
    </thead>
  );
}

// ─── Search bar ────────────────────────────────────────────────────────────────
function SearchBar({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="relative flex-1">
      <svg className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
      </svg>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? 'Search...'}
        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-full text-sm text-gray-700 placeholder-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
      />
    </div>
  );
}

// ─── Pagination ────────────────────────────────────────────────────────────────
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
        {total != null ? `Showing ${from ?? 1}–${to ?? 0} of ${total.toLocaleString()}` : ''}
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


export default function BanksPayoutsPage() {
  const { isAuthenticated } = useAuthStore();

  const [activeTab, setActiveTab] = useState<TabType>('bank-status');

  // Bank Status
  const [providers,        setProviders]        = useState<PaymentProviderStat[]>([]);
  const [loadingProviders, setLoadingProviders]  = useState(true);

  // Payout
  const [payouts,            setPayouts]            = useState<PayoutTransaction[]>([]);
  const [payoutStats,        setPayoutStats]        = useState<PayoutStats | null>(null);
  const [payoutPagination,   setPayoutPagination]   = useState<{ total: number; last_page: number; from: number; to: number } | null>(null);
  const [loadingPayouts,     setLoadingPayouts]     = useState(false);
  const [loadingPayoutStats, setLoadingPayoutStats] = useState(true);
  const [payoutPage,         setPayoutPage]         = useState(1);
  const [payoutSearch,       setPayoutSearch]       = useState('');
  const [payoutStatus,       setPayoutStatus]       = useState('');
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [error, setError] = useState<string | null>(null);

  // Handshake
  const [handshakes,       setHandshakes]       = useState<HandshakeRecord[] | null>(null);
  const [loadingHandshakes,setLoadingHandshakes]= useState(false);

  // ── Fetchers ────────────────────────────────────────────────────────────────
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

  const fetchPayoutStats = useCallback(async () => {
    try {
      setLoadingPayoutStats(true);
      const res = await banksApi.getPayoutStats();
      if (res.status) setPayoutStats(res.data);
    } catch { /* silent */ } finally {
      setLoadingPayoutStats(false);
    }
  }, []);

  const fetchPayouts = useCallback(async (page: number, search: string, status: string) => {
    try {
      setLoadingPayouts(true);
      setError(null);
      const res = await banksApi.getPayouts({
        page, per_page: 15,
        search: search || undefined,
        status: status || undefined,
      });
      if (res.status) {
        const d = res.data as any;
        if (d && 'data' in d) {
          setPayouts(d.data ?? []);
          setPayoutPagination({ total: d.total, last_page: d.last_page, from: d.from, to: d.to });
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

  const fetchHandshakes = useCallback(async () => {
    try {
      setLoadingHandshakes(true);
      const res = await banksApi.getHandshakes({ per_page: 50 });
      if (res?.status) {
        const d = res.data as any;
        if (Array.isArray(d)) setHandshakes(d);
        else if (d && 'data' in d) setHandshakes(d.data ?? []);
        else setHandshakes([]);
      } else {
        setHandshakes([]);
      }
    } catch { setHandshakes([]); } finally { setLoadingHandshakes(false); }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (activeTab === 'bank-status') fetchProviders();
    if (activeTab === 'payout') { fetchPayoutStats(); fetchPayouts(payoutPage, payoutSearch, payoutStatus); }
    if (activeTab === 'handshake') fetchHandshakes();
  }, [activeTab, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || activeTab !== 'payout') return;
    fetchPayouts(payoutPage, payoutSearch, payoutStatus);
  }, [payoutPage, payoutStatus]);

  if (!isAuthenticated) return null;

  const handleSearchChange = (val: string) => {
    setPayoutSearch(val);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setPayoutPage(1);
      fetchPayouts(1, val, payoutStatus);
    }, 400);
  };

  const totalPayoutPages = payoutPagination?.last_page ?? 1;

  const TABS: { id: TabType; label: string }[] = [
    { id: 'bank-status', label: 'Bank Status' },
    { id: 'payout',      label: 'Payout' },
    { id: 'handshake',   label: 'Handshake' },
  ];

  // ── Derive summary counts from providers for the stat cards ─────────────────
  const totalBanks  = providers.length;
  const onlineCount = providers.filter((p) => (p as any).status?.toLowerCase() === 'online' || p.success_rate >= 95).length;
  const degraded    = providers.filter((p) => (p as any).status?.toLowerCase() === 'degraded' || (p.success_rate >= 80 && p.success_rate < 95)).length;
  const offline     = providers.filter((p) => (p as any).status?.toLowerCase() === 'offline' || p.success_rate < 80).length;

  return (
    <div className="flex h-screen bg-[#F8F9FA] font-['DM_Sans',sans-serif]">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* ── Page header */}
        <div className="bg-white border-b border-gray-200 px-8 py-5 flex-shrink-0">
          <DashboardHeader
            title="Banks & Payouts"
            subtitle="Monitor bank status, payouts, and reconciliation"
          />
        </div>

        {/* ── Full-width tab bar — same pattern as FX Engine */}
        <div className="w-full flex-shrink-0">
          <div className="flex items-stretch w-full">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 ml-7 py-4 text-sm font-bold text-center transition-colors ${
                  activeTab === tab.id
                    ? 'bg-[#009F51] text-[#E1F7EB]'
                    : 'bg-[#F8F9FA] text-gray-700 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          {error && (
            <div className="mx-8 mt-5 p-3 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* ══════════════════════════════════════
              BANK STATUS TAB
          ══════════════════════════════════════ */}
          {activeTab === 'bank-status' && (
            <div className="p-8 space-y-6">

              {/* Heading + Refresh */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Bank Status Monitor</h2>
                  <p className="text-sm text-gray-500 mt-0.5">Real-time uptime and performance tracking</p>
                </div>
                <button
                  onClick={fetchProviders}
                  disabled={loadingProviders}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#009F51] text-white rounded-full text-sm font-semibold hover:bg-[#007A3D] disabled:opacity-50 transition-colors"
                >
                  <svg className={`w-4 h-4 ${loadingProviders ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                  </svg>
                  Refresh Now
                </button>
              </div>

              {/* Rate Engine Status summary cards */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <h3 className="text-base font-bold text-gray-900 mb-4">Rate Engine Status</h3>
                <div className="grid grid-cols-4 gap-4">
                  {/* Total Banks */}
                  <div className="rounded-xl p-5" style={{ backgroundColor: '#009F511A' }}>
                    <p className="text-xs text-gray-500 mb-2">Total Banks</p>
                    {loadingProviders
                      ? <Skeleton className="h-9 w-12" />
                      : <p className="text-3xl font-bold" style={{ color: '#009F51' }}>{totalBanks}</p>}
                  </div>
                  {/* Online */}
                  <div className="rounded-xl p-5" style={{ backgroundColor: '#0274D81A' }}>
                    <p className="text-xs text-gray-500 mb-2">Online</p>
                    {loadingProviders
                      ? <Skeleton className="h-9 w-12" />
                      : <p className="text-3xl font-bold" style={{ color: '#0274D8' }}>{onlineCount}</p>}
                  </div>
                  {/* Degraded */}
                  <div className="rounded-xl p-5" style={{ backgroundColor: '#FFDA441A' }}>
                    <p className="text-xs text-gray-500 mb-2">Degraded</p>
                    {loadingProviders
                      ? <Skeleton className="h-9 w-12" />
                      : <p className="text-3xl font-bold" style={{ color: '#D4A017' }}>{degraded}</p>}
                  </div>
                  {/* Offline */}
                  <div className="rounded-xl p-5" style={{ backgroundColor: '#FF756B1A' }}>
                    <p className="text-xs text-gray-500 mb-2">Offline</p>
                    {loadingProviders
                      ? <Skeleton className="h-9 w-12" />
                      : <p className="text-3xl font-bold" style={{ color: '#FF756B' }}>{offline}</p>}
                  </div>
                </div>
              </div>

              {/* Provider cards */}
              {loadingProviders ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-56 w-full" />)}
                </div>
              ) : providers.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
                  <p className="text-gray-400 text-sm">No provider data available</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {providers.map((p, idx) => {
                    const status = (p as any).status ?? (p.success_rate >= 95 ? 'online' : p.success_rate >= 80 ? 'degraded' : 'offline');
                    const uptimeColor = status === 'online' ? 'bg-emerald-500' : status === 'degraded' ? 'bg-yellow-400' : 'bg-red-500';
                    const hasDowntime = !!(p as any).last_downtime;

                    return (
                      <div key={p.provider ?? idx} className="bg-white rounded-2xl border border-gray-200 p-6">
                        {/* Bank header */}
                        <div className="flex items-center justify-between mb-5">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 overflow-hidden">
                              {(p as any).logo_url
                                ? <img src={(p as any).logo_url} alt={p.provider} className="w-full h-full object-cover" />
                                : <span>{p.provider?.slice(0, 2).toUpperCase()}</span>}
                            </div>
                            <div>
                              <h3 className="text-lg font-bold text-gray-900">{(p as any).bank_name ?? p.provider}</h3>
                              <p className="text-sm text-gray-400">{(p as any).bank_code ?? p.provider?.toUpperCase()}</p>
                            </div>
                          </div>
                          <ConnectivityBadge status={status} />
                        </div>

                        {/* Uptime + Response Time */}
                        <div className="bg-[#F8F9FA] rounded-xl px-5 py-4 mb-4">
                          <div className="flex items-start justify-between gap-6">
                            <div className="flex-1">
                              <p className="text-xs text-gray-500 mb-2">Uptime (30 days)</p>
                              <div className="flex items-center gap-3">
                                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full ${uptimeColor} rounded-full transition-all`}
                                    style={{ width: `${Math.min((p as any).uptime ?? p.success_rate, 100)}%` }}
                                  />
                                </div>
                                <span className="text-xs font-semibold text-gray-700 whitespace-nowrap">
                                  {(p as any).uptime ?? p.success_rate}%
                                </span>
                              </div>
                            </div>
                            <div className="flex-shrink-0">
                              <p className="text-xs text-gray-500 mb-1">Response Time</p>
                              <p className="text-base font-bold text-gray-900">{(p as any).response_time ?? '—'}</p>
                            </div>
                          </div>
                        </div>

                        {/* Transactions / Success Rate / Pending */}
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Transactions</p>
                            <p className="text-base font-bold text-gray-900">{p.total_transactions?.toLocaleString() ?? '—'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Success Rate</p>
                            <p className="text-base font-bold text-emerald-600">{p.success_rate}%</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Pending</p>
                            <p className="text-base font-bold text-amber-500">{(p as any).pending ?? '—'}</p>
                          </div>
                        </div>

                        {/* Last Downtime notice (only shown when present, like Access Bank / UBA) */}
                        {hasDowntime && (
                          <div className="mt-4 bg-amber-50 border border-amber-100 rounded-xl px-5 py-3">
                            <p className="text-xs text-gray-600">Last Downtime: <span className="font-semibold">{(p as any).last_downtime}</span></p>
                            {(p as any).downtime_duration && (
                              <p className="text-xs font-bold text-gray-800 mt-0.5">Duration: {(p as any).downtime_duration}</p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════
              PAYOUT TAB
          ══════════════════════════════════════ */}
          {activeTab === 'payout' && (
            <div className="p-8 space-y-6">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Payout Transactions</h2>
                <p className="text-sm text-gray-500 mt-0.5">All bank payout transactions</p>
              </div>

              {/* Stat cards — Figma colours exactly */}
              <div className="space-y-3">
                <h3 className="text-base font-bold text-gray-900">Rate Engine Status</h3>
                <div className="grid grid-cols-4 gap-4">
                  {([
                    { label: 'Total Payouts', value: payoutStats?.total,     bg: '#009F511A', color: '#009F51' },
                    { label: 'Successful',    value: payoutStats?.completed, bg: '#0274D81A', color: '#0274D8' },
                    { label: 'Pending',       value: payoutStats?.pending,   bg: '#FFDA441A', color: '#D4A017' },
                    { label: 'Failed',        value: payoutStats?.failed,    bg: '#FF756B1A', color: '#FF756B' },
                  ] as { label: string; value?: number | string; bg: string; color: string }[]).map((s) => (
                    <div key={s.label} className="rounded-xl p-5" style={{ backgroundColor: s.bg }}>
                      <p className="text-xs text-gray-500 mb-2">{s.label}</p>
                      {loadingPayoutStats
                        ? <Skeleton className="h-9 w-24" />
                        : <p className="text-3xl font-bold" style={{ color: s.color }}>
                            {s.value != null ? Number(s.value).toLocaleString() : '—'}
                          </p>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Filters row */}
              <div className="flex items-center gap-3">
                <SearchBar
                  value={payoutSearch}
                  onChange={handleSearchChange}
                  placeholder="Search by user, bank or reference..."
                />
                <div className="relative flex-shrink-0">
                  <select
                    value={payoutStatus}
                    onChange={(e) => { setPayoutStatus(e.target.value); setPayoutPage(1); }}
                    className="appearance-none bg-white border border-gray-200 rounded-lg pl-3 pr-8 py-2.5 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-400 cursor-pointer"
                  >
                    {['All Status', 'completed', 'pending', 'processing', 'failed'].map((s) => (
                      <option key={s} value={s === 'All Status' ? '' : s}>{s === 'All Status' ? 'All Status' : s.charAt(0).toUpperCase() + s.slice(1)}</option>
                    ))}
                  </select>
                  <svg className="w-4 h-4 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
                </div>
                <button className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 text-white rounded-full text-sm font-semibold hover:bg-emerald-600 transition-colors flex-shrink-0">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
                  </svg>
                  Export
                </button>
              </div>

              {/* Payout table */}
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <TableHead cols={['Timestamp', 'User', 'Bank', 'Account', 'Amount', 'Status', 'Reference']} />
                    <tbody className="divide-y divide-gray-50">
                      {loadingPayouts ? (
                        [...Array(5)].map((_, i) => (
                          <tr key={i}>{[...Array(7)].map((_, j) => (
                            <td key={j} className="px-5 py-4"><Skeleton className="h-5 w-full" /></td>
                          ))}</tr>
                        ))
                      ) : payouts.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-5 py-12 text-center text-sm text-gray-400">
                            No payout transactions found
                          </td>
                        </tr>
                      ) : (
                        payouts.map((tx) => {
                          const userName = tx.user ? `${tx.user.firstName} ${tx.user.lastName}`.trim() : '—';
                          const userSub  = tx.user?.changpayId ?? tx.user?.email ?? '';
                          const bankName = tx.bank?.name ?? tx.bank?.code ?? '—';
                          const acctNum  = tx.account?.number ?? '—';
                          const acctName = tx.account?.name;
                          const ts = tx.timestamp ? new Date(tx.timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
                          const currSymbol = tx.currency === 'NGN' ? '₦' : tx.currency === 'YAN' ? '¥' : '$';
                          return (
                            <tr key={tx.id} className="hover:bg-gray-50/50 transition-colors">
                              <td className="px-5 py-4">
                                <p className="text-xs text-gray-700 whitespace-nowrap">{ts}</p>
                                {tx.completedAt && <p className="text-xs text-gray-400">Done: {new Date(tx.completedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>}
                              </td>
                              <td className="px-5 py-4">
                                <UserCell name={userName} email={userSub} />
                              </td>
                              <td className="px-5 py-4 text-sm text-gray-700 whitespace-nowrap">{bankName}</td>
                              <td className="px-5 py-4">
                                <p className="text-sm text-gray-600 font-mono">{acctNum}</p>
                                {acctName && <p className="text-xs text-gray-400">{acctName}</p>}
                              </td>
                              <td className="px-5 py-4">
                                <p className="text-sm font-bold" style={{ color: '#009F51' }}>{currSymbol}{Number(tx.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                                {tx.fee && Number(tx.fee) > 0 && <p className="text-xs text-gray-400">Fee: {currSymbol}{Number(tx.fee).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>}
                              </td>
                              <td className="px-5 py-4"><StatusBadge status={tx.status} /></td>
                              <td className="px-5 py-4 text-xs text-gray-500 whitespace-nowrap">{tx.reference}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
                <Pagination
                  currentPage={payoutPage}
                  totalPages={totalPayoutPages}
                  onChange={setPayoutPage}
                  loading={loadingPayouts}
                  from={payoutPagination?.from}
                  to={payoutPagination?.to}
                  total={payoutPagination?.total}
                />
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════
              HANDSHAKE TAB
          ══════════════════════════════════════ */}
          {activeTab === 'handshake' && (
            <div className="p-8 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Bank Handshake &amp; Health Checks</h2>
                  <p className="text-sm text-gray-500 mt-0.5">Provider connectivity and health-check log</p>
                </div>
                <button onClick={fetchHandshakes} disabled={loadingHandshakes} className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-full text-sm font-semibold hover:bg-emerald-600 disabled:opacity-50 transition-colors">
                  <svg className={`w-4 h-4 ${loadingHandshakes ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                  </svg>
                  Refresh
                </button>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <TableHead cols={['Timestamp', 'Provider', 'Status', 'Response Time', 'Message']} />
                    <tbody className="divide-y divide-gray-50">
                      {loadingHandshakes
                        ? [...Array(4)].map((_, i) => (
                            <tr key={i}>{[...Array(5)].map((_, j) => <td key={j} className="px-5 py-4"><Skeleton className="h-5 w-full" /></td>)}</tr>
                          ))
                        : !handshakes || handshakes.length === 0
                          ? <tr><td colSpan={5} className="px-5 py-12 text-center text-sm text-gray-400">No handshake records available</td></tr>
                          : handshakes.map((h) => (
                              <tr key={h.id} className="hover:bg-gray-50/50 transition-colors">
                                <td className="px-5 py-4 text-xs text-gray-500 whitespace-nowrap">
                                  {h.timestamp ? new Date(h.timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                                </td>
                                <td className="px-5 py-4 text-sm font-semibold text-gray-900 capitalize">{h.provider}</td>
                                <td className="px-5 py-4"><StatusBadge status={h.status} /></td>
                                <td className="px-5 py-4 text-sm text-gray-600">{h.responseTime != null ? `${h.responseTime}ms` : '—'}</td>
                                <td className="px-5 py-4 text-sm text-gray-500">{h.message ?? '—'}</td>
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
      </div>
    </div>
  );
}