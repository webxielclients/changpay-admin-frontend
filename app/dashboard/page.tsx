'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { dashboardApi } from '@/lib/api/client';
import type {
  DashboardOverviewData,
  ChartData,
  RecentTransaction,
} from '@/lib/api/client';
import { AUTH_ROUTES } from '@/constants/auth';
import Sidebar from '@/components/Sidebar';
import DashboardHeader from '@/components/DashboardHeader';

type ChartInterval = 'daily' | 'weekly' | 'monthly' | 'yearly';

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-100 rounded-lg ${className}`} />;
}

function StatCard({
  label,
  value,
  color,
  icon,
  loading,
}: {
  label: string;
  value: string;
  color: string;
  icon: React.ReactNode;
  loading: boolean;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center mb-4`}>
        {icon}
      </div>
      <p className="text-xs text-gray-500 font-medium mb-1">{label}</p>
      {loading ? (
        <Skeleton className="h-8 w-24" />
      ) : (
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      )}
    </div>
  );
}

function LineChart({ data }: { data: ChartData | null }) {
  if (!data || data.data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-400 text-sm">
        No chart data available
      </div>
    );
  }

  const points = data.data;
  const amounts = points.map((p) => parseFloat(p.amount) || 0);
  const max = Math.max(...amounts, 1);
  const min = Math.min(...amounts, 0);
  const range = max - min || 1;
  const W = 800;
  const H = 220;
  const pad = 10;

  const coords = points.map((p, i) => ({
    x: pad + (i / Math.max(points.length - 1, 1)) * (W - pad * 2),
    y: H - pad - ((parseFloat(p.amount) || 0 - min) / range) * (H - pad * 2),
  }));

  const pathD = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x},${c.y}`).join(' ');
  const areaD = `${pathD} L ${coords[coords.length - 1].x},${H} L ${coords[0].x},${H} Z`;

  const step = Math.ceil(points.length / 12);
  const labels = points.filter((_, i) => i % step === 0 || i === points.length - 1);

  return (
    <div className="relative h-64">
      <svg className="w-full h-full" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style={{ stopColor: '#10b981', stopOpacity: 0.2 }} />
            <stop offset="100%" style={{ stopColor: '#10b981', stopOpacity: 0 }} />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75, 1].map((t) => (
          <line key={t} x1="0" y1={H * t} x2={W} y2={H * t} stroke="#f3f4f6" strokeWidth="1" />
        ))}
        <path d={areaD} fill="url(#areaGradient)" />
        <path d={pathD} fill="none" stroke="#10b981" strokeWidth="2.5" />
      </svg>
      <div className="flex justify-between mt-2 text-xs text-gray-400 px-1">
        {labels.map((p, i) => (
          <span key={i}>{new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
        ))}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const s = status?.toLowerCase();
  const styles =
    s === 'completed' || s === 'success'
      ? 'bg-emerald-100 text-emerald-700'
      : s === 'pending'
      ? 'bg-yellow-100 text-yellow-700'
      : s === 'failed'
      ? 'bg-red-100 text-red-700'
      : 'bg-gray-100 text-gray-600';
  return (
    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${styles}`}>
      {status}
    </span>
  );
}

