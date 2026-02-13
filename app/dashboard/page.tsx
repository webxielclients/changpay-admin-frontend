'use client';

import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { AUTH_ROUTES } from '@/constants/auth';
import Sidebar from '@/components/Sidebar';

export default function DashboardHome() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

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
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Welcome Back, Oola</h1>
                <p className="text-sm text-gray-500 mt-0.5">Here's your dashboard overview</p>
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
          </div>

          <div className="p-8">
            <div className="grid grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                    </svg>
                  </div>
                </div>
                <p className="text-xs text-gray-500 font-medium mb-1">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">132,420</p>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                    <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                    </svg>
                  </div>
                </div>
                <p className="text-xs text-gray-500 font-medium mb-1">Total Transactions</p>
                <p className="text-2xl font-bold text-red-600">17,665</p>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
                    </svg>
                  </div>
                </div>
                <p className="text-xs text-gray-500 font-medium mb-1">Total Withdrawal</p>
                <p className="text-2xl font-bold text-purple-600">$7,665</p>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                    <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                    </svg>
                  </div>
                </div>
                <p className="text-xs text-gray-500 font-medium mb-1">Total Referrals</p>
                <p className="text-2xl font-bold text-yellow-600">1,248</p>
              </div>
            </div>

            <div className="grid grid-cols-12 gap-6">
              <div className="col-span-8">
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <h3 className="text-base font-bold text-gray-900 mb-3">Total transaction</h3>
                      <p className="text-3xl font-bold text-gray-900 mb-2">N8,840,000,000</p>
                      <p className="text-sm text-gray-500">
                        Compared to <span className="text-emerald-600 font-medium">NGN: 9,620</span> Last Year
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                        Today
                      </button>
                      <button className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                        Week
                      </button>
                      <button className="px-4 py-2 text-sm font-medium bg-emerald-500 text-white rounded-lg">
                        Year
                      </button>
                    </div>
                  </div>

                  <div className="relative h-64">
                    <svg className="w-full h-full" viewBox="0 0 800 240" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" style={{ stopColor: '#10b981', stopOpacity: 0.2 }} />
                          <stop offset="100%" style={{ stopColor: '#10b981', stopOpacity: 0 }} />
                        </linearGradient>
                      </defs>

                      <line x1="0" y1="48" x2="800" y2="48" stroke="#f3f4f6" strokeWidth="1" />
                      <line x1="0" y1="96" x2="800" y2="96" stroke="#f3f4f6" strokeWidth="1" />
                      <line x1="0" y1="144" x2="800" y2="144" stroke="#f3f4f6" strokeWidth="1" />
                      <line x1="0" y1="192" x2="800" y2="192" stroke="#f3f4f6" strokeWidth="1" />

                      <path
                        d="M 0,180 L 66,170 L 133,145 L 200,130 L 267,110 L 333,95 L 400,75 L 467,65 L 533,50 L 600,40 L 667,30 L 733,20 L 800,15 L 800,240 L 0,240 Z"
                        fill="url(#areaGradient)"
                      />

                      <path
                        d="M 0,180 L 66,170 L 133,145 L 200,130 L 267,110 L 333,95 L 400,75 L 467,65 L 533,50 L 600,40 L 667,30 L 733,20 L 800,15"
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="2.5"
                      />
                    </svg>

                    <div className="flex justify-between mt-3 text-xs text-gray-500">
                      <span>Jan</span>
                      <span>Feb</span>
                      <span>Mar</span>
                      <span>Apr</span>
                      <span>May</span>
                      <span>Jun</span>
                      <span>Jul</span>
                      <span>Aug</span>
                      <span>Sep</span>
                      <span>Oct</span>
                      <span>Nov</span>
                      <span>Dec</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 mt-6 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                    <h3 className="text-base font-bold text-gray-900">Recent Transactions</h3>
                    <button className="text-sm text-emerald-600 hover:text-emerald-700 font-medium">
                      See all
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          {['Transaction ID', 'User Name', 'Transaction Type', 'Network', 'Amount', 'Status', 'Date', 'Charge', 'Action'].map((h) => (
                            <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {[
                          { id: 'TX-6417', user: 'James Smith', type: 'Airtime & Data', network: 'MTN', amount: 'NGN 5,000', status: 'Completed', date: '20th Oct 2023 at 11:00am', charge: '150' },
                          { id: 'TX-6418', user: 'James Smith', type: 'Digital Cable', network: 'DTV', amount: 'NGN 3,800', status: 'Completed', date: '20th Oct 2023 at 11:00am', charge: '120' },
                          { id: 'TX-6419', user: 'James Smith', type: 'Airtime & Data', network: 'Airtel', amount: 'NGN 2,000', status: 'Completed', date: '20th Oct 2023 at 11:00am', charge: '80' },
                          { id: 'TX-6420', user: 'James Smith', type: 'Airtime & Data', network: 'Glo', amount: 'NGN 1,500', status: 'Pending', date: '20th Oct 2023 at 11:00am', charge: '60' },
                          { id: 'TX-6421', user: 'James Smith', type: 'Digital Cable', network: '9mobile', amount: 'NGN 4,200', status: 'Completed', date: '20th Oct 2023 at 11:00am', charge: '130' },
                        ].map((tx) => (
                          <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">{tx.id}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold">
                                  JS
                                </div>
                                <span className="text-sm text-gray-900">{tx.user}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">{tx.type}</td>
                            <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">{tx.network}</td>
                            <td className="px-6 py-4 text-sm font-semibold text-gray-900 whitespace-nowrap">{tx.amount}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                                tx.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-yellow-100 text-yellow-700'
                              }`}>
                                {tx.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-xs text-gray-500 whitespace-nowrap">{tx.date}</td>
                            <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">{tx.charge}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <button className="text-gray-400 hover:text-gray-600">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
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

              <div className="col-span-4 space-y-6">
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h3 className="text-base font-bold text-gray-900 mb-5">Pending Actions</h3>
                  <div className="space-y-4">
                    {[
                      { type: 'Force Diagnosis', user: 'Yinka Fagbemi', date: '12/03/2023' },
                      { type: 'Wallet Funding', user: 'Yinka Fagbemi', date: '12/03/2023' },
                      { type: 'Wallet Funding', user: 'Yinka Fagbemi', date: '12/03/2023' },
                      { type: 'Wallet Funding', user: 'Yinka Fagbemi', date: '12/03/2023' },
                    ].map((action, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full mt-1.5 flex-shrink-0"></div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{action.type}</p>
                          <p className="text-xs text-gray-500">{action.user}</p>
                          <p className="text-xs text-gray-400">{action.date}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h3 className="text-base font-bold text-gray-900 mb-5">FX Account summary</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                      <span className="text-sm font-medium text-gray-600">Currency</span>
                      <span className="text-sm font-semibold text-gray-900">Payment</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Naira</span>
                      <span className="text-sm font-semibold text-gray-900">-</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Dollar</span>
                      <span className="text-sm font-semibold text-gray-900">-</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">Payment</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}