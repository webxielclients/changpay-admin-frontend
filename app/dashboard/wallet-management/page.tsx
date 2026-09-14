'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';
import { walletApi } from '@/lib/api/client';
import type { WalletStats, WalletRecord, CurrencyWalletData, ReconciliationStatus, TopupTransaction, LedgerEntry } from '@/lib/api/client';
import Sidebar from '@/components/Sidebar';
import DashboardHeader from '@/components/DashboardHeader';
import Image from 'next/image';

type MainTab       = 'overview' | 'currency-wallets' | 'ledger' | 'topup' | 'reconciliation';
type CurrencyType  = 'USD' | 'NGN' | 'YAN';
type LedgerAction  = 'all' | 'debit' | 'credit' | 'hold' | 'release';
type TopupCurrency = 'all' | 'USD' | 'NGN';

const FONT = { fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif" };


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

function fmtDateExact(s?: string | null) {
  if (!s) return '—';
  const d = new Date(s);
  if (isNaN(d.getTime())) return '—';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase().replace(' ', '');
  return `${y}-${m}-${day} ${time}`;
}

function timeAgo(s?: string | null): string {
  if (!s) return '';
  const diff = Date.now() - new Date(s).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? '' : 's'} ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
  return `${Math.floor(days / 30)} month${Math.floor(days / 30) === 1 ? '' : 's'} ago`;
}

function TimestampCell({ date }: { date?: string | null }) {
  return (
    <div>
      <p className="whitespace-nowrap" style={{ ...FONT, color: '#1A1D1F', fontWeight: 500, fontSize: 12, lineHeight: '150%', letterSpacing: '0.01em' }}>{fmtDateExact(date)}</p>
      <p className="whitespace-nowrap" style={{ ...FONT, color: '#6A7377', fontWeight: 400, fontSize: 14, lineHeight: '150%', letterSpacing: '0.02em' }}>{timeAgo(date)}</p>
    </div>
  );
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 rounded-lg ${className ?? ''}`} />;
}

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
        <Image src="/Icon.png" alt="" width={11} height={11} />
        Frozen
      </span>
    );
  }
  if (isActive) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border bg-white" style={{ borderColor: '#0274D8', color: '#0274D8' }}>
        <Image src="/Unlock.png" alt="" width={11} height={11} />
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
  const titleCased = nameStr.toLowerCase().replace(/(^|\s|-)\S/g, (c) => c.toUpperCase());
  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${color}`}>
        {display}
      </div>
      <div className="min-w-0">
        <p className="truncate" style={{ ...FONT, color: '#1A1D1F', fontWeight: 500, fontSize: '14.67px', lineHeight: '150%', letterSpacing: '0.02em' }}>{titleCased || '—'}</p>
        {email && <p className="text-xs text-gray-400 truncate">{email}</p>}
      </div>
    </div>
  );
}

// ─── Direction icons ───────────────────────────────────────────────────────────
function CreditIcon() {
  return <img src="/iconup.svg" alt="" className="w-8 h-8 flex-shrink-0" />;
}
function DebitIcon() {
  return <img src="/icondwn.svg" alt="" className="w-8 h-8 flex-shrink-0" />;
}
function TransferIcon() {
  return <img src="/iconupp.svg" alt="" className="w-8 h-8 flex-shrink-0" />;
}

// ─── Ledger row helpers ─────────────────────────────────────────────────────────
function ledgerDescription(row: LedgerEntry): string {
  const type = (row.transaction.type ?? '').toLowerCase();
  const isCredit = row.action === 'credit' || row.action === 'release';
  const map: Record<string, string> = {
    topup: 'Bank transfer deposit',
    deposit: 'Bank transfer deposit',
    withdrawal: 'Withdrawal to bank',
    swap: 'Currency swap',
    conversion: 'Currency conversion',
    transfer: isCredit ? 'Transfer in' : 'Transfer out',
    adjustment: 'Admin adjustment',
  };
  if (map[type]) return map[type];
  return type ? `${type.charAt(0).toUpperCase()}${type.slice(1)}` : (isCredit ? 'Credit' : 'Debit');
}