export default function DashboardHome() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();

  const [overview, setOverview] = useState<DashboardOverviewData | null>(null);
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [transactions, setTransactions] = useState<RecentTransaction[]>([]);
  const [chartInterval, setChartInterval] = useState<ChartInterval>('yearly');

  const [loadingOverview, setLoadingOverview] = useState(true);
  const [loadingChart, setLoadingChart] = useState(true);
  const [loadingTx, setLoadingTx] = useState(true);
  const [error, setError] = useState<string | null>(null);


  const fetchOverview = useCallback(async () => {
    try {
      setLoadingOverview(true);
      const res = await dashboardApi.getOverview();
      if (res.status) setOverview(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load overview');
    } finally {
      setLoadingOverview(false);
    }
  }, []);

  const fetchChart = useCallback(async (interval: ChartInterval) => {
    try {
      setLoadingChart(true);
      const res = await dashboardApi.getChart({ interval });
      if (res.status) setChartData(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load chart');
    } finally {
      setLoadingChart(false);
    }
  }, []);

  const fetchTransactions = useCallback(async () => {
    try {
      setLoadingTx(true);
      const res = await dashboardApi.getRecentTransactions(10);
      if (res.status) setTransactions(res.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load transactions');
    } finally {
      setLoadingTx(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchOverview();
    fetchChart(chartInterval);
    fetchTransactions();
  }, [isAuthenticated]);

  const handleIntervalChange = (interval: ChartInterval) => {
    setChartInterval(interval);
    fetchChart(interval);
  };

  if (!isAuthenticated) return null;

  const displayName = `Hello, ${user?.first_name
    ? `${user.first_name} ${user.last_name ?? ''}`.trim()
    : user?.email ?? 'Admin'}`;

  return (
    <div className="flex h-screen bg-gray-50 font-['DM_Sans']">
      <Sidebar />

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-8 py-6">
        <DashboardHeader title={displayName} subtitle="Dashboard overview" />
        </div>
        <div className="flex-1 overflow-y-auto p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Stat cards */}
          <div className="grid grid-cols-4 gap-6 mb-8">
            <StatCard
              label="Total Users"
              value={overview?.users?.total ?? '—'}
              color="bg-blue-100"
              loading={loadingOverview}
              icon={<svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>}
            />
            <StatCard
              label="Active Users"
              value={overview?.users?.active ?? '—'}
              color="bg-emerald-100"
              loading={loadingOverview}
              icon={<svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            />
            <StatCard
              label="Failed Transactions"
              value={String(overview?.alerts?.failed_transactions ?? '—')}
              color="bg-red-100"
              loading={loadingOverview}
              icon={<svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" /></svg>}
            />
            <StatCard
              label="Open Disputes"
              value={String(overview?.pending_actions?.open_disputes ?? '—')}
              color="bg-yellow-100"
              loading={loadingOverview}
              icon={<svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>}
            />
          </div>

          <div className="grid grid-cols-12 gap-6">
            {/* Chart + Recent Transactions */}
            <div className="col-span-8 space-y-6">
              {/* Chart */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h3 className="text-base font-bold text-gray-900 mb-1">Total Transaction Volume</h3>
                    {loadingChart ? (
                      <Skeleton className="h-8 w-40 mb-2" />
                    ) : (
                      <>
                        <p className="text-3xl font-bold text-gray-900 mb-1">
                          {chartData?.total_volume != null
                            ? new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(chartData.total_volume)
                            : '—'}
                        </p>
                        <p className="text-sm text-gray-500">
                          {chartData?.total_count ? `${chartData.total_count} transactions` : ''}
                        </p>
                      </>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {(['daily', 'weekly', 'monthly', 'yearly'] as ChartInterval[]).map((i) => (
                      <button
                        key={i}
                        onClick={() => handleIntervalChange(i)}
                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors capitalize ${
                          chartInterval === i
                            ? 'bg-emerald-500 text-white'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        {i === 'daily' ? 'Today' : i === 'weekly' ? 'Week' : i === 'monthly' ? 'Month' : 'Year'}
                      </button>
                    ))}
                  </div>
                </div>
                {loadingChart ? (
                  <Skeleton className="h-64 w-full" />
                ) : (
                  <LineChart data={chartData} />
                )}
              </div>

              {/* Recent Transactions */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                  <h3 className="text-base font-bold text-gray-900">Recent Transactions</h3>
                  <button className="text-sm text-emerald-600 hover:text-emerald-700 font-medium">See all</button>
                </div>

                {loadingTx ? (
                  <div className="p-6 space-y-3">
                    {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                  </div>
                ) : transactions.length === 0 ? (
                  <div className="p-12 text-center text-gray-400 text-sm">No recent transactions</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          {['Reference', 'Type', 'Amount', 'Currency', 'Status', 'Date', 'Fee'].map((h) => (
                            <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {transactions.map((tx) => (
                          <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">{tx.reference}</td>
                            <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap capitalize">{tx.type}</td>
                            <td className="px-6 py-4 text-sm font-semibold text-gray-900 whitespace-nowrap">{tx.amount}</td>
                            <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">{tx.currency}</td>
                            <td className="px-6 py-4 whitespace-nowrap"><StatusBadge status={tx.status} /></td>
                            <td className="px-6 py-4 text-xs text-gray-500 whitespace-nowrap">
                              {new Date(tx.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">{tx.fee}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar cards */}
            <div className="col-span-4 space-y-6">
              {/* Pending Actions */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-base font-bold text-gray-900 mb-5">Pending Actions</h3>
                {loadingOverview ? (
                  <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
                ) : overview?.pending_actions ? (
                  <div className="space-y-4">
                    {[
                      { label: 'KYC Approvals', value: overview.pending_actions.kyc_approvals },
                      { label: 'Failed Payouts', value: String(overview.pending_actions.failed_payouts) },
                      { label: 'Flagged Transactions', value: String(overview.pending_actions.flagged_transactions) },
                      { label: 'Open Disputes', value: String(overview.pending_actions.open_disputes) },
                      { label: 'Open Tickets', value: String(overview.pending_actions.open_tickets) },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-emerald-500 rounded-full flex-shrink-0" />
                          <p className="text-sm font-medium text-gray-900">{item.label}</p>
                        </div>
                        <span className="text-sm font-bold text-gray-700">{item.value}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">No pending actions</p>
                )}
              </div>

              {/* New Users in Period */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-base font-bold text-gray-900 mb-4">User Growth</h3>
                {loadingOverview ? (
                  <Skeleton className="h-16 w-full" />
                ) : (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                      <span className="text-sm font-medium text-gray-600">Total Users</span>
                      <span className="text-sm font-bold text-gray-900">{overview?.users?.total ?? '—'}</span>
                    </div>
                    <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                      <span className="text-sm text-gray-600">Active Users</span>
                      <span className="text-sm font-bold text-emerald-600">{overview?.users?.active ?? '—'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">New This Period</span>
                      <span className="text-sm font-bold text-blue-600">{overview?.users?.new_in_period ?? '—'}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}