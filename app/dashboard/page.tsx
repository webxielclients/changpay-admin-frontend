'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { dashboardApi } from '@/lib/api/client';
import type { DashboardOverviewData, ChartData, RecentTransaction } from '@/lib/api/client';
import Sidebar from '@/components/Sidebar';
import DashboardHeader from '@/components/DashboardHeader';
import Image from 'next/image';

type ChartInterval = 'daily' | 'weekly' | 'monthly' | 'yearly';

const FONT = { fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif", color: '#1A1D1F' };
const CELL_TEXT: React.CSSProperties = { fontWeight: 500, fontSize: '14.67px', lineHeight: '150%', letterSpacing: '0.02em', color: '#1A1D1F' };

/* ── Skeleton ── */
function Skeleton({ w = 'w-full', h = 'h-4' }: { w?: string; h?: string }) {
  return <div className={`animate-pulse bg-gray-100 rounded-md ${w} ${h}`} />;
}

/* ── Stat Card ── */
function StatCard({ label, value, subLabel, subTrend, subTrendValue, icon, loading }: {
  label: string; value: string; subLabel: string;
  subTrend?: 'up' | 'down'; subTrendValue?: string;
  icon: React.ReactNode; loading: boolean;
}) {
  const trend = subTrend ?? 'down';
  const trendValue = subTrendValue ?? '0';
  return (
    <div className="bg-[#F8F9FA] rounded-2xl p-5 flex flex-col gap-2 h-[130px]" style={FONT}>
      <p className="text-xs font-medium" style={{ color: '#6A7377' }}>{label}</p>
      {loading ? <Skeleton h="h-9" w="w-36" /> : (
        <div className="flex items-center gap-2">
          <span>{icon}</span>
          <p className="text-2xl font-bold" style={{ color: '#1A1D1F' }}>{value}</p>
        </div>
      )}
      {!loading && (
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-[11px]" style={{ color: '#6A7377' }}>{subLabel}</span>
          <span className={`flex items-center gap-0.5 text-[11px] font-semibold ${trend === 'up' ? 'text-emerald-500' : 'text-red-400'}`}>
            <Image src={trend === 'up' ? '/arrowup.png' : '/arrowdwn.png'} alt="" width={10} height={10} />
            {trendValue}
          </span>
        </div>
      )}
    </div>
  );
}

/* ── SVG Line Chart ── */
function smoothCurve(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return pts.length === 1 ? `M${pts[0].x},${pts[0].y}` : '';
  let d = `M${pts[0].x},${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const dx = (pts[i].x - pts[i - 1].x) * 0.4;
    d += ` C${pts[i-1].x + dx},${pts[i-1].y} ${pts[i].x - dx},${pts[i].y} ${pts[i].x},${pts[i].y}`;
  }
  return d;
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function formatPeriodLabel(period: number | string, interval: string): string {
  const s = String(period);
  if (interval === 'monthly') {
    const ym = s.match(/^\d{4}-(\d{1,2})$/);
    if (ym) return MONTHS[Number(ym[1]) - 1] ?? s;
    const n = Number(s);
    if (!isNaN(n) && n >= 1 && n <= 12) return MONTHS[n - 1];
    const d = new Date(s);
    return isNaN(d.getTime()) ? s : d.toLocaleDateString('en-US', { month: 'short' });
  }
  if (interval === 'daily') {
    const d = new Date(s);
    return isNaN(d.getTime()) ? s : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  if (interval === 'weekly') return `W${period}`;
  return s;
}

function TransactionChart({ data, loading }: { data: ChartData | null; loading: boolean }) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  if (loading) return <Skeleton h="h-56" />;
  if (!data || data.data.length === 0) {
    return <div className="h-56 flex items-center justify-center text-sm" style={{ color: '#6A7377' }}>No chart data available</div>;
  }

  const points = data.data;
  const volumes = points.map(p => Number(p.volume) || 0);
  const rawMax = Math.max(...volumes);
  const max = rawMax > 0 ? rawMax : 1;
  const W = 800; const H = 180; const padX = 0; const padY = 16;

  const coords = points.map((_, i) => ({
    x: padX + (i / Math.max(points.length - 1, 1)) * (W - padX * 2),
    y: padY + (1 - (volumes[i] / max)) * (H - padY * 2),
  }));

  const pathD = points.length > 1 ? smoothCurve(coords) : '';
  const areaD = coords.length > 1
    ? `${pathD} L${coords[coords.length - 1].x},${H} L${coords[0].x},${H} Z`
    : '';

  const formatY = (v: number) => `₦${Math.round(v).toLocaleString('en-US')}`;

  const yTicks = [max, max * 0.75, max * 0.5, max * 0.25, 0];
  const step = Math.max(1, Math.floor(points.length / 7));
  const xLabelIndices = Array.from(new Set([
    0,
    ...points.map((_, i) => i).filter(i => i % step === 0),
    points.length - 1,
  ]));

  const peakIdx = volumes.indexOf(rawMax);
  const peak    = rawMax > 0 ? coords[peakIdx] : null;
  const peakLabel = peak ? formatPeriodLabel(points[peakIdx].period, data.interval) : '';
  const peakPct = points[peakIdx]?.change_percent;

  const hover = hoverIdx != null ? coords[hoverIdx] : null;

  return (
    <div className="flex gap-3">
      {/* Y-axis labels */}
      <div className="flex flex-col justify-between text-[10px] py-1 text-right shrink-0" style={{ minWidth: 38, color: '#6A7377' }}>
        {yTicks.map((v, i) => <span key={i}>{formatY(v)}</span>)}
      </div>
      <div className="flex-1 select-none">
        <svg
          width="100%"
          viewBox={`0 0 ${W} ${H}`}
          style={{ display: 'block', height: 180 }}
          onMouseLeave={() => setHoverIdx(null)}
          onMouseMove={e => {
            const rect = e.currentTarget.getBoundingClientRect();
            const ratio = (e.clientX - rect.left) / rect.width;
            setHoverIdx(Math.max(0, Math.min(points.length - 1, Math.round(ratio * (points.length - 1)))));
          }}
        >
          <defs>
            <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#009F51" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#009F51" stopOpacity="0.01" />
            </linearGradient>
          </defs>
          {/* Grid lines */}
          {yTicks.map((_, i) => {
            const y = padY + (i / (yTicks.length - 1)) * (H - padY * 2);
            return <line key={i} x1={0} y1={y} x2={W} y2={y} stroke="#F0F0F0" strokeWidth="1" />;
          })}
          {/* Single-point dot when only 1 data point */}
          {points.length === 1 && (
            <circle cx={coords[0].x} cy={coords[0].y} r="5" fill="#009F51" />
          )}
          {/* Filled area */}
          {areaD && <path d={areaD} fill="url(#chartGrad)" />}
          {/* Line */}
          {pathD && <path d={pathD} fill="none" stroke="#009F51" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}
          {/* Peak marker */}
          {peak && points.length > 1 && (
            <>
              <line x1={peak.x} y1={padY} x2={peak.x} y2={H - padY} stroke="#009F51" strokeWidth="1" strokeDasharray="4 3" />
              <circle cx={peak.x} cy={peak.y} r="5" fill="#009F51" />
              <rect x={Math.min(Math.max(peak.x - 52, 4), W - 120)} y={peak.y - 50} width="116" height="38" rx="7" fill="#1A1D1F" />
              <text x={Math.min(Math.max(peak.x, 62), W - 62)} y={peak.y - 34} textAnchor="middle" fill="white" fontSize="9.5" fontWeight="600">{peakLabel}</text>
              <text x={Math.min(Math.max(peak.x, 62), W - 62)} y={peak.y - 19} textAnchor="middle" fill="#009F51" fontSize="9" fontWeight="700">
                {formatY(volumes[peakIdx])}{peakPct != null ? ` ${peakPct >= 0 ? '+' : ''}${peakPct.toFixed(1)}%` : ''}
              </text>
            </>
          )}
          {/* Hover dot */}
          {hover && hoverIdx != null && (
            <>
              <line x1={hover.x} y1={padY} x2={hover.x} y2={H - padY} stroke="#009F51" strokeWidth="1" strokeDasharray="3 3" strokeOpacity="0.5" />
              <circle cx={hover.x} cy={hover.y} r="4" fill="white" stroke="#009F51" strokeWidth="2" />
              <rect x={Math.min(Math.max(hover.x - 44, 4), W - 92)} y={hover.y - 46} width="88" height="34" rx="6" fill="white" style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.12))' }} />
              <text x={Math.min(Math.max(hover.x, 48), W - 48)} y={hover.y - 30} textAnchor="middle" fill="#6A7377" fontSize="8.5">{formatPeriodLabel(points[hoverIdx].period, data.interval)}</text>
              <text x={Math.min(Math.max(hover.x, 48), W - 48)} y={hover.y - 17} textAnchor="middle" fill="#009F51" fontSize="9" fontWeight="700">{formatY(volumes[hoverIdx])}</text>
            </>
          )}
        </svg>
        {/* X-axis labels */}
        <div className="flex justify-between text-[10px] mt-1 px-0" style={{ color: '#6A7377' }}>
          {xLabelIndices.map(i => (
            <span key={i}>{formatPeriodLabel(points[i].period, data.interval)}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Status Badge ── */
function StatusBadge({ status }: { status: string }) {
  const s = status?.toLowerCase().replace(/[\s_]+/g, '');
  const style: React.CSSProperties =
    s === 'completed' || s === 'success' ? { color: '#339D88', borderColor: '#339D88', backgroundColor: '#EFFEFA' } :
    s === 'failed'                       ? { color: '#FF756B', borderColor: '#FF756B', backgroundColor: '#FF756B1A' } :
    s === 'processing'                   ? { color: '#9E4300', borderColor: 'transparent', backgroundColor: '#FFD37933' } :
    s === 'ongoing' || s === 'on_going'  ? { color: '#2563EB', borderColor: '#2563EB', backgroundColor: '#ffffff' } :
    s === 'pending'                      ? { color: '#D97706', borderColor: '#D97706', backgroundColor: '#ffffff' } :
    { color: '#A8B0B5', borderColor: '#A8B0B5', backgroundColor: '#F8F9FA' };
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold capitalize border whitespace-nowrap" style={style}>
      {status}
    </span>
  );
}

/* ── Risk Badge ── */
function RiskBadge({ risk }: { risk?: string }) {
  const r = risk?.toLowerCase();
  if (!r || r === 'none') return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full border text-[11px] whitespace-nowrap" style={{ backgroundColor: '#F8F9FA', borderColor: '#A8B0B5', color: '#A8B0B5' }}>None</span>
  );
  const style: React.CSSProperties = r === 'high'
    ? { color: '#FF756B', borderColor: '#FF756B', backgroundColor: '#FF756B1A' }
    : { color: '#9E4300', borderColor: 'transparent', backgroundColor: '#FFD37933' };
  return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase border whitespace-nowrap" style={style}>{risk}</span>;
}

function fmtBalance(amount: number | undefined, symbol: string): string {
  if (amount == null) return '—';
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  if (abs >= 1_000_000_000) return `${sign}${symbol}${(abs / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `${sign}${symbol}${(abs / 1_000_000).toFixed(2)}M`;
  return `${sign}${symbol}${new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(abs)}`;
}

function fmtPct(pct: number | undefined): string {
  if (pct == null) return '';
  const abs = Math.abs(pct);
  const sign = pct >= 0 ? '+' : '-';
  if (abs >= 10_000) return `${sign}${(abs / 1000).toFixed(0)}K%`;
  return `${sign}${abs.toFixed(1)}%`;
}

function toTitleCase(name: string): string {
  return name.toLowerCase().replace(/(^|\s|-)\S/g, (c) => c.toUpperCase());
}

function fmtTxAmount(amount: number, currency: string): string {
  const symbol = currency === 'USD' ? '$' : currency === 'NGN' ? '₦' : currency === 'YAN' ? '¥' : '';
  const n = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(amount);
  return symbol ? `${symbol}${n}` : `${n} ${currency}`;
}

function exportToCSV(transactions: RecentTransaction[]) {
  const headers = ['Txn ID', 'Client Name', 'Changpay ID', 'Type', 'Channel/Asset', 'Amount', 'Currency', 'Status', 'Date/Time', 'Risk'];
  const rows = transactions.map(tx => [
    tx.id,
    tx.client.name ?? '',
    tx.client.changpayId ?? '',
    tx.type,
    tx.channel ?? '',
    tx.amount,
    tx.currency,
    tx.status,
    new Date(tx.dateTime).toLocaleString('en-US'),
    tx.risk ?? 'None',
  ]);
  const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `transactions-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click(); URL.revokeObjectURL(url);
}

const INTERVAL_OPTIONS: { key: ChartInterval; label: string }[] = [
  { key: 'daily',   label: 'Today' },
  { key: 'weekly',  label: 'This Week' },
  { key: 'monthly', label: 'This Month' },
  { key: 'yearly',  label: 'This Year' },
];

const PENDING_ACTIONS = [
  { label: 'KYC/KYB approvals',   key: 'kyc_approvals',        icon: '/kyc.svg',     href: '/dashboard/kyc-verification?status=pending' },
  { label: 'Failed payouts',       key: 'failed_payouts',       icon: '/failed.svg',  href: '/dashboard/banks-payouts?tab=payout&status=failed' },
  { label: 'Flagged transactions', key: 'flagged_transactions',  icon: '/flagged.svg', href: '/dashboard/transactions?risk=high' },
  { label: 'Disputes',             key: 'open_disputes',         icon: '/disputes.svg', href: '/dashboard/support?tab=disputes' },
] as const;

export default function DashboardHome() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();

  const [overview,        setOverview]        = useState<DashboardOverviewData | null>(null);
  const [chartData,       setChartData]       = useState<ChartData | null>(null);
  const [transactions,    setTransactions]    = useState<RecentTransaction[]>([]);
  const [searchQuery,     setSearchQuery]     = useState('');
  const [chartInterval,   setChartInterval]   = useState<ChartInterval>('monthly');
  const [filterOpen,      setFilterOpen]      = useState(false);
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [loadingChart,    setLoadingChart]    = useState(true);
  const [loadingTx,       setLoadingTx]       = useState(true);
  const [error,           setError]           = useState<string | null>(null);
  const filterRef = useRef<HTMLDivElement>(null);

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

  /* close filter dropdown on outside click */
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setFilterOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!isAuthenticated) return null;

  const selectedLabel = INTERVAL_OPTIONS.find(o => o.key === chartInterval)?.label ?? 'This Month';

  const q = searchQuery.trim().toLowerCase();
  const filteredTransactions = q
    ? transactions.filter(tx =>
        String(tx.id).toLowerCase().includes(q) ||
        (tx.client.name ?? '').toLowerCase().includes(q) ||
        (tx.client.changpayId ?? '').toLowerCase().includes(q)
      )
    : transactions;

  const totalVolume = chartData?.total_volume != null
    ? new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(chartData.total_volume)
    : '—';

  return (
    <div className="flex h-screen bg-white" style={FONT}>
      <Sidebar />

      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Header */}
        <div className="bg-white border-b border-gray-100 px-8 py-5 shrink-0">
          <DashboardHeader
            title={`Welcome Back, ${user?.first_name ?? user?.email?.split('@')[0] ?? 'Admin'} 👋`}
            subtitle="Here is your dashboard overview"
            large
          />
        </div>

        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-5 bg-white">
          {error && <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">{error}</div>}

          {/* ── Search + Filter + Export ── */}
          <div className="flex items-center gap-3 w-full">
            <div className="relative w-full max-w-md">
              <Image src="/Magnifer.png" alt="" width={15} height={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, wallet ID or transaction ID..."
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-[#F8F9FA] border border-gray-200 rounded-full text-gray-700 placeholder-[#A8B0B5] focus:outline-none focus:border-[#012D32] focus:ring-1 focus:ring-[#012D32]"
                style={FONT}
              />
            </div>

            {/* Today filter dropdown */}
            <div className="relative shrink-0 ml-auto" ref={filterRef}>
              <button
                onClick={() => setFilterOpen(p => !p)}
                className="flex items-center gap-1.5 px-5 py-2.5 text-sm font-medium text-gray-700 bg-[#F8F9FA] border border-gray-200 rounded-full hover:bg-gray-100 transition-colors whitespace-nowrap"
                style={FONT}
              >
                {selectedLabel}
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="m6 9 6 6 6-6"/>
                </svg>
              </button>
              {filterOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-40 bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-20">
                  {INTERVAL_OPTIONS.map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => { setChartInterval(key); fetchChart(key); setFilterOpen(false); }}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${chartInterval === key ? 'font-semibold text-[#009F51] bg-emerald-50' : 'text-gray-700 hover:bg-gray-50'}`}
                      style={FONT}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Export */}
            <button
              onClick={() => exportToCSV(transactions)}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-full transition-colors whitespace-nowrap shrink-0"
              style={{ ...FONT, backgroundColor: '#009F51', color: '#ffffff' }}
            >
              <Image src="/exportIcon.png" alt="" width={15} height={15} />
              Export
            </button>
          </div>

          {/* ── Stat cards ── */}
          <div className="grid grid-cols-4 gap-4">
            <StatCard label="Total users" value={String(overview?.users?.total ?? '—')}
              subLabel={`Verified Users`} subTrend={overview?.users?.change_direction}
              subTrendValue={fmtPct(overview?.users?.change_percent) || undefined}
              loading={loadingOverview}
              icon={<Image src="/icon(2).svg" alt="Users" width={34} height={34} />} />
            <StatCard label="YUAN Wallet Balance" value={fmtBalance(overview?.by_currency?.YAN?.total_balance, '¥')}
              subLabel={`Last month: ${fmtBalance(overview?.by_currency?.YAN?.last_period_balance, '¥')}`}
              subTrend={overview?.by_currency?.YAN?.change_direction}
              subTrendValue={fmtPct(overview?.by_currency?.YAN?.change_percent) || undefined}
              loading={loadingOverview}
              icon={<Image src="/china.svg" alt="YUAN" width={24} height={24} />} />
            <StatCard label="USD Wallet Balance" value={fmtBalance(overview?.by_currency?.USD?.total_balance, '$')}
              subLabel={`Last month: ${fmtBalance(overview?.by_currency?.USD?.last_period_balance, '$')}`}
              subTrend={overview?.by_currency?.USD?.change_direction}
              subTrendValue={fmtPct(overview?.by_currency?.USD?.change_percent) || undefined}
              loading={loadingOverview}
              icon={<Image src="/unitedstates.svg" alt="USD" width={24} height={24} />} />
            <StatCard label="NGN Wallet Balance" value={fmtBalance(overview?.by_currency?.NGN?.total_balance, '₦')}
              subLabel={`Last month: ${fmtBalance(overview?.by_currency?.NGN?.last_period_balance, '₦')}`}
              subTrend={overview?.by_currency?.NGN?.change_direction}
              subTrendValue={fmtPct(overview?.by_currency?.NGN?.change_percent) || undefined}
              loading={loadingOverview}
              icon={<Image src="/ngn.svg" alt="NGN" width={24} height={24} />} />
          </div>

          {/* ── Alert strip ── */}
          <div className="grid grid-cols-3 gap-4">
            <div className="flex items-center gap-3 bg-white rounded-2xl border border-gray-100 px-5 h-[100px]">
              <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: '#FFE6E7' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2">
                  <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              </div>
              <span className="text-sm font-medium flex-1" style={{ color: '#6A7377' }}>Failed Transactions</span>
              <span className="w-6 h-6 rounded-full text-[11px] font-bold flex items-center justify-center shrink-0" style={{ backgroundColor: '#FFE6E7', color: '#EF4444' }}>
                {overview?.alerts?.failed_transactions ?? 0}
              </span>
              <button
                onClick={() => router.push('/dashboard/transactions?status=failed')}
                className="px-4 py-1.5 text-xs font-semibold text-white rounded-xl shrink-0"
                style={{ backgroundColor: '#012D32' }}
              >View</button>
            </div>
            <div className="flex items-center gap-3 bg-white rounded-2xl border border-gray-100 px-5 h-[100px]">
              <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: '#FFE6E7' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2">
                  <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              </div>
              <span className="text-sm font-medium flex-1" style={{ color: '#6A7377' }}>Fraud Alerts</span>
              <span className="w-6 h-6 rounded-full text-[11px] font-bold flex items-center justify-center shrink-0" style={{ backgroundColor: '#FFE6E7', color: '#EF4444' }}>
                {overview?.alerts?.fraud_alerts ?? 0}
              </span>
              <div className="relative shrink-0">
                <button
                  disabled
                  title="Coming soon"
                  className="px-4 py-1.5 text-xs font-semibold text-white rounded-xl opacity-50 cursor-not-allowed"
                  style={{ backgroundColor: '#012D32' }}
                >View</button>
                <span
                  className="absolute -top-2 -right-2 px-1.5 py-0.5 text-[9px] font-bold text-white rounded-full whitespace-nowrap"
                  style={{ backgroundColor: '#EF4444' }}
                >
                  Soon
                </span>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 px-5 h-[100px] flex flex-col justify-center">
              <p className="text-sm font-semibold mb-2" style={{ color: '#1A1D1F' }}>FX exposure summary</p>
              <div className="flex items-center gap-4">
                {(['NGN','USD','YAN'] as const).map(cur => {
                  const val = overview?.fx_exposure_summary?.[cur];
                  const label = cur === 'YAN' ? 'YUAN' : cur;
                  return (
                    <span key={cur} className="text-xs" style={{ color: '#6A7377' }}>
                      <span className="font-medium">{label}:</span>{' '}
                      <span className="font-semibold" style={{ color: '#1A1D1F' }}>
                        {val ? val.charAt(0).toUpperCase() + val.slice(1) : '—'}
                      </span>
                    </span>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── Chart + Pending Actions ── */}
          <div className="grid grid-cols-12 gap-5">
            <div className="col-span-8 bg-white rounded-2xl border border-gray-100 p-6">
              <div className="mb-5">
                <p className="text-sm font-medium mb-1" style={{ color: '#6A7377' }}>Total transaction</p>
                {loadingChart ? <Skeleton h="h-9" w="w-44" /> : (
                  <p className="text-3xl font-bold" style={{ color: '#1A1D1F' }}>{totalVolume}</p>
                )}
              </div>
              <TransactionChart data={chartData} loading={loadingChart} />
            </div>

            <div className="col-span-4 bg-white rounded-2xl border border-gray-100 p-5">
              <h3 className="text-sm font-bold mb-1" style={FONT}>Pending Actions</h3>
              {loadingOverview ? (
                <div className="space-y-3 mt-4">{[...Array(4)].map((_, i) => <Skeleton key={i} h="h-14" />)}</div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {PENDING_ACTIONS.map(item => {
                    const isFlagged = item.key === 'flagged_transactions';
                    return (
                      <div
                        key={item.label}
                        onClick={isFlagged ? undefined : () => router.push(item.href)}
                        className={`flex items-center justify-between py-3.5 transition-opacity ${isFlagged ? '' : 'cursor-pointer hover:opacity-80'}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">
                            <Image src={item.icon} alt={item.label} width={22} height={22} className="object-contain" />
                          </div>
                          <div>
                            <p className="text-sm leading-tight" style={{ color: '#6A7377' }}>{item.label}</p>
                            <p className="text-[11px] font-medium mt-0.5" style={{ color: '#1A1D1F' }}>{(overview?.pending_actions as any)?.[item.key] ?? 0} activities</p>
                          </div>
                        </div>
                        {!isFlagged && (
                          <svg className="text-gray-400 shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="m9 18 6-6-6-6"/>
                          </svg>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ── Recent Transactions ── */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 style={{ ...FONT, color: '#1A1D1F', fontWeight: 600, fontSize: 20, lineHeight: '150%', letterSpacing: '-2%' }}>Recent Transactions</h3>
              <button
                onClick={() => router.push('/dashboard/transactions')}
                className="text-sm font-semibold underline"
                style={{ color: '#009F51' }}
              >
                View All
              </button>
            </div>

            {loadingTx ? (
              <div className="p-6 space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} h="h-14" />)}</div>
            ) : filteredTransactions.length === 0 ? (
              <div className="py-14 text-center text-sm text-gray-400">{q ? 'No transactions match your search' : 'No recent transactions'}</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm" style={FONT}>
                  <thead>
                    <tr style={{ backgroundColor: '#F6F8FA' }}>
                      {['Txn ID', 'Client Name', 'Type', 'Channel / Asset', 'Amount', 'Status', 'Date/time', 'Risk'].map(h => (
                        <th key={h} className="px-4 py-3 text-left whitespace-nowrap first:pl-6 last:pr-6 border-b border-gray-100"
                          style={{ color: '#6A7377', fontFamily: FONT.fontFamily, fontWeight: 400, fontSize: '14.67px', lineHeight: '150%', letterSpacing: '0.02em' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransactions.map((tx, idx) => (
                      <tr key={`${tx.id}-${tx.sourceType}-${tx.sourceId}`} className={`border-b border-gray-100 hover:bg-gray-50/60 transition-colors ${idx === filteredTransactions.length - 1 ? 'border-b-0' : ''}`}>
                        <td className="px-4 py-4 pl-6 whitespace-nowrap">
                          <span style={{ ...CELL_TEXT, fontWeight: 700 }}>{String(tx.id).slice(0, 10)}</span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2.5">
                            {tx.client.avatar ? (
                              <div className="w-8 h-8 rounded-full overflow-hidden shrink-0">
                                <img src={tx.client.avatar} alt={tx.client.name ?? ''} className="w-full h-full object-cover" />
                              </div>
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-emerald-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                                {(tx.client.name?.[0] ?? 'U').toUpperCase()}
                              </div>
                            )}
                            <div>
                              <p style={CELL_TEXT}>{tx.client.name ? toTitleCase(tx.client.name) : '—'}</p>
                              <p className="text-[11px] text-gray-400">{tx.client.changpayId ?? ''}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap capitalize" style={CELL_TEXT}>{tx.type}</td>
                        <td className="px-4 py-4 whitespace-nowrap max-w-[100px] truncate" style={CELL_TEXT}>{tx.channel || '—'}</td>
                        <td className="px-4 py-4 whitespace-nowrap" style={CELL_TEXT}>{fmtTxAmount(tx.amount, tx.currency)}</td>
                        <td className="px-4 py-4 whitespace-nowrap"><StatusBadge status={tx.status} /></td>
                        <td className="px-4 py-4 text-xs text-gray-500 whitespace-nowrap" style={{ color: '#1A1D1F' }}>
                          {new Date(tx.dateTime).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })}{' '}
                          {new Date(tx.dateTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase()}
                        </td>
                        <td className="px-4 py-4 pr-6 whitespace-nowrap"><RiskBadge risk={tx.risk} /></td>
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
