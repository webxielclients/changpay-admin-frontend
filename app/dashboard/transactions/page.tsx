'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { transactionsApi } from '@/lib/api/client';
import type {
  Transaction, TransactionStats,
  SellCryptoTransaction, SellCryptoStats,
  PayToChinaTransaction, PayToChinaStats,
  ConversionStats,
} from '@/lib/api/client';
import { AUTH_ROUTES } from '@/constants/auth';
import Sidebar from '@/components/Sidebar';
import DashboardHeader from '@/components/DashboardHeader';

type TabType = 'overview' | 'crypto' | 'pay-china' | 'conversions';

// ─── Helpers ──────────────────────────────────────────────────────────────────
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
    rejected: 'bg-red-100 text-red-700 border-red-200',
    'on-going': 'bg-teal-100 text-teal-700 border-teal-200',
    paid: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    refundable: 'bg-red-100 text-red-700 border-red-200',
    returned: 'bg-red-100 text-red-700 border-red-200',
  };
  return (
    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold border capitalize ${styles[s] ?? 'bg-gray-100 text-gray-600 border-gray-200'}`}>
      {status}
    </span>
  );
}

function StatCard({ label, value, color, sub, loading }: {
  label: string; value: string | number; color: string; sub?: string; loading?: boolean;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
      {loading ? <Skeleton className="h-8 w-20 mt-1" /> : (
        <p className={`text-2xl font-bold ${color}`}>{value}</p>
      )}
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

// ─── Transaction Detail Side Panel ────────────────────────────────────────────
function TxDetailPanel({
  txId,
  type,
  onClose,
  onApprove,
  onReject,
}: {
  txId: number;
  type: TabType;
  onClose: () => void;
  onApprove?: (id: number) => void;
  onReject?: (id: number) => void;
}) {
  const [detail, setDetail] = useState<Transaction | SellCryptoTransaction | PayToChinaTransaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        let res;
        if (type === 'crypto') res = await transactionsApi.getSellCryptoOne(txId);
        else if (type === 'pay-china') res = await transactionsApi.getPayToChinaOne(txId);
        else if (type === 'conversions') res = await transactionsApi.getConversionOne(txId);
        else res = await transactionsApi.getOne(txId);
        if (res.status && res.data) setDetail(res.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load details');
      } finally { setLoading(false); }
    })();
  }, [txId, type]);

  const handleApprove = async () => {
    try {
      setActing(true);
      const res = await transactionsApi.approve(txId);
      if (res.status && res.data) {
        setDetail(res.data);
        onApprove?.(txId);
      }
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed'); }
    finally { setActing(false); }
  };

  const handleReject = async () => {
    try {
      setActing(true);
      const res = await transactionsApi.reject(txId);
      if (res.status && res.data) {
        setDetail(res.data);
        onReject?.(txId);
      }
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed'); }
    finally { setActing(false); }
  };

  const isPending = detail && 'status' in detail &&
    ['pending', 'processing'].includes((detail as Transaction).status?.toLowerCase());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white w-full max-w-md h-full shadow-2xl flex flex-col">
        <button onClick={onClose}
          className="absolute -left-12 top-6 w-10 h-10 flex items-center justify-center rounded-full bg-white hover:bg-gray-100 shadow-lg">
          <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="flex-1 overflow-y-auto p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-6">Transaction Details</h2>

          {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg"><p className="text-sm text-red-600">{error}</p></div>}

          {loading ? (
            <div className="space-y-4">
              {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : detail ? (
            <div className="space-y-4">
              {Object.entries(detail).filter(([k]) => !['user', 'wallet', 'supplier'].includes(k)).map(([key, val]) => {
                if (val == null || val === '') return null;
                const label = key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim();
                return (
                  <div key={key} className="flex items-start justify-between py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-500 capitalize">{label}</span>
                    <span className="text-sm font-semibold text-gray-900 text-right max-w-xs break-all">
                      {key === 'status' ? <StatusBadge status={String(val)} /> : String(val)}
                    </span>
                  </div>
                );
              })}

              {/* Supplier info for Pay to China */}
              {type === 'pay-china' && (detail as PayToChinaTransaction).supplier && (
                <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <p className="text-xs font-bold text-gray-700 mb-3 uppercase">Supplier</p>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-xs text-gray-500">Name</span>
                      <span className="text-xs font-semibold text-gray-900">{(detail as PayToChinaTransaction).supplier!.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-gray-500">Account</span>
                      <span className="text-xs font-semibold text-gray-900">{(detail as PayToChinaTransaction).supplier!.accountNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-gray-500">Bank</span>
                      <span className="text-xs font-semibold text-gray-900">{(detail as PayToChinaTransaction).supplier!.bank?.name ?? '—'}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-400">No details available</p>
          )}
        </div>

        {/* Actions */}
        <div className="border-t border-gray-200 p-6 space-y-3">
          {isPending && type === 'overview' && (
            <div className="flex gap-3">
              <button onClick={handleApprove} disabled={acting}
                className="flex-1 py-3 bg-emerald-500 text-white rounded-lg text-sm font-semibold hover:bg-emerald-600 disabled:opacity-50">
                {acting ? '...' : 'Approve'}
              </button>
              <button onClick={handleReject} disabled={acting}
                className="flex-1 py-3 bg-red-500 text-white rounded-lg text-sm font-semibold hover:bg-red-600 disabled:opacity-50">
                {acting ? '...' : 'Reject'}
              </button>
            </div>
          )}
          <button onClick={onClose}
            className="w-full py-3 border border-gray-300 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Pagination ───────────────────────────────────────────────────────────────
function Pagination({ page, total, onChange }: { page: number; total: number; onChange: (p: number) => void }) {
  const pages = Array.from({ length: Math.min(total, 5) }, (_, i) => {
    if (total <= 5) return i + 1;
    if (page <= 3) return i + 1;
    if (page >= total - 2) return total - 4 + i;
    return page - 2 + i;
  });
  return (
    <div className="flex items-center gap-1">
      <button onClick={() => onChange(Math.max(1, page - 1))} disabled={page === 1}
        className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40">
        <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
      </button>
      {pages.map((p) => (
        <button key={p} onClick={() => onChange(p)}
          className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium ${page === p ? 'bg-emerald-500 text-white' : 'border border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
          {p}
        </button>
      ))}
      <button onClick={() => onChange(Math.min(total, page + 1))} disabled={page === total}
        className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40">
        <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
      </button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function TransactionsPage() {
  const router = useRouter();
  const { isAuthenticated, user: authUser } = useAuthStore();

  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // Overview state
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [txStats, setTxStats] = useState<TransactionStats | null>(null);
  const [txPag, setTxPag] = useState<{ total: number; last_page: number; from: number; to: number } | null>(null);
  const [loadingTxs, setLoadingTxs] = useState(false);
  const [loadingTxStats, setLoadingTxStats] = useState(true);
  const [txPage, setTxPage] = useState(1);
  const [txSearch, setTxSearch] = useState('');
  const [txStatus, setTxStatus] = useState('');
  const [txCurrency, setTxCurrency] = useState('');

  // Crypto state
  const [cryptoTxs, setCryptoTxs] = useState<SellCryptoTransaction[]>([]);
  const [cryptoStats, setCryptoStats] = useState<SellCryptoStats | null>(null);
  const [cryptoPag, setCryptoPag] = useState<{ total: number; last_page: number; from: number; to: number } | null>(null);
  const [loadingCrypto, setLoadingCrypto] = useState(false);
  const [loadingCryptoStats, setLoadingCryptoStats] = useState(true);
  const [cryptoPage, setCryptoPage] = useState(1);
  const [cryptoSearch, setCryptoSearch] = useState('');
  const [cryptoStatus, setCryptoStatus] = useState('');

  // Pay to China state
  const [chinaTxs, setChinaTxs] = useState<PayToChinaTransaction[]>([]);
  const [chinaStats, setChinaStats] = useState<PayToChinaStats | null>(null);
  const [chinaPag, setChinaPag] = useState<{ total: number; last_page: number; from: number; to: number } | null>(null);
  const [loadingChina, setLoadingChina] = useState(false);
  const [loadingChinaStats, setLoadingChinaStats] = useState(true);
  const [chinaPage, setChinaPage] = useState(1);
  const [chinaSearch, setChinaSearch] = useState('');
  const [chinaStatus, setChinaStatus] = useState('');

  // Conversions state
  const [convTxs, setConvTxs] = useState<Transaction[]>([]);
  const [convStats, setConvStats] = useState<ConversionStats | null>(null);
  const [convPag, setConvPag] = useState<{ total: number; last_page: number; from: number; to: number } | null>(null);
  const [loadingConv, setLoadingConv] = useState(false);
  const [loadingConvStats, setLoadingConvStats] = useState(true);
  const [convPage, setConvPage] = useState(1);
  const [convSearch, setConvSearch] = useState('');
  const [convStatus, setConvStatus] = useState('');

  // Detail panel
  const [selectedTx, setSelectedTx] = useState<{ id: number; type: TabType } | null>(null);

  const [error, setError] = useState<string | null>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch helpers
  const fetchTxStats = useCallback(async () => {
    try { setLoadingTxStats(true); const r = await transactionsApi.getStats(); if (r.status) setTxStats(r.data); }
    catch { /* silent */ } finally { setLoadingTxStats(false); }
  }, []);

  const fetchTxs = useCallback(async (page: number, search: string, status: string, currency: string) => {
    try {
      setLoadingTxs(true); setError(null);
      const r = await transactionsApi.getAll({ page, per_page: 15, search: search || undefined, status: status || undefined, currency: currency || undefined });
      if (r.status) { const d = r.data as any; setTxs(d?.data ?? []); if (d?.total) setTxPag({ total: d.total, last_page: d.last_page, from: d.from, to: d.to }); }
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed'); }
    finally { setLoadingTxs(false); }
  }, []);

  const fetchCryptoStats = useCallback(async () => {
    try { setLoadingCryptoStats(true); const r = await transactionsApi.getSellCryptoStats(); if (r.status) setCryptoStats(r.data); }
    catch { /* silent */ } finally { setLoadingCryptoStats(false); }
  }, []);

  const fetchCrypto = useCallback(async (page: number, search: string, status: string) => {
    try {
      setLoadingCrypto(true); setError(null);
      const r = await transactionsApi.getSellCrypto({ page, per_page: 15, search: search || undefined, status: status || undefined });
      if (r.status) { const d = r.data as any; setCryptoTxs(d?.data ?? []); if (d?.total) setCryptoPag({ total: d.total, last_page: d.last_page, from: d.from, to: d.to }); }
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed'); }
    finally { setLoadingCrypto(false); }
  }, []);

  const fetchChinaStats = useCallback(async () => {
    try { setLoadingChinaStats(true); const r = await transactionsApi.getPayToChinaStats(); if (r.status) setChinaStats(r.data); }
    catch { /* silent */ } finally { setLoadingChinaStats(false); }
  }, []);

  const fetchChina = useCallback(async (page: number, search: string, status: string) => {
    try {
      setLoadingChina(true); setError(null);
      const r = await transactionsApi.getPayToChina({ page, per_page: 15, search: search || undefined, status: status || undefined });
      if (r.status) { const d = r.data as any; setChinaTxs(d?.data ?? []); if (d?.total) setChinaPag({ total: d.total, last_page: d.last_page, from: d.from, to: d.to }); }
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed'); }
    finally { setLoadingChina(false); }
  }, []);

  const fetchConvStats = useCallback(async () => {
    try { setLoadingConvStats(true); const r = await transactionsApi.getConversionStats(); if (r.status) setConvStats(r.data); }
    catch { /* silent */ } finally { setLoadingConvStats(false); }
  }, []);

  const fetchConv = useCallback(async (page: number, search: string, status: string) => {
    try {
      setLoadingConv(true); setError(null);
      const r = await transactionsApi.getConversions({ page, per_page: 15, search: search || undefined, status: status || undefined });
      if (r.status) { const d = r.data as any; setConvTxs(d?.data ?? []); if (d?.total) setConvPag({ total: d.total, last_page: d.last_page, from: d.from, to: d.to }); }
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed'); }
    finally { setLoadingConv(false); }
  }, []);

  // Tab effects
  useEffect(() => {
    if (!isAuthenticated) return;
    if (activeTab === 'overview') { fetchTxStats(); fetchTxs(txPage, txSearch, txStatus, txCurrency); }
    if (activeTab === 'crypto') { fetchCryptoStats(); fetchCrypto(cryptoPage, cryptoSearch, cryptoStatus); }
    if (activeTab === 'pay-china') { fetchChinaStats(); fetchChina(chinaPage, chinaSearch, chinaStatus); }
    if (activeTab === 'conversions') { fetchConvStats(); fetchConv(convPage, convSearch, convStatus); }
  }, [isAuthenticated, activeTab]);

  useEffect(() => {
    if (!isAuthenticated || activeTab !== 'overview') return;
    fetchTxs(txPage, txSearch, txStatus, txCurrency);
  }, [txPage, txStatus, txCurrency]);

  useEffect(() => {
    if (!isAuthenticated || activeTab !== 'crypto') return;
    fetchCrypto(cryptoPage, cryptoSearch, cryptoStatus);
  }, [cryptoPage, cryptoStatus]);

  useEffect(() => {
    if (!isAuthenticated || activeTab !== 'pay-china') return;
    fetchChina(chinaPage, chinaSearch, chinaStatus);
  }, [chinaPage, chinaStatus]);

  useEffect(() => {
    if (!isAuthenticated || activeTab !== 'conversions') return;
    fetchConv(convPage, convSearch, convStatus);
  }, [convPage, convStatus]);

  // ── 2. Auth guard after all hooks ──
  if (!isAuthenticated) return null;

  // ── 3. Search handlers ──
  const debounce = (fn: () => void) => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(fn, 400);
  };

  const handleTxSearch = (v: string) => { setTxSearch(v); debounce(() => { setTxPage(1); fetchTxs(1, v, txStatus, txCurrency); }); };
  const handleCryptoSearch = (v: string) => { setCryptoSearch(v); debounce(() => { setCryptoPage(1); fetchCrypto(1, v, cryptoStatus); }); };
  const handleChinaSearch = (v: string) => { setChinaSearch(v); debounce(() => { setChinaPage(1); fetchChina(1, v, chinaStatus); }); };
  const handleConvSearch = (v: string) => { setConvSearch(v); debounce(() => { setConvPage(1); fetchConv(1, v, convStatus); }); };

  const handleTxAction = (id: number) => {
    setTxs((prev) => prev.map((t) => t.id === id ? { ...t, status: 'completed' } : t));
    setSelectedTx(null);
  };

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'crypto', label: 'Crypto → Cash' },
    { id: 'pay-china', label: 'Pay to China' },
    { id: 'conversions', label: 'Conversions' },
  ] as const;

  const tableRows = (loading: boolean, cols: number) =>
    loading ? [...Array(6)].map((_, i) => (
      <tr key={i}>{[...Array(cols)].map((_, j) => (
        <td key={j} className="px-6 py-4"><Skeleton className="h-5 w-full" /></td>
      ))}</tr>
    )) : null;

  // ── 4. Render ──
  return (
    <div className="flex h-screen bg-gray-50 font-['DM_Sans']">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">

          {/* Header */}
          <div className="bg-white border-b border-gray-200 px-8 py-6">
         <DashboardHeader title="Transactions" subtitle="comprehensive wallet transactions for all users"/>
         </div>
          <div className="p-8">
            {error && <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl"><p className="text-sm text-red-600">{error}</p></div>}

            {/* ── OVERVIEW TAB ── */}
            {activeTab === 'overview' && (
              <>
                <div className="grid grid-cols-4 gap-5 mb-6">
                  <StatCard label="Total Transactions" value={txStats?.total ?? 0} color="text-gray-900" loading={loadingTxStats} />
                  <StatCard label="Completed" value={txStats?.completed ?? 0} color="text-emerald-600" loading={loadingTxStats} />
                  <StatCard label="Pending" value={txStats?.pending ?? 0} color="text-orange-600" loading={loadingTxStats} />
                  <StatCard label="Failed" value={txStats?.failed ?? 0} color="text-red-600" loading={loadingTxStats} />
                </div>

                {/* Filters */}
                <div className="flex items-center gap-3 mb-6">
                  <div className="flex-1 relative">
                    <svg className="w-4 h-4 text-gray-400 absolute left-3 top-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                    </svg>
                    <input type="text" value={txSearch} onChange={(e) => handleTxSearch(e.target.value)}
                      placeholder="Search by name, wallet ID or transaction ID..."
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                  </div>
                  <select value={txStatus} onChange={(e) => { setTxStatus(e.target.value); setTxPage(1); }}
                    className="px-4 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white">
                    <option value="">All Status</option>
                    <option value="completed">Completed</option>
                    <option value="pending">Pending</option>
                    <option value="failed">Failed</option>
                  </select>
                  <select value={txCurrency} onChange={(e) => { setTxCurrency(e.target.value); setTxPage(1); }}
                    className="px-4 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white">
                    <option value="">All Currencies</option>
                    <option value="USD">USD</option>
                    <option value="NGN">NGN</option>
                    <option value="YAN">YAN</option>
                  </select>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          {['Reference', 'Type', 'Category', 'Amount', 'Currency', 'Fee', 'Status', 'Created', 'Actions'].map((h) => (
                            <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {loadingTxs ? tableRows(true, 9) : txs.length === 0 ? (
                          <tr><td colSpan={9} className="px-6 py-12 text-center text-gray-400 text-sm">No transactions found</td></tr>
                        ) : (
                          txs.map((t) => (
                            <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-6 py-4 text-xs text-gray-600 font-mono whitespace-nowrap">{t.reference}</td>
                              <td className="px-6 py-4 text-sm text-gray-900 capitalize whitespace-nowrap">{t.type}</td>
                              <td className="px-6 py-4 text-sm text-gray-600 capitalize whitespace-nowrap">{t.category}</td>
                              <td className="px-6 py-4 text-sm font-bold text-gray-900 whitespace-nowrap">{t.amount}</td>
                              <td className="px-6 py-4 text-sm text-gray-600">{t.currency}</td>
                              <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">{t.fee}</td>
                              <td className="px-6 py-4"><StatusBadge status={t.status} /></td>
                              <td className="px-6 py-4 text-xs text-gray-500 whitespace-nowrap">{formatDate(t.createdAt)}</td>
                              <td className="px-6 py-4">
                                <button onClick={() => setSelectedTx({ id: t.id, type: 'overview' })}
                                  className="text-sm text-emerald-600 hover:text-emerald-700 font-medium">View</button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                    <p className="text-sm text-gray-500">
                      {txPag ? `Showing ${txPag.from ?? 0}–${txPag.to ?? 0} of ${txPag.total}` : ''}
                    </p>
                    <Pagination page={txPage} total={txPag?.last_page ?? 1} onChange={setTxPage} />
                  </div>
                </div>
              </>
            )}

            {/* ── CRYPTO TAB ── */}
            {activeTab === 'crypto' && (
              <>
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-gray-900">Crypto → Cash</h2>
                  <p className="text-sm text-gray-500 mt-0.5">Monitor crypto deposits and cash payouts</p>
                </div>
                <div className="grid grid-cols-4 gap-5 mb-6">
                  <StatCard label="Total" value={cryptoStats?.total ?? 0} color="text-gray-900" loading={loadingCryptoStats} />
                  <StatCard label="Completed" value={cryptoStats?.completed ?? 0} color="text-emerald-600" loading={loadingCryptoStats} />
                  <StatCard label="Pending" value={cryptoStats?.pending ?? 0} color="text-orange-600" loading={loadingCryptoStats} />
                  <StatCard label="Total Fiat" value={cryptoStats?.total_fiat_amount ?? '—'} color="text-blue-600" loading={loadingCryptoStats} />
                </div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="flex-1 relative">
                    <svg className="w-4 h-4 text-gray-400 absolute left-3 top-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                    </svg>
                    <input type="text" value={cryptoSearch} onChange={(e) => handleCryptoSearch(e.target.value)}
                      placeholder="Search by reference or user..."
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                  </div>
                  <select value={cryptoStatus} onChange={(e) => { setCryptoStatus(e.target.value); setCryptoPage(1); }}
                    className="px-4 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white">
                    <option value="">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="completed">Completed</option>
                    <option value="failed">Failed</option>
                  </select>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          {['ID', 'Asset', 'Amount', 'Network', 'Fiat Amount', 'Rate', 'Fee', 'Status', 'Created', 'Actions'].map((h) => (
                            <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {loadingCrypto ? tableRows(true, 10) : cryptoTxs.length === 0 ? (
                          <tr><td colSpan={10} className="px-6 py-12 text-center text-gray-400 text-sm">No crypto transactions found</td></tr>
                        ) : (
                          cryptoTxs.map((t) => (
                            <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-6 py-4 text-sm text-gray-600">#{t.id}</td>
                              <td className="px-6 py-4 text-sm font-bold text-gray-900">{t.cryptoCurrency}</td>
                              <td className="px-6 py-4 text-sm font-bold text-gray-900 whitespace-nowrap">{t.cryptoAmount}</td>
                              <td className="px-6 py-4 text-sm text-gray-600">{t.cryptoNetwork}</td>
                              <td className="px-6 py-4 text-sm font-bold text-emerald-600 whitespace-nowrap">{t.fiatAmount} {t.fiatCurrency}</td>
                              <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">{t.rate}</td>
                              <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">{t.fee}</td>
                              <td className="px-6 py-4"><StatusBadge status={t.status} /></td>
                              <td className="px-6 py-4 text-xs text-gray-500 whitespace-nowrap">{formatDate(t.createdAt)}</td>
                              <td className="px-6 py-4">
                                <button onClick={() => setSelectedTx({ id: t.id, type: 'crypto' })}
                                  className="text-sm text-emerald-600 hover:text-emerald-700 font-medium">View</button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                    <p className="text-sm text-gray-500">{cryptoPag ? `Showing ${cryptoPag.from ?? 0}–${cryptoPag.to ?? 0} of ${cryptoPag.total}` : ''}</p>
                    <Pagination page={cryptoPage} total={cryptoPag?.last_page ?? 1} onChange={setCryptoPage} />
                  </div>
                </div>
              </>
            )}

            {/* ── PAY TO CHINA TAB ── */}
            {activeTab === 'pay-china' && (
              <>
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-gray-900">Payment to China</h2>
                  <p className="text-sm text-gray-500 mt-0.5">Monitor YAN deposits and cash payouts</p>
                </div>
                <div className="grid grid-cols-4 gap-5 mb-6">
                  <StatCard label="Total" value={chinaStats?.total ?? 0} color="text-gray-900" loading={loadingChinaStats} />
                  <StatCard label="Completed" value={chinaStats?.completed ?? 0} color="text-emerald-600" loading={loadingChinaStats} />
                  <StatCard label="Pending" value={chinaStats?.pending ?? 0} color="text-orange-600" loading={loadingChinaStats} />
                  <StatCard label="Failed" value={chinaStats?.failed ?? 0} color="text-red-600" loading={loadingChinaStats} />
                </div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="flex-1 relative">
                    <svg className="w-4 h-4 text-gray-400 absolute left-3 top-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                    </svg>
                    <input type="text" value={chinaSearch} onChange={(e) => handleChinaSearch(e.target.value)}
                      placeholder="Search by reference or user..."
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                  </div>
                  <select value={chinaStatus} onChange={(e) => { setChinaStatus(e.target.value); setChinaPage(1); }}
                    className="px-4 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white">
                    <option value="">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="completed">Completed</option>
                    <option value="failed">Failed</option>
                  </select>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          {['Reference', 'Amount', 'Received', 'Currency', 'Exchange Rate', 'Fee', 'Method', 'Status', 'Created', 'Actions'].map((h) => (
                            <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {loadingChina ? tableRows(true, 10) : chinaTxs.length === 0 ? (
                          <tr><td colSpan={10} className="px-6 py-12 text-center text-gray-400 text-sm">No Pay to China transactions found</td></tr>
                        ) : (
                          chinaTxs.map((t) => (
                            <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-6 py-4 text-xs text-gray-600 font-mono whitespace-nowrap">{t.reference}</td>
                              <td className="px-6 py-4 text-sm font-bold text-gray-900 whitespace-nowrap">{t.amount}</td>
                              <td className="px-6 py-4 text-sm font-bold text-emerald-600 whitespace-nowrap">{t.amountReceived}</td>
                              <td className="px-6 py-4 text-sm text-gray-600">{t.currency}</td>
                              <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">{t.exchangeRate}</td>
                              <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">{t.fee}</td>
                              <td className="px-6 py-4 text-sm text-gray-600 capitalize whitespace-nowrap">{t.payoutMethod?.replace(/_/g, ' ')}</td>
                              <td className="px-6 py-4"><StatusBadge status={t.status} /></td>
                              <td className="px-6 py-4 text-xs text-gray-500 whitespace-nowrap">{formatDate(t.createdAt)}</td>
                              <td className="px-6 py-4">
                                <button onClick={() => setSelectedTx({ id: t.id, type: 'pay-china' })}
                                  className="text-sm text-emerald-600 hover:text-emerald-700 font-medium">View</button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                    <p className="text-sm text-gray-500">{chinaPag ? `Showing ${chinaPag.from ?? 0}–${chinaPag.to ?? 0} of ${chinaPag.total}` : ''}</p>
                    <Pagination page={chinaPage} total={chinaPag?.last_page ?? 1} onChange={setChinaPage} />
                  </div>
                </div>
              </>
            )}

            {/* ── CONVERSIONS TAB ── */}
            {activeTab === 'conversions' && (
              <>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Inter-Wallet Conversions</h2>
                    <p className="text-sm text-gray-500 mt-0.5">Track all wallet-to-wallet currency conversions</p>
                  </div>
                  <button className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-500 text-white rounded-lg text-sm font-semibold hover:bg-emerald-600">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                    Export
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-5 mb-6">
                  <StatCard label="Total Conversions" value={convStats?.total_count ?? '—'} color="text-gray-900" loading={loadingConvStats} sub="All time" />
                  <StatCard label="Total Volume" value={convStats?.total_volume ?? '—'} color="text-blue-600" loading={loadingConvStats} sub="All currencies" />
                  <StatCard label="USD Volume" value={convStats?.by_source_currency?.USD ?? '—'} color="text-emerald-600" loading={loadingConvStats} />
                  <StatCard label="NGN Volume" value={convStats?.by_source_currency?.NGN ?? '—'} color="text-orange-600" loading={loadingConvStats} />
                </div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="flex-1 relative">
                    <svg className="w-4 h-4 text-gray-400 absolute left-3 top-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                    </svg>
                    <input type="text" value={convSearch} onChange={(e) => handleConvSearch(e.target.value)}
                      placeholder="Search by name, wallet ID or transaction ID..."
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                  </div>
                  <select value={convStatus} onChange={(e) => { setConvStatus(e.target.value); setConvPage(1); }}
                    className="px-4 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white">
                    <option value="">All Status</option>
                    <option value="completed">Completed</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          {['Reference', 'Type', 'Amount', 'Currency', 'Fee', 'Status', 'Description', 'Created', 'Actions'].map((h) => (
                            <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {loadingConv ? tableRows(true, 9) : convTxs.length === 0 ? (
                          <tr><td colSpan={9} className="px-6 py-12 text-center text-gray-400 text-sm">No conversions found</td></tr>
                        ) : (
                          convTxs.map((t) => (
                            <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-6 py-4 text-xs text-gray-600 font-mono whitespace-nowrap">{t.reference}</td>
                              <td className="px-6 py-4 text-sm text-gray-900 capitalize whitespace-nowrap">{t.type}</td>
                              <td className="px-6 py-4 text-sm font-bold text-gray-900 whitespace-nowrap">{t.amount}</td>
                              <td className="px-6 py-4 text-sm text-gray-600">{t.currency}</td>
                              <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">{t.fee}</td>
                              <td className="px-6 py-4"><StatusBadge status={t.status} /></td>
                              <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">{t.description ?? '—'}</td>
                              <td className="px-6 py-4 text-xs text-gray-500 whitespace-nowrap">{formatDate(t.createdAt)}</td>
                              <td className="px-6 py-4">
                                <button onClick={() => setSelectedTx({ id: t.id, type: 'conversions' })}
                                  className="text-sm text-emerald-600 hover:text-emerald-700 font-medium">View</button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                    <p className="text-sm text-gray-500">{convPag ? `Showing ${convPag.from ?? 0}–${convPag.to ?? 0} of ${convPag.total}` : ''}</p>
                    <Pagination page={convPage} total={convPag?.last_page ?? 1} onChange={setConvPage} />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </main>

      {/* Detail side panel */}
      {selectedTx && (
        <TxDetailPanel
          txId={selectedTx.id}
          type={selectedTx.type}
          onClose={() => setSelectedTx(null)}
          onApprove={handleTxAction}
          onReject={handleTxAction}
        />
      )}
    </div>
  );
}