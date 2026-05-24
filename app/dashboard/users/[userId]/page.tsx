'use client';

import { use, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { usersApi } from '@/lib/api/client';
import Sidebar from '@/components/Sidebar';

/* ─────────────────────────────────────────
   TYPES — camelCase (detail endpoint) with
   snake_case fallbacks (list endpoint)
───────────────────────────────────────── */
interface RawUser {
  id: number;
  // camelCase (detail endpoint)
  firstName?: string | null;
  lastName?: string | null;
  email?: string;
  phoneNumber?: string | null;
  dateOfBirth?: string | null;
  country?: string | null;
  state?: string | null;
  city?: string | null;
  changpayId?: string | null;
  kycStatus?: string | null;
  kybStatus?: string | null;
  isActive?: boolean;
  emailVerifiedAt?: string | null;
  lastLoginAt?: string | null;
  createdAt?: string | null;
  // snake_case fallbacks
  first_name?: string | null;
  last_name?: string | null;
  phone_number?: string | null;
  date_of_birth?: string | null;
  changpay_id?: string | null;
  kyc_status?: string | null;
  kyb_status?: string | null;
  is_active?: boolean;
  email_verified_at?: string | null;
  last_login_at?: string | null;
  created_at?: string | null;
  // wallet balances
  usd_balance?: string | number | null;
  ngn_balance?: string | number | null;
  yuan_balance?: string | number | null;
  usdBalance?: string | number | null;
  ngnBalance?: string | number | null;
  yuanBalance?: string | number | null;
}

interface Device {
  id: number | string;
  device_name?: string;
  deviceName?: string;
  location?: string;
  last_used_at?: string;
  lastUsedAt?: string;
  is_active?: boolean;
  isActive?: boolean;
}

interface ApiNote {
  id: number;
  admin_id: number;
  note: string;
  created_at: string;
}

interface TxItem {
  id: number;
  type: string;
  category?: string;
  amount: string;
  currency: string;
  status: string;
  reference: string;
  fee?: string;
  created_at?: string;
  createdAt?: string;
}

/* ─────────────────────────────────────────
   FIELD ACCESSORS — camelCase ?? snake_case
───────────────────────────────────────── */
const g = {
  firstName:  (u: RawUser) => u.firstName  ?? u.first_name  ?? '',
  lastName:   (u: RawUser) => u.lastName   ?? u.last_name   ?? '',
  phone:      (u: RawUser) => u.phoneNumber ?? u.phone_number ?? null,
  dob:        (u: RawUser) => u.dateOfBirth ?? u.date_of_birth ?? null,
  country:    (u: RawUser) => u.country ?? null,
  state:      (u: RawUser) => u.state ?? null,
  city:       (u: RawUser) => u.city ?? null,
  changpayId: (u: RawUser) => u.changpayId ?? u.changpay_id ?? null,
  kycStatus:  (u: RawUser) => u.kycStatus  ?? u.kyc_status  ?? null,
  kybStatus:  (u: RawUser) => u.kybStatus  ?? u.kyb_status  ?? null,
  isActive:   (u: RawUser) => u.isActive   ?? u.is_active   ?? false,
  emailVerified: (u: RawUser) => !!(u.emailVerifiedAt ?? u.email_verified_at),
  lastLogin:  (u: RawUser) => u.lastLoginAt ?? u.last_login_at ?? null,
  createdAt:  (u: RawUser) => u.createdAt  ?? u.created_at  ?? null,
  usd:        (u: RawUser) => u.usdBalance ?? u.usd_balance ?? null,
  ngn:        (u: RawUser) => u.ngnBalance ?? u.ngn_balance ?? null,
  yuan:       (u: RawUser) => u.yuanBalance ?? u.yuan_balance ?? null,
  fullName:   (u: RawUser) => [u.firstName ?? u.first_name, u.lastName ?? u.last_name].filter(Boolean).join(' ') || u.email || '—',
  initials:   (u: RawUser) => {
    const f = u.firstName ?? u.first_name ?? '';
    const l = u.lastName  ?? u.last_name  ?? '';
    return `${f[0] ?? ''}${l[0] ?? ''}`.toUpperCase() || (u.email ?? '??').slice(0, 2).toUpperCase();
  },
};

/* ─────────────────────────────────────────
   HELPERS
───────────────────────────────────────── */
function fmtDate(d: string | null | undefined) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
}
function fmtDateTime(d: string | null | undefined) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-US', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: true,
  }).replace(',', '');
}
function fmtDeviceDate(d: string | null | undefined) {
  if (!d) return '';
  return new Date(d).toLocaleString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
}
function fmtBalance(v: string | number | null | undefined, symbol: string) {
  if (v == null || v === '' || v === 0 || v === '0') return `${symbol}0`;
  const n = Number(v);
  if (n >= 1_000_000_000) return `${symbol}${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `${symbol}${(n / 1_000_000).toFixed(2)}M`;
  return `${symbol}${n.toLocaleString('en-US', { minimumFractionDigits: 0 })}`;
}

/* ─────────────────────────────────────────
   BADGES
───────────────────────────────────────── */
function ActiveBadge({ active }: { active: boolean }) {
  return active ? (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border" style={{ borderColor: '#0274D8', color: '#0274D8', backgroundColor: '#EFF7FF' }}>
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
      Active
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border border-gray-300 text-gray-500 bg-gray-50">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
      Frozen
    </span>
  );
}

function KYCBadge({ status }: { status: string | null }) {
  const s = (status ?? 'pending').toLowerCase();
  const isVerified = s === 'verified' || s === 'approved';
  const isRejected = s === 'rejected';
  const color = isVerified ? '#339D88' : isRejected ? '#FF756B' : '#9E4300';
  const bg    = isVerified ? '#EFFAF7' : isRejected ? '#FFF2F1' : '#FFF4ED';
  const label = isVerified ? 'Verified' : isRejected ? 'Rejected' : 'Pending';
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border" style={{ borderColor: color, color, backgroundColor: bg }}>
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <circle cx="12" cy="12" r="10"/>
        {isVerified && <path d="m9 12 2 2 4-4"/>}
        {!isVerified && <path d="M12 8v4m0 4h.01"/>}
      </svg>
      {label}
    </span>
  );
}

function TxStatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase().replace(/\s+/g, '');
  const cfg =
    s === 'completed' || s === 'success'   ? 'border-emerald-500 text-emerald-600' :
    s === 'ongoing' || s === 'on-going'    ? 'border-blue-500 text-blue-600' :
    s === 'processing'                     ? 'border-orange-400 text-orange-600' :
    s === 'pending'                        ? 'border-amber-500 text-amber-600' :
    s === 'failed'                         ? 'border-red-500 text-red-600' :
    'border-gray-300 text-gray-500';
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border bg-white whitespace-nowrap ${cfg}`}>{status}</span>;
}

