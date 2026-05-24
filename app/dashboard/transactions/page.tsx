'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';
import { transactionsApi } from '@/lib/api/client';
import type {
  Transaction, TransactionStats,
  SellCryptoTransaction, SellCryptoStats,
  PayToChinaTransaction, PayToChinaStats,
  ConversionStats,
} from '@/lib/api/client';
import Sidebar from '@/components/Sidebar';
import DashboardHeader from '@/components/DashboardHeader';

type TabType = 'overview' | 'conversions';
type ProductFilter = '' | 'crypto' | 'pay-china' | 'gift-card';

/* ── Helpers ── */
function fmtDT(s?: string | null) {
  if (!s) return '—';
  return new Date(s).toLocaleString('en-US', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).replace(',', '');
}
function fmtGMT(s?: string | null) {
  if (!s) return '—';
  return new Date(s).toUTCString().replace('GMT', 'GMT');
}
function dash(v: any) { return (v == null || v === '') ? '—' : String(v); }

/* ── STATUS BADGE — Figma outlined ── */
function StatusBadge({ status }: { status?: string }) {
  const s = (status ?? '').toLowerCase().replace(/[\s_-]+/g, '');
  const cfg =
    s === 'completed' || s === 'success' || s === 'paid'
      ? 'border-emerald-500 text-emerald-600' :
    s === 'confirming' || s === 'ongoing' || s === 'onging'
      ? 'border-blue-500 text-blue-600' :
    s === 'processing'
      ? 'border-orange-400 text-orange-600' :
    s === 'pending'
      ? 'border-amber-500 text-amber-600' :
    s === 'failed' || s === 'rejected' || s === 'refunded' || s === 'returned'
      ? 'border-red-500 text-red-600' :
    'border-gray-300 text-gray-500';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border bg-white whitespace-nowrap ${cfg}`}>
      {status ?? '—'}
    </span>
  );
}

/* ── RISK BADGE ── */
function RiskBadge({ risk }: { risk?: string }) {
  const r = (risk ?? 'none').toLowerCase();
  if (r === 'high') return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-500 text-white">High</span>;
  if (r === 'medium') return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-400 text-white">Medium</span>;
  return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border border-gray-300 text-gray-500 bg-white">None</span>;
}

/* ── AVATAR ── */
const AV = ['from-teal-400 to-teal-600','from-blue-400 to-blue-600','from-purple-400 to-purple-600','from-orange-400 to-orange-600','from-rose-400 to-rose-600','from-emerald-400 to-emerald-600'];
function Avatar({ name, uid }: { name: string; uid: number | string }) {
  const idx = typeof uid === 'number' ? uid : (parseInt(String(uid)) || 0);
  return (
    <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${AV[idx % AV.length]} flex items-center justify-center text-white text-[11px] font-bold shrink-0`}>
      {(name ?? '??').split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase() || '??'}
    </div>
  );
}

/* ── SKELETON ── */
function Sk() { return <div className="animate-pulse bg-gray-100 rounded h-4 w-full"/>; }

/* ── PAGINATION ── */
function Pagination({ current, total, onChange }: { current: number; total: number; onChange: (p: number) => void }) {
  if (total <= 1) return null;
  const pages: (number | '…')[] = [];
  if (total <= 7) { for (let i = 1; i <= total; i++) pages.push(i); }
  else {
    pages.push(1);
    if (current > 3) pages.push('…');
    for (let i = Math.max(2, current-1); i <= Math.min(total-1, current+1); i++) pages.push(i);
    if (current < total-2) pages.push('…');
    pages.push(total);
  }
  return (
    <div className="flex items-center gap-1">
      <button onClick={() => onChange(current-1)} disabled={current===1}
        className="w-7 h-7 flex items-center justify-center rounded border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6"/></svg>
      </button>
      {pages.map((p, i) => p === '…'
        ? <span key={`d${i}`} className="w-7 h-7 flex items-center justify-center text-sm text-gray-400">…</span>
        : <button key={p} onClick={() => onChange(p as number)}
            className="w-7 h-7 flex items-center justify-center rounded text-sm font-medium border transition-colors"
            style={p === current ? { backgroundColor: '#012D32', color: 'white', borderColor: '#012D32' } : { borderColor: '#E5E7EB', color: '#374151' }}>
            {p}
          </button>
      )}
      <button onClick={() => onChange(current+1)} disabled={current===total}
        className="w-7 h-7 flex items-center justify-center rounded border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>
      </button>
    </div>
  );
}

