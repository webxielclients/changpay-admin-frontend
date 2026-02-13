'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { AUTH_ROUTES } from '@/constants/auth';
import Sidebar from '@/components/Sidebar';

// ---------- Types ----------

type AccountStatus = 'Active' | 'Frozen';
type KYCStatus   = 'Verified' | 'Pending' | 'Rejected';
type WalletType = 'usd' | 'ngn' | 'yan';

interface WalletCard {
  label: string;
  amount: string;
  icon: WalletType;
}

interface Transaction {
  type: string;
  date: string;
  txId: string;
  amount: string;
  status: string;
}

interface Device {
  name: string;
  location: string;
  lastUsed: string;
  isActive: boolean;
}

interface AdminNote {
  text: string;
  date: string;
  reference: { label: string; url: string } | null;
}

interface UserProfile {
  name: string;
  email: string;
  changPayId: string;
  dateCreated: string;
  phone: string;
  lastLogin: string;
  accountStatus: AccountStatus;
  kycStatus: KYCStatus;
  wallets: WalletCard[];
  transactions: Transaction[];
  devices: Device[];
  hasKYB: boolean;
  kybStatus: KYCStatus | null;
  kybMessage: string;
  kycMessage: string;
  adminNote: AdminNote | null;
}

// ---------- Mock data — 3 user states ----------

const userProfiles: Record<string, UserProfile> = {
  // State A — Active + Verified (has transactions, no KYB section)
  'CHG-001': {
    name: 'Olalekan',
    email: 'john.doe@example.com',
    changPayId: 'CHG-983211',
    dateCreated: '2024-03-20',
    phone: '+1987654321',
    lastLogin: '2026-01-04 04:22pm',
    accountStatus: 'Active',
    kycStatus: 'Verified',
    wallets: [
      { label: 'YAN Wallet Balance', amount: '¥7,865',  icon: 'yan' },
      { label: 'USD Wallet Balance', amount: '$7,865',  icon: 'usd' },
      { label: 'NGN Wallet Balance', amount: '₦1.24B', icon: 'ngn' },
    ],
    transactions: [
      { type: 'Deposit',  date: '2026-01-04', txId: 'TX-9A21F', amount: '+$3,000', status: 'completed' },
      { type: 'Transfer', date: '2026-01-04', txId: 'TX-9A21F', amount: '+$3,000', status: 'completed' },
      { type: 'Transfer', date: '2026-01-04', txId: 'TX-9A21F', amount: '+$3,000', status: 'completed' },
    ],
    devices: [
      { name: 'Samsung S23',  location: 'Lagos, Nigeria', lastUsed: '2026-01-04 14:22am', isActive: true },
      { name: 'Techno Phone', location: 'Lagos, Nigeria', lastUsed: '2026-01-04 14:22am', isActive: false },
      { name: 'Oppo Phone',   location: 'Lagos, Nigeria', lastUsed: '2026-01-04 14:22am', isActive: false },
    ],
    hasKYB: false,
    kybStatus: null,
    kybMessage: '',
    kycMessage: 'Documents approved, verification complete',
    adminNote: null,
  },

  // State B — Frozen + Pending (NO transactions, has KYB section, Unfreeze button)
  'CHG-002': {
    name: 'O. Olalekan',
    email: 'john.doe@example.com',
    changPayId: 'CHG-083211',
    dateCreated: '2024-03-20',
    phone: '+1987654321',
    lastLogin: '2026-01-04 04:22pm',
    accountStatus: 'Frozen',
    kycStatus: 'Pending',
    wallets: [
      { label: 'USD Wallet Balance', amount: '$7,865',  icon: 'usd' },
      { label: 'NGN Wallet Balance', amount: '₦1.24B', icon: 'ngn' },
      { label: 'YAN Wallet Balance', amount: '¥7,865',  icon: 'yan' },
    ],
    transactions: [],
    devices: [
      { name: 'Samsung S23',  location: 'Lagos, Nigeria', lastUsed: '2026-01-04 14:22am', isActive: true },
      { name: 'Techno Phone', location: 'Lagos, Nigeria', lastUsed: '2026-01-04 14:22am', isActive: false },
      { name: 'Oppo Phone',   location: 'Lagos, Nigeria', lastUsed: '2026-01-04 14:22am', isActive: false },
    ],
    hasKYB: true,
    kybStatus: 'Pending',
    kybMessage: 'Awaiting document verification',
    kycMessage: 'Awaiting document verification',
    adminNote: {
      text: 'Account frozen pending KYC verification',
      date: '2026-01-05',
      reference: { label: 'Admin A', url: '#' },
    },
  },

  // State C — Active + Rejected (has transactions, no KYB, Freeze button)
  'CHG-005': {
    name: 'Michael Chen',
    email: 'michael.chen@example.com',
    changPayId: 'CHG-953211',
    dateCreated: '2024-03-20',
    phone: '+1987654321',
    lastLogin: '2026-01-04 04:22pm',
    accountStatus: 'Active',
    kycStatus: 'Rejected',
    wallets: [
      { label: 'USD Wallet Balance', amount: '$7,865',  icon: 'usd' },
      { label: 'NGN Wallet Balance', amount: '₦1.24B', icon: 'ngn' },
      { label: 'YAN Wallet Balance', amount: '¥7,865',  icon: 'yan' },
    ],
    transactions: [
      { type: 'Deposit',  date: '2026-01-04', txId: 'TX-9A21F', amount: '+$3,000', status: 'completed' },
      { type: 'Transfer', date: '2026-01-04', txId: 'TX-9A21F', amount: '+$3,000', status: 'completed' },
      { type: 'Transfer', date: '2026-01-04', txId: 'TX-9A21F', amount: '+$3,000', status: 'completed' },
    ],
    devices: [
      { name: 'Samsung S23',  location: 'Lagos, Nigeria', lastUsed: '2026-01-04 14:22am', isActive: true },
      { name: 'Techno Phone', location: 'Lagos, Nigeria', lastUsed: '2026-01-04 14:22am', isActive: false },
      { name: 'Oppo Phone',   location: 'Lagos, Nigeria', lastUsed: '2026-01-04 14:22am', isActive: false },
    ],
    hasKYB: false,
    kybStatus: null,
    kybMessage: '',
    kycMessage: 'Documents rejected, resubmission required',
    adminNote: {
      text: 'KYC documents unclear, requested resubmission',
      date: '2026-01-05',
      reference: { label: 'Oola ID: 2139586', url: '#' },
    },
  },
};

