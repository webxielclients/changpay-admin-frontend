'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { dashboardApi } from '@/lib/api/client';
import type { DashboardOverviewData, ChartData, RecentTransaction } from '@/lib/api/client';
import Sidebar from '@/components/Sidebar';
import DashboardHeader from '@/components/DashboardHeader';
import Image from 'next/image';

type ChartInterval = 'daily' | 'weekly' | 'monthly' | 'yearly';

/* ── Skeleton ── */
function Skeleton({ w = 'w-full', h = 'h-4' }: { w?: string; h?: string }) {
  return <div className={`animate-pulse bg-gray-100 rounded-md ${w} ${h}`} />;
}

/* ── Stat Card ── */
function StatCard({
  label, value, subLabel, subTrend, icon, loading,
}: {
  label: string;
  value: string;
  subLabel: string;
  subTrend?: 'up' | 'down';
  icon: React.ReactNode;
  loading: boolean;
}) {
  return (
    <div className="bg-[#F9FAFB] rounded-2xl border border-gray-100 p-5 flex flex-col gap-2">
      <p className="text-xs font-medium text-gray-500">{label}</p>
      {loading ? (
        <Skeleton h="h-9" w="w-36" />
      ) : (
        <div className="flex items-center gap-2">
          <span className="text-gray-400">{icon}</span>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
      )}
      {!loading && (
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-[11px] text-gray-500">{subLabel}</span>
          {subTrend && (
            <span className={`flex items-center gap-0.5 text-[11px] font-semibold ${subTrend === 'up' ? 'text-emerald-500' : 'text-red-400'}`}>
              {subTrend === 'up' ? (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M5 1.5 L8.5 7H1.5Z" fill="currentColor"/></svg>
              ) : (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M5 8.5 L1.5 3H8.5Z" fill="currentColor"/></svg>
              )}
              +20%
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/* ── SVG Line Chart ── */
function TransactionChart({ data, loading }: { data: ChartData | null; loading: boolean }) {
  if (loading) return <Skeleton h="h-52" />;
  if (!data || data.data.length === 0) {
    return <div className="h-52 flex items-center justify-center text-sm text-gray-400">No chart data available</div>;
  }

  const points = data.data;
  const amounts = points.map(p => parseFloat(p.amount) || 0);
  const max = Math.max(...amounts, 1);
  const range = max || 1;
  const W = 900; const H = 200; const padY = 10;

  const coords = points.map((p, i) => ({
    x: (i / Math.max(points.length - 1, 1)) * W,
    y: H - padY - ((parseFloat(p.amount) || 0) / range) * (H - padY * 2),
  }));

  const pathD = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x},${c.y}`).join(' ');
  const areaD = `${pathD} L${coords[coords.length - 1].x},${H} L${coords[0].x},${H} Z`;

  const formatY = (v: number) => {
    if (v >= 1_000_000) return `₦${(v/1_000_000).toFixed(0)}M`;
    if (v >= 1000) return `₦${(v/1000).toFixed(0)}k`;
    return `₦${v}`;
  };
  const yTicks = [max, max * 0.75, max * 0.5, max * 0.25, 0];
  const step = Math.max(1, Math.floor(points.length / 6));
  const xLabels = points
    .filter((_, i) => i % step === 0 || i === points.length - 1)
    .map(p => new Date(p.created_at).toLocaleDateString('en-US', { month: 'short' }));

  const peakIdx = amounts.indexOf(Math.max(...amounts));
  const peak = coords[peakIdx];
  const peakDate = new Date(points[peakIdx]?.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div className="flex gap-4">
      <div className="flex flex-col justify-between text-[10px] text-gray-400 py-1 text-right shrink-0" style={{ minWidth: 40 }}>
        {yTicks.map((v, i) => <span key={i}>{formatY(v)}</span>)}
      </div>
      <div className="flex-1">
        <svg className="w-full" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ height: 200 }}>
          <defs>
            <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
            </linearGradient>
          </defs>
          {yTicks.map((_, i) => (
            <line key={i} x1={0} y1={(H / (yTicks.length - 1)) * i} x2={W} y2={(H / (yTicks.length - 1)) * i} stroke="#F3F4F6" strokeWidth="1" />
          ))}
          <path d={areaD} fill="url(#cg)" />
          <path d={pathD} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
          {peak && (
            <>
              <line x1={peak.x} y1={0} x2={peak.x} y2={H} stroke="#10b981" strokeWidth="1" strokeDasharray="3,3" />
              <circle cx={peak.x} cy={peak.y} r="5" fill="#10b981" />
              <rect x={peak.x - 50} y={peak.y - 44} width="100" height="36" rx="6" fill="#1C2B2D" />
              <text x={peak.x} y={peak.y - 28} textAnchor="middle" fill="white" fontSize="10" fontWeight="600">{peakDate}</text>
              <text x={peak.x} y={peak.y - 14} textAnchor="middle" fill="white" fontSize="9">{formatY(amounts[peakIdx])}</text>
            </>
          )}
        </svg>
        <div className="flex justify-between text-[10px] text-gray-400 mt-1">
          {xLabels.map((l, i) => <span key={i}>{l}</span>)}
        </div>
      </div>
    </div>
  );
}

/* ── Status Badge ── */
function StatusBadge({ status }: { status: string }) {
  const s = status?.toLowerCase().replace(/\s+/g, '');
  const cfg =
    s === 'completed' || s === 'success'    ? 'border-emerald-500 text-emerald-600' :
    s === 'ongoing' || s === 'on_going'     ? 'border-blue-500 text-blue-600' :
    s === 'pending'                          ? 'border-amber-500 text-amber-600' :
    s === 'failed'                           ? 'border-red-500 text-red-600' :
    s === 'processing'                       ? 'border-orange-400 text-orange-600' :
    'border-gray-300 text-gray-500';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold capitalize border bg-white whitespace-nowrap ${cfg}`}>
      {status}
    </span>
  );
}

/* ── Risk Badge ── */
function RiskBadge({ risk }: { risk?: string }) {
  const r = risk?.toLowerCase();
  if (!r || r === 'none') return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded border border-gray-300 text-[11px] text-gray-500 bg-white">None</span>
  );
  const cfg = r === 'high' ? 'bg-red-500 text-white border-red-500' : 'bg-amber-400 text-white border-amber-400';
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-[11px] font-bold uppercase border ${cfg}`}>{risk}</span>;
}

const PENDING_ACTIONS = [
  { label: 'KYC/KYB approvals',     key: 'kyc_approvals',       icon: '/kyc.svg' },
  { label: 'Failed payouts',         key: 'failed_payouts',      icon: '/failed.svg' },
  { label: 'Flagged transactions',   key: 'flagged_transactions', icon: '/flagged.svg' },
  { label: 'Disputes',               key: 'open_disputes',        icon: '/disputes.svg' },
] as const;

export default function DashboardHome() {
  const { isAuthenticated, user } = useAuthStore();

  const [overview,        setOverview]        = useState<DashboardOverviewData | null>(null);
  const [chartData,       setChartData]       = useState<ChartData | null>(null);
  const [transactions,    setTransactions]    = useState<RecentTransaction[]>([]);
  const [chartInterval,   setChartInterval]   = useState<ChartInterval>('yearly');
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [loadingChart,    setLoadingChart]    = useState(true);
  const [loadingTx,       setLoadingTx]       = useState(true);
  const [error,           setError]           = useState<string | null>(null);

  const fetchOverview = useCallback(async () => {
    try { setLoadingOverview(true); const r = await dashboardApi.getOverview(); if (r.status) setOverview(r.data); }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed to load overview'); }
    finally { setLoadingOverview(false); }
  }, []);

  const fetchChart = useCallback(async (interval: ChartInterval) => {
    try { setLoadingChart(true); const r = await dashboardApi.getChart({ interval }); if (r.status) setChartData(r.data); }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed to load chart'); }
    finally { setLoadingChart(false); }
  }, []);

  const fetchTransactions = useCallback(async () => {
    try { setLoadingTx(true); const r = await dashboardApi.getRecentTransactions(10); if (r.status) setTransactions(r.data ?? []); }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed to load transactions'); }
    finally { setLoadingTx(false); }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchOverview(); fetchChart(chartInterval); fetchTransactions();
  }, [isAuthenticated]);

  if (!isAuthenticated) return null;

  const greeting = `Welcome Back, ${user?.first_name ?? user?.email?.split('@')[0] ?? 'Admin'} 👋`;
  const verifiedLabel = 'Verified Users';
  const totalVolume = chartData?.total_volume != null
    ? new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(chartData.total_volume)
    : '—';

  const intervals: { key: ChartInterval; label: string }[] = [
    { key: 'daily',   label: 'Today' },
    { key: 'weekly',  label: 'Week' },
    { key: 'monthly', label: 'Month' },
    { key: 'yearly',  label: 'Year' },
  ];

  return (
    <div className="flex h-screen bg-white font-['DM_Sans']">
      <Sidebar />

      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Header */}
        <div className="bg-white border-b border-gray-100 px-8 py-5 flex-shrink-0">
          <DashboardHeader title={greeting} subtitle="Here is your dashboard overview" />
        </div>

        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-5 bg-white">
          {error && (
            <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">{error}</div>
          )}

          {/* ── Search + actions — full width ── */}
          <div className="flex items-center gap-3 w-full">
            {/* Search fills all remaining space */}
            <div className="flex-1 relative">
              <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                type="text"
                placeholder="Search by name, wallet ID or transaction ID..."
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-[#F9FAFB] border border-gray-200 rounded-xl text-gray-700 placeholder-gray-400 focus:outline-none focus:border-[#012D32] focus:ring-1 focus:ring-[#012D32]"
              />
            </div>

            {/* Today filter — fixed width */}
            <button className="flex items-center gap-1.5 px-5 py-2.5 text-sm font-medium text-gray-600 bg-[#F9FAFB] border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors whitespace-nowrap flex-shrink-0">
              Today
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="m6 9 6 6 6-6"/>
              </svg>
            </button>

            {/* Export — fixed width */}
            <button
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white rounded-xl transition-colors whitespace-nowrap flex-shrink-0"
              style={{ backgroundColor: '#009F51' }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Export
            </button>
          </div>

          {/* ── Stat cards ── */}
          <div className="grid grid-cols-4 gap-4">
            <StatCard
              label="Total users"
              value={loadingOverview ? '—' : (overview?.users?.total ?? '—')}
              subLabel={verifiedLabel}
              subTrend="up"
              loading={loadingOverview}
              icon={
              <Image src="/icon(2).svg" alt="Users" width={34} height={34} />
              }
            />
            <StatCard
              label="YUAN Wallet Balance"
              value="¥7,865"
              subLabel="Last month: ¥38,118"
              subTrend="down"
              loading={loadingOverview}
              icon={<Image src="/china.svg" alt="YUAN" width={24} height={24} />}
            />
            <StatCard
              label="USD Wallet Balance"
              value="$7,865"
              subLabel="Last month: $38,118"
              subTrend="down"
              loading={loadingOverview}
              icon={<Image src="/unitedstates.svg" alt="USD" width={24} height={24} />}
            />
            <StatCard
              label="NGN Wallet Balance"
              value="₦1.24B"
              subLabel="Last month: ₦38,118"
              subTrend="down"
              loading={loadingOverview}
              icon={<Image src="/ngn.svg" alt="NGN" width={24} height={24} />}
            />
          </div>

          {/* ── Alert strip ── */}
              <div className="grid grid-cols-3 gap-4">
            <div className="flex items-center gap-3 bg-[#F9FAFB] rounded-2xl border border-gray-100 px-5 py-4">
              <svg className="shrink-0 text-red-500" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <span className="text-sm font-medium text-gray-800 flex-1">Failed Transactions</span>
              <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                {overview?.alerts?.failed_transactions ?? 4}
              </span>
              <button className="px-3 py-1 text-xs font-semibold text-white rounded-xl shrink-0" style={{ backgroundColor: '#012D32' }}>View</button>
            </div>
            <div className="flex items-center gap-3 bg-[#F9FAFB] rounded-2xl border border-gray-100 px-5 py-4">
              <svg className="shrink-0 text-amber-500" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <span className="text-sm font-medium text-gray-800 flex-1">Fraud Alerts</span>
              <span className="w-5 h-5 rounded-full bg-amber-400 text-white text-[11px] font-bold flex items-center justify-center shrink-0">4</span>
              <button className="px-3 py-1 text-xs font-semibold text-white rounded-xl shrink-0" style={{ backgroundColor: '#012D32' }}>View</button>
            </div>
 
            {/* FX Exposure Summary */}
            <div className="bg-[#F9FAFB] rounded-2xl border border-gray-100 px-5 py-4 flex flex-col justify-center">
              <p className="text-sm font-semibold text-gray-800 mb-2">FX exposure summary</p>
              <div className="flex items-center gap-4">
                {([
                  { label: 'NGN', value: (overview as any)?.fx_exposure?.ngn ?? 'Short' },
                  { label: 'USD', value: (overview as any)?.fx_exposure?.usd ?? 'Long' },
                  { label: 'YUAN', value: (overview as any)?.fx_exposure?.yuan ?? 'Long' },
                ] as { label: string; value: string }[]).map(({ label, value }) => (
                  <span key={label} className="text-xs text-gray-500">
                    <span className="font-semibold text-gray-600">{label}:</span>{' '}
                    <span className={`font-semibold ${value === 'Long' ? 'text-emerald-600' : value === 'Short' ? 'text-red-500' : 'text-gray-600'}`}>
                      {value}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          </div>

        
          <div className="grid grid-cols-12 gap-5">
            {/* Chart — col 8 */}
            <div className="col-span-8 bg-[#F9FAFB] rounded-2xl border border-gray-100 p-6">
              <div className="flex items-start justify-between mb-5">
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Total transaction</p>
                  {loadingChart ? <Skeleton h="h-9" w="w-44" /> : <p className="text-3xl font-bold text-gray-900">{totalVolume}</p>}
                </div>
                <div className="flex items-center gap-1 bg-white border border-gray-100 rounded-xl p-1">
                  {intervals.map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => { setChartInterval(key); fetchChart(key); }}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${chartInterval === key ? 'text-white' : 'text-gray-500 hover:text-gray-700'}`}
                      style={chartInterval === key ? { backgroundColor: '#012D32' } : {}}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <TransactionChart data={chartData} loading={loadingChart} />
            </div>

            {/* Pending Actions — col 4 */}
            <div className="col-span-4 bg-[#F9FAFB] rounded-2xl border border-gray-100 p-5">
              <h3 className="text-sm font-bold text-gray-900 mb-1">Pending Actions</h3>
              {loadingOverview ? (
                <div className="space-y-3 mt-4">{[...Array(5)].map((_, i) => <Skeleton key={i} h="h-14" />)}</div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {PENDING_ACTIONS.map((item) => (
                    <div key={item.label} className="flex items-center justify-between py-3 cursor-pointer hover:opacity-80 transition-opacity">
                      <div className="flex items-center gap-3">
                        {/* Icon — replace files in /public/icons/ with your Figma exports */}
                        <div className="w-9 h-9 rounded-xl bg-white border border-gray-100 flex items-center justify-center shrink-0 overflow-hidden">
                          <Image
                            src={item.icon}
                            alt={item.label}
                            width={22}
                            height={22}
                            className="object-contain"
                          />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-800 leading-tight">{item.label}</p>
                          <p className="text-[11px] text-gray-400">
                            {(overview?.pending_actions as any)?.[item.key] ?? 0} activities
                          </p>
                        </div>
                      </div>
                      <svg className="text-gray-400 shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="m9 18 6-6-6-6"/>
                      </svg>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Recent Transactions ── */}
          <div className="bg-[#F9FAFB] rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-900">Recent Transactions</h3>
              <button className="text-xs font-semibold text-emerald-600 hover:text-emerald-700">See all</button>
            </div>

            {loadingTx ? (
              <div className="p-6 space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} h="h-14" />)}</div>
            ) : transactions.length === 0 ? (
              <div className="py-14 text-center text-sm text-gray-400">No recent transactions</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      {['Txn ID', 'Client Name', 'Type', 'Channel / Asset', 'Amount', 'Status', 'Date/time', 'Risk', 'Action'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap first:pl-6 last:pr-6">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {transactions.map((tx) => (
                      <tr key={tx.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-4 pl-6 text-sm font-medium text-gray-800 whitespace-nowrap">
                          {tx.reference?.slice(0, 8) ?? `TX-${tx.id}`}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-emerald-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                              {((tx as any).client_name?.[0] ?? (tx as any).user?.first_name?.[0] ?? 'U').toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900 leading-tight">
                                {(tx as any).client_name ?? ((tx as any).user ? `${(tx as any).user.first_name ?? ''} ${(tx as any).user.last_name ?? ''}`.trim() : '—')}
                              </p>
                              <p className="text-[11px] text-gray-400">{(tx as any).changpay_id ?? (tx as any).user?.changpay_id ?? ''}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-600 whitespace-nowrap capitalize">{tx.type}</td>
                        <td className="px-4 py-4 text-sm text-gray-600 whitespace-nowrap">{(tx as any).channel ?? tx.currency ?? '—'}</td>
                        <td className="px-4 py-4 text-sm font-semibold text-gray-900 whitespace-nowrap">{tx.amount}</td>
                        <td className="px-4 py-4 whitespace-nowrap"><StatusBadge status={tx.status} /></td>
                        <td className="px-4 py-4 text-xs text-gray-500 whitespace-nowrap">
                          {new Date(tx.created_at).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })},&nbsp;
                          {new Date(tx.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase()}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap"><RiskBadge risk={(tx as any).risk} /></td>
                        <td className="px-4 py-4 pr-6 whitespace-nowrap">
                          <button className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:underline">View</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}