/* ── TABLE SHELL ── */
function TableShell({ headers, loading, empty, emptyMsg, children, from, to, total, page, lastPage, onPage }: {
  headers: string[]; loading: boolean; empty: boolean; emptyMsg?: string; children: React.ReactNode;
  from?: number; to?: number; total?: number; page: number; lastPage: number; onPage: (p: number) => void;
}) {
  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden bg-white">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#F8F9FA] border-b border-gray-200">
              {headers.map(h => (
                <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap first:pl-6 last:pr-6">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {loading
              ? [...Array(6)].map((_,i) => <tr key={i}>{headers.map((_,j) => <td key={j} className="px-4 py-4"><Sk/></td>)}</tr>)
              : empty
              ? <tr><td colSpan={headers.length} className="px-4 py-12 text-center text-sm text-gray-400">{emptyMsg ?? 'No transactions found'}</td></tr>
              : children}
          </tbody>
        </table>
      </div>
      <div className="px-6 py-3.5 border-t border-gray-100 bg-white flex items-center justify-between">
        <p className="text-xs text-gray-500">
          {total != null ? `Showing ${from ?? 1} to ${to ?? 0} of ${total.toLocaleString()} results` : ''}
        </p>
        <Pagination current={page} total={lastPage} onChange={onPage}/>
      </div>
    </div>
  );
}

/* ── STAT CARD ── */
function StatCard({ label, value, valueColor = 'text-gray-900', sub, loading, bg = '#F8F9FA' }: {
  label: string; value: string | number; valueColor?: string; sub?: string; loading?: boolean; bg?: string;
}) {
  return (
    <div className="rounded-xl border border-gray-100 p-5" style={{ backgroundColor: bg }}>
      <p className="text-xs text-gray-500 mb-2">{label}</p>
      {loading ? <Sk/> : <p className={`text-2xl font-bold ${valueColor}`}>{value}</p>}
      {sub && <p className="text-[11px] text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

/* ═══════════════════════════════════════════
   DETAIL PANEL — slides in from right
   Handles: general, crypto, pay-china, gift-card, conversion
═══════════════════════════════════════════ */
function Row({ label, value, copy }: { label: string; value: string; copy?: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-xs text-gray-500">{label}</span>
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-semibold text-gray-900 text-right">{value}</span>
        {copy && (
          <button onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
            className="text-gray-400 hover:text-gray-600 transition-colors">
            {copied
              ? <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#009F51" strokeWidth="2.5"><path d="m5 13 4 4L19 7"/></svg>
              : <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>}
          </button>
        )}
      </div>
    </div>
  );
}

function SectionBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <p className="text-xs font-bold text-gray-700 mb-2">{title}</p>
      <div className="divide-y divide-gray-100">{children}</div>
    </div>
  );
}

interface PanelProps {
  txId: number;
  product: 'crypto' | 'pay-china' | 'gift-card' | 'conversion' | 'general';
  onClose: () => void;
}

function DetailPanel({ txId, product, onClose }: PanelProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true); setErr(null);
        let res: any;
        if (product === 'crypto')     res = await transactionsApi.getSellCryptoOne(txId);
        else if (product === 'pay-china') res = await transactionsApi.getPayToChinaOne(txId);
        else if (product === 'conversion') res = await transactionsApi.getConversionOne(txId);
        else res = await transactionsApi.getOne(txId);
        if (res.status && res.data) setData(res.data);
        else setErr('No data returned');
      } catch (e) { setErr(e instanceof Error ? e.message : 'Failed to load'); }
      finally { setLoading(false); }
    })();
  }, [txId, product]);

  const handleMarkFailed = async () => {
    try { setActing(true); await transactionsApi.reject(txId); onClose(); }
    catch (e) { setErr(e instanceof Error ? e.message : 'Failed'); }
    finally { setActing(false); }
  };

  /* computed values */
  const isSuccess = ['completed','success','paid'].includes((data?.status ?? '').toLowerCase());
  const user = data?.user ?? {};
  const userName = [user.firstName ?? user.first_name, user.lastName ?? user.last_name].filter(Boolean).join(' ') || user.name || user.email || '—';
  const changpayId = user.changpayId ?? user.changpay_id ?? '—';

  /* ── Total payment — each product type has different field ── */
  const totalPayment = product === 'crypto'
    ? (data?.fiatAmount ?? data?.amount ?? '—')
    : product === 'pay-china'
    ? (data?.amountReceived ?? data?.amount ?? '—')
    : product === 'gift-card'
    ? (data?.cardValue ?? data?.amount ?? '—')
    : product === 'conversion'
    ? (data?.toAmount ?? data?.amount ?? '—')
    : (data?.amount ?? '—');

  const currency = data?.fiatCurrency ?? data?.currency ?? '';

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end">
      <div className="absolute inset-0 bg-black/20" onClick={onClose}/>
      <div className="relative bg-white w-full max-w-[440px] h-full flex flex-col shadow-2xl overflow-hidden">

        {/* Close */}
        <button onClick={onClose}
          className="absolute -left-10 top-4 w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center shadow-md hover:bg-gray-50 z-10">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-6 space-y-4">{[...Array(8)].map((_,i) => <Sk key={i}/>)}</div>
          ) : err && !data ? (
            <div className="p-6 text-sm text-red-500">{err}</div>
          ) : (
            <>
              {/* ── CONVERSION: success header with icon ── */}
              {(product === 'conversion') && (
                <div className="px-6 pt-6 pb-2 text-center border-b border-gray-100">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2" style={{ backgroundColor: '#009F51' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="m5 13 4 4L19 7"/></svg>
                  </div>
                  <p className="text-sm font-bold text-gray-900">Transaction Success</p>
                  {data?.createdAt && <p className="text-xs text-gray-400 mt-0.5">{fmtGMT(data.createdAt)}</p>}
                </div>
              )}

              {/* ── GENERAL: header with title only ── */}
              {product === 'general' && (
                <div className="px-6 pt-6 pb-2 border-b border-gray-100">
                  <h2 className="text-base font-bold text-gray-900">Transaction Details</h2>
                </div>
              )}

              {/* ── GIFT CARD / PAY TO CHINA: success date header ── */}
              {(product === 'gift-card' || product === 'pay-china') && data?.createdAt && (
                <div className="px-6 pt-5 pb-2 text-center border-b border-gray-100">
                  <p className="text-sm font-bold text-gray-900">Transaction Success</p>
                  <p className="text-xs text-gray-400">{fmtGMT(data.createdAt)}</p>
                </div>
              )}

              <div className="px-6 pt-4">

                {/* ── Total Payment ── */}
                <div className="flex items-center justify-between rounded-xl px-4 py-3 mb-4" style={{ backgroundColor: '#F0FBF7' }}>
                  <span className="text-sm font-semibold text-gray-700">Total Payment</span>
                  <span className="text-base font-bold text-gray-900">{currency} {totalPayment}</span>
                </div>

                {/* ── Status row ── */}
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm text-gray-500">Status</span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border"
                    style={isSuccess
                      ? { borderColor: '#009F51', color: '#009F51', backgroundColor: '#F0FBF7' }
                      : { borderColor: '#F59E0B', color: '#D97706', backgroundColor: '#FFFBEB' }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <circle cx="12" cy="12" r="10"/>
                      {isSuccess && <path d="m9 12 2 2 4-4"/>}
                    </svg>
                    {isSuccess ? 'Success' : (data?.status ?? '—')}
                  </span>
                </div>

                {/* ── User card (crypto + gift-card) ── */}
                {(product === 'crypto' || product === 'gift-card') && userName !== '—' && (
                  <div className="flex items-center justify-between border border-gray-100 rounded-xl px-4 py-3 mb-4">
                    <div className="flex items-center gap-3">
                      <Avatar name={userName} uid={txId}/>
                      <div>
                        <p className="text-sm font-bold text-gray-900">{userName}</p>
                        <p className="text-xs text-gray-400">ChangPayID: {changpayId}</p>
                      </div>
                    </div>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>
                  </div>
                )}

                {/* ════════ CRYPTO: Crypto Sent + Payout Destination + Transaction Detail ════════ */}
                {product === 'crypto' && (
                  <>
                    <SectionBlock title="Crypto Sent">
                      <Row label="Asset" value={dash(data?.cryptoCurrency)}/>
                      <Row label="Amount" value={dash(data?.cryptoAmount)}/>
                    </SectionBlock>
                    <SectionBlock title="Payout Destination">
                      <Row label="Wallet" value={dash(data?.fiatCurrency ? `${data.fiatCurrency} Wallet` : data?.payoutWallet)}/>
                      <Row label="Wallet ID" value={dash(data?.walletId ?? data?.payoutWalletId)}/>
                    </SectionBlock>
                    <SectionBlock title="Transaction Detail">
                      <Row label="Transaction ID" value={dash(data?.reference)} copy/>
                      <Row label="User ID" value={dash(user?.id)}/>
                      <Row label="Transaction Type" value="Crypto → Cash"/>
                      <Row label="Fee" value={dash(data?.fee)}/>
                    </SectionBlock>
                    <div className="flex justify-between items-center pt-3 border-t border-gray-100 mt-2">
                      <span className="text-sm font-bold text-gray-900">Total</span>
                      <span className="text-sm font-bold text-gray-900">{currency} {totalPayment}</span>
                    </div>
                  </>
                )}

                {/* ════════ GIFT CARD: Card Details + Payout + Conversion + Transaction Detail ════════ */}
                {product === 'gift-card' && (
                  <>
                    <SectionBlock title="Card Details">
                      <Row label="Card Type" value={dash(data?.cardType)}/>
                      <Row label="Card Value" value={dash(data?.cardValue)}/>
                      <Row label="Card Code" value={dash(data?.cardCode ? `****${String(data.cardCode).slice(-3)}` : null)}/>
                    </SectionBlock>
                    <SectionBlock title="Payout Destination">
                      <Row label="Wallet" value={dash(data?.payoutWallet ?? data?.fiatCurrency ? `${data?.fiatCurrency} Wallet` : null)}/>
                      <Row label="Wallet ID" value={dash(data?.walletId)}/>
                    </SectionBlock>
                    <SectionBlock title="Conversion Details">
                      <Row label="Rate" value={dash(data?.rate)}/>
                      <Row label="Fee" value={dash(data?.fee)}/>
                    </SectionBlock>
                    <SectionBlock title="Transaction Detail">
                      <Row label="Transaction ID" value={dash(data?.reference)} copy/>
                      <Row label="User ID" value={dash(user?.id)}/>
                      <Row label="Transaction Type" value="Gift Card → Cash"/>
                    </SectionBlock>
                    <div className="flex justify-between items-center pt-3 border-t border-gray-100 mt-2">
                      <span className="text-sm font-bold text-gray-900">Total</span>
                      <span className="text-sm font-bold text-gray-900">{currency} {totalPayment}</span>
                    </div>
                  </>
                )}

                {/* ════════ PAY TO CHINA: Sender + Recipient + Transaction Detail ════════ */}
                {product === 'pay-china' && (
                  <>
                    <SectionBlock title="Sender Details">
                      <p className="text-sm font-semibold text-gray-900 py-1">{userName}</p>
                      <p className="text-xs text-gray-500 pb-1">
                        {dash(data?.senderWallet ?? (data?.currency ? `${data.currency} Wallet` : null))} · {dash(data?.walletId)}
                      </p>
                    </SectionBlock>
                    {data?.supplier && (
                      <SectionBlock title="Recipient Details">
                        <p className="text-sm font-semibold text-gray-900 py-1">{data.supplier.name ?? '—'}</p>
                        <p className="text-xs text-gray-500 pb-1">
                          {data.supplier.bank?.name ?? ''}{data.supplier.accountNumber ? ` · ****${String(data.supplier.accountNumber).slice(-4)}` : ''}
                          {data.supplier.accountType ? ` (${data.supplier.accountType})` : ''}
                        </p>
                      </SectionBlock>
                    )}
                    <SectionBlock title="Transaction Detail">
                      <Row label="Transaction ID" value={dash(data?.reference)} copy/>
                      <Row label="User ID" value={dash(user?.id)}/>
                      <Row label="FX rate" value={dash(data?.exchangeRate)}/>
                      <Row label="Amount sent" value={dash(data?.amount)}/>
                      <Row label="Amount sent" value={dash(data?.amountReceived)}/>
                      <Row label="Fee" value={dash(data?.fee)}/>
                    </SectionBlock>
                    <div className="flex justify-between items-center pt-3 border-t border-gray-100 mt-2">
                      <span className="text-sm font-bold text-gray-900">Total</span>
                      <span className="text-sm font-bold text-gray-900">{currency} {totalPayment}</span>
                    </div>
                  </>
                )}

                {/* ════════ CONVERSION: From/To + Transaction Detail ════════ */}
                {product === 'conversion' && (
                  <>
                    <div className="mb-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">From</span>
                        <span className="font-semibold text-gray-900">{dash(data?.fromWalletName ?? (data?.fromCurrency ? `${data.fromUser ?? ''} • ${data.fromCurrency} Wallet` : null))}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">To</span>
                        <span className="font-semibold text-gray-900">{dash(data?.toWalletName ?? (data?.toCurrency ? `${data.toUser ?? ''} • ${data.toCurrency} Wallet` : null))}</span>
                      </div>
                    </div>
                    <SectionBlock title="Transaction Detail">
                      <Row label="Transaction ID" value={dash(data?.reference)} copy/>
                      <Row label="Wallet ID" value={dash(data?.walletId)}/>
                      <Row label="Amount" value={dash(data?.fromAmount ?? data?.amount)}/>
                      <Row label="Exchange Rate" value={dash(data?.rate)}/>
                      <Row label="Fee" value={dash(data?.fee)}/>
                      <Row label="Discount" value={dash(data?.discount ?? '—')}/>
                    </SectionBlock>
                  </>
                )}

                {/* ════════ GENERAL: Transaction ID + Product + Amount + Lifecycle + Financials ════════ */}
                {product === 'general' && (
                  <>
                    {userName !== '—' && (
                      <div className="flex items-center justify-between border border-gray-100 rounded-xl px-4 py-3 mb-4">
                        <div className="flex items-center gap-3">
                          <Avatar name={userName} uid={txId}/>
                          <div>
                            <p className="text-sm font-bold text-gray-900">{userName}</p>
                            <p className="text-xs text-gray-400">ChangPayID: {changpayId}</p>
                          </div>
                        </div>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>
                      </div>
                    )}
                    <div className="mb-4 space-y-1.5">
                      <Row label="Transaction ID" value={dash(data?.reference ?? data?.id)} copy/>
                      <Row label="Product" value={dash(data?.type ?? data?.product)}/>
                      <Row label="Amount" value={`${currency} ${dash(data?.amount)}`}/>
                    </div>
                    {(data?.lifecycle || data?.initiatedAt) && (
                      <SectionBlock title="Lifecycle">
                        {data?.initiatedAt && <p className="text-xs text-gray-600 py-1">Initiated - {new Date(data.initiatedAt).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',hour12:true})}</p>}
                        {data?.processingAt && <p className="text-xs font-semibold py-1" style={{color:'#F59E0B'}}>Processing - {new Date(data.processingAt).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',hour12:true})}</p>}
                      </SectionBlock>
                    )}
                    {(data?.rate || data?.fee) && (
                      <SectionBlock title="Financials">
                        {data?.rate && <Row label="FX Rate Used" value={dash(data.rate)}/>}
                        {data?.fee && <Row label="Fees Applied" value={dash(data.fee)}/>}
                      </SectionBlock>
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </div>

        {/* ── Action buttons ── */}
        {!loading && (
          <div className="px-6 py-4 border-t border-gray-100 space-y-2.5">
            {err && <p className="text-xs text-red-500 mb-2">{err}</p>}
            <div className="flex gap-3">
              <button onClick={handleMarkFailed} disabled={acting}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold border text-red-500 hover:bg-red-50 disabled:opacity-50 transition-colors"
                style={{ borderColor: '#FF756B' }}>
                {acting ? 'Processing…' : 'Mark as failed'}
              </button>
              <button disabled={acting}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                Mark as Manual Review
              </button>
            </div>
            <button className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-colors"
              style={{ backgroundColor: '#009F51' }}>
              Download Receipt
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   FILTER BAR — full-width, matches Figma
═══════════════════════════════════════════ */
const ARROW = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2.5'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`;
const dropCls = "pl-3 pr-8 py-2.5 text-sm border border-gray-200 rounded-xl text-gray-600 bg-white focus:outline-none focus:border-gray-400 appearance-none cursor-pointer shrink-0";
const dropStyle = { backgroundImage: ARROW, backgroundRepeat: 'no-repeat' as const, backgroundPosition: 'right 10px center' };

function FilterBar({ product, setProduct, status, setStatus, search, setSearch }: {
  product: ProductFilter; setProduct: (v: ProductFilter) => void;
  status: string; setStatus: (v: string) => void;
  search: string; setSearch: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-3 mb-6 w-full">
      {/* Search — grows to fill remaining space */}
      <div className="relative flex-1 min-w-0">
        <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, wallet ID or transaction ID..."
          className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-gray-200 rounded-full text-gray-700 placeholder-gray-400 focus:outline-none focus:border-gray-400"/>
      </div>
      {/* Product */}
      <select value={product} onChange={e => setProduct(e.target.value as ProductFilter)} className={dropCls} style={dropStyle}>
        <option value="">All Products</option>
        <option value="crypto">Crypto → Cash</option>
        <option value="gift-card">Gift Card → Cash</option>
        <option value="pay-china">Payment to China</option>
      </select>
      {/* Status */}
      <select value={status} onChange={e => setStatus(e.target.value)} className={dropCls} style={dropStyle}>
        <option value="">All Status</option>
        <option value="completed">Completed</option>
        <option value="pending">Pending</option>
        <option value="processing">Processing</option>
        <option value="failed">Failed</option>
        <option value="confirming">Confirming</option>
        <option value="refunded">Refunded</option>
        <option value="on-going">On Going</option>
      </select>
      {/* Date */}
      <div className="flex items-center gap-2 px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-400 cursor-pointer hover:bg-gray-50 shrink-0">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
        mm/dd/yyyy
      </div>
      {/* Risk */}
      <select className={dropCls} style={dropStyle}>
        <option value="">Risk Flag</option>
        <option value="high">High</option>
        <option value="medium">Medium</option>
        <option value="none">None</option>
      </select>
    </div>
  );
}

/* ═══════════════════════════════════════════
   PAGE
═══════════════════════════════════════════ */
export default function TransactionsPage() {
  const { isAuthenticated } = useAuthStore();

  /* ── Shared filter state ── */
  const [tab, setTab] = useState<TabType>('overview');
  const [product, setProduct] = useState<ProductFilter>('');
  const [sharedStatus, setSharedStatus] = useState('');
  const [sharedSearch, setSharedSearch] = useState('');

  /* ── All Transactions state (default: GET /transactions) ── */
  const [allTxs, setAllTxs] = useState<Transaction[]>([]);
  const [allStats, setAllStats] = useState<TransactionStats | null>(null);
  const [allPag, setAllPag] = useState<any>(null);
  const [loadingAll, setLoadingAll] = useState(true);
  const [loadingAllStats, setLoadingAllStats] = useState(true);
  const [allPage, setAllPage] = useState(1);
  const [allStatus, setAllStatus] = useState('');
  const [allSearch, setAllSearch] = useState('');

  /* ── Crypto state ── */
  const [cryptoTxs, setCryptoTxs] = useState<SellCryptoTransaction[]>([]);
  const [cryptoStats, setCryptoStats] = useState<SellCryptoStats | null>(null);
  const [cryptoPag, setCryptoPag] = useState<any>(null);
  const [loadingCrypto, setLoadingCrypto] = useState(false);
  const [loadingCryptoStats, setLoadingCryptoStats] = useState(false);
  const [cryptoPage, setCryptoPage] = useState(1);
  const [cryptoStatus, setCryptoStatus] = useState('');
  const [cryptoSearch, setCryptoSearch] = useState('');

  /* ── Gift Card state (no endpoint yet — UI only) ── */
  const [giftTxs] = useState<any[]>([]);
  const [giftStats] = useState<any>(null);
  const [loadingGift] = useState(false);
  const [loadingGiftStats] = useState(false);
  const [giftPage, setGiftPage] = useState(1);

  /* ── Pay to China state ── */
  const [chinaTxs, setChinaTxs] = useState<PayToChinaTransaction[]>([]);
  const [chinaStats, setChinaStats] = useState<PayToChinaStats | null>(null);
  const [chinaPag, setChinaPag] = useState<any>(null);
  const [loadingChina, setLoadingChina] = useState(false);
  const [loadingChinaStats, setLoadingChinaStats] = useState(false);
  const [chinaPage, setChinaPage] = useState(1);
  const [chinaStatus, setChinaStatus] = useState('');
  const [chinaSearch, setChinaSearch] = useState('');

  /* ── Conversions state ── */
  const [convTxs, setConvTxs] = useState<Transaction[]>([]);
  const [convStats, setConvStats] = useState<ConversionStats | null>(null);
  const [convPag, setConvPag] = useState<any>(null);
  const [loadingConv, setLoadingConv] = useState(false);
  const [loadingConvStats, setLoadingConvStats] = useState(true);
  const [convPage, setConvPage] = useState(1);
  const [convStatus, setConvStatus] = useState('');
  const [convSearch, setConvSearch] = useState('');

  /* ── Detail panel ── */
  const [panel, setPanel] = useState<{ id: number; product: 'crypto'|'pay-china'|'gift-card'|'conversion'|'general' } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const st = useRef<ReturnType<typeof setTimeout> | null>(null);
  const deb = (fn: () => void) => { if (st.current) clearTimeout(st.current); st.current = setTimeout(fn, 400); };

  /* ── Fetchers ── */
  const fetchAllStats = useCallback(async () => {
    try { setLoadingAllStats(true); const r = await transactionsApi.getStats(); if (r.status) setAllStats(r.data); }
    catch { } finally { setLoadingAllStats(false); }
  }, []);

  const fetchAll = useCallback(async (pg: number, q: string, status: string) => {
    try {
      setLoadingAll(true); setError(null);
      const r = await transactionsApi.getAll({ page: pg, per_page: 15, search: q || undefined, status: status || undefined });
      if (r.status && r.data) { const d = r.data as any; setAllTxs(d.data ?? []); setAllPag(d); }
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed'); }
    finally { setLoadingAll(false); }
  }, []);

  const fetchCryptoStats = useCallback(async () => {
    try { setLoadingCryptoStats(true); const r = await transactionsApi.getSellCryptoStats(); if (r.status) setCryptoStats(r.data); }
    catch { } finally { setLoadingCryptoStats(false); }
  }, []);

  const fetchCrypto = useCallback(async (pg: number, q: string, status: string) => {
    try {
      setLoadingCrypto(true); setError(null);
      const r = await transactionsApi.getSellCrypto({ page: pg, per_page: 15, search: q || undefined, status: status || undefined });
      if (r.status && r.data) { const d = r.data as any; setCryptoTxs(d.data ?? []); setCryptoPag(d); }
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed'); }
    finally { setLoadingCrypto(false); }
  }, []);

  const fetchChinaStats = useCallback(async () => {
    try { setLoadingChinaStats(true); const r = await transactionsApi.getPayToChinaStats(); if (r.status) setChinaStats(r.data); }
    catch { } finally { setLoadingChinaStats(false); }
  }, []);

  const fetchChina = useCallback(async (pg: number, q: string, status: string) => {
    try {
      setLoadingChina(true); setError(null);
      const r = await transactionsApi.getPayToChina({ page: pg, per_page: 15, search: q || undefined, status: status || undefined });
      if (r.status && r.data) { const d = r.data as any; setChinaTxs(d.data ?? []); setChinaPag(d); }
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed'); }
    finally { setLoadingChina(false); }
  }, []);

  const fetchConvStats = useCallback(async () => {
    try { setLoadingConvStats(true); const r = await transactionsApi.getConversionStats(); if (r.status) setConvStats(r.data); }
    catch { } finally { setLoadingConvStats(false); }
  }, []);

  const fetchConv = useCallback(async (pg: number, q: string, status: string) => {
    try {
      setLoadingConv(true); setError(null);
      const r = await transactionsApi.getConversions({ page: pg, per_page: 15, search: q || undefined, status: status || undefined });
      if (r.status && r.data) { const d = r.data as any; setConvTxs(d.data ?? []); setConvPag(d); }
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed'); }
    finally { setLoadingConv(false); }
  }, []);

  /* ── Effects ── */
  useEffect(() => {
    if (!isAuthenticated) return;
    fetchAllStats(); fetchAll(1, '', '');
    fetchConvStats(); fetchConv(1, '', '');
  }, [isAuthenticated]);

  useEffect(() => { if (isAuthenticated) fetchAll(allPage, allSearch, allStatus); }, [allPage, allStatus]);
  useEffect(() => { if (isAuthenticated) fetchCrypto(cryptoPage, cryptoSearch, cryptoStatus); }, [cryptoPage, cryptoStatus]);
  useEffect(() => { if (isAuthenticated) fetchChina(chinaPage, chinaSearch, chinaStatus); }, [chinaPage, chinaStatus]);
  useEffect(() => { if (isAuthenticated) fetchConv(convPage, convSearch, convStatus); }, [convPage, convStatus]);

  if (!isAuthenticated) return null;

  /* ── Handler: product switch ── */
  const handleProductChange = (p: ProductFilter) => {
    setProduct(p); setSharedStatus(''); setSharedSearch('');
    if (p === '') { setAllPage(1); setAllStatus(''); setAllSearch(''); fetchAll(1,'',''); }
    else if (p === 'crypto') { setCryptoPage(1); setCryptoStatus(''); setCryptoSearch(''); fetchCryptoStats(); fetchCrypto(1,'',''); }
    else if (p === 'pay-china') { setChinaPage(1); setChinaStatus(''); setChinaSearch(''); fetchChinaStats(); fetchChina(1,'',''); }
    // gift-card: no endpoint yet — just show empty table
  };

  const handleStatusChange = (s: string) => {
    setSharedStatus(s);
    if (product === '') { setAllStatus(s); setAllPage(1); }
    else if (product === 'crypto') { setCryptoStatus(s); setCryptoPage(1); }
    else if (product === 'pay-china') { setChinaStatus(s); setChinaPage(1); }
  };

  const handleSearchChange = (q: string) => {
    setSharedSearch(q);
    if (product === '') {
      setAllSearch(q); deb(() => { setAllPage(1); fetchAll(1, q, allStatus); });
    } else if (product === 'crypto') {
      setCryptoSearch(q); deb(() => { setCryptoPage(1); fetchCrypto(1, q, cryptoStatus); });
    } else if (product === 'pay-china') {
      setChinaSearch(q); deb(() => { setChinaPage(1); fetchChina(1, q, chinaStatus); });
    } else if (product === 'gift-card') {
      // no endpoint yet
    }
  };

  /* ── Tab bar ── */
  const TabBar = () => (
    <div className="flex border-b border-gray-200 mb-0">
      {(['overview','conversions'] as TabType[]).map(t => (
        <button key={t} onClick={() => setTab(t)}
          className={`px-8 py-3.5 text-sm font-semibold capitalize transition-colors relative ${tab === t ? 'text-emerald-600' : 'text-gray-500 hover:text-gray-700'}`}>
          {t === 'overview' ? 'Overview' : 'Conversions'}
          {tab === t && <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full" style={{ backgroundColor: '#009F51' }}/>}
        </button>
      ))}
      {/* Full-width underline */}
      <div className="flex-1 border-b border-gray-200 -mb-px"/>
    </div>
  );

  return (
    <div className="flex h-screen bg-white font-['DM_Sans']">
      <Sidebar/>
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Header */}
        <div className="bg-white border-b border-gray-100 px-8 py-5 shrink-0">
          <DashboardHeader title="Transactions" subtitle="Comprehensive wallet transactions for all users"/>
        </div>

        <div className="flex-1 overflow-y-auto bg-white">

          {/* Tab bar — full width */}
          <div className="px-8">
            <TabBar/>
          </div>

          <div className="px-8 py-6">
            {error && <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">{error}</div>}

            {/* ══════════════ OVERVIEW TAB ══════════════ */}
            {tab === 'overview' && (
              <>
                {/* Filter bar — full width */}
                <FilterBar
                  product={product} setProduct={handleProductChange}
                  status={sharedStatus} setStatus={handleStatusChange}
                  search={sharedSearch} setSearch={handleSearchChange}
                />

                {/* ── DEFAULT: All Transactions ── */}
                {product === '' && (
                  <div>
                    <h2 className="text-lg font-bold mb-0.5" style={{ color: '#012D32' }}>All Transactions</h2>
                    <p className="text-xs text-gray-500 mb-5">Comprehensive wallet transactions for all users.</p>
                    <div className="grid grid-cols-4 gap-4 mb-5">
                      <StatCard label="Total Transactions" value={allStats?.total ?? 0} loading={loadingAllStats}/>
                      <StatCard label="Completed" value={allStats?.completed ?? 0} valueColor="text-emerald-600" loading={loadingAllStats}/>
                      <StatCard label="Pending" value={allStats?.pending ?? 0} valueColor="text-amber-600" loading={loadingAllStats}/>
                      <StatCard label="Failed" value={allStats?.failed ?? 0} valueColor="text-red-600" loading={loadingAllStats}/>
                    </div>
                    <TableShell
                      headers={['Txn ID','Client Name','Type','Channel / Asset','Amount','Status','Date/time','Risk','Action']}
                      loading={loadingAll} empty={allTxs.length === 0}
                      from={allPag?.from} to={allPag?.to} total={allPag?.total}
                      page={allPage} lastPage={allPag?.last_page ?? 1} onPage={setAllPage}>
                      {allTxs.map(tx => {
                        const u = (tx as any).user ?? {};
                        const name = [u.firstName ?? u.first_name, u.lastName ?? u.last_name].filter(Boolean).join(' ') || u.email || '—';
                        const isIncome = (tx.category ?? '').toLowerCase() === 'income' || tx.type === 'deposit';
                        return (
                          <tr key={tx.id} className="hover:bg-gray-50/60 transition-colors">
                            <td className="px-4 py-3.5 pl-6 font-mono text-xs text-gray-700 whitespace-nowrap">{String(tx.reference ?? tx.id).slice(0,9)}</td>
                            <td className="px-4 py-3.5 whitespace-nowrap">
                              <div className="flex items-center gap-2.5">
                                <Avatar name={name} uid={tx.id}/>
                                <div><p className="text-sm font-semibold text-gray-900 leading-tight">{name}</p><p className="text-[11px] text-gray-400">{u.changpayId ?? u.changpay_id ?? ''}</p></div>
                              </div>
                            </td>
                            <td className="px-4 py-3.5 text-sm text-gray-600 capitalize whitespace-nowrap">{tx.type ?? '—'}</td>
                            <td className="px-4 py-3.5 text-sm text-gray-600 whitespace-nowrap">{tx.currency ?? '—'}</td>
                            <td className="px-4 py-3.5 whitespace-nowrap">
                              <span className="text-sm font-semibold" style={{ color: isIncome ? '#009F51' : '#FF756B' }}>{tx.amount ?? '—'}</span>
                            </td>
                            <td className="px-4 py-3.5 whitespace-nowrap"><StatusBadge status={tx.status}/></td>
                            <td className="px-4 py-3.5 text-xs text-gray-500 whitespace-nowrap">{fmtDT(tx.createdAt)}</td>
                            <td className="px-4 py-3.5 whitespace-nowrap"><RiskBadge risk={(tx as any).risk}/></td>
                            <td className="px-4 py-3.5 pr-6 whitespace-nowrap">
                              <button onClick={() => setPanel({ id: tx.id, product: 'general' })} className="text-sm font-semibold" style={{ color: '#339D88' }}>View</button>
                            </td>
                          </tr>
                        );
                      })}
                    </TableShell>
                  </div>
                )}

                {/* ── CRYPTO → CASH ── */}
                {product === 'crypto' && (
                  <div>
                    <h2 className="text-lg font-bold mb-0.5" style={{ color: '#009F51' }}>Crypto → Cash</h2>
                    <p className="text-xs text-gray-500 mb-5">Admin view for monitoring crypto deposits and cash payouts.</p>
                    <div className="grid grid-cols-4 gap-4 mb-5">
                      <StatCard label="Pending confirmations" value={cryptoStats?.pending ?? '—'} loading={loadingCryptoStats}/>
                      <StatCard label="Completed today" value={cryptoStats?.completed ?? '—'} valueColor="text-emerald-500" loading={loadingCryptoStats}/>
                      <StatCard label="Flagged for review" value={(cryptoStats as any)?.flagged ?? '—'} loading={loadingCryptoStats}/>
                      <StatCard label="Refunds (24h)" value={(cryptoStats as any)?.refunds_24h ?? '—'} loading={loadingCryptoStats}/>
                    </div>
                    <TableShell
                      headers={['Txn ID','Client Name','Asset','Amount','Confirmations','Rate Lock','Status','Payout','Action']}
                      loading={loadingCrypto} empty={cryptoTxs.length === 0}
                      from={cryptoPag?.from} to={cryptoPag?.to} total={cryptoPag?.total}
                      page={cryptoPage} lastPage={cryptoPag?.last_page ?? 1} onPage={setCryptoPage}>
                      {cryptoTxs.map(tx => {
                        const u = (tx as any).user ?? {};
                        const name = [u.firstName ?? u.first_name, u.lastName ?? u.last_name].filter(Boolean).join(' ') || u.email || '—';
                        const confs = (tx as any).confirmations;
                        const totalConfs = (tx as any).requiredConfirmations ?? (tx as any).total_confirmations;
                        return (
                          <tr key={tx.id} className="hover:bg-gray-50/60 transition-colors">
                            <td className="px-4 py-3.5 pl-6 font-mono text-xs text-gray-700 whitespace-nowrap">{String(tx.reference ?? tx.id).slice(0,9)}</td>
                            <td className="px-4 py-3.5 whitespace-nowrap">
                              <div className="flex items-center gap-2.5">
                                <Avatar name={name} uid={tx.id}/>
                                <div><p className="text-sm font-semibold text-gray-900 leading-tight">{name}</p><p className="text-[11px] text-gray-400">{u.changpayId ?? u.changpay_id ?? ''}</p></div>
                              </div>
                            </td>
                            <td className="px-4 py-3.5 text-sm font-semibold text-gray-800 whitespace-nowrap">{tx.cryptoCurrency ?? '—'}</td>
                            <td className="px-4 py-3.5 text-sm text-gray-800 whitespace-nowrap">{tx.cryptoAmount ?? '—'}</td>
                            <td className="px-4 py-3.5 whitespace-nowrap">
                              {confs != null
                                ? <span className="text-sm font-semibold" style={{ color: tx.status === 'completed' ? '#009F51' : '#F59E0B' }}>{confs}{totalConfs ? ` / ${totalConfs}` : ''}</span>
                                : <span className="text-sm font-semibold" style={{ color: '#009F51' }}>{tx.status === 'completed' ? 'Completed' : '—'}</span>}
                            </td>
                            <td className="px-4 py-3.5 whitespace-nowrap">
                              <p className="text-xs text-gray-700">{tx.rate ? `₦${tx.rate} / ${tx.cryptoCurrency ?? ''}` : '—'}</p>
                              {(tx as any).rateLockTime && <p className="text-[10px] text-gray-400">Locked {(tx as any).rateLockTime}</p>}
                            </td>
                            <td className="px-4 py-3.5 whitespace-nowrap"><StatusBadge status={tx.status}/></td>
                            <td className="px-4 py-3.5 whitespace-nowrap">
                              <p className="text-xs text-gray-700">{(tx as any).payoutMethod ?? '—'}</p>
                              {(tx as any).payoutAccount && <p className="text-[10px] text-gray-400">{(tx as any).payoutAccount}</p>}
                            </td>
                            <td className="px-4 py-3.5 pr-6 whitespace-nowrap">
                              <button onClick={() => setPanel({ id: tx.id, product: 'crypto' })} className="text-sm font-semibold" style={{ color: '#339D88' }}>View</button>
                            </td>
                          </tr>
                        );
                      })}
                    </TableShell>
                  </div>
                )}

                {/* ── GIFT CARD → CASH ── */}
                {product === 'gift-card' && (
                  <div>
                    <h2 className="text-lg font-bold mb-0.5" style={{ color: '#009F51' }}>Gift Card → Cash</h2>
                    <p className="text-xs text-gray-500 mb-5">Admin view for monitoring Gift card deposits and cash payouts.</p>
                    <div className="grid grid-cols-4 gap-4 mb-5">
                      <StatCard label="Pending confirmations" value={giftStats?.pending ?? '—'} loading={loadingGiftStats}/>
                      <StatCard label="Completed today" value={giftStats?.completed ?? '—'} valueColor="text-emerald-500" loading={loadingGiftStats}/>
                      <StatCard label="Flagged for review" value={giftStats?.flagged ?? '—'} loading={loadingGiftStats}/>
                      <StatCard label="Refunds (24h)" value={giftStats?.refunds_24h ?? '—'} loading={loadingGiftStats}/>
                    </div>
                    <TableShell
                      headers={['Txn ID','Client Name','Card Type','Card Value','Voucher','Rate Lock','Status','Payout','Action']}
                      loading={loadingGift} empty={giftTxs.length === 0}
                      emptyMsg="No gift card transactions found — endpoint not yet available"
                      page={giftPage} lastPage={1} onPage={setGiftPage}>
                      {/* No endpoint yet — renders empty state */}
                      <></>
                    </TableShell>
                  </div>
                )}

                {/* ── PAYMENT TO CHINA ── */}
                {product === 'pay-china' && (
                  <div>
                    <h2 className="text-lg font-bold mb-0.5" style={{ color: '#009F51' }}>Payment to China</h2>
                    <p className="text-xs text-gray-500 mb-5">Admin view for monitoring YUAN deposits and cash payouts.</p>
                    <div className="grid grid-cols-4 gap-4 mb-5">
                      <StatCard label="Pending confirmations" value={chinaStats?.pending ?? '—'} loading={loadingChinaStats}/>
                      <StatCard label="Completed today" value={chinaStats?.completed ?? '—'} valueColor="text-emerald-500" loading={loadingChinaStats}/>
                      <StatCard label="Flagged for review" value={(chinaStats as any)?.flagged ?? '—'} loading={loadingChinaStats}/>
                      <StatCard label="AI Passed" value={(chinaStats as any)?.ai_passed ?? '—'} loading={loadingChinaStats}/>
                    </div>
                    <TableShell
                      headers={['Txn ID','User','Amount','Receiver','Rate','Fee','Status','Timestamp','Risk','Actions']}
                      loading={loadingChina} empty={chinaTxs.length === 0}
                      from={chinaPag?.from} to={chinaPag?.to} total={chinaPag?.total}
                      page={chinaPage} lastPage={chinaPag?.last_page ?? 1} onPage={setChinaPage}>
                      {chinaTxs.map(tx => {
                        const u = (tx as any).user ?? {};
                        const name = [u.firstName ?? u.first_name, u.lastName ?? u.last_name].filter(Boolean).join(' ') || u.email || '—';
                        return (
                          <tr key={tx.id} className="hover:bg-gray-50/60 transition-colors">
                            <td className="px-4 py-3.5 pl-6 font-mono text-xs text-gray-700 whitespace-nowrap">{String(tx.reference ?? tx.id).slice(0,9)}</td>
                            <td className="px-4 py-3.5 whitespace-nowrap">
                              <div className="flex items-center gap-2.5">
                                <Avatar name={name} uid={tx.id}/>
                                <div><p className="text-sm font-semibold text-gray-900 leading-tight">{name}</p><p className="text-[11px] text-gray-400">{u.changpayId ?? u.changpay_id ?? ''}</p></div>
                              </div>
                            </td>
                            <td className="px-4 py-3.5 text-sm font-semibold whitespace-nowrap" style={{ color: '#009F51' }}>{tx.amount ?? '—'}</td>
                            <td className="px-4 py-3.5 whitespace-nowrap">
                              {tx.supplier
                                ? <><p className="text-xs text-gray-800 font-medium">{tx.supplier.bank?.name ?? 'Bank Transfer'}</p><p className="text-[10px] text-gray-400">····{String(tx.supplier.accountNumber ?? '').slice(-4)}</p></>
                                : <span className="text-gray-400 text-sm">—</span>}
                            </td>
                            <td className="px-4 py-3.5 text-sm text-gray-600 whitespace-nowrap">{tx.exchangeRate ?? '—'}</td>
                            <td className="px-4 py-3.5 text-sm text-gray-600 whitespace-nowrap">{tx.fee ?? '—'}</td>
                            <td className="px-4 py-3.5 whitespace-nowrap"><StatusBadge status={tx.status}/></td>
                            <td className="px-4 py-3.5 text-xs text-gray-500 whitespace-nowrap">{fmtDT(tx.createdAt)}</td>
                            <td className="px-4 py-3.5 whitespace-nowrap"><RiskBadge risk={(tx as any).risk}/></td>
                            <td className="px-4 py-3.5 pr-6 whitespace-nowrap">
                              <button onClick={() => setPanel({ id: tx.id, product: 'pay-china' })} className="text-sm font-semibold" style={{ color: '#339D88' }}>View</button>
                            </td>
                          </tr>
                        );
                      })}
                    </TableShell>
                  </div>
                )}
              </>
            )}

            {/* ══════════════ CONVERSIONS TAB ══════════════ */}
            {tab === 'conversions' && (
              <>
                <div className="flex items-start justify-between mb-5">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Inter-Wallet Conversions</h2>
                    <p className="text-sm text-gray-500 mt-0.5">Track all wallet-to-wallet currency conversions</p>
                  </div>
                  <button className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white rounded-xl shrink-0" style={{ backgroundColor: '#009F51' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    Export
                  </button>
                </div>

                {/* Conversions filters */}
                <div className="flex items-center gap-3 mb-5 w-full">
                  <div className="relative flex-1 min-w-0">
                    <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                    <input type="text" value={convSearch} onChange={e => { setConvSearch(e.target.value); deb(() => { setConvPage(1); fetchConv(1, e.target.value, convStatus); }); }}
                      placeholder="Search by name, wallet ID or transaction ID..."
                      className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-gray-200 rounded-full placeholder-gray-400 focus:outline-none focus:border-gray-400"/>
                  </div>
                  <select value={convStatus} onChange={e => { setConvStatus(e.target.value); setConvPage(1); }}
                    className={dropCls} style={dropStyle}>
                    <option value="">All Status</option>
                    <option value="completed">Completed</option>
                    <option value="pending">Pending</option>
                    <option value="failed">Failed</option>
                  </select>
                  <div className="flex items-center gap-2 px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-400 cursor-pointer hover:bg-gray-50 shrink-0">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                    mm/dd/yyyy
                  </div>
                </div>

                {/* Conversions stat cards — Figma exact colors */}
                <div className="grid grid-cols-4 gap-4 mb-5">
                  <div className="rounded-xl border border-gray-100 p-5" style={{ backgroundColor: '#009F511A' }}>
                    <p className="text-xs mb-2" style={{ color: '#009F51' }}>Total Conversions</p>
                    <p className="text-2xl font-bold" style={{ color: '#009F51' }}>{loadingConvStats ? '—' : (convStats?.total_count ?? '—')}</p>
                    <p className="text-[11px] text-gray-400 mt-1">Last 24 hours</p>
                  </div>
                  <div className="rounded-xl border border-gray-100 p-5" style={{ backgroundColor: '#0274D81A' }}>
                    <p className="text-xs mb-2" style={{ color: '#0274D8' }}>Total Volume</p>
                    <p className="text-2xl font-bold" style={{ color: '#0274D8' }}>{loadingConvStats ? '—' : (convStats?.total_volume ?? '—')}</p>
                    <p className="text-[11px] text-gray-400 mt-1">All currencies</p>
                  </div>
                  <div className="rounded-xl border border-gray-100 p-5" style={{ backgroundColor: '#A585E81A' }}>
                    <p className="text-xs mb-2" style={{ color: '#A585E8' }}>Avg Conversion</p>
                    <p className="text-2xl font-bold" style={{ color: '#A585E8' }}>{loadingConvStats ? '—' : ((convStats as any)?.avg_conversion ?? '—')}</p>
                    <p className="text-[11px] text-gray-400 mt-1">Per transaction</p>
                  </div>
                  <div className="rounded-xl border border-gray-100 p-5" style={{ backgroundColor: '#F2C04C1A' }}>
                    <p className="text-xs mb-2" style={{ color: '#F2C04C' }}>Total Fees</p>
                    <p className="text-2xl font-bold" style={{ color: '#F2C04C' }}>{loadingConvStats ? '—' : ((convStats as any)?.total_fees ?? '—')}</p>
                    <p className="text-[11px] text-gray-400 mt-1">Revenue earned</p>
                  </div>
                </div>

                {/* Conversions table */}
                <TableShell
                  headers={['Txn ID','User','Conversion','From Amount','To Amount','Rate','Fee','Status','Timestamp','Risk','Actions']}
                  loading={loadingConv} empty={convTxs.length === 0}
                  from={convPag?.from} to={convPag?.to} total={convPag?.total}
                  page={convPage} lastPage={convPag?.last_page ?? 1} onPage={setConvPage}>
                  {convTxs.map(tx => {
                    const u = (tx as any).user ?? {};
                    const name = [u.firstName ?? u.first_name, u.lastName ?? u.last_name].filter(Boolean).join(' ') || u.email || '—';
                    const fromCur = (tx as any).fromCurrency ?? '';
                    const toCur = (tx as any).toCurrency ?? '';
                    return (
                      <tr key={tx.id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="px-4 py-3.5 pl-6 font-mono text-xs text-gray-700 whitespace-nowrap">{String(tx.reference ?? tx.id).slice(0,9)}</td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-2.5">
                            <Avatar name={name} uid={tx.id}/>
                            <div><p className="text-sm font-semibold text-gray-900 leading-tight">{name}</p><p className="text-[11px] text-gray-400">{u.changpayId ?? u.changpay_id ?? ''}</p></div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-700">
                            {fromCur}
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m7 16 4-4-4-4M17 8l-4 4 4 4"/></svg>
                            {toCur}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-sm text-gray-800 whitespace-nowrap">{(tx as any).fromAmount ?? tx.amount ?? '—'}</td>
                        <td className="px-4 py-3.5 text-sm font-semibold whitespace-nowrap" style={{ color: '#009F51' }}>{(tx as any).toAmount ?? '—'}</td>
                        <td className="px-4 py-3.5 text-sm text-gray-600 whitespace-nowrap">{(tx as any).rate ?? '—'}</td>
                        <td className="px-4 py-3.5 text-sm text-gray-600 whitespace-nowrap">{tx.fee ?? '—'}</td>
                        <td className="px-4 py-3.5 whitespace-nowrap"><StatusBadge status={tx.status}/></td>
                        <td className="px-4 py-3.5 text-xs text-gray-500 whitespace-nowrap">{fmtDT(tx.createdAt)}</td>
                        <td className="px-4 py-3.5 whitespace-nowrap"><RiskBadge risk={(tx as any).risk}/></td>
                        <td className="px-4 py-3.5 pr-6 whitespace-nowrap">
                          <button onClick={() => setPanel({ id: tx.id, product: 'conversion' })} className="text-sm font-semibold" style={{ color: '#339D88' }}>View</button>
                        </td>
                      </tr>
                    );
                  })}
                </TableShell>
              </>
            )}
          </div>
        </div>
      </main>

      {/* Detail panel */}
      {panel && <DetailPanel txId={panel.id} product={panel.product} onClose={() => setPanel(null)}/>}
    </div>
  );
}