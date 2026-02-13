'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { AUTH_ROUTES } from '@/constants/auth';
import Sidebar from '@/components/Sidebar';

type MainTab = 'overview' | 'currency-wallets' | 'ledger' | 'reconciliation';
type CurrencyTab = 'wallets' | 'topup' | 'swap';
type CurrencyType = 'usd' | 'ngn' | 'yuan';

// Mock data
const mockWallets = {
  usd: Array.from({ length: 8 }, (_, i) => ({
    id: `USD${String(i + 1).padStart(3, '0')}`,
    user: { name: 'James Smith', email: 'john.doe@example.com', avatar: 'JS' },
    balance: '$15,420.50',
    dateCreated: '2026-01-05',
    status: i % 3 === 0 ? 'Active' : 'Frozen',
    lastActivity: `2026-01-05 10:30am\n${['2 mins ago', '3 hours ago', '2 mins ago', '4 days ago', '10 months ago'][i % 5]}`,
  })),
  ngn: Array.from({ length: 8 }, (_, i) => ({
    id: `NGN${String(i + 1).padStart(3, '0')}`,
    user: { name: 'James Smith', email: 'john.doe@example.com', avatar: 'JS' },
    balance: '₦15,420.50',
    dateCreated: '2026-01-05',
    status: i % 3 === 0 ? 'Active' : 'Frozen',
    lastActivity: `2026-01-05 10:30am\n${['2 mins ago', '3 hours ago', '4 days ago'][i % 3]}`,
  })),
  yuan: Array.from({ length: 8 }, (_, i) => ({
    id: `RMB${String(i + 1).padStart(3, '0')}`,
    user: { name: 'James Smith', email: 'john.doe@example.com', avatar: 'JS' },
    balance: '¥15,420.50',
    dateCreated: '2026-01-05',
    status: i % 3 === 0 ? 'Active' : 'Frozen',
    lastActivity: `2026-01-05 10:30am\n${['2 mins ago', '3 hours ago', '10 months ago'][i % 3]}`,
  })),
};

const mockTopup = Array.from({ length: 8 }, (_, i) => ({
  id: `TOP${String(i + 1).padStart(3, '0')}`,
  user: { name: 'James Smith', email: 'john.doe@example.com', avatar: 'JS' },
  walletId: `RMB003`,
  amount: ['6,000.00', '1,000.00', '3,000.00', '2,000.00', '78,000.00', '6,000.00', '₦2,000.00', '₦2,000.00'][i],
  currency: ['NGN', 'USD', 'NGN', 'NGN', 'NGN', 'YUAN', 'USD', 'USD'][i],
  method: ['Bank Transfer', 'Card Payment', 'Bank Transfer', 'Bank Transfer', 'Bank Transfer', 'Bank Transfer', 'Bank Transfer', 'Bank Transfer'][i],
  status: ['Processing', 'Failed', 'Processing', 'Failed', 'Processing', 'Completed', 'Failed', 'Completed'][i],
  timestamp: '2026-01-05 10:30am\n2 mins ago',
  reference: 'TXN2026091001',
}));

const mockSwap = Array.from({ length: 8 }, (_, i) => ({
  id: `SWP001`,
  user: { name: 'James Smith', email: 'john.doe@example.com', avatar: 'JS' },
  walletId: ['RMB001', 'RMB007', 'RMB007', 'RMB003', 'RMB003', 'RMB007', 'RMB003', 'RMB003'][i],
  from: ['₦6,000.00 NGN', '$1,000.00 USD', '$1,000.00 USD', '$2,000.00 USD', '$2,000.00 USD', '$1,000.00 USD', '$2,000.00 USD', '$2,000.00 USD'][i],
  to: ['$82.00 USD', '₦1,300,000 CYN', '₦1,300,000 CYN', '¥14,540.00 CYN', '¥14,540.00 CYN', '₦1,300,000 CYN', '¥14,540.00 CYN', '¥14,540.00 CYN'][i],
  rate: ['7.27', '1.27', '1.27', '6.24', '6.24', '1.27', '6.24', '6.24'][i],
  status: ['Processing', 'Failed', 'Failed', 'Completed', 'Completed', 'Failed', 'Completed', 'Completed'][i],
  timestamp: '2026-01-05 10:30am\n2 mins ago',
  reference: 'SWP2026091001',
}));

