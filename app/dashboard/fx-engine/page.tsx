'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';
import { fxApi } from '@/lib/api/client';
import type { ConversionRate, FxOverviewSummary, SpreadConfig, CryptoRateMarkup, ConversionTransaction } from '@/lib/api/client';
import DashboardHeader from '@/components/DashboardHeader';
import Sidebar from '@/components/Sidebar';
import Image from 'next/image';

const FONT = { fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif" };

// ─── Types ────────────────────────────────────────────────────────────────────
type MainTab = 'overview' | 'swap';
type SubTab  = 'live-rates' | 'spread' | 'rate-logs';
type SwapCurrency = 'USD' | 'NGN' | 'YAN';
type SwapPairFilter = 'all' | 'NGN-YAN' | 'USD-YAN' | 'USD-NGN' | 'NGN-USD' | 'YAN-USD' | 'YAN-NGN';

interface LatestChange {
  timestamp: string;
  action_type: string;
  admin_name: string;
  admin_id: string;
  source: string;
  reason?: string;
}

function fmtDate(s?: string | null) {
  if (!s) return '—';
  const d = new Date(s);
  return isNaN(d.getTime()) ? s : d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-100 rounded-lg ${className ?? ''}`} />;
}

// ─── Toggle ───────────────────────────────────────────────────────────────────
function Toggle({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
        enabled ? 'bg-[#009F51]' : 'bg-gray-300'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

// ─── Active badge ─────────────────────────────────────────────────────────────
function ActiveBadge({ isActive }: { isActive: boolean }) {
  return (
    <span className="inline-flex items-center justify-center text-xs font-semibold"
      style={isActive
        ? { backgroundColor: '#D9F5DB', color: '#047857', width: 43, height: 24, gap: 4, borderRadius: 4, paddingLeft: 4, paddingRight: 4 }
        : { backgroundColor: '#F3F4F6', color: '#6B7280', height: 24, gap: 4, borderRadius: 4, paddingLeft: 8, paddingRight: 8 }}>
      {isActive ? 'Active' : 'Inactive'}
    </span>
  );
}

// ─── Change badge ─────────────────────────────────────────────────────────────
function ChangeBadge({ value }: { value?: string }) {
  return (
    <span className="inline-flex items-center justify-center text-xs font-semibold text-[#009F51]"
      style={{ backgroundColor: '#D9F5DB', width: 66, height: 24, gap: 4, borderRadius: 4, paddingLeft: 4, paddingRight: 4 }}>
      <svg className="w-3 h-3 mr-0.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
      </svg>
      {value ?? '+20%'}
    </span>
  );
}

// ─── Conversion status badge ───────────────────────────────────────────────────
function ConversionStatusBadge({ status }: { status: string }) {
  const s = (status ?? '').toLowerCase();
  const map: Record<string, { bg: string; text: string }> = {
    completed: { bg: '#D9F5DB', text: '#047857' },
    success:   { bg: '#D9F5DB', text: '#047857' },
    pending:   { bg: '#FEF3C7', text: '#B45309' },
    processing:{ bg: '#FEF3C7', text: '#B45309' },
    failed:    { bg: '#FEE2E2', text: '#DC2626' },
  };
  const style = map[s] ?? { bg: '#F3F4F6', text: '#6B7280' };
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold capitalize" style={{ backgroundColor: style.bg, color: style.text }}>
      {status || '—'}
    </span>
  );
}

// ─── Currency pair cell (with right-arrow icon) ───────────────────────────────
function PairCell({ from, to }: { from: string; to: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-900">
      {from}
      <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
      </svg>
      {to}
    </span>
  );
}

// ─── Pair icon ────────────────────────────────────────────────────────────────
function PairIcon() {
  return (
    <div className="w-10 h-10 rounded-full bg-[#E1F7EB] flex items-center justify-center flex-shrink-0">
      <svg className="w-5 h-5 text-[#009F51]" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
      </svg>
    </div>
  );
}

// ─── Rate Card ────────────────────────────────────────────────────────────────
interface RateCardProps {
  rate: ConversionRate;
  overrideEnabled: boolean;
  onToggleOverride: (v: boolean) => void;
  onOpenOverride: () => void;
  hasActiveOverride: boolean;
  onRelease: () => void;
  releasingThis: boolean;
  onEditRate: () => void;
}

function RateCard({ rate, overrideEnabled, onToggleOverride, onOpenOverride, hasActiveOverride, onRelease, releasingThis, onEditRate }: RateCardProps) {
  return (
    <div className="bg-white rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-6 pb-4">
        <div className="flex items-center gap-3">
          <PairIcon />
          <div>
            <h3 className="text-xl font-bold text-gray-900">{rate.pair}</h3>
            <p className="text-sm text-gray-400">{(rate as any).source ?? `${rate.from_currency} → ${rate.to_currency}`}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ChangeBadge value={(rate as any).change} />
          <ActiveBadge isActive={rate.is_active} />
          {rate.is_manually_overridden && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border bg-amber-50 text-amber-700 border-amber-200">
              Overridden
            </span>
          )}
          <button
            onClick={onEditRate}
            title="Edit base rate"
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors flex-shrink-0"
          >
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
            </svg>
          </button>
        </div>
      </div>

      {/* Mid Rate */}
      <div className="mx-6 mb-4 bg-[#F8F9FA] rounded-xl px-5 py-4">
        <p className="text-xs text-gray-500 mb-1">Mid Rate</p>
        <p className="text-3xl font-bold text-gray-900">{(rate as any).mid_rate ?? rate.rate ?? '—'}</p>
      </div>

      {/* Buy / Sell */}
      <div className="grid grid-cols-2 gap-3 mx-6 mb-4">
        <div className="bg-[#F8F9FA] rounded-xl px-5 py-4">
          <p className="text-xs text-gray-500 mb-1">Buy Rate</p>
          <p className="text-2xl font-bold text-[#009F51]">{rate.buy_rate ?? (rate as any).buy_rate ?? '—'}</p>
        </div>
        <div className="bg-red-50 rounded-xl px-5 py-4">
          <p className="text-xs text-gray-500 mb-1">Sell Rate</p>
          <p className="text-2xl font-bold text-red-400">{rate.sell_rate ?? (rate as any).sell_rate ?? '—'}</p>
        </div>
      </div>

      {/* Spread / Volume */}
      <div className="flex items-center gap-6 mx-6 mb-4">
        <p className="text-sm text-gray-500">
          Spread <span className="font-bold text-gray-900">{(rate as any).spread ?? '—'}</span>
        </p>
        <p className="text-sm text-gray-500">
          24h Volume <span className="font-bold text-gray-900">{(rate as any).volume_24h ?? '—'}</span>
        </p>
      </div>

      {/* Manual Override */}
      <div className="flex items-center justify-between mx-6 mb-6 bg-[#F8F9FA] rounded-xl px-5 py-3.5">
        <div>
          <p className="text-sm font-semibold text-gray-900">Manual Override</p>
          <p className="text-xs text-gray-400">Override automatic rate updates</p>
        </div>
        <div className="flex items-center gap-3">
          {hasActiveOverride ? (
            <button
              onClick={onRelease}
              disabled={releasingThis}
              className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-xs font-semibold hover:bg-red-600 disabled:opacity-50 transition-colors"
            >
              {releasingThis ? 'Releasing…' : 'Release Override'}
            </button>
          ) : (
            <button
              onClick={onOpenOverride}
              className="px-3 py-1.5 text-white rounded-lg text-xs font-semibold transition-colors hover:opacity-90"
              style={{ backgroundColor: '#009F51' }}
            >
              Set Override
            </button>
          )}
          <Toggle enabled={overrideEnabled} onChange={onToggleOverride} />
        </div>
      </div>
    </div>
  );
}

// ─── Override Modal ────────────────────────────────────────────────────────────
function OverrideModal({ rate, onClose, onSuccess }: {
  rate: ConversionRate;
  onClose: () => void;
  onSuccess: (rateId: number) => void;
}) {
  const [buyRate,    setBuyRate]    = useState('');
  const [sellRate,   setSellRate]   = useState('');
  const [reason,     setReason]     = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [err,        setErr]        = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!buyRate || !sellRate || !reason.trim()) {
      setErr('All fields are required');
      return;
    }
    try {
      setSubmitting(true);
      setErr(null);
      const res = await fxApi.applyOverride({
        from_currency: rate.from_currency,
        to_currency: rate.to_currency,
        buy_rate: Number(buyRate),
        sell_rate: Number(sellRate),
        reason,
      });
      if (res?.status && res.data?.id != null) {
        onSuccess(res.data.id);
        onClose();
      } else {
        setErr(res?.message ?? 'Override failed');
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Override failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white w-full max-w-md h-full overflow-y-auto shadow-2xl p-8 flex flex-col">
        <button onClick={onClose} className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-full transition-colors">
          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <div className="mb-8">
          <h3 className="text-xl font-bold text-gray-900">Set Manual Override</h3>
          <p className="text-sm text-gray-500 mt-1">Currency Pair: <span className="font-semibold text-[#009F51]">{rate.pair}</span></p>
        </div>
        <div className="space-y-5 flex-1">
          {([
            { label: 'Buy Rate',  val: buyRate,  set: setBuyRate },
            { label: 'Sell Rate', val: sellRate, set: setSellRate },
          ] as { label: string; val: string; set: (v: string) => void }[]).map(({ label, val, set }) => (
            <div key={label}>
              <label className="block text-sm font-medium text-gray-900 mb-2">{label}</label>
              <input
                type="number"
                value={val}
                onChange={(e) => set(e.target.value)}
                placeholder="0.00"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#009F51]"
              />
            </div>
          ))}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">Reason for Override</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Provide reason..."
              rows={4}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#009F51]"
            />
          </div>
          {err && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{err}</p>
          )}
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <svg className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <p className="text-xs text-red-700">Manual overrides bypass automatic rate updates and will be logged in the audit trail.</p>
          </div>
        </div>
        <div className="mt-8 space-y-3">
          <button onClick={onClose} disabled={submitting} className="w-full px-6 py-3 border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50">Cancel</button>
          <button onClick={handleSubmit} disabled={submitting} className="w-full px-6 py-3 bg-[#009F51] text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-colors disabled:opacity-60">
            {submitting ? 'Applying…' : 'Apply Override'}
          </button>
        </div>
      </div>
    </div>
  );
}

function SetRateModal({ rate, onClose, onSuccess }: {
  rate?: ConversionRate;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const isEdit = !!rate;
  const [fromCurrency, setFromCurrency] = useState(rate?.from_currency ?? '');
  const [toCurrency,   setToCurrency]   = useState(rate?.to_currency ?? '');
  const [rateValue,    setRateValue]    = useState(rate?.rate ?? '');
  const [submitting,   setSubmitting]   = useState(false);
  const [err,          setErr]          = useState<string | null>(null);

  const handleSubmit = async () => {
    const from = fromCurrency.trim().toUpperCase();
    const to   = toCurrency.trim().toUpperCase();
    if (!from || !to || !rateValue) {
      setErr('All fields are required');
      return;
    }
    if (from.length !== 3 || to.length !== 3) {
      setErr('Currency codes must be exactly 3 characters (e.g. USD)');
      return;
    }
    if (Number(rateValue) <= 0 || Number.isNaN(Number(rateValue))) {
      setErr('Rate must be a positive number');
      return;
    }
    try {
      setSubmitting(true);
      setErr(null);
      const res = await fxApi.setConversionRate({
        from_currency: from,
        to_currency: to,
        rate: Number(rateValue),
      });
      if (res?.status) {
        onSuccess();
        onClose();
      } else {
        setErr(res?.message ?? 'Failed to save conversion rate');
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to save conversion rate');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white w-full max-w-md h-full overflow-y-auto shadow-2xl p-8 flex flex-col">
        <button onClick={onClose} className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-full transition-colors">
          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <div className="mb-8">
          <h3 className="text-xl font-bold text-gray-900">{isEdit ? 'Update Conversion Rate' : 'Add Conversion Pair'}</h3>
          <p className="text-sm text-gray-500 mt-1">
            {isEdit
              ? <>Currency Pair: <span className="font-semibold text-[#009F51]">{rate!.pair}</span></>
              : 'Set the base rate for a new or existing currency pair.'}
          </p>
        </div>
        <div className="space-y-5 flex-1">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">From Currency</label>
              <input
                type="text"
                value={fromCurrency}
                onChange={(e) => setFromCurrency(e.target.value.toUpperCase())}
                placeholder="USD"
                maxLength={3}
                disabled={isEdit}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm uppercase focus:outline-none focus:ring-2 focus:ring-[#009F51] disabled:bg-gray-50 disabled:text-gray-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">To Currency</label>
              <input
                type="text"
                value={toCurrency}
                onChange={(e) => setToCurrency(e.target.value.toUpperCase())}
                placeholder="NGN"
                maxLength={3}
                disabled={isEdit}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm uppercase focus:outline-none focus:ring-2 focus:ring-[#009F51] disabled:bg-gray-50 disabled:text-gray-400"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">Rate</label>
            <input
              type="number"
              value={rateValue}
              onChange={(e) => setRateValue(e.target.value)}
              placeholder="0.00"
              step="any"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#009F51]"
            />
            <p className="text-xs text-gray-400 mt-1.5">receiver_amount = sender_amount × rate</p>
          </div>
          {err && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{err}</p>
          )}
          {!isEdit && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="text-xs text-blue-700">If this currency pair already exists, its rate will be updated instead of creating a duplicate.</p>
            </div>
          )}
        </div>
        <div className="mt-8 space-y-3">
          <button onClick={onClose} disabled={submitting} className="w-full px-6 py-3 border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50">Cancel</button>
          <button onClick={handleSubmit} disabled={submitting} className="w-full px-6 py-3 bg-[#009F51] text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-colors disabled:opacity-60">
            {submitting ? 'Saving…' : isEdit ? 'Update Rate' : 'Save Rate'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Configure Spread Modal ───────────────────────────────────────────────────
function ConfigureSpreadModal({ spread, onClose }: { spread: SpreadConfig; onClose: () => void }) {
  const [baseSpread, setBaseSpread] = useState(String(spread.baseSpread));
  const [minSpread,  setMinSpread]  = useState(String(spread.minSpread));
  const [maxSpread,  setMaxSpread]  = useState(String(spread.maxSpread));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white w-full max-w-md h-full overflow-y-auto shadow-2xl p-8 flex flex-col">
        <button onClick={onClose} className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-full transition-colors">
          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <div className="mb-8">
          <h3 className="text-xl font-bold text-gray-900">Configure Spread</h3>
          <p className="text-sm text-gray-500 mt-1">Currency Pair: <span className="font-semibold text-[#009F51]">{spread.pair}</span></p>
        </div>
        <div className="space-y-5 flex-1">
          {([
            { label: 'Base Spread (%)',    val: baseSpread, set: setBaseSpread },
            { label: 'Minimum Spread (%)', val: minSpread,  set: setMinSpread },
            { label: 'Maximum Spread (%)', val: maxSpread,  set: setMaxSpread },
          ] as { label: string; val: string; set: (v: string) => void }[]).map(({ label, val, set }) => (
            <div key={label}>
              <label className="block text-sm font-medium text-gray-900 mb-2">{label}</label>
              <input
                type="number"
                value={val}
                onChange={(e) => set(e.target.value)}
                className="w-full px-4 py-3 border text-gray-900 border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#009F51]"
              />
            </div>
          ))}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-xs text-blue-700">Dynamic spread is calculated automatically based on market conditions and will be added to the base spread.</p>
          </div>
        </div>
        <div className="mt-8 space-y-3">
          <button onClick={onClose} className="w-full px-6 py-3 border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors">Cancel</button>
          <button onClick={onClose} className="w-full px-6 py-3 bg-[#009F51] text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-colors">Save Changes</button>
        </div>
      </div>
    </div>
  );
}

// ─── Table header helper ──────────────────────────────────────────────────────
function TableHead({ cols }: { cols: string[] }) {
  return (
    <thead>
      <tr className="bg-[#F8F9FA]">
        {cols.map((h, idx) => (
          <th
            key={h}
            className={`px-5 py-4 text-left text-xs font-semibold text-gray-500 whitespace-nowrap ${
              idx === 0 ? 'rounded-tl-xl' : ''
            } ${idx === cols.length - 1 ? 'rounded-tr-xl' : ''}`}
          >
            {h}
          </th>
        ))}
      </tr>
    </thead>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
//  PAGE
// ═════════════════════════════════════════════════════════════════════════════
export default function FXEnginePage() {
  const { isAuthenticated } = useAuthStore();

  const [mainTab,           setMainTab]           = useState<MainTab>('overview');
  const [subTab,            setSubTab]            = useState<SubTab>('live-rates');
  const [conversionRates,   setConversionRates]   = useState<ConversionRate[]>([]);
  const [summary,           setSummary]           = useState<FxOverviewSummary | null>(null);
  const [isLoading,         setIsLoading]         = useState(true);
  const [error,             setError]             = useState<string | null>(null);
  const [lastUpdated,       setLastUpdated]       = useState('');
  const [overrides,         setOverrides]         = useState<Record<string, boolean>>({});
  const [appliedOverrides,  setAppliedOverrides]  = useState<Record<string, number>>({});
  const [releasingOverride, setReleasingOverride] = useState<string | null>(null);
  const [overrideModal,     setOverrideModal]     = useState<ConversionRate | null>(null);
  const [rateModal,         setRateModal]         = useState<{ rate?: ConversionRate } | null>(null);
  const [spreads,           setSpreads]           = useState<SpreadConfig[] | null>(null);
  const [loadingSpreads,    setLoadingSpreads]    = useState(false);
  const [cryptoRates,       setCryptoRates]       = useState<CryptoRateMarkup[] | null>(null);
  const [loadingCryptoRates,setLoadingCryptoRates]= useState(false);
  const [latestChange]                            = useState<LatestChange | null>(null);
  const [configSpreadModal, setConfigSpreadModal] = useState<SpreadConfig | null>(null);
  const [conversions,        setConversions]        = useState<ConversionTransaction[]>([]);
  const [conversionsMeta,    setConversionsMeta]    = useState<{ total: number; last_page: number; from: number | null; to: number | null } | null>(null);
  const [loadingConversions, setLoadingConversions] = useState(false);
  const [conversionsPage,    setConversionsPage]    = useState(1);
  const [conversionsSearch,  setConversionsSearch]  = useState(''); // debounced — drives the actual fetch
  const [searchInput,        setSearchInput]        = useState(''); // immediate — what the input displays
  const [pairFilter,         setPairFilter]         = useState<SwapPairFilter>('all');
  const conversionsSearchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const conversionsFetchSeq = useRef(0);

  const fetchOverview = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fxApi.getOverview();
      if (res.status) {
        setConversionRates(res.data.conversion_rates ?? []);
        setSummary(res.data.summary ?? null);
        setLastUpdated(new Date().toLocaleTimeString());
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load FX data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchSpreads = useCallback(async () => {
    try {
      setLoadingSpreads(true);
      const res = await fxApi.getSpreads();
      setSpreads(res?.status ? (res.data ?? []) : []);
    } catch { setSpreads([]); } finally { setLoadingSpreads(false); }
  }, []);

  const fetchCryptoRates = useCallback(async () => {
    try {
      setLoadingCryptoRates(true);
      const res = await fxApi.getCryptoRateMarkups();
      setCryptoRates(res?.status ? (res.data ?? []) : []);
    } catch { setCryptoRates([]); } finally { setLoadingCryptoRates(false); }
  }, []);

  // Guards against out-of-order responses — without this, a slower response for an
  // earlier keystroke could arrive after a newer one and wipe out correct results
  // with an empty/stale set.
  const fetchConversions = useCallback(async (page: number, search: string, pair: SwapPairFilter) => {
    const seq = ++conversionsFetchSeq.current;
    try {
      setLoadingConversions(true);
      const [from, to] = pair === 'all' ? [undefined, undefined] : pair.split('-') as [SwapCurrency, SwapCurrency];
      const res = await fxApi.getConversions({
        page, per_page: 15,
        search: search || undefined,
        from_currency: from,
        to_currency: to,
      });
      if (seq !== conversionsFetchSeq.current) return; // superseded by a newer request
      if (res?.status && res.data) {
        setConversions(res.data.data ?? []);
        setConversionsMeta({ total: res.data.meta.total, last_page: res.data.meta.last_page, from: res.data.meta.from, to: res.data.meta.to });
      } else {
        setConversions([]);
        setConversionsMeta(null);
      }
    } catch {
      if (seq !== conversionsFetchSeq.current) return;
      setConversions([]);
      setConversionsMeta(null);
    } finally {
      if (seq === conversionsFetchSeq.current) setLoadingConversions(false);
    }
  }, []);

  const handleConversionsSearch = (val: string) => {
    setSearchInput(val);
    if (conversionsSearchTimeout.current) clearTimeout(conversionsSearchTimeout.current);
    conversionsSearchTimeout.current = setTimeout(() => {
      setConversionsPage(1);
      setConversionsSearch(val);
    }, 400);
  };

  const handleRelease = useCallback(async (pair: string) => {
    const rateId = appliedOverrides[pair];
    if (rateId == null) return;
    try {
      setReleasingOverride(pair);
      await fxApi.releaseOverride(rateId);
      setAppliedOverrides((prev) => { const n = { ...prev }; delete n[pair]; return n; });
      setOverrides((prev) => ({ ...prev, [pair]: false }));
    } catch { /* noop */ } finally { setReleasingOverride(null); }
  }, [appliedOverrides]);

  useEffect(() => { fetchOverview(); }, [fetchOverview]);

  useEffect(() => {
    if (mainTab === 'overview' && subTab === 'spread') fetchSpreads();
    if (mainTab === 'overview' && subTab === 'rate-logs') fetchCryptoRates();
  }, [mainTab, subTab, fetchSpreads, fetchCryptoRates]);

  useEffect(() => {
    if (mainTab === 'swap') fetchConversions(conversionsPage, conversionsSearch, pairFilter);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mainTab, conversionsPage, conversionsSearch, pairFilter]);

  if (!isAuthenticated) return null;

  const SUB_TABS: { id: SubTab; label: string }[] = [
    { id: 'live-rates', label: 'Live rates' },
    { id: 'spread',     label: 'Spread' },
    { id: 'rate-logs',  label: 'Rate Logs' },
  ];

  const activePairs = summary?.active_conversion_pairs ?? conversionRates.filter((r) => r.is_active).length;

  return (
    <div className="flex h-screen bg-white" style={FONT}>
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* ── Page header */}
        <div className="bg-white mb-3 border-gray-200 px-8 py-5 flex-shrink-0">
          <DashboardHeader
            title="FX Engine"
            subtitle="Real-time foreign exchange rate management and conversion engine"
            large
          />
        </div>

        <div className="w-full bg-white px-8 py-4 flex-shrink-0">
          <div className="flex items-stretch w-full gap-2">
            <button
              onClick={() => setMainTab('overview')}
              className="flex-1 flex items-center justify-center text-sm font-medium text-center transition-colors rounded-lg"
              style={mainTab === 'overview'
                ? { backgroundColor: '#009F51', color: '#E1F7EB', height: 48, gap: 8, padding: '12px 16px' }
                : { backgroundColor: '#F8F9FA', color: '#374151', height: 48, gap: 8, padding: '12px 16px' }}
            >
              Overview
            </button>
            <button
              onClick={() => setMainTab('swap')}
              className="flex-1 flex items-center justify-center text-sm font-medium text-center transition-colors rounded-lg"
              style={mainTab === 'swap'
                ? { backgroundColor: '#009F51', color: '#E1F7EB', height: 48, gap: 8, padding: '12px 16px' }
                : { backgroundColor: '#F8F9FA', color: '#374151', height: 48, gap: 8, padding: '12px 16px' }}
            >
              Swap
            </button>
          </div>
        </div>

        {mainTab === 'overview' && (
          <div className="w-full bg-white flex items-stretch flex-shrink-0 px-8 border-b border-gray-100">
            {SUB_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSubTab(tab.id)}
                className={`relative flex-1 py-4 text-sm font-medium text-center transition-colors whitespace-nowrap ${
                  subTab === tab.id ? 'text-[#009F51]' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
                {subTab === tab.id && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#009F51]" />
                )}
              </button>
            ))}
          </div>
        )}

        {/* ── Scrollable content */}
        <div className="flex-1 overflow-y-auto">

          {error && (
            <div className="mx-8 mt-4 p-3 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* ══════════════════ OVERVIEW ══════════════════ */}
          {mainTab === 'overview' && (
            <>
              {/* ── Live Rates */}
              {subTab === 'live-rates' && (
                <div className="p-8 space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-3">
                        <h2 className="text-lg font-bold text-gray-900 whitespace-nowrap">FX Rates</h2>
                        <Image src="/live.png" alt="LIVE" width={64} height={24} className="block" />
                      </div>
                      <p className="text-sm text-gray-400 whitespace-nowrap mt-1">Last updated: {lastUpdated || '—'}</p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <button
                        onClick={() => setRateModal({})}
                        className="flex items-center justify-center transition-colors whitespace-nowrap"
                        style={{ backgroundColor: '#F8F9FA', color: '#009F51', border: '1.5px solid #009F51', minWidth: 152, height: 56, gap: 8, borderRadius: 200, padding: 12, ...FONT, fontWeight: 600, fontSize: 18, lineHeight: '120%', letterSpacing: '-1%' }}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                        Add Pair
                      </button>
                      <button
                        onClick={fetchOverview}
                        disabled={isLoading}
                        className="flex items-center justify-center disabled:opacity-50 transition-colors whitespace-nowrap"
                        style={{ backgroundColor: '#009F51', color: '#E1F7EB', minWidth: 176, height: 56, gap: 8, borderRadius: 200, padding: 12, ...FONT, fontWeight: 600, fontSize: 20, lineHeight: '120%', letterSpacing: '-1%' }}
                      >
                        <svg className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                        </svg>
                        Refresh Now
                      </button>
                    </div>
                  </div>

                  {isLoading ? (
                    <div className="space-y-5">
                      {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-64 w-full" />)}
                    </div>
                  ) : conversionRates.length === 0 ? (
                    <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                      <p className="text-gray-400 text-sm">No conversion rates available.</p>
                    </div>
                  ) : (
                    <div style={{ backgroundColor: '#F8F9FA', borderRadius: 16, borderWidth: '1.05px', borderStyle: 'solid', borderColor: '#E1E4E6', paddingTop: 16, paddingBottom: 16, paddingLeft: 12, paddingRight: 12 }}>
                      <div className="space-y-5">
                        {conversionRates.map((rate, idx) => (
                          <RateCard
                            key={rate.id ?? idx}
                            rate={rate}
                            overrideEnabled={!!overrides[rate.pair]}
                            onToggleOverride={(val) => {
                              setOverrides((prev) => ({ ...prev, [rate.pair]: val }));
                              if (val && !appliedOverrides[rate.pair]) setOverrideModal(rate);
                            }}
                            onOpenOverride={() => setOverrideModal(rate)}
                            hasActiveOverride={appliedOverrides[rate.pair] != null}
                            onRelease={() => handleRelease(rate.pair)}
                            releasingThis={releasingOverride === rate.pair}
                            onEditRate={() => setRateModal({ rate })}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Rate Engine Status */}
                  {!isLoading && (
                    <div className="pt-2">
                      <h3 className="text-lg font-bold text-gray-900 mb-4">Rate Engine Status</h3>
                      <div className="grid grid-cols-4 gap-4">
                        <div className="bg-[#F5FCF7] rounded-xl p-5 border border-[#E1F7EB]">
                          <p className="text-xs text-gray-500 mb-2">Active Pairs</p>
                          <p className="text-3xl font-bold text-[#009F51]">{activePairs}</p>
                        </div>
                        <div className="bg-blue-50 rounded-xl p-5 border border-blue-100">
                          <p className="text-xs text-gray-500 mb-2">Avg Spread</p>
                          <p className="text-3xl font-bold text-blue-600">{(summary as any)?.avg_spread ?? '—'}</p>
                        </div>
                        <div className="bg-violet-50 rounded-xl p-5 border border-violet-100">
                          <p className="text-xs text-gray-500 mb-2">24h Volume</p>
                          <p className="text-3xl font-bold text-violet-600">{(summary as any)?.volume_24h ?? '—'}</p>
                        </div>
                        <div className="bg-amber-50 rounded-xl p-5 border border-amber-100">
                          <p className="text-xs text-gray-500 mb-2">Last Update</p>
                          <p className="text-2xl font-bold text-amber-600">{lastUpdated || '—'}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── Spread */}
              {subTab === 'spread' && (
                <div className="p-8 space-y-6">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Spread Configuration</h2>
                    <p className="text-sm text-gray-500 mt-0.5">Manage base and dynamic spreads for each currency pair</p>
                  </div>
                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <TableHead cols={['Currency Pair', 'Base Spread', 'Dynamic Spread', 'Total Spread', 'Min / Max', 'Status', 'Action']} />
                        <tbody className="divide-y divide-gray-50">
                          {loadingSpreads
                            ? [...Array(3)].map((_, i) => (
                                <tr key={i}>{[...Array(7)].map((_, j) => <td key={j} className="px-5 py-4"><Skeleton className="h-5 w-full" /></td>)}</tr>
                              ))
                            : !spreads || spreads.length === 0
                              ? <tr><td colSpan={7} className="px-5 py-12 text-center text-sm text-gray-400">No spread configuration available</td></tr>
                              : spreads.map((row) => (
                                  <tr key={row.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-5 py-4 text-sm font-semibold text-gray-900">{row.pair}</td>
                                    <td className="px-5 py-4 text-sm text-gray-700">{row.baseSpread}%</td>
                                    <td className="px-5 py-4 text-sm text-gray-700">{row.dynamicSpread}%</td>
                                    <td className="px-5 py-4 text-sm font-semibold text-gray-900">{row.totalSpread}%</td>
                                    <td className="px-5 py-4 text-sm text-gray-500">{row.minSpread}% – {row.maxSpread}%</td>
                                    <td className="px-5 py-4"><ActiveBadge isActive={row.isActive} /></td>
                                    <td className="px-5 py-4">
                                      <button
                                        onClick={() => setConfigSpreadModal(row)}
                                        className="text-sm font-semibold text-[#009F51] hover:text-[#009F51] transition-colors"
                                      >
                                        Configure
                                      </button>
                                    </td>
                                  </tr>
                                ))
                          }
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-6">
                    <h3 className="text-sm font-bold text-blue-900 mb-3">How Spreads Work</h3>
                    <div className="space-y-1.5 text-sm text-blue-900">
                      <p><span className="font-bold">Base Spread:</span> Fixed spread percentage applied to all transactions</p>
                      <p><span className="font-bold">Dynamic Spread:</span> Variable spread based on market volatility, liquidity, and volume</p>
                      <p><span className="font-bold">Total Spread:</span> Base + Dynamic = Final spread applied to conversions</p>
                      <p><span className="font-bold">Min/Max Limits:</span> Safeguards to prevent extreme spread values</p>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Rate Logs (crypto rate markups) */}
              {subTab === 'rate-logs' && (
                <div className="p-8 space-y-6">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Crypto Rate Markups</h2>
                    <p className="text-sm text-gray-500 mt-0.5">Current markup rates applied to crypto currency conversions</p>
                  </div>

                  {/* Summary stats from overview */}
                  <div className="grid grid-cols-4 gap-4">
                    {([
                      { label: 'Total Changes',    value: (summary as any)?.total_changes    ?? '—', color: 'text-gray-900' },
                      { label: 'Manual Overrides', value: (summary as any)?.manual_overrides ?? '—', color: 'text-gray-900' },
                      { label: 'Auto Updates',     value: (summary as any)?.auto_updates     ?? '—', color: 'text-[#009F51]' },
                      { label: 'Active Crypto',    value: summary?.active_crypto_rates       ?? '—', color: 'text-gray-900' },
                    ] as { label: string; value: string | number; color: string }[]).map((s) => (
                      <div key={s.label} className="rounded-xl p-5" style={{ backgroundColor: '#F8F9FA' }}>
                        <p className="text-xs text-gray-500 mb-2">{s.label}</p>
                        <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Crypto rates table */}
                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <TableHead cols={['Crypto Currency', 'Rate Markup (%)', 'Status', 'Last Updated']} />
                        <tbody className="divide-y divide-gray-50">
                          {loadingCryptoRates
                            ? [...Array(3)].map((_, i) => (
                                <tr key={i}>{[...Array(4)].map((_, j) => <td key={j} className="px-5 py-4"><Skeleton className="h-5 w-full" /></td>)}</tr>
                              ))
                            : !cryptoRates || cryptoRates.length === 0
                              ? <tr><td colSpan={4} className="px-5 py-12 text-center text-sm text-gray-400">No crypto rate data available</td></tr>
                              : cryptoRates.map((row) => (
                                  <tr key={row.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-5 py-4 text-sm font-semibold text-gray-900">{row.cryptoCurrency}</td>
                                    <td className="px-5 py-4 text-sm text-gray-700">{row.ratePercentage}%</td>
                                    <td className="px-5 py-4"><ActiveBadge isActive={row.isActive} /></td>
                                    <td className="px-5 py-4 text-xs text-gray-500 whitespace-nowrap">{fmtDate(row.updatedAt)}</td>
                                  </tr>
                                ))
                          }
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Latest Change Details — API data only */}
                  <div className="space-y-4">
                    <h3 className="text-base font-bold text-gray-900">Latest Change Details</h3>
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                      {latestChange ? (
                        <>
                          <div className="grid grid-cols-2 gap-6 px-6 py-5 border-b border-gray-100">
                            <div>
                              <p className="text-sm font-semibold text-gray-900 mb-1">Timestamp</p>
                              <p className="text-sm text-gray-600">{latestChange.timestamp}</p>
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-gray-900 mb-1">Action Type</p>
                              <p className="text-sm text-gray-600">{latestChange.action_type}</p>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-6 px-6 py-5">
                            <div>
                              <p className="text-sm font-semibold text-gray-900 mb-1">Admin</p>
                              <p className="text-sm text-gray-600">
                                {latestChange.admin_name}
                                {latestChange.admin_id && (
                                  <span className="text-gray-400"> (ID: {latestChange.admin_id})</span>
                                )}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-gray-900 mb-1">Source</p>
                              <p className="text-sm text-gray-600">{latestChange.source}</p>
                            </div>
                          </div>
                          {latestChange.reason && (
                            <div className="mx-6 mb-6 bg-violet-50 border border-violet-100 rounded-xl px-5 py-4">
                              <p className="text-sm font-semibold text-violet-700 mb-1">Reason</p>
                              <p className="text-sm text-gray-700">{latestChange.reason}</p>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="px-6 py-12 text-center text-sm text-gray-400">
                          No change history available
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ══════════════════ SWAP ══════════════════ */}
          {mainTab === 'swap' && (() => {
            const totalPages = conversionsMeta?.last_page ?? 1;
            const PAIR_FILTERS: { id: SwapPairFilter; label: React.ReactNode }[] = [
              { id: 'all',     label: 'All Pairs' },
              { id: 'NGN-YAN', label: <PairCell from="NGN" to="YUAN" /> },
              { id: 'USD-YAN', label: <PairCell from="USD" to="YUAN" /> },
              { id: 'USD-NGN', label: <PairCell from="USD" to="NGN" /> },
              { id: 'NGN-USD', label: <PairCell from="NGN" to="USD" /> },
              { id: 'YAN-USD', label: <PairCell from="YUAN" to="USD" /> },
              { id: 'YAN-NGN', label: <PairCell from="YUAN" to="NGN" /> },
            ];
            return (
              <div className="p-8 space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Currency Conversions</h2>
                  <p className="text-sm text-gray-500 mt-0.5">Inter-wallet currency conversion transactions across USD, NGN and YUAN</p>
                </div>

                {/* Pair filter chips */}
                <div className="flex items-center gap-2 flex-wrap">
                  {PAIR_FILTERS.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => { setPairFilter(f.id); setConversionsPage(1); }}
                      className="px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap"
                      style={pairFilter === f.id
                        ? { backgroundColor: '#009F51', color: '#ffffff' }
                        : { backgroundColor: '#F8F9FA', color: '#374151', border: '1px solid #E1E4E6' }}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                {/* Search */}
                <div className="flex items-center gap-3">
                  <div className="relative flex-1 max-w-sm">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                    </svg>
                    <input
                      type="text"
                      value={searchInput}
                      onChange={(e) => handleConversionsSearch(e.target.value)}
                      placeholder="Search by reference or user name/email..."
                      className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#009F51]"
                    />
                  </div>
                </div>

                {/* Conversions table */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <TableHead cols={['Reference', 'User', 'Pair', 'From', 'To', 'Rate', 'Status', 'Timestamp']} />
                      <tbody className="divide-y divide-gray-50">
                        {loadingConversions
                          ? [...Array(5)].map((_, i) => (
                              <tr key={i}>{[...Array(8)].map((_, j) => <td key={j} className="px-5 py-4"><Skeleton className="h-5 w-full" /></td>)}</tr>
                            ))
                          : conversions.length === 0
                            ? <tr><td colSpan={8} className="px-5 py-14 text-center text-sm text-gray-400">No conversion transactions found</td></tr>
                            : conversions.map((c) => {
                                const fullName = c.user ? `${c.user.firstName} ${c.user.lastName}`.trim() : '—';
                                const initials = c.user ? `${c.user.firstName?.[0] ?? ''}${c.user.lastName?.[0] ?? ''}`.toUpperCase() : '?';
                                return (
                                  <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-5 py-4 text-xs text-gray-500 font-mono">{String(c.reference ?? c.id).slice(0, 14)}</td>
                                    <td className="px-5 py-4">
                                      <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-[#E1F7EB] flex items-center justify-center text-xs font-bold text-[#009F51] flex-shrink-0">{initials}</div>
                                        <div>
                                          <p className="text-sm font-semibold text-gray-900">{fullName}</p>
                                          <p className="text-xs text-gray-400">{c.user?.changpayId ?? c.user?.email ?? '—'}</p>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="px-5 py-4"><PairCell from={c.fromCurrency} to={c.toCurrency} /></td>
                                    <td className="px-5 py-4 text-sm text-gray-900">{Number(c.fromAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })} <span className="text-xs text-gray-400">{c.fromCurrency}</span></td>
                                    <td className="px-5 py-4 text-sm font-semibold text-[#009F51]">{Number(c.toAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })} <span className="text-xs text-gray-400 font-normal">{c.toCurrency}</span></td>
                                    <td className="px-5 py-4 text-sm text-gray-700">{c.rate}</td>
                                    <td className="px-5 py-4"><ConversionStatusBadge status={c.status} /></td>
                                    <td className="px-5 py-4 text-xs text-gray-500 whitespace-nowrap">{fmtDate(c.createdAt)}</td>
                                  </tr>
                                );
                              })
                        }
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-500">{conversionsMeta?.from ?? '—'}–{conversionsMeta?.to ?? '—'} of {conversionsMeta?.total ?? '—'}</p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setConversionsPage((p) => Math.max(1, p - 1))}
                        disabled={conversionsPage <= 1 || loadingConversions}
                        className="px-4 py-2 text-sm border border-gray-200 rounded-lg bg-white hover:bg-gray-50 disabled:opacity-40 transition-colors"
                      >
                        Prev
                      </button>
                      <span className="text-sm text-gray-600 font-medium">{conversionsPage} / {totalPages}</span>
                      <button
                        onClick={() => setConversionsPage((p) => Math.min(totalPages, p + 1))}
                        disabled={conversionsPage >= totalPages || loadingConversions}
                        className="px-4 py-2 text-sm border border-gray-200 rounded-lg bg-white hover:bg-gray-50 disabled:opacity-40 transition-colors"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

        </div>
      </div>

      {/* Modals */}
      {overrideModal && (
        <OverrideModal
          rate={overrideModal}
          onClose={() => setOverrideModal(null)}
          onSuccess={(rateId) => {
            setAppliedOverrides((prev) => ({ ...prev, [overrideModal.pair]: rateId }));
            setOverrides((prev) => ({ ...prev, [overrideModal.pair]: true }));
          }}
        />
      )}
      {configSpreadModal && (
        <ConfigureSpreadModal spread={configSpreadModal} onClose={() => setConfigSpreadModal(null)} />
      )}
      {rateModal && (
        <SetRateModal
          rate={rateModal.rate}
          onClose={() => setRateModal(null)}
          onSuccess={() => { fetchOverview(); }}
        />
      )}
    </div>
  );
}