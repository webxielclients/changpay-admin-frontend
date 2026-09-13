'use client';

import { use, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { usersApi, UserTransactionItem } from '@/lib/api/client';
import Sidebar from '@/components/Sidebar';
import Image from 'next/image';

const FONT = { fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif" };
const CELL_TEXT: React.CSSProperties = { ...FONT, fontWeight: 500, fontSize: '14.67px', lineHeight: '150%', letterSpacing: '0.02em', color: '#1A1D1F' };

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


/* ─────────────────────────────────────────
   FIELD ACCESSORS — camelCase ?? snake_case
───────────────────────────────────────── */
const g = {
  firstName:  (u: RawUser) => u.firstName  ?? u.first_name  ?? '',
  lastName:   (u: RawUser) => u.lastName   ?? u.last_name   ?? '',
  phone:      (u: RawUser) => u.phoneNumber ?? u.phone_number ?? null,
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
  fullName:   (u: RawUser) => {
    const name = [u.firstName ?? u.first_name, u.lastName ?? u.last_name].filter(Boolean).join(' ');
    return name ? name.toLowerCase().replace(/(^|\s|-)\S/g, (c) => c.toUpperCase()) : (u.email || '—');
  },
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
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border" style={{ borderColor: '#0274D8', color: '#0274D8', backgroundColor: '#E4F2FE' }}>
      <Image src="/Unlock.png" alt="" width={11} height={11} />
      Active
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border" style={{ borderColor: '#A8B0B5', color: '#A8B0B5', backgroundColor: '#F8F9FA' }}>
      <Image src="/Icon.png" alt="" width={11} height={11} />
      Frozen
    </span>
  );
}

function KYCBadge({ status }: { status: string | null }) {
  const s = (status ?? 'pending').toLowerCase();
  const isVerified = s === 'verified' || s === 'approved';
  const isRejected = s === 'rejected';
  const color = isVerified ? '#339D88' : isRejected ? '#FF756B' : '#9E4300';
  const bg    = isVerified ? '#EFFEFA' : isRejected ? '#FF756B1A' : '#FFD37933';
  const label = isVerified ? 'Verified' : isRejected ? 'Rejected' : 'Pending';
  const icon  = isVerified ? '/Verified.png' : isRejected ? '/Icon (1).png' : '/Clock.png';
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border" style={{ borderColor: color, color, backgroundColor: bg }}>
      <Image src={icon} alt="" width={11} height={11} />
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
      <p style={{ ...FONT, color: '#1A1D1F', fontWeight: 500, fontSize: 14, lineHeight: '24px', letterSpacing: '0%' }}>{label}</p>
      <p style={{ ...FONT, color: '#6A7377', fontWeight: 400, fontSize: 18, lineHeight: '136%', letterSpacing: '-1%' }}>{value || '—'}</p>
    </div>
  );
}

/* ─────────────────────────────────────────
   VERIFICATION CARD (KYC / KYB)
───────────────────────────────────────── */
function VerificationCard({ title, status }: { title: string; status: string | null }) {
  const s = (status ?? 'pending').toLowerCase();
  const isVerified = s === 'verified' || s === 'approved';
  const isRejected = s === 'rejected';
  const desc = isVerified ? 'Identity verified and approved' : isRejected ? 'Verification was rejected' : 'Awaiting document verification';
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <h2 style={{ ...FONT, color: '#1A1D1F', fontWeight: 600, fontSize: 20, lineHeight: '100%', letterSpacing: '0%' }} className="mb-5">{title}</h2>
      <KYCBadge status={status}/>
      <p className="text-sm text-gray-400 mt-3">{desc}</p>
    </div>
  );
}