function LedgerTypeIcon({ action, type }: { action: LedgerEntry['action']; type: string }) {
  const isTransferLike = ['transfer', 'adjustment'].includes((type ?? '').toLowerCase());
  const isCredit = action === 'credit' || action === 'release';
  if (isTransferLike) return <TransferIcon />;
  return isCredit ? <CreditIcon /> : <DebitIcon />;
}


function SearchBar({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="relative shrink-0" style={{ width: 740 }}>
      <svg className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
      </svg>
      <input
        type="text" value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-10 pr-4 border rounded-full text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-400"
        style={{ backgroundColor: '#F8F9FA', borderColor: '#E1E4E6', height: 48, borderWidth: 1, borderRadius: 70 }}
      />
    </div>
  );
}


function ExportBtn({ onClick }: { onClick?: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-2 px-5 text-white rounded-full text-sm font-medium transition-colors flex-shrink-0"
      style={{ backgroundColor: '#009F51', height: 48 }}>
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
      </svg>
      Export
    </button>
  );
}

// ─── CSV helpers ──────────────────────────────────────────────────────────────
function downloadCSV(filename: string, headers: string[], rows: (string | number | null | undefined)[][]) {
  const csv = [headers, ...rows].map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = `${filename}-${new Date().toISOString().slice(0,10)}.csv`; a.click();
  URL.revokeObjectURL(url);
}

