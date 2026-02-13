'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { AUTH_ROUTES } from '@/constants/auth';
import Sidebar from '@/components/Sidebar';


type TabType = 'bank-status' | 'payout' | 'handshake';

interface BankStatus {
  id: string;
  name: string;
  code: string;
  logo: string;
  status: 'online' | 'offline' | 'warning';
  uptime: number;
  responseTime: string;
  transactions: number;
  successRate: number;
  pending: number;
  lastDowntime?: string;
  downtimeDuration?: string;
}

interface PayoutTransaction {
  timestamp: string;
  timeAgo: string;
  user: string;
  email: string;
  bank: string;
  account: string;
  amount: string;
  status: 'processing' | 'completed' | 'failed';
  reference: string;
}

interface HandshakeRecord {
  timestamp: string;
  timeAgo: string;
  bank: string;
  status: 'success' | 'failed' | 'warning';
  responseTime: string;
  message: string;
}


const bankStatuses: BankStatus[] = [
  {
    id: '1',
    name: 'First Bank of Nigeria',
    code: 'FBN',
    logo: 'FB',
    status: 'online',
    uptime: 99.4,
    responseTime: '245ms',
    transactions: 1250,
    successRate: 98.5,
    pending: 25,
  },
  {
    id: '2',
    name: 'Guaranty Trust Bank',
    code: 'GTB',
    logo: 'GT',
    status: 'online',
    uptime: 99.9,
    responseTime: '180ms',
    transactions: 2100,
    successRate: 99.2,
    pending: 25,
  },
  {
    id: '3',
    name: 'Access Bank',
    code: 'ACCESS',
    logo: 'AB',
    status: 'warning',
    uptime: 97.2,
    responseTime: '890ms',
    transactions: 2100,
    successRate: 99.2,
    pending: 25,
    lastDowntime: '2026-01-05 08:45',
    downtimeDuration: '45 mins',
  },
  {
    id: '4',
    name: 'Zenith Bank',
    code: 'ZENITH',
    logo: 'ZB',
    status: 'online',
    uptime: 97.2,
    responseTime: '210ms',
    transactions: 1680,
    successRate: 99.2,
    pending: 18,
  },
  {
    id: '5',
    name: 'United Bank for Africa',
    code: 'UBA',
    logo: 'UBA',
    status: 'offline',
    uptime: 92.5,
    responseTime: '0ms',
    transactions: 1680,
    successRate: 99.2,
    pending: 18,
    lastDowntime: '2026-01-05 08:45',
    downtimeDuration: '45 mins',
  },
];

const payoutTransactions: PayoutTransaction[] = [
  { timestamp: '2026-01-05 10:30am', timeAgo: '2 mins ago', user: 'James Smith', email: 'jsmith@example.com', bank: 'Guaranty Trust Bank', account: '0123456789', amount: 'NGN 50,000', status: 'processing', reference: 'TRF-GTB-001' },
  { timestamp: '2026-01-05 10:30am', timeAgo: '2 mins ago', user: 'James Smith', email: 'jsmith@example.com', bank: 'Access Bank', account: '0987654321', amount: 'NGN 125,000', status: 'failed', reference: 'TRF-ACC-002' },
  { timestamp: '2026-01-05 10:30am', timeAgo: '2 mins ago', user: 'David Okonkwo', email: 'david@example.com', bank: 'ICBC', account: '6217001234567890', amount: 'RMB 8,000', status: 'completed', reference: 'TRF-ICBC-003' },
  { timestamp: '2026-01-05 10:30am', timeAgo: '2 mins ago', user: 'David Okonkwo', email: 'david@example.com', bank: 'ICBC', account: '6217001234567890', amount: 'RMB 8,000', status: 'completed', reference: 'TRF-ICBC-003' },
  { timestamp: '2026-01-05 10:30am', timeAgo: '2 mins ago', user: 'James Smith', email: 'jsmith@example.com', bank: 'Guaranty Trust Bank', account: '0123456789', amount: 'NGN 50,000', status: 'processing', reference: 'TRF-GTB-001' },
];

const handshakeRecords: HandshakeRecord[] = [
  { timestamp: '2026-01-05 10:30am', timeAgo: '2 mins ago', bank: 'Zenith Bank', status: 'success', responseTime: '210ms', message: 'Connection established' },
  { timestamp: '2026-01-05 10:30am', timeAgo: '2 mins ago', bank: 'GTBank', status: 'success', responseTime: '180ms', message: 'Connection established' },
  { timestamp: '2026-01-05 10:30am', timeAgo: '2 mins ago', bank: 'First Bank', status: 'success', responseTime: '245ms', message: 'Connection established' },
  { timestamp: '2026-01-05 10:30am', timeAgo: '2 mins ago', bank: 'UBA', status: 'failed', responseTime: '0ms', message: 'Connection timeout' },
  { timestamp: '2026-01-05 10:30am', timeAgo: '2 mins ago', bank: 'Access Bank', status: 'warning', responseTime: '890ms', message: 'Slow response detected' },
];


