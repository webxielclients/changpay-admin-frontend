'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { AUTH_ROUTES } from '@/constants/auth';
import Sidebar from '@/components/Sidebar';

type AccountStatus = 'Active' | 'Frozen';
type KYCStatus = 'Verified' | 'Pending' | 'Rejected';

interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  accountStatus: AccountStatus;
  kycStatus: KYCStatus;
  usdBalance: string;
  ngnBalance: string;
  yanBalance: string;
  lastLogin: string;
  lastLoginRelative: string;
}

const users: User[] = [
  { id: 'CHG-001', name: 'James Smith', email: 'john.doe@example.com', avatar: 'JS', accountStatus: 'Active',  kycStatus: 'Verified',  usdBalance: '$15,420.5',  ngnBalance: '₦15,420.5', yanBalance: '¥15,420.5', lastLogin: '2026-01-05 10:30am', lastLoginRelative: '2 mins ago' },
  { id: 'CHG-002', name: 'James Smith', email: 'john.doe@example.com', avatar: 'JS', accountStatus: 'Frozen',  kycStatus: 'Pending',   usdBalance: '$15,420.5',  ngnBalance: '₦15,420.5', yanBalance: '¥15,420.5', lastLogin: '2026-01-05 10:30am', lastLoginRelative: '3 hours ago' },
  { id: 'CHG-003', name: 'James Smith', email: 'john.doe@example.com', avatar: 'JS', accountStatus: 'Frozen',  kycStatus: 'Pending',   usdBalance: '$15,420.5',  ngnBalance: '₦15,420.5', yanBalance: '¥15,420.5', lastLogin: '2026-01-05 10:30am', lastLoginRelative: '2 mins ago' },
  { id: 'CHG-004', name: 'James Smith', email: 'john.doe@example.com', avatar: 'JS', accountStatus: 'Active',  kycStatus: 'Verified',  usdBalance: '$15,420.5',  ngnBalance: '₦15,420.5', yanBalance: '¥15,420.5', lastLogin: '2026-01-05 10:30am', lastLoginRelative: '2 mins ago' },
  { id: 'CHG-005', name: 'James Smith', email: 'john.doe@example.com', avatar: 'JS', accountStatus: 'Active',  kycStatus: 'Rejected',  usdBalance: '$15,420.5',  ngnBalance: '₦15,420.5', yanBalance: '¥15,420.5', lastLogin: '2026-01-05 10:30am', lastLoginRelative: '4 days ago' },
  { id: 'CHG-006', name: 'James Smith', email: 'john.doe@example.com', avatar: 'JS', accountStatus: 'Active',  kycStatus: 'Verified',  usdBalance: '$15,420.5',  ngnBalance: '₦15,420.5', yanBalance: '¥15,420.5', lastLogin: '2026-01-05 10:30am', lastLoginRelative: '10 months ago' },
  { id: 'CHG-007', name: 'James Smith', email: 'john.doe@example.com', avatar: 'JS', accountStatus: 'Active',  kycStatus: 'Rejected',  usdBalance: '$15,420.5',  ngnBalance: '₦15,420.5', yanBalance: '¥15,420.5', lastLogin: '2026-01-05 10:30am', lastLoginRelative: '2 mins ago' },
  { id: 'CHG-008', name: 'James Smith', email: 'john.doe@example.com', avatar: 'JS', accountStatus: 'Active',  kycStatus: 'Rejected',  usdBalance: '$15,420.5',  ngnBalance: '₦15,420.5', yanBalance: '¥15,420.5', lastLogin: '2026-01-05 10:30am', lastLoginRelative: '2 mins ago' },
];

// ---------- Badge components ----------

function AccountStatusBadge({ status }: { status: AccountStatus }) {
  if (status === 'Active') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
        </svg>
        Active
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200">
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 10.5a6 6 0 00-6 6v.75a2.25 2.25 0 002.25 2.25h11.25a2.25 2.25 0 002.25-2.25v-.75a6 6 0 00-6-6zm0 0V6.75A2.25 2.25 0 009.75 4.5h4.5A2.25 2.25 0 0116.5 6.75V10.5m-4.5 6H9m1.5-6H9m3 6h1.5m-1.5-6h1.5" />
      </svg>
      Frozen
    </span>
  );
}