/* ─────────────────────────────────────────
   WALLET CARD
───────────────────────────────────────── */
function WalletCard({ icon, symbol, label, value, onClick }: {
  icon: string; symbol: string; label: string;
  value: string | number | null | undefined;
  onClick: () => void;
}) {
  return (
    <div className="flex-1 bg-[#F8F9FA] rounded-xl p-4 flex flex-col gap-3 min-w-0">
      <p className="text-xs text-gray-500">{label}</p>
      <div className="flex items-center gap-2">
        <Image src={icon} alt="" width={24} height={24} className="rounded-full object-cover shrink-0" />
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
  const [txs, setTxs]     = useState<UserTransactionItem[]>([]);
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
        setTxs(txRes.value.data.data ?? []);
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
    <div className="flex h-screen bg-white" style={FONT}>
      <Sidebar/>
      <main className="flex-1 p-8 space-y-5 overflow-y-auto">
        <Sk h="h-6" w="w-32"/><Sk h="h-20"/><Sk h="h-40"/><Sk h="h-40"/>
      </main>
    </div>
  );

  if (error && !user) return (
    <div className="flex h-screen bg-white" style={FONT}>
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
    <div className="flex h-screen bg-white" style={FONT}>
      <Sidebar/>
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        <div className="flex-1 overflow-y-auto">

          {/* ── Back bar ── */}
          <div className="px-8 pt-5 pb-4 bg-white sticky top-0 z-10">
            <button onClick={() => router.push('/dashboard/users')}
              className="flex items-center gap-2 w-full px-4 py-2.5 rounded-xl"
              style={{ backgroundColor: '#F8F9FA' }}>
              <Image src="/back.png" alt="" width={20} height={20} />
              <span style={{ ...FONT, color: '#1A1D1F', fontWeight: 500, fontSize: 24, lineHeight: '120%', letterSpacing: '-1%' }}>
                Back to Users List
              </span>
            </button>
          </div>

          <div className="px-8 pb-6 space-y-8" style={{ maxWidth: '100%' }}>
            {error && <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">{error}</div>}

            {/* ── User header ── */}
            <div className="flex items-center justify-between flex-wrap gap-3 mt-2">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full flex items-center justify-center text-white text-lg font-bold shrink-0" style={{ background: 'linear-gradient(135deg, #339D88, #0274D8)' }}>
                  {g.initials(user)}
                </div>
                <div>
                  <h1 style={{ ...FONT, color: '#1A1D1F', fontWeight: 600, fontSize: 24, lineHeight: '100%', letterSpacing: '0%' }}>{g.fullName(user)}</h1>
                  <p className="text-sm text-gray-500 mt-1">{user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <ActiveBadge active={g.isActive(user)}/>
                <KYCBadge status={g.kycStatus(user)}/>
              </div>
            </div>

            {/* ── Outer frame — Personal Details / Wallet & Limits / Devices ── */}
            <div style={{ backgroundColor: '#F8F9FA', border: '1px solid #DFE1E7', borderRadius: 15 }} className="p-6 space-y-5">

              {/* ── Personal Details ── */}
              <div className="bg-white rounded-xl p-6">
                <h2 className="text-sm font-bold text-gray-900 mb-5">Personal Details</h2>
                <div className="grid grid-cols-4 gap-y-5 gap-x-6">
                  <InfoField label="ChangPayID"   value={g.changpayId(user)}/>
                  <InfoField label="Date Created" value={fmtDate(g.createdAt(user))}/>
                  <InfoField label="Phone"        value={g.phone(user)}/>
                  <InfoField label="Last Login"   value={fmtDateTime(g.lastLogin(user))}/>
                </div>
              </div>

              {/* ── Wallet & Transaction Limits ── */}
              <div className="bg-white rounded-xl p-6">
                <h2 className="text-sm font-bold text-gray-900 mb-4">Wallet &amp; Transaction Limits</h2>
                <div className="flex gap-4">
                  <WalletCard icon="/unitedstates.svg" symbol="$" label="USD Wallet Balance" value={g.usd(user)}
                    onClick={() => router.push(`/dashboard/users/${userId}/transactions/usd`)}/>
                  <WalletCard icon="/ngn.svg" symbol="₦" label="NGN Wallet Balance" value={g.ngn(user)}
                    onClick={() => router.push(`/dashboard/users/${userId}/transactions/ngn`)}/>
                  <WalletCard icon="/china.svg" symbol="¥" label="YUAN Wallet Balance" value={g.yuan(user)}
                    onClick={() => router.push(`/dashboard/users/${userId}/transactions/yuan`)}/>
                </div>
              </div>

              {/* ── Logged in Devices ── */}
              <div className="bg-white rounded-xl p-6">
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
            </div>

            {/* ── Transaction History ── */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100">
                <h2 className="text-sm font-bold text-gray-900">Transaction History</h2>
                <button onClick={() => router.push(`/dashboard/users/${userId}/transactions`)}
                  className="flex items-center gap-1 text-sm font-semibold" style={{ color: '#6A7377' }}>
                  See all
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </button>
              </div>

              {txs.length === 0 ? (
                <div className="px-6 py-8 text-sm text-gray-400 text-center">No recent transactions</div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {txs.map((tx, i) => {
                    const isIncome = (tx.category ?? '').toLowerCase() === 'income' || tx.type?.toLowerCase() === 'deposit';
                    const date = tx.dateTime ?? tx.created_at ?? tx.createdAt ?? null;
                    const ref = tx.reference ?? String(tx.id);
                    return (
                      <div key={`${tx.id}-${i}`} className="px-6 py-4 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-gray-900 capitalize">{tx.type}</p>
                          <p className="text-[11px] text-gray-400 mt-0.5">{fmtDate(date)} • {ref}</p>
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

            <VerificationCard title="KYB Status" status={g.kybStatus(user)}/>
            <VerificationCard title="KYC Status" status={g.kycStatus(user)}/>

            {/* ── Account Actions ── */}
            <div className="bg-white border border-gray-200 rounded-xl p-6">
                <h2 style={{ ...FONT, color: '#1A1D1F', fontWeight: 600, fontSize: 20, lineHeight: '100%', letterSpacing: '0%' }} className="mb-4">Account Actions</h2>
                <div className="flex gap-3">
                  <button onClick={handleToggle} disabled={isToggling}
                    className="flex-1 flex items-center justify-center text-white transition-colors disabled:opacity-50"
                    style={{ backgroundColor: isFrozen ? '#339D88' : '#FF756B', height: 48, borderRadius: 40, gap: 4, paddingTop: 8, paddingRight: 24, paddingBottom: 8, paddingLeft: 24, fontSize: 14, fontWeight: 600 }}>
                    {isToggling
                      ? <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                      : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>}
                    {isFrozen ? 'Unfreeze Account' : 'Freeze Account'}
                  </button>
                  <button className="flex-1 flex items-center justify-center text-white"
                    style={{ backgroundColor: '#6A7377', height: 48, borderRadius: 40, gap: 4, paddingTop: 8, paddingRight: 24, paddingBottom: 8, paddingLeft: 24, fontSize: 14, fontWeight: 600 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>
                    Reset Password
                  </button>
                </div>
              </div>

            {/* ── Admin Notes ── */}
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h2 className="text-sm font-bold text-gray-900 mb-4">Admin Notes</h2>
              {notes.length > 0 ? (
                <div className="space-y-2.5 mb-4">
                  {notes.map(n => (
                    <div key={n.id} className="bg-gray-50 border border-gray-100 rounded-xl p-4">
                      <p className="text-sm text-gray-800">{n.note}</p>
                      <p className="text-[11px] text-gray-400 mt-1.5">{fmtDate(n.created_at)} • Admin #{n.admin_id}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400 italic mb-4">No notes yet</p>
              )}
              {noteMsg && (
                <div className={`mb-3 px-4 py-2.5 rounded-xl text-xs font-medium border ${noteMsg.type === 'ok' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                  {noteMsg.text}
                </div>
              )}
              <textarea value={noteInput} onChange={e => setNoteInput(e.target.value)}
                placeholder="Add internal notes…" rows={3} maxLength={2000}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-700 resize-none focus:outline-none focus:border-gray-400 placeholder-gray-400 bg-[#F8F9FA]"/>
              <button onClick={handleSaveNote} disabled={isSavingNote || !noteInput.trim()}
                className="w-full mt-3 py-3 rounded-full text-sm font-semibold text-white disabled:opacity-50"
                style={{ backgroundColor: '#0274D8' }}>
                {isSavingNote ? 'Saving…' : 'Save Note'}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