// ─── Pill filter tabs (e.g. Ledger action, Topup currency) ───────────────────
function PillTabs<T extends string>({ options, value, onChange }: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {options.map((opt) => (
        <button
          key={opt.id}
          onClick={() => onChange(opt.id)}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
            value === opt.id ? 'text-white' : 'text-gray-600 hover:bg-gray-100'
          }`}
          style={value === opt.id ? { backgroundColor: '#009F51' } : { backgroundColor: '#F8F9FA', border: '1px solid #E1E4E6' }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ─── Status filter dropdown ────────────────────────────────────────────────────
function StatusFilter({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative flex-shrink-0">
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="appearance-none border pl-3 pr-8 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-400 cursor-pointer"
        style={{ backgroundColor: '#F8F9FA', borderColor: '#E1E4E6', width: 172, height: 48, borderWidth: 1, borderRadius: 100 }}>
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


// ─── Wallet detail modal ───────────────────────────────────────────────────────
function WalletDetailModal({ wallet, onClose, onToggleLock, toggling }: { wallet: WalletRecord; onClose: () => void; onToggleLock: (wallet: WalletRecord) => void; toggling: boolean }) {
  const [copied, setCopied] = useState(false);
  const userName = wallet.user ? [wallet.user.firstName, wallet.user.lastName].filter(Boolean).join(' ') : '—';
  const lastActivity = wallet.lastActivityAt
    ? new Date(wallet.lastActivityAt).toLocaleString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).replace(',', '')
    : '—';
  const dateCreated = wallet.createdAt
    ? new Date(wallet.createdAt).toLocaleString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).replace(',', '')
    : '—';

  const row = (label: string, value: React.ReactNode) => (
    <div className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-semibold text-gray-900">{value}</span>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white w-full max-w-md rounded-xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-900">Wallet Details</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="px-6 py-4">
          <div className="flex items-center justify-between py-2 border-b border-gray-50">
            <span className="text-sm text-gray-500">Wallet ID</span>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold text-gray-900 font-mono">{wallet.id}</span>
              <button
                onClick={() => { navigator.clipboard.writeText(wallet.id); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
                className="text-gray-400 hover:text-gray-600">
                {copied
                  ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#009F51" strokeWidth="2.5"><path d="m5 13 4 4L19 7" /></svg>
                  : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>}
              </button>
            </div>
          </div>
          {row('Owner', <UserCell name={userName} email={wallet.user?.changpayId ?? wallet.user?.email ?? ''} initials={null} />)}
          {row('Currency', wallet.currency)}
          {row('Balance', `${currencySymbol(wallet.currency)}${Number(wallet.balance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)}
          {row('Available Balance', `${currencySymbol(wallet.currency)}${Number(wallet.availableBalance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)}
          {row('Status', <StatusBadge isLocked={wallet.isLocked} isActive={wallet.isActive} />)}
          {row('Verified', wallet.isVerified ? 'Yes' : 'No')}
          {row('Date Created', dateCreated)}
          {row('Last Activity', lastActivity)}
        </div>

        <div className="px-6 pb-6">
          <button
            onClick={() => onToggleLock(wallet)}
            disabled={toggling}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
            style={{ backgroundColor: wallet.isLocked ? '#009F51' : '#FF756B' }}>
            {toggling ? 'Processing…' : wallet.isLocked ? 'Unfreeze Wallet' : 'Freeze Wallet'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function WalletManagementPage() {
  const { isAuthenticated } = useAuthStore();

  const [mainTab,          setMainTab]          = useState<MainTab>('overview');
  const [selectedCurrency, setSelectedCurrency]  = useState<CurrencyType>('USD');
  const [walletSearch,     setWalletSearch]      = useState('');
  const [ledgerSearch,     setLedgerSearch]      = useState('');
  const [ledgerAction,     setLedgerAction]      = useState<LedgerAction>('all');
  const [topupSearch,      setTopupSearch]       = useState('');
  const [topupFilter,      setTopupFilter]       = useState('All Status');
  const [topupCurrency,    setTopupCurrency]     = useState<TopupCurrency>('all');
  const [currentPage,      setCurrentPage]       = useState(1);

  const [stats,          setStats]          = useState<WalletStats | null>(null);
  const [currencyData,   setCurrencyData]   = useState<CurrencyWalletData | null>(null);
  const [wallets,        setWallets]        = useState<WalletRecord[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivityItem[]>([]);
  const [togglingId,          setTogglingId]          = useState<string | null>(null);
  const [viewingWallet,       setViewingWallet]       = useState<WalletRecord | null>(null);
  const [reconciliation,      setReconciliation]      = useState<ReconciliationStatus | null>(null);
  const [loadingStats,        setLoadingStats]        = useState(true);
  const [loadingWallets,      setLoadingWallets]      = useState(false);
  const [loadingRecon,        setLoadingRecon]        = useState(false);
  const [runningRecon,        setRunningRecon]        = useState(false);
  const [topups,              setTopups]              = useState<TopupTransaction[] | null>(null);
  const [topupPage,           setTopupPage]           = useState(1);
  const [topupMeta,           setTopupMeta]           = useState<{ last_page: number; from: number | null; to: number | null; total: number } | null>(null);
  const [ledger,              setLedger]              = useState<LedgerEntry[] | null>(null);
  const [ledgerPage,          setLedgerPage]          = useState(1);
  const [ledgerMeta,          setLedgerMeta]          = useState<{ current_page: number; last_page: number; from: number | null; to: number | null; total: number } | null>(null);
  const [loadingTopups,       setLoadingTopups]       = useState(false);
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

  const fetchTopups = useCallback(async (search = '', status = '', currency: TopupCurrency = 'all', page = 1) => {
    try {
      setLoadingTopups(true);
      const res = await walletApi.getTopups({
        search: search || undefined,
        status: status && status !== 'All Status' ? status.toLowerCase() : undefined,
        currency: currency !== 'all' ? currency : undefined,
        per_page: 15,
        page,
      });
      setTopups(res.data?.data ?? []);
      if (res.data?.meta) setTopupMeta(res.data.meta);
    } catch { /* silent */ } finally { setLoadingTopups(false); }
  }, []);

  const fetchLedger = useCallback(async (search = '', action: LedgerAction = 'all', page = 1) => {
    try {
      setLoadingLedger(true);
      const res = await walletApi.getLedger({
        search: search || undefined,
        action: action !== 'all' ? action : undefined,
        per_page: 15,
        page,
      });
      setLedger(res.data?.data ?? []);
      if (res.data?.meta) setLedgerMeta(res.data.meta);
    } catch { /* silent */ } finally { setLoadingLedger(false); }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  useEffect(() => {
    if (mainTab === 'currency-wallets') fetchCurrencyWallets(selectedCurrency, currentPage, walletSearch);
    if (mainTab === 'topup') fetchTopups(topupSearch, topupFilter, topupCurrency, topupPage);
    if (mainTab === 'ledger') fetchLedger(ledgerSearch, ledgerAction, ledgerPage);
    if (mainTab === 'reconciliation') fetchReconciliation();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mainTab, selectedCurrency, currentPage, topupSearch, topupFilter, topupCurrency, topupPage, ledgerSearch, ledgerAction, ledgerPage]);

  const handleWalletSearch = (val: string) => {
    setWalletSearch(val);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setCurrentPage(1);
      fetchCurrencyWallets(selectedCurrency, 1, val);
    }, 400);
  };

  const handleTopupSearch = (val: string) => {
    setTopupSearch(val);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => { setTopupPage(1); fetchTopups(val, topupFilter, topupCurrency, 1); }, 400);
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
      if (res.status) {
        setWallets((prev) => prev.map((w) => w.id === wallet.id ? res.data : w));
        setViewingWallet((prev) => prev && prev.id === wallet.id ? res.data : prev);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle wallet lock');
    } finally {
      setTogglingId(null);
    }
  };

  if (!isAuthenticated) return null;

  const displayWallets: WalletRecord[] = wallets;
  const totalPages = currencyData?.wallets?.meta?.last_page ?? 1;

  const goToCurrencyWallets = (currency: CurrencyType) => {
    setMainTab('currency-wallets');
    handleCurrencyChange(currency);
  };

  const MAIN_TABS: { id: MainTab; label: string }[] = [
    { id: 'overview',         label: 'Overview' },
    { id: 'currency-wallets', label: 'Currency Wallets' },
    { id: 'ledger',           label: 'Ledger' },
    { id: 'topup',            label: 'Top Up' },
    { id: 'reconciliation',   label: 'Reconciliation' },
  ];

  const LEDGER_ACTIONS: { id: LedgerAction; label: string }[] = [
    { id: 'all',     label: 'All' },
    { id: 'credit',  label: 'Credit' },
    { id: 'debit',   label: 'Debit' },
    { id: 'hold',    label: 'Hold' },
    { id: 'release', label: 'Release' },
  ];

  const TOPUP_CURRENCIES: { id: TopupCurrency; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'USD', label: 'USD' },
    { id: 'NGN', label: 'NGN' },
  ];

  return (
    <div className="flex h-screen bg-[#F8F9FA]" style={FONT}>
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
                className={`relative py-4 text-sm font-medium transition-colors whitespace-nowrap flex-1 text-center ${
                  mainTab === tab.id ? 'text-emerald-600' : 'text-gray-500 hover:text-gray-700'
                }`}>
                {tab.label}
                {mainTab === tab.id && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500" />}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex-1 overflow-y-auto bg-white">
          {error && (
            <div className="mx-8 mt-5 p-3 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* ── OVERVIEW ── */}
          {mainTab === 'overview' && (
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-3 items-stretch" style={{ gap: '12.02px' }}>
                <div className="flex flex-col bg-[#F8F9FA]" style={{ borderRadius: '18.03px', padding: '18.03px', minHeight: 112 }}>
                  <p className="text-xs text-gray-500 mb-2">Total Wallets</p>
                  {loadingStats ? <Skeleton className="h-10 w-16" /> : (
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center flex-shrink-0">
                        <Image src="/wallet.png" alt="" width={16} height={16} />
                      </div>
                      <p style={{ fontFamily: FONT.fontFamily, color: '#1A1D1F', fontWeight: 600, fontSize: '30.04px', lineHeight: '130%', letterSpacing: '0%' }}>{stats?.total_wallets ?? '—'}</p>
                    </div>
                  )}
                </div>

                <div className="flex flex-col bg-[#F8F9FA]" style={{ borderRadius: '18.03px', padding: '18.03px', minHeight: 112 }}>
                  <p className="text-xs text-gray-500 mb-2">Today's Transactions</p>
                  {loadingStats ? <Skeleton className="h-10 w-28" /> : (
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center flex-shrink-0">
                        <Image src="/arrowupbn.png" alt="" width={16} height={16} />
                      </div>
                      <p style={{ fontFamily: FONT.fontFamily, color: '#1A1D1F', fontWeight: 600, fontSize: '30.04px', lineHeight: '130%', letterSpacing: '0%' }}>{stats?.today?.transactions_count ?? '—'}</p>
                    </div>
                  )}
                </div>

                <div className="flex flex-col bg-[#F8F9FA]" style={{ borderRadius: '18.03px', padding: '18.03px', minHeight: 112 }}>
                  <p className="text-xs text-gray-500 mb-2">Transaction Volume</p>
                  {loadingStats ? <Skeleton className="h-10 w-28" /> : (
                    stats?.transaction_volume?.total != null ? (
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center flex-shrink-0">
                          <Image src="/arrowupbn.png" alt="" width={16} height={16} />
                        </div>
                        <p style={{ fontFamily: FONT.fontFamily, color: '#1A1D1F', fontWeight: 600, fontSize: '30.04px', lineHeight: '130%', letterSpacing: '0%' }}>
                          ${Number(stats.transaction_volume.total).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                    ) : <p style={{ fontFamily: FONT.fontFamily, color: '#9CA3AF', fontWeight: 600, fontSize: '30.04px', lineHeight: '130%', letterSpacing: '0%' }}>—</p>
                  )}
                </div>
              </div>

              {/* Currency cards */}
              <div className="grid grid-cols-3 items-stretch" style={{ gap: '12.02px' }}>
                {(['USD', 'NGN', 'YAN'] as CurrencyType[]).map((cur) => {
                  const curData = stats?.by_currency?.[cur];
                  const labels: Record<CurrencyType, string>  = { USD: 'USD Wallets', NGN: 'NGN Wallets', YAN: 'YUAN Wallet Balance' };
                  const links:  Record<CurrencyType, string>  = { USD: 'View All USD Wallets', NGN: 'View All NGN Wallets', YAN: 'View All YUAN Wallets' };
                  return (
                    <div key={cur} className="flex flex-col bg-[#F8F9FA]" style={{ borderRadius: '18.03px', padding: '18.03px', minHeight: 112 }}>
                      <p className="text-xs text-gray-500 mb-2">{labels[cur]}</p>
                      {loadingStats ? <Skeleton className="h-10 w-36" /> : (
                        <div>
                          <div className="flex items-center gap-2.5 mb-1">
                            <CurrencyFlag currency={cur} className="w-7 h-5" />
                            <p style={{ fontFamily: FONT.fontFamily, color: '#1A1D1F', fontWeight: 600, fontSize: '30.04px', lineHeight: '130%', letterSpacing: '0%' }}>
                              {curData ? `${currencySymbol(cur)}${curData.total_balance}` : '—'}
                            </p>
                          </div>
                          <p className="text-xs text-gray-400 mt-1">{curData ? 'Last 5 secs' : ' '}</p>
                        </div>
                      )}
                      <button onClick={() => goToCurrencyWallets(cur)} className="mt-auto pt-3 text-left hover:underline"
                        style={{ ...FONT, color: '#009F51', fontWeight: 700, fontSize: 10, lineHeight: '150%', letterSpacing: '0%' }}>
                        {links[cur]} →
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Recent Activity — API data only */}
              <div style={{ backgroundColor: '#F8F9FA', borderRadius: 16, borderWidth: '1.05px', borderStyle: 'solid', borderColor: '#E1E4E6', paddingTop: 16, paddingBottom: 16, paddingLeft: 12, paddingRight: 12 }}>
                <div className="bg-white rounded-xl p-6">
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
                        <div key={i} className="flex items-center justify-between bg-[#F8F9FA] rounded-xl" style={{ padding: 12 }}>
                          <div className="flex items-center gap-3">
                            {item.action === 'credit' ? <CreditIcon /> : <DebitIcon />}
                            <div>
                              <p style={{ ...FONT, color: '#1A1D1F', fontWeight: 500, fontSize: 16, lineHeight: '24px', letterSpacing: '0%' }}>{item.user}</p>
                              <p style={{ ...FONT, color: '#6A7377', fontWeight: 400, fontSize: 18, lineHeight: '136%', letterSpacing: '-1%' }}>{item.walletId.slice(0, 8).toUpperCase()} • {item.label}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p style={{ ...FONT, color: item.action === 'credit' ? '#009F51' : '#FF756B', fontWeight: 700, fontSize: 20, lineHeight: '24px', letterSpacing: '0%', textAlign: 'right' }}>
                              {item.action === 'debit' ? '-' : '+'}{currencySymbol(item.currency)}{Number(item.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                            <p style={{ ...FONT, color: '#6A7377', fontWeight: 400, fontSize: 18, lineHeight: '136%', letterSpacing: '-1%', textAlign: 'right' }}>{fmtDate(item.createdAt)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── CURRENCY WALLETS ── */}
          {mainTab === 'currency-wallets' && (
            <div className="p-8 space-y-5">
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="relative flex-shrink-0">
                      <select value={selectedCurrency} onChange={(e) => handleCurrencyChange(e.target.value as CurrencyType)}
                        className="appearance-none border border-gray-200 pl-3 pr-8 py-2 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 cursor-pointer"
                        style={{ backgroundColor: '#F8F9FA', borderRadius: 100 }}>
                        <option value="USD">USD Wallets</option>
                        <option value="NGN">NGN Wallets</option>
                        <option value="YAN">YUAN Wallets</option>
                      </select>
                      <svg className="w-4 h-4 text-gray-500 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
                    </div>
                    <div className="flex items-center gap-2">
                      <CurrencyFlag currency={selectedCurrency} className="w-7 h-5" />
                      <span style={{ ...FONT, color: '#1A1D1F', fontWeight: 600, fontSize: 24, lineHeight: '120%', letterSpacing: '-1%' }}>{currencyLabel(selectedCurrency)}</span>
                      <span style={{ ...FONT, color: '#6A7377', fontWeight: 400, fontSize: 24, lineHeight: '120%', letterSpacing: '-1%' }}>
                        Total Balance:{' '}
                        <span style={{ ...FONT, color: '#1A1D1F', fontWeight: 600, fontSize: 24, lineHeight: '120%', letterSpacing: '-1%' }}>
                          {currencyData?.stats?.total_balance != null
                            ? `${currencySymbol(selectedCurrency)}${Number(currencyData.stats.total_balance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                            : stats?.by_currency?.[selectedCurrency]?.total_balance
                              ? `${currencySymbol(selectedCurrency)}${stats.by_currency[selectedCurrency].total_balance}`
                              : '—'}
                        </span>
                      </span>
                    </div>
                  </div>
                  <div className="max-w-lg">
                    <SearchBar value={walletSearch} onChange={handleWalletSearch} placeholder="Search by name, wallet ID or transaction ID..." />
                  </div>
                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr style={{ backgroundColor: '#F8F9FA', borderTop: '1.05px solid #E1E4E6', borderBottom: '1.05px solid #E1E4E6' }}>
                            {['Wallet ID','User','Balance','Date Created','Status','Last activity','Action'].map((h) => (
                              <th key={h} className="pl-5 py-4 text-left whitespace-nowrap"
                                style={{ ...FONT, color: '#6A7377', fontWeight: 400, fontSize: '14.67px', lineHeight: '150%', letterSpacing: '0.02em', paddingRight: '9.43px' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {loadingWallets ? [...Array(6)].map((_, i) => (
                            <tr key={i}>{[...Array(7)].map((_, j) => <td key={j} className="px-5 py-5"><Skeleton className="h-5 w-full" /></td>)}</tr>
                          )) : displayWallets.length === 0 ? (
                            <tr><td colSpan={7} className="px-5 py-12 text-center text-sm text-gray-400">No {selectedCurrency} wallets found</td></tr>
                          ) : (
                            displayWallets.map((wallet, idx) => {
                              const userName = wallet.user
                                ? [wallet.user.firstName, wallet.user.lastName].filter(Boolean).join(' ')
                                : '—';
                              const dateCreated = wallet.createdAt
                                ? new Date(wallet.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })
                                : '—';
                              return (
                                <tr key={wallet.id ?? idx} className="hover:bg-gray-50/50 transition-colors">
                                  <td className="pl-5 py-5 text-[13px] font-bold text-gray-900 font-mono" style={{ paddingRight: '9.43px' }}>{wallet.id.slice(0, 8).toUpperCase()}</td>
                                  <td className="pl-5 py-5" style={{ paddingRight: '9.43px' }}>
                                    <UserCell
                                      name={userName}
                                      email={wallet.user?.changpayId ?? wallet.user?.email ?? ''}
                                      initials={null}
                                    />
                                  </td>
                                  <td className="pl-5 py-5 text-[13px] font-bold text-gray-900" style={{ paddingRight: '9.43px' }}>
                                    {currencySymbol(wallet.currency)}{Number(wallet.balance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </td>
                                  <td className="pl-5 py-5" style={{ paddingRight: '9.43px' }}>
                                    <p className="text-[13px] text-gray-600 whitespace-nowrap">{dateCreated}</p>
                                  </td>
                                  <td className="pl-5 py-5" style={{ paddingRight: '9.43px' }}><StatusBadge isLocked={wallet.isLocked} isActive={wallet.isActive} /></td>
                                  <td className="pl-5 py-5" style={{ paddingRight: '9.43px' }}>
                                    <TimestampCell date={wallet.lastActivityAt} />
                                  </td>
                                  <td className="pl-5 py-5" style={{ paddingRight: '9.43px' }}>
                                    <button onClick={() => setViewingWallet(wallet)} className="text-sm font-semibold" style={{ color: '#009F51' }}>
                                      Adjust
                                    </button>
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
            </div>
          )}

          {/* ── LEDGER ── */}
          {mainTab === 'ledger' && (
            <div className="p-8 space-y-5">
              <div><h2 className="text-lg font-bold text-gray-900">System-Wide Transaction Ledger</h2><p className="text-sm text-gray-500 mt-0.5">Immutable record of all wallet balance changes</p></div>
              <PillTabs
                options={LEDGER_ACTIONS}
                value={ledgerAction}
                onChange={(v) => { setLedgerAction(v); setLedgerPage(1); fetchLedger(ledgerSearch, v, 1); }}
              />
              <div className="flex items-center gap-3">
                <SearchBar value={ledgerSearch} onChange={setLedgerSearch} placeholder="Search by wallet, user, reference, or description..." />
                <ExportBtn onClick={() => ledger && downloadCSV('ledger',
                  ['Time','User','Wallet ID','Currency','Type','Amount','Reference','Description'],
                  ledger.map(r => [r.createdAt, `${r.wallet.user.firstName} ${r.wallet.user.lastName}`.trim(), r.wallet.id, r.wallet.currency, r.transaction.type, r.amount, r.transaction.reference, ledgerDescription(r)]))} />
              </div>
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-[#F8F9FA] border-b border-gray-100">
                        {['Time','User','Wallet','Type','Amount','Reference','Description'].map((h) => (
                          <th key={h} className="px-5 py-4 text-left text-sm font-medium text-gray-500 whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {loadingLedger
                        ? [...Array(5)].map((_, i) => (
                            <tr key={i}>{[...Array(7)].map((_, j) => <td key={j} className="px-5 py-4"><Skeleton className="h-5 w-full" /></td>)}</tr>
                          ))
                        : !ledger || ledger.length === 0
                          ? <tr><td colSpan={7} className="px-5 py-16 text-center text-sm text-gray-400">No ledger entries available</td></tr>
                          : ledger.map((row, idx) => {
                              const sym = currencySymbol(row.wallet.currency);
                              const isCredit = row.action === 'credit' || row.action === 'release';
                              return (
                                <tr key={`${row.transaction.reference}-${idx}`} className="hover:bg-gray-50/50 transition-colors">
                                  <td className="px-5 py-4"><TimestampCell date={row.createdAt} /></td>
                                  <td className="px-5 py-4">
                                    <UserCell
                                      name={`${row.wallet.user.firstName} ${row.wallet.user.lastName}`.trim()}
                                      initials={null}
                                    />
                                  </td>
                                  <td className="px-5 py-4">
                                    <p className="text-xs font-semibold text-gray-700 font-mono">{row.wallet.id.slice(0, 8).toUpperCase()}</p>
                                    <p className="text-xs text-gray-400">{row.wallet.currency}</p>
                                  </td>
                                  <td className="px-5 py-4">
                                    <LedgerTypeIcon action={row.action} type={row.transaction.type} />
                                  </td>
                                  <td className="px-5 py-4 text-sm font-semibold whitespace-nowrap" style={{ color: isCredit ? '#009F51' : '#FF756B' }}>
                                    {isCredit ? '+' : '-'}{sym}{Number(row.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                  </td>
                                  <td className="px-5 py-4 text-xs text-gray-700 whitespace-nowrap">{row.transaction.reference}</td>
                                  <td className="px-5 py-4 text-xs text-gray-600 min-w-[140px]">{ledgerDescription(row)}</td>
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

          {/* ── TOP UP ── */}
          {mainTab === 'topup' && (
            <div className="p-8 space-y-5">
              <div><h2 className="text-lg font-bold text-gray-900">Top Up Transactions</h2><p className="text-sm text-gray-500 mt-0.5">Bank transfer deposits across USD and NGN wallets</p></div>
              <PillTabs
                options={TOPUP_CURRENCIES}
                value={topupCurrency}
                onChange={(v) => { setTopupCurrency(v); setTopupPage(1); fetchTopups(topupSearch, topupFilter, v, 1); }}
              />
              <div className="flex items-center gap-3">
                <SearchBar value={topupSearch} onChange={handleTopupSearch} placeholder="Search..." />
                <StatusFilter value={topupFilter} onChange={(v) => { setTopupFilter(v); setTopupPage(1); fetchTopups(topupSearch, v, topupCurrency, 1); }} />
                <ExportBtn onClick={() => topups && downloadCSV('topups', ['Txn ID','User','Wallet ID','Amount','Currency','Method','Status','Timestamp','Reference'],
                  topups.map(r => [r.reference ?? r.id, r.user ? `${r.user.firstName} ${r.user.lastName}`.trim() : '', r.wallet?.id ?? '', r.amount, r.currency, r.provider, r.status, r.createdAt, r.reference]))} />
              </div>
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead><tr style={{ backgroundColor: '#F8F9FA', borderTop: '1.05px solid #E1E4E6', borderBottom: '1.05px solid #E1E4E6' }}>{['Transaction ID','User','Wallet ID','Amount','Method','Status','Timestamp','Reference'].map((h) => <th key={h} className="pl-5 py-4 text-left whitespace-nowrap" style={{ ...FONT, color: '#6A7377', fontWeight: 400, fontSize: '14.67px', lineHeight: '150%', letterSpacing: '0.02em', paddingRight: '9.43px' }}>{h}</th>)}</tr></thead>
                    <tbody className="divide-y divide-gray-50">
                      {loadingTopups
                        ? [...Array(4)].map((_, i) => (
                            <tr key={i}>{[...Array(8)].map((_, j) => <td key={j} className="px-5 py-5"><Skeleton className="h-5 w-full" /></td>)}</tr>
                          ))
                        : !topups || topups.length === 0
                          ? <tr><td colSpan={8} className="px-5 py-16 text-center text-sm text-gray-400">No topup transactions available</td></tr>
                          : topups.map((row) => (
                              <tr key={String(row.id)} className="hover:bg-gray-50/50 transition-colors">
                                <td className="px-5 py-5 text-[13px] font-bold text-gray-900">{String(row.reference ?? row.id).slice(0, 12)}</td>
                                <td className="px-5 py-5"><UserCell name={row.user ? `${row.user.firstName} ${row.user.lastName}`.trim() : '—'} email={row.user?.changpayId ?? row.user?.email ?? ''} initials={null} /></td>
                                <td className="px-5 py-5 text-[13px] font-bold text-gray-900">{row.wallet?.id?.slice(0, 8).toUpperCase() ?? '—'}</td>
                                <td className="px-5 py-5"><p className="text-[13px] font-bold text-gray-900">{currencySymbol(row.currency)}{Number(row.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p><p className="text-xs text-gray-400">{row.currency}</p></td>
                                <td className="px-5 py-5 text-[13px] text-gray-800 capitalize">{row.provider}</td>
                                <td className="px-5 py-5"><TxBadge status={row.status} /></td>
                                <td className="px-5 py-5"><TimestampCell date={row.createdAt} /></td>
                                <td className="px-5 py-5 text-[13px] text-gray-500">{row.reference}</td>
                              </tr>
                            ))
                      }
                    </tbody>
                  </table>
                </div>
                <Pagination
                  currentPage={topupPage}
                  totalPages={topupMeta?.last_page ?? 1}
                  onChange={setTopupPage}
                  loading={loadingTopups}
                  from={topupMeta?.from ?? undefined}
                  to={topupMeta?.to ?? undefined}
                  total={topupMeta?.total}
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
                <div className={`${reconciliation?.is_reconciled !== false ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'} border rounded-xl p-5 flex items-center justify-between`}>
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
              <div className="bg-white rounded-xl border border-gray-200 p-5">
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

      {viewingWallet && (
        <WalletDetailModal
          wallet={viewingWallet}
          onClose={() => setViewingWallet(null)}
          onToggleLock={handleToggleLock}
          toggling={togglingId === viewingWallet.id}
        />
      )}
    </div>
  );
}