const mockLedger = Array.from({ length: 10 }, (_, i) => ({
  time: ['2026-01-05 11:15:22', '2026-01-05 11:03:45', '2026-01-05 10:35:15', '2026-01-05 11:15:22', '2026-01-05 11:15:22', '2026-01-05 10:15:22', '2026-01-05 10:08:30', '2026-01-05 09:45:18', '2026-01-05 09:45:18', '2026-01-05 09:33:45'][i],
  user: { name: ['David Okonkwo', 'Robert Johnson', 'John Doe', 'Sarah Smith', 'Sarah Smith', 'David Okonkwo', 'Sarah Smith', 'David Okonkwo', 'David Okonkwo', 'David Okonkwo'][i], email: 'user-178001', avatar: ['DO', 'RJ', 'JD', 'SS', 'SS', 'DO', 'SS', 'DO', 'DO', 'DO'][i] },
  wallet: 'NGN003',
  type: i % 3 === 0 ? 'deposit' : i % 3 === 1 ? 'withdrawal' : 'transfer',
  amount: ['+2,000,000', '+5,000', '+2,000,000', '-2,000', '+500,000', '-500', '+2,000,000', '+2,000,000', '+2,000,000', '+100,000'][i],
  reference: ['DEP-78001', 'DEP-78001', 'DEP-78001', '', 'DEP-78001', 'INT-11111', 'INT-11111', 'DEP-78001', 'DEP-78001', 'ADJ-00001'][i],
  description: ['Bank transfer dep...', 'Wire transfer', 'Bank transfer dep...', 'Withdrawal to bank', 'Local transfer', 'Transfer to USD002', 'Transfer from USD001', 'Bank transfer dep...', 'Bank transfer dep...', 'Admin adjustment -...'][i],
}));

const recentActivity = [
  { user: 'David Okonkwo', description: 'NGN003 • Bank transfer deposit', amount: '+₦2,000,000', time: '11:15:22', type: 'deposit' },
  { user: 'David Okonkwo', description: 'NGN003 • Bank transfer deposit', amount: '+₦2,000,000', time: '11:15:22', type: 'deposit' },
  { user: 'Sarah Smith', description: 'USD002 • Withdrawal to bank', amount: '-$2,000', time: '10:15:22', type: 'withdrawal' },
  { user: 'John Doe', description: 'NGN001 • Local transfer', amount: '+₦500,000', time: '10:00:30', type: 'deposit' },
  { user: 'Sarah Smith', description: 'USD002 • Withdrawal to bank', amount: '-$2,000', time: '10:15:22', type: 'withdrawal' },
];