function getProfile(id: string): UserProfile {
  return userProfiles[id] ?? userProfiles['CHG-001'];
}

// ---------- Sub-components ----------

function WalletIcon({ type }: { type: WalletType }) {
  if (type === 'usd') return <span className="text-xl">🇺🇸</span>;
  if (type === 'ngn') return <span className="text-xl">🇳🇬</span>;
  return (
    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-500 text-white text-[11px] font-bold">¥</span>
  );
}

function StatusPill({ status }: { status: KYCStatus }) {
  const map: Record<KYCStatus, string> = {
    Verified: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    Pending:  'bg-orange-100  text-orange-700  border-orange-200',
    Rejected: 'bg-red-100     text-red-700     border-red-200',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${map[status]}`}>
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m6 2.25a6 6 0 11-12 0 6 6 0 0112 0z" />
      </svg>
      {status}
    </span>
  );
}

// ---------- Page ----------

export default function UserDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = use(params);
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [noteInput, setNoteInput] = useState('');
  
  if (!isAuthenticated) {
    router.push(AUTH_ROUTES.LOGIN);
    return null;
  }

  const user = getProfile(userId);
  const isFrozen = user.accountStatus === 'Frozen';

  const handleViewTransactions = (walletType: WalletType) => {
    router.push(`/dashboard/users/${userId}/transactions/${walletType.toLowerCase()}`);
  };

  return (
    <div className="flex h-screen bg-gray-50 font-['DM_Sans']">
      <Sidebar />

      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">

          {/* ===== Back button ===== */}
          <div className="px-8 pt-6 pb-2">
            <button
              onClick={() => router.push('/dashboard/users')}
              className="flex items-center gap-2 text-gray-700 hover:text-gray-900 transition-colors"
            >
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-800 text-white">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
              </span>
              <span className="text-sm font-semibold">Back to Users List</span>
            </button>
          </div>

          {/* ===== User header ===== */}
          <div className="px-8 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-lg font-bold flex-shrink-0">
                {user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{user.name}</h2>
                <p className="text-sm text-gray-500">{user.email}</p>
              </div>
            </div>

            {/* Two status badges */}
            <div className="flex items-center gap-2">
              {isFrozen ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-300">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 4.5h10.5a2.25 2.25 0 012.25 2.25v6.75a2.25 2.25 0 01-2.25 2.25H6.75a2.25 2.25 0 01-2.25-2.25v-6.75A2.25 2.25 0 016.75 10.5z" />
                  </svg>
                  Frozen
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                  </svg>
                  Active
                </span>
              )}

              {user.kycStatus === 'Verified' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  Verified
                </span>
              )}
              {user.kycStatus === 'Pending' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-orange-100 text-orange-700 border border-orange-200">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Pending
                </span>
              )}
              {user.kycStatus === 'Rejected' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-100 text-red-700 border border-red-200">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Rejected
                </span>
              )}
            </div>
          </div>

          {/* ===== Personal Details ===== */}
          <div className="px-8 pb-4">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-sm font-bold text-gray-900 mb-4">Personal Details</h3>
              <div className="grid grid-cols-4 gap-6">
                {[
                  { label: 'ChangPayID',   value: user.changPayId },
                  { label: 'Date Created', value: user.dateCreated },
                  { label: 'Phone',        value: user.phone },
                  { label: 'Last Login',   value: user.lastLogin },
                ].map((f) => (
                  <div key={f.label}>
                    <p className="text-xs text-gray-400 mb-0.5">{f.label}</p>
                    <p className="text-sm font-medium text-gray-900">{f.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ===== Wallet & Transaction Limits ===== */}
          <div className="px-8 pb-4">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-sm font-bold text-gray-900 mb-4">Wallet &amp; Transaction Limits</h3>
              <div className="grid grid-cols-3 gap-4">
                {user.wallets.map((w) => (
                  <div key={w.label} className="border border-gray-200 rounded-xl p-4">
                    <p className="text-xs text-gray-400 mb-2">{w.label}</p>
                    <div className="flex items-center gap-2">
                      <WalletIcon type={w.icon} />
                      <p className="text-xl font-bold text-gray-900">{w.amount}</p>
                    </div>
                    <button 
                      onClick={() => handleViewTransactions(w.icon)}
                      className="mt-3 text-xs text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-0.5"
                    >
                      View transactions
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ===== Transaction History — ONLY shown when transactions exist ===== */}
          {user.transactions.length > 0 && (
            <div className="px-8 pb-4">
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-gray-900">Transaction History</h3>
                  <button className="text-xs text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-0.5">
                    See all
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </button>
                </div>
                <div className="divide-y divide-gray-100">
                  {user.transactions.map((tx, i) => (
                    <div key={i} className="flex items-center justify-between py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{tx.type}</p>
                        <p className="text-xs text-gray-400">{tx.date} • {tx.txId}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-emerald-600">{tx.amount}</p>
                        <p className="text-xs text-gray-400">{tx.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ===== Logged in Devices ===== */}
          <div className="px-8 pb-4">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-sm font-bold text-gray-900 mb-4">Logged in Devices</h3>
              <div className="divide-y divide-gray-100">
                {user.devices.map((device, i) => (
                  <div key={i} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3" />
                      </svg>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-gray-900">{device.name}</p>
                          {device.isActive && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-semibold">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              Active now
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400">{device.location} • Last used: {device.lastUsed}</p>
                      </div>
                    </div>
                    {device.isActive ? (
                      <button className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-500 text-white rounded-lg text-xs font-semibold hover:bg-red-600 transition-colors">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.739 4.89M5.526 3.921h1.372m8.188 8.77h1.372M6.982 3.44c-.03.527-.758 9.09 4.563 13.912m2.134.556c5.054 2.523 9.02-1.017 8.741-5.495M11.68 19.95c-.715.236-4.193.86-5.96-2.61 0 0 3.141.252 4.526-1.907m1.317-1.692c-4.03.389-12.08-1.058-11.698-12.872" />
                        </svg>
                        Remove Device
                      </button>
                    ) : (
                      <button className="p-1 text-gray-400 hover:text-gray-600">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <circle cx="12" cy="5" r="1.5" />
                          <circle cx="12" cy="12" r="1.5" />
                          <circle cx="12" cy="19" r="1.5" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ===== KYB Status — ONLY for frozen/pending users ===== */}
          {user.hasKYB && user.kybStatus && (
            <div className="px-8 pb-4">
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-sm font-bold text-gray-900 mb-3">KYB Status</h3>
                <StatusPill status={user.kybStatus} />
                <p className="text-xs text-gray-500 mt-2">{user.kybMessage}</p>
              </div>
            </div>
          )}

          {/* ===== KYC Status ===== */}
          <div className="px-8 pb-4">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-sm font-bold text-gray-900 mb-3">KYC Status</h3>
              <StatusPill status={user.kycStatus} />
              <p className="text-xs text-gray-500 mt-2">{user.kycMessage}</p>
            </div>
          </div>

          {/* ===== Account Actions ===== */}
          <div className="px-8 pb-4">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-sm font-bold text-gray-900 mb-4">Account Actions</h3>
              <div className="flex gap-4">
                {isFrozen ? (
                  <button className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-emerald-500 text-white rounded-lg text-sm font-semibold hover:bg-emerald-600 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 119 0v3.75m-4.5 6H9m1.5-6H9m3 6h1.5m-1.5-6h1.5M6.75 10.5h10.5a2.25 2.25 0 012.25 2.25v6.75a2.25 2.25 0 01-2.25 2.25H6.75a2.25 2.25 0 01-2.25-2.25v-6.75A2.25 2.25 0 016.75 10.5z" />
                    </svg>
                    Unfreeze Account
                  </button>
                ) : (
                  <button className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-red-500 text-white rounded-lg text-sm font-semibold hover:bg-red-600 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 4.5h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                    Freeze Account
                  </button>
                )}
                <button className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-gray-500 text-white rounded-lg text-sm font-semibold hover:bg-gray-600 transition-colors">
                  Reset Password
                </button>
              </div>
            </div>
          </div>

          {/* ===== Admin Notes ===== */}
          <div className="px-8 pb-8">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-sm font-bold text-gray-900 mb-4">Admin Notes</h3>

              {user.adminNote && (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4 relative overflow-hidden">
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-5">
                    <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" />
                    </svg>
                  </div>
                  <p className="text-sm text-gray-800 font-medium relative">{user.adminNote.text}</p>
                  <div className="flex items-center gap-2 mt-1.5 relative">
                    <p className="text-xs text-gray-400">{user.adminNote.date}</p>
                    {user.adminNote.reference && (
                      <>
                        <span className="text-xs text-gray-300">•</span>
                        <a href={user.adminNote.reference.url} className="text-xs text-blue-500 hover:text-blue-600 font-medium">
                          {user.adminNote.reference.label}
                        </a>
                      </>
                    )}
                  </div>
                </div>
              )}

              <textarea
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                placeholder="Add internal notes..."
                rows={3}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-700 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-gray-400"
              />
              <button className="w-full mt-3 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors">
                Save Note
              </button>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}