function Sk({ h = 'h-4', w = 'w-full' }: { h?: string; w?: string }) {
  return <div className={`animate-pulse bg-gray-100 rounded ${h} ${w}`}/>;
}

function InfoField({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-gray-900">{value || '—'}</p>
    </div>
  );
}

/* ─────────────────────────────────────────
   WALLET CARD
───────────────────────────────────────── */
function WalletCard({ flag, symbol, label, value, onClick }: {
  flag: string; symbol: string; label: string;
  value: string | number | null | undefined;
  onClick: () => void;
}) {
  return (
    <div className="flex-1 border border-gray-200 rounded-xl p-4 flex flex-col gap-3 min-w-0">
      <p className="text-xs text-gray-500">{label}</p>
      <div className="flex items-center gap-2">
        <span className="text-2xl leading-none">{flag}</span>
        <p className="text-xl font-bold text-gray-900">{fmtBalance(value, symbol)}</p>
      </div>
      <button onClick={onClick} className="flex items-center gap-1 text-xs font-semibold w-fit" style={{ color: '#339D88' }}>
        View transactions
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────
   DEVICE ROW
───────────────────────────────────────── */
function DeviceRow({ device, userId, onRemove }: { device: Device; userId: number; onRemove: (id: number | string) => void }) {
  const name     = device.device_name ?? device.deviceName ?? 'Unknown Device';
  const location = device.location ?? '';
  const lastUsed = device.last_used_at ?? device.lastUsedAt ?? null;
  const active   = device.is_active ?? device.isActive ?? false;
  const [removing, setRemoving] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const handleRemove = async () => {
    try {
      setRemoving(true);
      // await usersApi.removeDevice(userId, device.id); // wire when endpoint available
      onRemove(device.id);
    } catch { /* silent */ }
    finally { setRemoving(false); }
  };

  return (
    <div className="flex items-center justify-between py-4 border-b border-gray-100 last:border-0 group">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-500 shrink-0">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="7" y="2" width="10" height="20" rx="2"/><path d="M12 18h.01"/></svg>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-gray-900">{name}</p>
            {active && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border" style={{ borderColor: '#339D88', color: '#339D88', backgroundColor: '#EFFAF7' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"/>
                Active now
              </span>
            )}
          </div>
          <p className="text-[11px] text-gray-400 mt-0.5">
            {location}{location && lastUsed ? ' • ' : ''}{lastUsed ? `Last used: ${fmtDeviceDate(lastUsed)}` : ''}
          </p>
        </div>
      </div>
      {/* Actions */}
      {active ? (
        <button onClick={handleRemove} disabled={removing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-colors disabled:opacity-50"
          style={{ backgroundColor: '#FF756B' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 6h18M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2"/></svg>
          {removing ? 'Removing…' : 'Remove Device'}
        </button>
      ) : (
        <div className="relative">
          <button onClick={() => setShowMenu(v => !v)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>
          </button>
          {showMenu && (
            <div className="absolute right-0 top-8 z-20 w-36 bg-white border border-gray-200 rounded-xl shadow-lg py-1">
              <button onClick={() => { setShowMenu(false); handleRemove(); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-red-500 hover:bg-red-50">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 6h18M19 6l-1 14H6L5 6"/></svg>
                Remove Device
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────── */
export default function UserDetailPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = use(params);
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  const [user, setUser]   = useState<RawUser | null>(null);
  const [notes, setNotes] = useState<ApiNote[]>([]);
  const [txs, setTxs]     = useState<TxItem[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [noteInput, setNoteInput]     = useState('');
  const [isLoading, setIsLoading]     = useState(true);
  const [isToggling, setIsToggling]   = useState(false);
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [noteMsg, setNoteMsg]         = useState<{ type: 'ok'|'err'; text: string } | null>(null);

  const id = Number(userId);

  const fetchAll = useCallback(async () => {
    try {
      setIsLoading(true);
      const [userRes, notesRes, txRes] = await Promise.allSettled([
        usersApi.getUser(id),
        usersApi.getNotes(id),
        usersApi.getTransactions(id, { per_page: 5, page: 1 }),
      ]);

      if (userRes.status === 'fulfilled' && userRes.value.status) {
        setUser(userRes.value.data as unknown as RawUser);
      } else {
        setError('Failed to load user');
      }
      if (notesRes.status === 'fulfilled' && notesRes.value.status) {
        setNotes((notesRes.value.data as any)?.data ?? []);
      }
      if (txRes.status === 'fulfilled' && txRes.value.status) {
        setTxs((txRes.value.data as any)?.data ?? []);
      }

      // Devices — try fetching, silent fail if endpoint doesn't exist yet
      try {
        const devRes = await (usersApi as any).getDevices?.(id);
        if (devRes?.status && devRes?.data) setDevices((devRes.data as any)?.data ?? devRes.data ?? []);
      } catch { /* endpoint may not be implemented yet */ }

    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => { if (isAuthenticated) fetchAll(); }, [isAuthenticated]);

  if (!isAuthenticated) return null;

  const handleToggle = async () => {
    if (!user) return;
    try {
      setIsToggling(true);
      const res = await usersApi.toggleStatus(user.id);
      if (res.status) setUser(prev => prev ? { ...prev, isActive: (res.data as any).is_active ?? (res.data as any).isActive } : prev);
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed'); }
    finally { setIsToggling(false); }
  };

  const handleSaveNote = async () => {
    if (!noteInput.trim() || !user) return;
    try {
      setIsSavingNote(true); setNoteMsg(null);
      const res = await usersApi.addNote(user.id, noteInput.trim());
      if (res.status && res.data) {
        setNotes(prev => [res.data as unknown as ApiNote, ...prev]);
        setNoteInput('');
        setNoteMsg({ type: 'ok', text: 'Note saved.' });
        setTimeout(() => setNoteMsg(null), 3000);
      }
    } catch (e) { setNoteMsg({ type: 'err', text: e instanceof Error ? e.message : 'Failed' }); }
    finally { setIsSavingNote(false); }
  };

  /* Loading */
  if (isLoading) return (
    <div className="flex h-screen bg-white font-['DM_Sans']">
      <Sidebar/>
      <main className="flex-1 p-8 space-y-5 overflow-y-auto">
        <Sk h="h-6" w="w-32"/><Sk h="h-20"/><Sk h="h-40"/><Sk h="h-40"/>
      </main>
    </div>
  );

  if (error && !user) return (
    <div className="flex h-screen bg-white font-['DM_Sans']">
      <Sidebar/>
      <main className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-red-500">{error}</p>
          <button onClick={fetchAll} className="px-5 py-2 rounded-xl text-sm font-semibold text-white" style={{ backgroundColor: '#012D32' }}>Retry</button>
        </div>
      </main>
    </div>
  );

  if (!user) return null;

  const isFrozen = !g.isActive(user);

  return (
    <div className="flex h-screen bg-white font-['DM_Sans']">
      <Sidebar/>
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        <div className="flex-1 overflow-y-auto">

          {/* ── Back bar ── */}
          <div className="px-8 pt-5 pb-4 border-b border-gray-100 bg-white sticky top-0 z-10">
            <button onClick={() => router.push('/dashboard/users')} className="flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-gray-900">
              <span className="w-5 h-5 rounded-full flex items-center justify-center bg-gray-900 text-white">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M15 18l-6-6 6-6"/></svg>
              </span>
              Back to Users List
            </button>
          </div>

          <div className="px-8 py-6 space-y-5" style={{ maxWidth: '100%' }}>
            {error && <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">{error}</div>}

            {/* ── User header ── */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full flex items-center justify-center text-white text-lg font-bold shrink-0" style={{ background: 'linear-gradient(135deg, #339D88, #0274D8)' }}>
                  {g.initials(user)}
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">{g.fullName(user)}</h1>
                  <p className="text-sm text-gray-500">{user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <ActiveBadge active={g.isActive(user)}/>
                <KYCBadge status={g.kycStatus(user)}/>
                {g.emailVerified(user) && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border" style={{ borderColor: '#0274D8', color: '#0274D8', backgroundColor: '#EFF7FF' }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m9 12 2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg>
                    Email Verified
                  </span>
                )}
              </div>
            </div>

            {/* ── Personal Details ── */}
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h2 className="text-sm font-bold text-gray-900 mb-5">Personal Details</h2>
              <div className="grid grid-cols-4 gap-y-5 gap-x-6">
                <InfoField label="ChangPayID"   value={g.changpayId(user)}/>
                <InfoField label="Date Created" value={fmtDate(g.createdAt(user))}/>
                <InfoField label="Phone"        value={g.phone(user)}/>
                <InfoField label="Last Login"   value={fmtDateTime(g.lastLogin(user))}/>
                <InfoField label="Date of Birth" value={g.dob(user)}/>
                <InfoField label="Country"      value={g.country(user)}/>
                <InfoField label="State"        value={g.state(user)}/>
                <InfoField label="City"         value={g.city(user)}/>
              </div>
            </div>

            {/* ── Wallet & Transaction Limits ── */}
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h2 className="text-sm font-bold text-gray-900 mb-4">Wallet &amp; Transaction Limits</h2>
              <div className="flex gap-4">
                <WalletCard flag="🇺🇸" symbol="$" label="USD Wallet Balance" value={g.usd(user)}
                  onClick={() => router.push(`/dashboard/users/${userId}/transactions/usd`)}/>
                <WalletCard flag="🇳🇬" symbol="₦" label="NGN Wallet Balance" value={g.ngn(user)}
                  onClick={() => router.push(`/dashboard/users/${userId}/transactions/ngn`)}/>
                <WalletCard flag="🇨🇳" symbol="¥" label="YUAN Wallet Balance" value={g.yuan(user)}
                  onClick={() => router.push(`/dashboard/users/${userId}/transactions/yuan`)}/>
              </div>
            </div>

            {/* ── Logged in Devices ── */}
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h2 className="text-sm font-bold text-gray-900 mb-1">Logged in Devices</h2>
              {devices.length === 0 ? (
                <p className="text-sm text-gray-400 py-4">No devices found</p>
              ) : (
                <div>
                  {devices.map(d => (
                    <DeviceRow key={d.id} device={d} userId={user.id}
                      onRemove={did => setDevices(prev => prev.filter(x => x.id !== did))}/>
                  ))}
                </div>
              )}
            </div>

            {/* ── Transaction History ── */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100">
                <h2 className="text-sm font-bold text-gray-900">Transaction History</h2>
                <button onClick={() => router.push(`/dashboard/users/${userId}/transactions`)}
                  className="flex items-center gap-1 text-sm font-semibold" style={{ color: '#339D88' }}>
                  See all
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </button>
              </div>

              {txs.length === 0 ? (
                <div className="px-6 py-8 text-sm text-gray-400 text-center">No recent transactions</div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {txs.map(tx => {
                    const isIncome = (tx.category ?? '').toLowerCase() === 'income' || tx.type === 'deposit';
                    const date = tx.created_at ?? tx.createdAt ?? null;
                    return (
                      <div key={tx.id} className="px-6 py-4 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-gray-900 capitalize">{tx.type}</p>
                          <p className="text-[11px] text-gray-400 mt-0.5">{fmtDate(date)} • {tx.reference}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold" style={{ color: isIncome ? '#339D88' : '#FF756B' }}>
                            {isIncome ? '+' : '-'}{tx.currency} {tx.amount}
                          </p>
                          <TxStatusBadge status={tx.status}/>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── Account Actions ── */}
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h2 className="text-sm font-bold text-gray-900 mb-4">Account Actions</h2>
              <div className="flex gap-3">
                <button onClick={handleToggle} disabled={isToggling}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-50"
                  style={{ backgroundColor: isFrozen ? '#339D88' : '#FF756B' }}>
                  {isToggling
                    ? <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                    : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>}
                  {isFrozen ? 'Unfreeze Account' : 'Freeze Account'}
                </button>
                <button className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white"
                  style={{ backgroundColor: '#012D32' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>
                  Reset Password
                </button>
              </div>
            </div>

            {/* ── Admin Notes ── */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 mb-8">
              <h2 className="text-sm font-bold text-gray-900 mb-4">Admin Notes</h2>
              {notes.length > 0 && (
                <div className="space-y-2.5 mb-4">
                  {notes.map(n => (
                    <div key={n.id} className="bg-gray-50 border border-gray-100 rounded-xl p-4">
                      <p className="text-sm text-gray-800">{n.note}</p>
                      <p className="text-[11px] text-gray-400 mt-1.5">{fmtDate(n.created_at)} • Admin #{n.admin_id}</p>
                    </div>
                  ))}
                </div>
              )}
              {noteMsg && (
                <div className={`mb-3 px-4 py-2.5 rounded-xl text-xs font-medium border ${noteMsg.type === 'ok' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                  {noteMsg.text}
                </div>
              )}
              <textarea value={noteInput} onChange={e => setNoteInput(e.target.value)}
                placeholder="Add internal note…" rows={3} maxLength={2000}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-700 resize-none focus:outline-none focus:border-gray-400 placeholder-gray-400"/>
              <div className="flex items-center justify-between mt-1.5">
                <span className="text-xs text-gray-400">{noteInput.length}/2000</span>
                <button onClick={handleSaveNote} disabled={isSavingNote || !noteInput.trim()}
                  className="px-5 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
                  style={{ backgroundColor: '#0274D8' }}>
                  {isSavingNote ? 'Saving…' : 'Save Note'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}