function StatusBadge({ status }: { status: 'online' | 'offline' | 'warning' | 'processing' | 'completed' | 'failed' | 'success' }) {
  const styles: Record<string, string> = {
    online: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    success: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    completed: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    offline: 'bg-red-100 text-red-700 border-red-200',
    failed: 'bg-red-100 text-red-700 border-red-200',
    warning: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    processing: 'bg-orange-100 text-orange-700 border-orange-200',
  };

  const labels: Record<string, string> = {
    online: 'ONLINE',
    success: 'Success',
    completed: 'Completed',
    offline: 'OFFLINE',
    failed: 'Failed',
    warning: 'Warning',
    processing: 'Processing',
  };

  return (
    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold border ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  const bgColors: Record<string, string> = {
    green: 'bg-emerald-50',
    blue: 'bg-blue-50',
    yellow: 'bg-yellow-50',
    red: 'bg-red-50',
  };

  const textColors: Record<string, string> = {
    green: 'text-emerald-700',
    blue: 'text-blue-700',
    yellow: 'text-yellow-700',
    red: 'text-red-700',
  };

  return (
    <div className={`${bgColors[color]} rounded-xl p-5`}>
      <p className="text-xs font-medium text-gray-500 mb-2">{label}</p>
      <p className={`text-3xl font-bold ${textColors[color]}`}>{value}</p>
    </div>
  );
}


export default function BanksPayoutsPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabType>('bank-status');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('All Status');

  if (!isAuthenticated) {
    router.push(AUTH_ROUTES.LOGIN);
    return null;
  }

  return (
    <div className="flex h-screen bg-gray-50 font-['DM_Sans']">
      <Sidebar />

      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <div className="bg-white border-b border-gray-200 px-8 py-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Banks & Payouts</h1>
                <p className="text-sm text-gray-500 mt-0.5">Monitor bank status, payouts, and reconciliation</p>
              </div>

              <div className="flex items-center gap-4">
                <button className="relative p-2 hover:bg-gray-100 rounded-xl">
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312.665M14.857 17.082a23.848 23.848 0 00-5.454-1.31m5.454 1.31A6.976 6.976 0 0112 17.25c-2.676 0-5.216-.584-7.545-1.668M14.857 17.082L15 17.25m-3 3.75h.01M5.25 6h13.5" />
                  </svg>
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">4</span>
                </button>

                <div className="flex items-center gap-3 cursor-pointer">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white text-xs font-bold">OO</div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 leading-tight">Olalekan. O</p>
                    <p className="text-xs text-gray-500">Ops Admin</p>
                  </div>
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={() => setActiveTab('bank-status')}
                className={`px-8 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                  activeTab === 'bank-status'
                    ? 'bg-emerald-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Bank Status
              </button>
              <button
                onClick={() => setActiveTab('payout')}
                className={`px-8 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                  activeTab === 'payout'
                    ? 'bg-emerald-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Payout
              </button>
              <button
                onClick={() => setActiveTab('handshake')}
                className={`px-8 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                  activeTab === 'handshake'
                    ? 'bg-emerald-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Handshake
              </button>
            </div>
          </div>

          <div className="p-8">
            {activeTab === 'bank-status' && (
              <>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Bank Status Monitor</h2>
                    <p className="text-sm text-gray-500 mt-0.5">Real-time uptime and performance tracking</p>
                  </div>
                  <button className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-500 text-white rounded-lg text-sm font-semibold hover:bg-emerald-600 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                    </svg>
                    Refresh Now
                  </button>
                </div>

                <div className="mb-8">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Rate Engine Status</h3>
                  <div className="grid grid-cols-4 gap-5">
                    <StatCard label="Total Banks" value="3" color="green" />
                    <StatCard label="Online" value="5" color="blue" />
                    <StatCard label="Degraded" value="4" color="yellow" />
                    <StatCard label="Offline" value="2" color="red" />
                  </div>
                </div>

                <div className="space-y-5">
                  {bankStatuses.map((bank) => (
                    <div key={bank.id} className="bg-white rounded-xl border border-gray-200 p-6">
                      <div className="flex items-start justify-between mb-5">
                        <div className="flex items-center gap-3">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                            bank.status === 'online' ? 'bg-blue-600' : bank.status === 'warning' ? 'bg-yellow-500' : 'bg-red-600'
                          }`}>
                            {bank.logo}
                          </div>
                          <div>
                            <h3 className="text-base font-bold text-gray-900">{bank.name}</h3>
                            <p className="text-sm text-gray-500">{bank.code}</p>
                          </div>
                        </div>
                        <StatusBadge status={bank.status} />
                      </div>

                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-gray-600">Uptime (30 days)</span>
                            <span className="text-sm font-bold text-gray-900">{bank.uptime}%</span>
                          </div>
                          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${
                                bank.status === 'online' ? 'bg-emerald-500' : bank.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${bank.uptime}%` }}
                            ></div>
                          </div>
                        </div>

                        <div>
                          <span className="text-sm text-gray-600">Response Time</span>
                          <p className="text-sm font-bold text-gray-900 mt-1">{bank.responseTime}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-6 mt-5">
                        <div>
                          <span className="text-sm text-gray-600">Transactions</span>
                          <p className="text-base font-bold text-gray-900 mt-1">{bank.transactions}</p>
                        </div>
                        <div>
                          <span className="text-sm text-gray-600">Success Rate</span>
                          <p className="text-base font-bold text-gray-900 mt-1">{bank.successRate}%</p>
                        </div>
                        <div>
                          <span className="text-sm text-gray-600">Pending</span>
                          <p className="text-base font-bold text-gray-900 mt-1">{bank.pending}</p>
                        </div>
                      </div>

                      {bank.lastDowntime && (
                        <div className="mt-5 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <p className="text-sm text-yellow-800">
                            <span className="font-semibold">Last Downtime:</span> {bank.lastDowntime}
                          </p>
                          <p className="text-sm text-yellow-800 mt-1">
                            <span className="font-semibold">Duration:</span> {bank.downtimeDuration}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}

            {activeTab === 'payout' && (
              <>
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-gray-900">Payout Transactions</h2>
                  <p className="text-sm text-gray-500 mt-0.5">All bank payout transactions</p>
                </div>

                <div className="mb-8">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Rate Engine Status</h3>
                  <div className="grid grid-cols-4 gap-5">
                    <StatCard label="Total Payouts" value="200,345" color="green" />
                    <StatCard label="Successful" value="199,394" color="blue" />
                    <StatCard label="Pending" value="4" color="yellow" />
                    <StatCard label="Failed" value="1,394" color="red" />
                  </div>
                </div>

                <div className="flex items-center gap-3 mb-6">
                  <div className="flex-1 relative">
                    <svg
                      className="w-4 h-4 text-gray-400 absolute left-3 top-3"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                    </svg>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search by user, bank or reference..."
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    <option>All Status</option>
                    <option>Processing</option>
                    <option>Completed</option>
                    <option>Failed</option>
                  </select>

                  <button className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-500 text-white rounded-xl text-sm font-semibold hover:bg-emerald-600 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                    Export
                  </button>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          {['Timestamp', 'User', 'Bank', 'Account', 'Amount', 'Status', 'Reference'].map((h) => (
                            <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {payoutTransactions.map((tx, i) => (
                          <tr key={i} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4">
                              <div>
                                <p className="text-sm text-gray-900">{tx.timestamp}</p>
                                <p className="text-xs text-gray-500">{tx.timeAgo}</p>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold">
                                  {tx.user.split(' ').map(w => w[0]).join('')}
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-900">{tx.user}</p>
                                  <p className="text-xs text-gray-400">{tx.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">{tx.bank}</td>
                            <td className="px-6 py-4 text-sm text-gray-900">{tx.account}</td>
                            <td className="px-6 py-4 text-sm font-bold text-gray-900">{tx.amount}</td>
                            <td className="px-6 py-4"><StatusBadge status={tx.status} /></td>
                            <td className="px-6 py-4 text-sm text-gray-900">{tx.reference}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'handshake' && (
              <>
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-gray-900">Bank Handshake & Reconciliation</h2>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          {['Timestamp', 'Bank', 'Status', 'Response Time', 'Message'].map((h) => (
                            <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {handshakeRecords.map((record, i) => (
                          <tr key={i} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4">
                              <div>
                                <p className="text-sm text-gray-900">{record.timestamp}</p>
                                <p className="text-xs text-gray-500">{record.timeAgo}</p>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm font-medium text-gray-900">{record.bank}</td>
                            <td className="px-6 py-4"><StatusBadge status={record.status} /></td>
                            <td className="px-6 py-4 text-sm text-gray-900">{record.responseTime}</td>
                            <td className="px-6 py-4 text-sm text-gray-600">{record.message}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}