function KYCStatusBadge({ status }: { status: KYCStatus }) {
  const map: Record<KYCStatus, { bg: string; text: string; border: string }> = {
    Verified:  { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200' },
    Pending:   { bg: 'bg-orange-100',  text: 'text-orange-700',  border: 'border-orange-200' },
    Rejected:  { bg: 'bg-red-100',     text: 'text-red-700',     border: 'border-red-200' },
  };
  const { bg, text, border } = map[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${bg} ${text} ${border}`}>
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m6 2.25a6 6 0 11-12 0 6 6 0 0112 0z" />
      </svg>
      {status}
    </span>
  );
}

// ---------- Page ----------

export default function UsersPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [currentPage, setCurrentPage] = useState(3);

  useEffect(() => {
    if (!isAuthenticated) router.push(AUTH_ROUTES.LOGIN);
  }, [isAuthenticated, router]);

  if (!isAuthenticated) return null;

  return (
    <div className="flex h-screen bg-gray-50 font-['DM_Sans']">
      <Sidebar />

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* -------- Header -------- */}
        <header className="bg-white border-b border-gray-200 px-8 py-5">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Users</h1>
              <p className="text-sm text-gray-500 mt-0.5">Inspect, control, and restrict user activity</p>
            </div>

            {/* Notifications + admin avatar */}
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

          {/* Search bar */}
          <div className="mt-4 max-w-xl relative">
            <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              type="text"
              placeholder="Search by name, wallet ID or transaction ID..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            />
          </div>
        </header>

        {/* -------- Body -------- */}
        <div className="flex-1 overflow-y-auto p-8">
          {/* Stats */}
          <div className="grid grid-cols-4 gap-5 mb-6">
            {[
              { label: 'Total Users', value: '188,000', color: 'text-gray-900' },
              { label: 'Active',      value: '6',       color: 'text-emerald-600' },
              { label: 'KYC Verified',value: '3',       color: 'text-emerald-600' },
              { label: 'KYC Pending', value: '2',       color: 'text-orange-500' },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-5">
                <p className="text-xs font-medium text-gray-500">{s.label}</p>
                <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    {['User','Status','KYC','USD Balance','NGN Balance','YAN Balance','Last Login','Action'].map((h) => (
                      <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                      {/* User */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {user.avatar}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{user.name}</p>
                            <p className="text-xs text-gray-400">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      {/* Status */}
                      <td className="px-5 py-4"><AccountStatusBadge status={user.accountStatus} /></td>
                      {/* KYC */}
                      <td className="px-5 py-4"><KYCStatusBadge status={user.kycStatus} /></td>
                      {/* USD */}
                      <td className="px-5 py-4 text-sm text-gray-900 whitespace-nowrap">🇺🇸 {user.usdBalance}</td>
                      {/* NGN */}
                      <td className="px-5 py-4 text-sm text-gray-900 whitespace-nowrap">🇳🇬 {user.ngnBalance}</td>
                      {/* YAN */}
                      <td className="px-5 py-4 text-sm text-gray-900 whitespace-nowrap">
                        <span className="inline-block w-4 h-4 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center mr-1 font-bold leading-none">¥</span>
                        {user.yanBalance}
                      </td>
                      {/* Last Login */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <p className="text-xs text-gray-900">{user.lastLogin}</p>
                        <p className="text-xs text-gray-400">{user.lastLoginRelative}</p>
                      </td>
                      {/* Action */}
                      <td className="px-5 py-4">
                        <button
                          onClick={() => router.push(`/dashboard/users/${user.id}`)}
                          className="text-sm text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1 whitespace-nowrap"
                        >
                          View Profile
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <p className="text-sm text-gray-500">Showing 1 to 8 of 500 results</p>
              <div className="flex items-center gap-1">
                {/* prev */}
                <button className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded-lg hover:bg-gray-50">
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                  </svg>
                </button>
                {[1,2,3,4,5].map((p) => (
                  <button
                    key={p}
                    onClick={() => setCurrentPage(p)}
                    className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                      currentPage === p ? 'bg-emerald-500 text-white' : 'border border-gray-300 text-gray-600 hover:bg-gray-50'
                    }`}
                  >{p}</button>
                ))}
                {/* next */}
                <button className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded-lg hover:bg-gray-50">
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}