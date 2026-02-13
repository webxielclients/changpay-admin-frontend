'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { AUTH_ROUTES } from '@/constants/auth';
import Sidebar from '@/components/Sidebar';

// ---------- Types ----------

type WalletType = 'USD' | 'NGN' | 'YAN';
type TransactionStatus = 'completed' | 'processing' | 'on-going';
type TransactionCategory = 'outgoing' | 'income';

interface Transaction {
  txId: string;
  category: TransactionCategory;
  type: string;
  destination: string;
  destinationSub?: string;
  amount: string;
  status: TransactionStatus;
  fee: string;
  dateTime: string;
}

// ---------- Mock transaction data ----------

const mockTransactions: Record<WalletType, Transaction[]> = {
  NGN: [
    {
      txId: 'TX-9A21F',
      category: 'outgoing',
      type: 'Internal Transfer',
      destination: 'NGN Wallet',
      destinationSub: '(ng***ala)',
      amount: '₦450,000',
      status: 'completed',
      fee: '₦0.00',
      dateTime: '2025-01-05 10:30am',
    },
    {
      txId: 'TX-9A21F',
      category: 'outgoing',
      type: 'Gift Card + Cash',
      destination: 'Amazon',
      destinationSub: '(www.amazon.com)',
      amount: '₦1,200.00',
      status: 'processing',
      fee: '₦0.00',
      dateTime: '28 Dec, 10:42am',
    },
    {
      txId: 'TX-9A21F',
      category: 'outgoing',
      type: 'Internal Transfer',
      destination: 'NGN Wallet',
      destinationSub: '(ng***ala)',
      amount: '₦450,000',
      status: 'completed',
      fee: '₦0.00',
      dateTime: '2025-01-05 10:30am',
    },
    {
      txId: 'TX-9A21F',
      category: 'outgoing',
      type: 'Gift Card + Cash',
      destination: 'Amazon',
      destinationSub: '(www.amazon.com)',
      amount: '₦1,200.00',
      status: 'processing',
      fee: '₦0.00',
      dateTime: '28 Dec, 10:42am',
    },
    {
      txId: 'TX-9A21F',
      category: 'income',
      type: 'Top-up',
      destination: 'Bank Transfer',
      destinationSub: '(ng***4562)',
      amount: '₦1,200.00',
      status: 'on-going',
      fee: '₦0.00',
      dateTime: '2026-01-05 10:30am',
    },
    {
      txId: 'TX-9A21F',
      category: 'income',
      type: 'Top-up',
      destination: 'Bank Transfer',
      destinationSub: '(ng***4562)',
      amount: '₦1,200.00',
      status: 'on-going',
      fee: '₦0.00',
      dateTime: '2026-01-05 10:30am',
    },
    {
      txId: 'TX-9A21F',
      category: 'outgoing',
      type: 'Gift Card + Cash',
      destination: 'NGN Wallet',
      destinationSub: '(www.amazon.com)',
      amount: '₦1,000.00',
      status: 'processing',
      fee: '₦0.00',
      dateTime: '28 Dec, 10:42am',
    },
    {
      txId: 'TX-9A21F',
      category: 'outgoing',
      type: 'Gift Card + Cash',
      destination: 'Bank Transfer',
      destinationSub: '(ng***4562)',
      amount: '₦1,200.00',
      status: 'processing',
      fee: '₦0.00',
      dateTime: '28 Dec, 10:42am',
    },
  ],
  USD: [
    {
      txId: 'TX-9A21F',
      category: 'outgoing',
      type: 'Internal Transfer',
      destination: 'USD Wallet',
      destinationSub: '(us***ala)',
      amount: '$450,000',
      status: 'completed',
      fee: '$0.00',
      dateTime: '2025-01-06 10:30am',
    },
    {
      txId: 'TX-9A21F',
      category: 'outgoing',
      type: 'Gift Card + Cash',
      destination: 'Amazon',
      destinationSub: '(www.amazon.com)',
      amount: '$1,200.00',
      status: 'processing',
      fee: '$0.00',
      dateTime: '28 Dec, 10:42am',
    },
    {
      txId: 'TX-9A21F',
      category: 'outgoing',
      type: 'Internal Transfer',
      destination: 'USD Wallet',
      destinationSub: '(us***ala)',
      amount: '$450,000',
      status: 'completed',
      fee: '$0.00',
      dateTime: '2025-01-06 10:30am',
    },
    {
      txId: 'TX-9A21F',
      category: 'outgoing',
      type: 'Gift Card + Cash',
      destination: 'Amazon',
      destinationSub: '(www.amazon.com)',
      amount: '$1,200.00',
      status: 'processing',
      fee: '$0.00',
      dateTime: '28 Dec, 10:42am',
    },
    {
      txId: 'TX-9A21F',
      category: 'income',
      type: 'Top-up',
      destination: 'Bank Transfer',
      destinationSub: '(us***4562)',
      amount: '$1,200.00',
      status: 'on-going',
      fee: '$0.00',
      dateTime: '2026-01-06 10:30am',
    },
    {
      txId: 'TX-9A21F',
      category: 'income',
      type: 'Top-up',
      destination: 'Bank Transfer',
      destinationSub: '(us***4562)',
      amount: '$1,200.00',
      status: 'on-going',
      fee: '$0.00',
      dateTime: '2026-01-06 10:30am',
    },
    {
      txId: 'TX-9A21F',
      category: 'outgoing',
      type: 'Gift Card + Cash',
      destination: 'USD Wallet',
      destinationSub: '(www.amazon.com)',
      amount: '$1,000.00',
      status: 'processing',
      fee: '$0.00',
      dateTime: '28 Dec, 10:42am',
    },
    {
      txId: 'TX-9A21F',
      category: 'outgoing',
      type: 'Gift Card + Cash',
      destination: 'Bank Transfer',
      destinationSub: '(us***4562)',
      amount: '$1,200.00',
      status: 'processing',
      fee: '$0.00',
      dateTime: '28 Dec, 10:42am',
    },
  ],
  YAN: [
    {
      txId: 'TX-9A21F',
      category: 'outgoing',
      type: 'Internal Transfer',
      destination: 'YAN Wallet',
      destinationSub: '(yan***ala)',
      amount: '¥450,000',
      status: 'completed',
      fee: '¥0.00',
      dateTime: '2025-01-05 10:30am',
    },
    {
      txId: 'TX-9A21F',
      category: 'outgoing',
      type: 'Gift Card + Cash',
      destination: 'YAN Wallet',
      destinationSub: '(www.amazon.com)',
      amount: '¥1,200.00',
      status: 'processing',
      fee: '¥0.00',
      dateTime: '28 Dec, 10:42am',
    },
    {
      txId: 'TX-9A21F',
      category: 'outgoing',
      type: 'Internal Transfer',
      destination: 'YAN Wallet',
      destinationSub: '(yan***ala)',
      amount: '¥450,000',
      status: 'completed',
      fee: '¥0.00',
      dateTime: '2025-01-05 10:30am',
    },
    {
      txId: 'TX-9A21F',
      category: 'outgoing',
      type: 'Gift Card + Cash',
      destination: 'Amazon',
      destinationSub: '(www.amazon.com)',
      amount: '¥1,200.00',
      status: 'processing',
      fee: '¥0.00',
      dateTime: '28 Dec, 10:42am',
    },
    {
      txId: 'TX-9A21F',
      category: 'income',
      type: 'Top-up',
      destination: 'Bank Transfer',
      destinationSub: '(yan***4562)',
      amount: '¥1,200.00',
      status: 'on-going',
      fee: '¥0.00',
      dateTime: '2026-01-05 10:30am',
    },
    {
      txId: 'TX-9A21F',
      category: 'income',
      type: 'Top-up',
      destination: 'Bank Transfer',
      destinationSub: '(yan***4562)',
      amount: '¥1,200.00',
      status: 'on-going',
      fee: '¥0.00',
      dateTime: '2026-01-05 10:30am',
    },
    {
      txId: 'TX-9A21F',
      category: 'outgoing',
      type: 'Payment to supplier',
      destination: 'YAN Wallet',
      destinationSub: '(yan***ala)',
      amount: '¥1,200.00',
      status: 'processing',
      fee: '¥0.00',
      dateTime: '28 Dec, 10:42am',
    },
    {
      txId: 'TX-9A21F',
      category: 'outgoing',
      type: 'Gift Card + Cash',
      destination: 'YAN Wallet',
      destinationSub: '(www.amazon.com)',
      amount: '¥1,000.00',
      status: 'processing',
      fee: '¥0.00',
      dateTime: '28 Dec, 10:42am',
    },
  ],
};