export default function WalletManagementPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [mainTab, setMainTab] = useState<MainTab>('overview');
  const [currencyTab, setCurrencyTab] = useState<CurrencyTab>('wallets');
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyType>('usd');
  const [searchQuery, setSearchQuery] = useState('');

  if (!isAuthenticated) {
    router.push(AUTH_ROUTES.LOGIN);
    return null;
  }

  const currencyMeta: Record<CurrencyType, { label: string; flag: string; totalBalance: string }> = {
    usd: { label: 'US Dollar Wallets', flag: '🇺🇸', totalBalance: '$95,071.50' },
    ngn: { label: 'Nigerian Naira Wallets', flag: '🇳🇬', totalBalance: '₦24,550,000.00' },
    yuan: { label: 'Chinese Yuan Wallets', flag: '🇨🇳', totalBalance: '¥250,000.00' },
  };

  return (
    <div className="flex h-screen bg-gray-50 font-['DM_Sans']">
      <Sidebar />

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-8 py-5">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Wallet Management System</h1>
              <p className="text-sm text-gray-500 mt-0.5">Comprehensive wallet management for all users</p>
            </div>

            <div className="flex items-center gap-4">
              <button className="relative p-2 hover:bg-gray-100 rounded-xl">
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312.665" />
                </svg>
                <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">4</span>
              </button>

              <div className="flex items-center gap-3 cursor-pointer">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white text-xs font-bold">OO</div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Olalekan. O</p>
                  <p className="text-xs text-gray-500">Ops Admin</p>
                </div>
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </div>
            </div>
          </div>

          {/* Main Tabs */}
          <div className="mt-6 flex items-center border-b border-gray-200">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'currency-wallets', label: 'Currency Wallets' },
              { id: 'ledger', label: 'Ledger' },
              { id: 'reconciliation', label: 'Reconciliation' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setMainTab(tab.id as MainTab)}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  mainTab === tab.id
                    ? 'border-emerald-500 text-emerald-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8">
          {/* OVERVIEW TAB */}
          {mainTab === 'overview' && (
            <div>
              {/* Stats Row */}
              <div className="grid grid-cols-3 gap-6 mb-8">
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <p className="text-xs text-gray-500 mb-2">Total Wallets</p>
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
                    </svg>
                    <p className="text-3xl font-bold text-gray-900">3</p>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <p className="text-xs text-gray-500 mb-2">Today's Transactions</p>
                  <div className="flex items-baseline gap-2">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                    </svg>
                    <p className="text-3xl font-bold text-gray-900">100,212</p>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">5 hr 7 out</p>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <p className="text-xs text-gray-500 mb-2">Transaction Volume</p>
                  <div className="flex items-baseline gap-2">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-3xl font-bold text-gray-900">$2613K</p>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Last 5 days</p>
                </div>
              </div>

              {/* Wallet Balances Row */}
              <div className="grid grid-cols-3 gap-6 mb-8">
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <p className="text-xs text-gray-500 mb-2">USD Wallets</p>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">🇺🇸</span>
                    <p className="text-3xl font-bold text-gray-900">$95,071.50</p>
                  </div>
                  <p className="text-xs text-gray-500">Last 5 years</p>
                  <button className="mt-3 text-xs text-emerald-600 hover:text-emerald-700 font-medium">
                    View All USD Wallets →
                  </button>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <p className="text-xs text-gray-500 mb-2">YUAN Wallet Balance</p>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-500 text-white text-sm font-bold">¥</span>
                    <p className="text-3xl font-bold text-gray-900">¥7,865</p>
                  </div>
                  <p className="text-xs text-gray-500">Last 5 years</p>
                  <button className="mt-3 text-xs text-emerald-600 hover:text-emerald-700 font-medium">
                    View All YUAN Wallets →
                  </button>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <p className="text-xs text-gray-500 mb-2">NGN Wallets</p>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">🇳🇬</span>
                    <p className="text-3xl font-bold text-gray-900">₦24,550,000</p>
                  </div>
                  <p className="text-xs text-gray-500">Last 5 years</p>
                  <button className="mt-3 text-xs text-emerald-600 hover:text-emerald-700 font-medium">
                    View All NGN Wallets →
                  </button>
                </div>
              </div>

              {/* Recent System Activity */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-gray-900">Recent System Activity</h3>
                  <button className="text-sm text-emerald-600 hover:text-emerald-700 font-medium">
                    View Full Ledger →
                  </button>
                </div>

                <div className="divide-y divide-gray-100">
                  {recentActivity.map((activity, i) => (
                    <div key={i} className="flex items-center justify-between py-4">
                      <div className="flex items-center gap-3">
                        <svg className={`w-5 h-5 ${activity.type === 'deposit' ? 'text-emerald-500' : 'text-red-500'}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d={activity.type === 'deposit' ? "M7 11l5-5m0 0l5 5m-5-5v12" : "M17 13l-5 5m0 0l-5-5m5 5V6"} />
                        </svg>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{activity.user}</p>
                          <p className="text-xs text-gray-500">{activity.description}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-bold ${activity.type === 'deposit' ? 'text-emerald-600' : 'text-red-600'}`}>
                          {activity.amount}
                        </p>
                        <p className="text-xs text-gray-400">{activity.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* CURRENCY WALLETS TAB */}
          {mainTab === 'currency-wallets' && (
            <div>
              {/* Sub-tabs */}
              <div className="flex items-center gap-4 mb-6">
                {[
                  { id: 'wallets', label: 'Wallets' },
                  { id: 'topup', label: 'Topup' },
                  { id: 'swap', label: 'Swap' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setCurrencyTab(tab.id as CurrencyTab)}
                    className={`px-8 py-2.5 text-sm font-semibold rounded-lg transition-colors ${
                      currencyTab === tab.id
                        ? 'bg-emerald-500 text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Wallets Content */}
              {currencyTab === 'wallets' && (
                <div className="bg-white rounded-xl border border-gray-200">
                  <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <select
                        value={selectedCurrency}
                        onChange={(e) => setSelectedCurrency(e.target.value as CurrencyType)}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="usd">USD Wallets</option>
                        <option value="ngn">NGN Wallets</option>
                        <option value="yuan">YUAN Wallets</option>
                      </select>

                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{currencyMeta[selectedCurrency].flag}</span>
                        <span className="text-lg font-bold text-gray-900">{currencyMeta[selectedCurrency].label}</span>
                        <span className="text-sm text-gray-500 ml-2">Total Balance:</span>
                        <span className="text-lg font-bold text-gray-900">{currencyMeta[selectedCurrency].totalBalance}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-6">
                    <div className="relative mb-6">
                      <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                      </svg>
                      <input
                        type="text"
                        placeholder="Search by name, wallet ID or transaction ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-200 bg-gray-50">
                            <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Wallet ID</th>
                            <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">User</th>
                            <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Balance</th>
                            {selectedCurrency === 'usd' && <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Date Created</th>}
                            <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                            <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Last activity</th>
                            <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {mockWallets[selectedCurrency].map((wallet) => (
                            <tr key={wallet.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-5 py-4 text-sm font-medium text-gray-900">{wallet.id}</td>
                              <td className="px-5 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold">
                                    {wallet.user.avatar}
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-gray-900">{wallet.user.name}</p>
                                    <p className="text-xs text-gray-400">{wallet.user.email}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-5 py-4 text-sm font-bold text-gray-900">{wallet.balance}</td>
                              {selectedCurrency === 'usd' && <td className="px-5 py-4 text-sm text-gray-600">{wallet.dateCreated}</td>}
                              <td className="px-5 py-4">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                                  wallet.status === 'Active' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-gray-100 text-gray-600 border border-gray-200'
                                }`}>
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                                  </svg>
                                  {wallet.status}
                                </span>
                              </td>
                              <td className="px-5 py-4">
                                {wallet.lastActivity.split('\n').map((line, i) => (
                                  <p key={i} className={i === 0 ? 'text-xs text-gray-900' : 'text-xs text-gray-400'}>{line}</p>
                                ))}
                              </td>
                              <td className="px-5 py-4">
                                <button className="relative text-gray-400 hover:text-gray-600">
                                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                    <circle cx="12" cy="5" r="1.5" />
                                    <circle cx="12" cy="12" r="1.5" />
                                    <circle cx="12" cy="19" r="1.5" />
                                  </svg>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Topup Content */}
              {currencyTab === 'topup' && (
                <div className="bg-white rounded-xl border border-gray-200">
                  <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                    <div className="relative flex-1 max-w-md">
                      <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                      </svg>
                      <input
                        type="text"
                        placeholder="Search by name, wallet ID or transaction ID..."
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <select className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                        <option>All Status</option>
                      </select>
                      <button className="px-6 py-2 bg-emerald-500 text-white rounded-lg text-sm font-semibold hover:bg-emerald-600">
                        Export
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200 bg-gray-50">
                          <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Transaction ID</th>
                          <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">User</th>
                          <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Wallet ID</th>
                          <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Amount</th>
                          <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Method</th>
                          <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                          <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Timestamp</th>
                          <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Reference</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {mockTopup.map((tx, i) => (
                          <tr key={i} className="hover:bg-gray-50 transition-colors">
                            <td className="px-5 py-4 text-sm font-medium text-gray-900">{tx.id}</td>
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold">
                                  {tx.user.avatar}
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-900">{tx.user.name}</p>
                                  <p className="text-xs text-gray-400">{tx.user.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-4 text-sm font-medium text-gray-900">{tx.walletId}</td>
                            <td className="px-5 py-4">
                              <p className="text-sm font-bold text-gray-900">{tx.amount}</p>
                              <p className="text-xs text-gray-400">{tx.currency}</p>
                            </td>
                            <td className="px-5 py-4">
                              <p className="text-sm text-gray-900">{tx.method}</p>
                            </td>
                            <td className="px-5 py-4">
                              <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                                tx.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' : 
                                tx.status === 'Processing' ? 'bg-orange-100 text-orange-700' : 
                                'bg-red-100 text-red-700'
                              }`}>
                                {tx.status}
                              </span>
                            </td>
                            <td className="px-5 py-4">
                              {tx.timestamp.split('\n').map((line, i) => (
                                <p key={i} className={i === 0 ? 'text-xs text-gray-900' : 'text-xs text-gray-400'}>{line}</p>
                              ))}
                            </td>
                            <td className="px-5 py-4 text-xs text-gray-600">{tx.reference}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                    <p className="text-sm text-gray-500">Showing 1 to 8 of 500 results</p>
                    <div className="flex items-center gap-1">
                      <button className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded-lg hover:bg-gray-50">
                        <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                        </svg>
                      </button>
                      {[1, 2, 3, 4, 5].map((p) => (
                        <button
                          key={p}
                          className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium ${
                            p === 3 ? 'bg-emerald-500 text-white' : 'border border-gray-300 text-gray-600 hover:bg-gray-50'
                          }`}
                        >{p}</button>
                      ))}
                      <button className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded-lg hover:bg-gray-50">
                        <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Swap Content */}
              {currencyTab === 'swap' && (
                <div className="bg-white rounded-xl border border-gray-200">
                  <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                    <div className="relative flex-1 max-w-md">
                      <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                      </svg>
                      <input
                        type="text"
                        placeholder="Search by name, wallet ID or transaction ID..."
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <select className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                        <option>All Status</option>
                      </select>
                      <button className="px-6 py-2 bg-emerald-500 text-white rounded-lg text-sm font-semibold hover:bg-emerald-600">
                        Export
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200 bg-gray-50">
                          <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Transaction ID</th>
                          <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">User</th>
                          <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Wallet ID</th>
                          <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">From</th>
                          <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">To</th>
                          <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Rate</th>
                          <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                          <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Timestamp</th>
                          <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Reference</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {mockSwap.map((tx, i) => (
                          <tr key={i} className="hover:bg-gray-50 transition-colors">
                            <td className="px-5 py-4 text-sm font-medium text-gray-900">{tx.id}</td>
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold">
                                  {tx.user.avatar}
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-900">{tx.user.name}</p>
                                  <p className="text-xs text-gray-400">{tx.user.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-4 text-sm font-medium text-gray-900">{tx.walletId}</td>
                            <td className="px-5 py-4">
                              <p className="text-sm text-gray-900 whitespace-nowrap">{tx.from.split(' ')[0]}</p>
                              <p className="text-xs text-gray-400">{tx.from.split(' ').slice(1).join(' ')}</p>
                            </td>
                            <td className="px-5 py-4">
                              <p className="text-sm text-emerald-600 font-medium whitespace-nowrap">{tx.to.split(' ')[0]}</p>
                              <p className="text-xs text-gray-400">{tx.to.split(' ').slice(1).join(' ')}</p>
                            </td>
                            <td className="px-5 py-4 text-sm text-gray-900">{tx.rate}</td>
                            <td className="px-5 py-4">
                              <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                                tx.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' : 
                                tx.status === 'Processing' ? 'bg-orange-100 text-orange-700' : 
                                'bg-red-100 text-red-700'
                              }`}>
                                {tx.status}
                              </span>
                            </td>
                            <td className="px-5 py-4">
                              {tx.timestamp.split('\n').map((line, i) => (
                                <p key={i} className={i === 0 ? 'text-xs text-gray-900' : 'text-xs text-gray-400'}>{line}</p>
                              ))}
                            </td>
                            <td className="px-5 py-4 text-xs text-gray-600">{tx.reference}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                    <p className="text-sm text-gray-500">Showing 1 to 8 of 500 results</p>
                    <div className="flex items-center gap-1">
                      <button className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded-lg hover:bg-gray-50">
                        <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                        </svg>
                      </button>
                      {[1, 2, 3, 4, 5].map((p) => (
                        <button
                          key={p}
                          className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium ${
                            p === 3 ? 'bg-emerald-500 text-white' : 'border border-gray-300 text-gray-600 hover:bg-gray-50'
                          }`}
                        >{p}</button>
                      ))}
                      <button className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded-lg hover:bg-gray-50">
                        <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* LEDGER TAB */}
          {mainTab === 'ledger' && (
            <div>
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-900">System-Wide Transaction Ledger</h2>
                <p className="text-sm text-gray-500 mt-1">Immutable record of all transactions</p>
              </div>

              <div className="bg-white rounded-xl border border-gray-200">
                <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                  <div className="relative flex-1 max-w-md">
                    <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                    </svg>
                    <input
                      type="text"
                      placeholder="Search by wallet, user reference or description..."
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <button className="px-6 py-2 bg-emerald-500 text-white rounded-lg text-sm font-semibold hover:bg-emerald-600">
                    Export
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Time</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">User</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Wallet</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Type</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Amount</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Reference</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {mockLedger.map((entry, i) => (
                        <tr key={i} className="hover:bg-gray-50 transition-colors">
                          <td className="px-5 py-4 text-xs text-gray-600">{entry.time}</td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold">
                                {entry.user.avatar}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900">{entry.user.name}</p>
                                <p className="text-xs text-gray-400">{entry.user.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-sm font-medium text-gray-900">{entry.wallet}</td>
                          <td className="px-5 py-4">
                            <svg className={`w-5 h-5 ${entry.type === 'withdrawal' ? 'text-red-500' : 'text-emerald-500'}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d={entry.type === 'withdrawal' ? "M17 13l-5 5m0 0l-5-5m5 5V6" : "M7 11l5-5m0 0l5 5m-5-5v12"} />
                            </svg>
                          </td>
                          <td className="px-5 py-4">
                            <span className={`text-sm font-bold ${entry.amount.startsWith('+') ? 'text-emerald-600' : 'text-red-600'}`}>
                              {entry.amount}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-xs text-gray-600">{entry.reference}</td>
                          <td className="px-5 py-4 text-sm text-gray-600">{entry.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                  <p className="text-sm text-gray-500">Showing 1 to 10 of 500 results</p>
                  <div className="flex items-center gap-1">
                    <button className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded-lg hover:bg-gray-50">
                      <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                      </svg>
                    </button>
                    {[1, 2, 3, 4, 5].map((p) => (
                      <button
                        key={p}
                        className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium ${
                          p === 3 ? 'bg-emerald-500 text-white' : 'border border-gray-300 text-gray-600 hover:bg-gray-50'
                        }`}
                      >{p}</button>
                    ))}
                    <button className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded-lg hover:bg-gray-50">
                      <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* RECONCILIATION TAB */}
          {mainTab === 'reconciliation' && (
            <div>
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-900">System-Wide Reconciliation</h2>
                <p className="text-sm text-gray-500 mt-1">Immutable record of all transactions</p>
              </div>

              {/* Success Banner */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 mb-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <svg className="w-12 h-12 text-emerald-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-lg font-bold text-gray-900">All Wallets Reconciled</p>
                    <p className="text-sm text-gray-600 mt-1">Last reconciliation: 1/6/2026, 10:30:20 AM</p>
                  </div>
                </div>
                <button className="px-6 py-2.5 bg-emerald-500 text-white rounded-lg text-sm font-semibold hover:bg-emerald-600 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                  </svg>
                  Manual Reconcile
                </button>
              </div>

              {/* Automated Reconciliation */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-6">Automated Reconciliation</h3>
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="text-base font-bold text-gray-900">Auto-Reconciliation Job</p>
                      <p className="text-sm text-gray-500 mt-1">Runs every 10 minutes</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-semibold">
                    Active
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}