// Mock user data
const mockUsers: Record<string, { name: string; email: string }> = {
  'CHG-001': { name: 'Olalekan', email: 'olalekan@example.com' },
  'CHG-002': { name: 'O. Olalekan', email: 'john.doe@example.com' },
  'CHG-005': { name: 'Michael Chen', email: 'michael.chen@example.com' },
};

// ---------- Helper components ----------

function StatusBadge({ status }: { status: TransactionStatus }) {
  const styles: Record<TransactionStatus, string> = {
    completed: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    processing: 'bg-orange-100 text-orange-700 border-orange-200',
    'on-going': 'bg-blue-100 text-blue-700 border-blue-200',
  };

  return (
    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold border ${styles[status]}`}>
      {status === 'completed' ? 'Completed' : status === 'processing' ? 'Processing' : 'On Going'}
    </span>
  );
}

function getAmountColor(walletType: WalletType, category: TransactionCategory) {
  if (category === 'income') return 'text-emerald-600';
  // Outgoing amounts match wallet currency color
  if (walletType === 'NGN') return 'text-red-600';
  if (walletType === 'USD') return 'text-emerald-600';
  return 'text-red-600'; // YAN
}

// ---------- Page Component ----------

export default function UserTransactionsPage({
  params,
}: {
  params: Promise<{ userId: string; walletType: string }>;
}) {
  const { userId, walletType } = use(params);
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('All Types');
  const [filterStatus, setFilterStatus] = useState('All Status');

  if (!isAuthenticated) {
    router.push(AUTH_ROUTES.LOGIN);
    return null;
  }

  const walletTypeUpper = walletType.toUpperCase() as WalletType;
  const transactions = mockTransactions[walletTypeUpper] || [];
  const user = mockUsers[userId] || { name: 'Unknown User', email: 'user@example.com' };
  const currencyName = walletTypeUpper;

  return (
    <div className="flex h-screen bg-gray-50 font-['DM_Sans']">
      <Sidebar />

      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          
          {/* Header */}
          <div className="bg-white border-b border-gray-200 px-8 py-6">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => router.push(`/dashboard/users/${userId}`)}
                className="flex items-center gap-2 text-gray-700 hover:text-gray-900 transition-colors"
              >
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-800 text-white">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                  </svg>
                </span>
                <span className="text-sm font-semibold">Back to User profile</span>
              </button>

              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-sm font-bold">
                  {user.name.split(' ').map(w => w[0]).join('').toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">{user.name}</p>
                  <p className="text-xs text-gray-500">{user.email}</p>
                </div>
                <div className="flex gap-2 ml-4">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                    </svg>
                    Active
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    Verified
                  </span>
                </div>
              </div>
            </div>

            <h2 className="text-xl font-bold text-gray-900 mb-1">
              All {currencyName} Wallet Transactions
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Complete transaction history for this user's {currencyName} wallet
            </p>

            {/* Search and filters */}
            <div className="flex items-center gap-3">
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
                  placeholder="Search by name, wallet ID or transaction ID..."
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              >
                <option>All Types</option>
                <option>Internal Transfer</option>
                <option>Gift Card + Cash</option>
                <option>Top-up</option>
                <option>Bank Transfer</option>
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              >
                <option>All Status</option>
                <option>Completed</option>
                <option>Processing</option>
                <option>On Going</option>
              </select>

              <button className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-500 text-white rounded-xl text-sm font-semibold hover:bg-emerald-600 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Export
              </button>
            </div>
          </div>

          {/* Transaction Table */}
          <div className="p-8">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-sm font-bold text-gray-900">All Transactions</h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      {['Txn. ID', 'Category', 'Type', 'Destination', 'Amount', 'Status', 'Fee', 'Date/time', 'Action'].map((header) => (
                        <th
                          key={header}
                          className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap"
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {transactions.map((tx, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">{tx.txId}</td>
                        <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap capitalize">{tx.category}</td>
                        <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">{tx.type}</td>
                        <td className="px-6 py-4">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{tx.destination}</p>
                            {tx.destinationSub && (
                              <p className="text-xs text-gray-400">{tx.destinationSub}</p>
                            )}
                          </div>
                        </td>
                        <td className={`px-6 py-4 text-sm font-bold whitespace-nowrap ${getAmountColor(walletTypeUpper, tx.category)}`}>
                          {tx.category === 'income' ? '+' : ''}{tx.amount}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <StatusBadge status={tx.status} />
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">{tx.fee}</td>
                        <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">{tx.dateTime}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button className="text-sm text-emerald-600 hover:text-emerald-700 font-medium">
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}