'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';
import { supportApi } from '@/lib/api/client';
import type { SupportTicket, TicketStats, Dispute, DisputeStats } from '@/lib/api/client';
import Sidebar from '@/components/Sidebar';
import DashboardHeader from '@/components/DashboardHeader';

type TabType = 'support-tickets' | 'disputes';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-100 rounded-lg ${className ?? ''}`} />;
}

function formatDate(s: string | null | undefined) {
  if (!s) return '—';
  try {
    const d = new Date(s);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ', ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase();
  } catch { return s; }
}

// ─── Priority badge — outline pill ────────────────────────────────────────────
function PriorityBadge({ priority }: { priority: string }) {
  const p = priority?.toLowerCase();
  const styles: Record<string, string> = {
    high:   'border-red-300    text-red-500',
    medium: 'border-amber-300  text-amber-600',
    low:    'border-gray-300   text-gray-500',
  };
  return (
    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold border ${styles[p] ?? 'border-gray-300 text-gray-500'} capitalize`}>
      {priority}
    </span>
  );
}

// ─── Status badge — outline pill ──────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const s = status?.toLowerCase();
  const styles: Record<string, string> = {
    open:         'border-blue-300    text-blue-600',
    in_progress:  'border-orange-300  text-orange-600',
    pending:      'border-amber-300   text-amber-600',
    resolved:     'border-emerald-300 text-emerald-600',
    closed:       'border-gray-300    text-gray-500',
    under_review: 'border-purple-300  text-purple-600',
    rejected:     'border-red-300     text-red-500',
  };
  const labels: Record<string, string> = {
    in_progress: 'In Progress', under_review: 'Under Review',
    open: 'Open', resolved: 'Resolved', pending: 'Pending',
    closed: 'Closed', rejected: 'Rejected',
  };
  return (
    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold border ${styles[s] ?? 'border-gray-300 text-gray-500'}`}>
      {labels[s] ?? status}
    </span>
  );
}

// ─── User cell ─────────────────────────────────────────────────────────────────
function ClientCell({ name, userId }: { name?: string; userId?: string }) {
  const nameStr = typeof name === 'string' ? name : '—';
  const COLORS = ['bg-emerald-600', 'bg-blue-600', 'bg-violet-600', 'bg-amber-600', 'bg-rose-600'];
  const color  = COLORS[nameStr.charCodeAt(0) % COLORS.length];
  const initials = nameStr.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <div className={`w-8 h-8 rounded-full ${color} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
        {initials || 'U'}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{nameStr}</p>
        {userId && <p className="text-xs text-gray-400 truncate">{userId}</p>}
      </div>
    </div>
  );
}

// ─── Table head ───────────────────────────────────────────────────────────────
function TableHead({ cols }: { cols: string[] }) {
  return (
    <thead>
      <tr className="border-b border-gray-100">
        {cols.map((h) => (
          <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">{h}</th>
        ))}
      </tr>
    </thead>
  );
}

// ─── Search bar ───────────────────────────────────────────────────────────────
function SearchBar({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="relative flex-1 max-w-sm">
      <svg className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
      </svg>
      <input
        type="text" value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? 'Search...'}
        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-full text-sm text-gray-700 placeholder-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
      />
    </div>
  );
}

// ─── Filter dropdown ──────────────────────────────────────────────────────────
function FilterSelect({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <div className="relative flex-shrink-0">
      <select
        value={value} onChange={(e) => onChange(e.target.value)}
        className="appearance-none bg-white border border-gray-200 rounded-full pl-4 pr-8 py-2.5 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-400 cursor-pointer"
      >
        {options.map(([val, label]) => <option key={val} value={val}>{label}</option>)}
      </select>
      <svg className="w-4 h-4 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
      </svg>
    </div>
  );
}

// ─── Pagination ───────────────────────────────────────────────────────────────
function Pagination({ current, total, onChange, from, to, count }: {
  current: number; total: number; onChange: (p: number) => void;
  from?: number; to?: number; count?: number;
}) {
  const pages = Array.from({ length: Math.min(total, 5) }, (_, i) => {
    if (total <= 5) return i + 1;
    if (current <= 3) return i + 1;
    if (current >= total - 2) return total - 4 + i;
    return current - 2 + i;
  });
  return (
    <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between">
      <p className="text-xs text-gray-500">{count != null ? `Showing ${from ?? 1}–${to ?? 0} of ${count.toLocaleString()}` : ''}</p>
      <div className="flex items-center gap-1">
        <button onClick={() => onChange(Math.max(1, current - 1))} disabled={current === 1}
          className="w-7 h-7 flex items-center justify-center border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40">
          <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
        </button>
        {pages.map((p) => (
          <button key={p} onClick={() => onChange(p)}
            className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-medium transition-colors ${current === p ? 'bg-emerald-500 text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            {p}
          </button>
        ))}
        <button onClick={() => onChange(Math.min(total, current + 1))} disabled={current === total}
          className="w-7 h-7 flex items-center justify-center border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40">
          <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
        </button>
      </div>
    </div>
  );
}

// ─── Ticket Detail Panel ──────────────────────────────────────────────────────
function TicketPanel({ ticket, onClose, onUpdated }: {
  ticket: SupportTicket;
  onClose: () => void;
  onUpdated: (t: SupportTicket) => void;
}) {
  const [fullTicket,     setFullTicket]     = useState<SupportTicket | null>(null);
  const [loadingDetail,  setLoadingDetail]  = useState(true);
  const [response,       setResponse]       = useState('');
  const [sending,        setSending]        = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [error,          setError]          = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoadingDetail(true);
        const res = await supportApi.getTicket(ticket.id);
        if (res.status && res.data) setFullTicket(res.data);
        else setFullTicket(ticket);
      } catch { setFullTicket(ticket); }
      finally { setLoadingDetail(false); }
    })();
  }, [ticket.id]);

  const handleRespond = async () => {
    if (!response.trim()) return;
    try {
      setSending(true);
      setError(null);
      const res = await supportApi.respondToTicket(ticket.id, response.trim());
      if (res.status && res.data) {
        setFullTicket((prev) => prev ? { ...prev, responses: [...(prev.responses ?? []), res.data] } : prev);
        setResponse('');
      }
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to send'); }
    finally { setSending(false); }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    try {
      setUpdatingStatus(true);
      const res = await supportApi.updateTicketStatus(ticket.id, newStatus);
      if (res.status && res.data) { setFullTicket(res.data); onUpdated(res.data); }
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to update'); }
    finally { setUpdatingStatus(false); }
  };

  const t = fullTicket ?? ticket;
  const isResolved = t.status === 'resolved' || t.status === 'closed';

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white w-full max-w-md h-full shadow-2xl flex flex-col">
        {/* Close button — on background left edge */}
        <button
          onClick={onClose}
          className="absolute -left-12 top-5 w-9 h-9 flex items-center justify-center rounded-full bg-white shadow-lg hover:bg-gray-50"
        >
          <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <h2 className="text-base font-bold text-gray-900">Ticket Details</h2>

          {loadingDetail ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : (
            <>
              {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl"><p className="text-sm text-red-600">{error}</p></div>}

              {/* Ticket ID + Status */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-xl px-4 py-3">
                  <p className="text-xs text-gray-400 mb-1">Ticket ID</p>
                  <p className="text-sm font-semibold text-gray-900">{(t as any).reference ?? `TX-${t.id}`}</p>
                </div>
                <div className="bg-gray-50 rounded-xl px-4 py-3">
                  <p className="text-xs text-gray-400 mb-1">Status</p>
                  <StatusBadge status={t.status} />
                </div>
              </div>

              {/* Priority + Type */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-xl px-4 py-3">
                  <p className="text-xs text-gray-400 mb-1">Priority</p>
                  <p className="text-sm font-semibold text-gray-900 capitalize">{(t as any).reference ?? `TX-${t.id}`}</p>
                </div>
                <div className="bg-gray-50 rounded-xl px-4 py-3">
                  <p className="text-xs text-gray-400 mb-1">Type</p>
                  <p className="text-sm font-semibold text-gray-900 capitalize">{t.category ?? 'Support'}</p>
                </div>
              </div>

              {/* Subject */}
              <div>
                <p className="text-sm font-bold text-gray-900 mb-1.5">Subject</p>
                <p className="text-sm font-semibold text-emerald-600">{t.subject}</p>
              </div>

              {/* Description */}
              <div>
                <p className="text-sm font-bold text-gray-900 mb-1.5">Description</p>
                <div className="bg-gray-50 rounded-xl px-4 py-3">
                  <p className="text-sm text-gray-600 leading-relaxed">{t.message}</p>
                </div>
              </div>

              {/* Previous responses */}
              {(t.responses?.length ?? 0) > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-bold text-gray-900">Conversation ({t.responses!.length})</p>
                  {t.responses!.map((r, i) => (
                    <div key={i} className={`rounded-xl px-4 py-3 text-sm ${r.fromAdmin ? 'bg-emerald-50' : 'bg-gray-50'}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs font-semibold ${r.fromAdmin ? 'text-emerald-700' : 'text-gray-600'}`}>{r.fromAdmin ? 'Admin' : 'Customer'}</span>
                        <span className="text-xs text-gray-400">{formatDate(r.createdAt)}</span>
                      </div>
                      <p className="text-gray-700">{r.message}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Response */}
              <div>
                <p className="text-sm font-bold text-gray-900 mb-2">Add Response</p>
                <textarea
                  value={response}
                  onChange={(e) => setResponse(e.target.value)}
                  placeholder="Type your response to the customer..."
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#009F51] text-black"
                />
              </div>
            </>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-5 border-t border-gray-100 space-y-3">
          <button
            onClick={handleRespond}
            disabled={sending || !response.trim()}
            className="w-full py-3 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-sm font-bold disabled:opacity-50 transition-colors"
          >
            {sending ? 'Sending...' : 'Send Response'}
          </button>
          <button
            onClick={onClose}
            className="w-full py-3 border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
          {!isResolved && (
            <button
              onClick={() => handleUpdateStatus('resolved')}
              disabled={updatingStatus}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-bold disabled:opacity-50 transition-colors"
            >
              {updatingStatus ? 'Updating...' : 'Mark as resolved'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Dispute Detail Panel ─────────────────────────────────────────────────────
function DisputePanel({ dispute, onClose, onResolved }: {
  dispute: Dispute;
  onClose: () => void;
  onResolved: (d: Dispute) => void;
}) {
  const [fullDispute,   setFullDispute]   = useState<Dispute | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(true);
  const [resolution,    setResolution]    = useState('');
  const [resolving,     setResolving]     = useState(false);
  const [error,         setError]         = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoadingDetail(true);
        const res = await supportApi.getDispute(dispute.id);
        if (res.status && res.data) setFullDispute(res.data);
        else setFullDispute(dispute);
      } catch { setFullDispute(dispute); }
      finally { setLoadingDetail(false); }
    })();
  }, [dispute.id]);

  const handleResolve = async (status: 'resolved' | 'rejected') => {
    if (!resolution.trim()) { setError('Please provide a resolution message'); return; }
    try {
      setResolving(true);
      setError(null);
      const res = await supportApi.resolveDispute(dispute.id, status, resolution.trim());
      if (res.status && res.data) { onResolved(res.data); onClose(); }
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to resolve'); }
    finally { setResolving(false); }
  };

  const d = fullDispute ?? dispute;
  const canAct = d.status !== 'resolved' && d.status !== 'rejected';

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white w-full max-w-md h-full shadow-2xl flex flex-col">
        <button onClick={onClose} className="absolute -left-12 top-5 w-9 h-9 flex items-center justify-center rounded-full bg-white shadow-lg hover:bg-gray-50">
          <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <h2 className="text-base font-bold text-gray-900">Dispute Details</h2>

          {loadingDetail ? (
            <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
          ) : (
            <>
              {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl"><p className="text-sm text-red-600">{error}</p></div>}

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-xl px-4 py-3">
                  <p className="text-xs text-gray-400 mb-1">Dispute ID</p>
                  <p className="text-sm font-semibold text-gray-900">{(d as any).reference ?? `TX-${d.id}`}</p>
                </div>
                <div className="bg-gray-50 rounded-xl px-4 py-3">
                  <p className="text-xs text-gray-400 mb-1">Status</p>
                  <StatusBadge status={d.status} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-xl px-4 py-3">
                  <p className="text-xs text-gray-400 mb-1">Type</p>
                  <p className="text-sm font-semibold text-gray-900 capitalize">{d.type ?? 'Dispute'}</p>
                </div>
                <div className="bg-gray-50 rounded-xl px-4 py-3">
                  <p className="text-xs text-gray-400 mb-1">Created</p>
                  <p className="text-sm font-semibold text-gray-900">{formatDate(d.createdAt)}</p>
                </div>
              </div>

              <div>
                <p className="text-sm font-bold text-gray-900 mb-1.5">Subject</p>
                <p className="text-sm font-semibold text-[#009F51]">{d.subject}</p>
              </div>

              <div>
                <p className="text-sm font-bold text-gray-900 mb-1.5">Description</p>
                <div className="bg-gray-50 rounded-xl px-4 py-3">
                  <p className="text-sm text-gray-600 leading-relaxed">{d.description}</p>
                </div>
              </div>

              {d.resolution && (
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
                  <p className="text-xs font-semibold text-emerald-700 mb-1">Resolution</p>
                  <p className="text-sm text-emerald-800">{d.resolution}</p>
                </div>
              )}

              {canAct && (
                <div>
                  <p className="text-sm font-bold text-gray-900 mb-2">Resolution Message *</p>
                  <textarea
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value)}
                    placeholder="Describe the resolution or reason for rejection..."
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                </div>
              )}
            </>
          )}
        </div>

        <div className="p-5 border-t border-gray-100 space-y-3">
          <button onClick={onClose} className="w-full py-3 border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors">Close</button>
          {canAct && (
            <div className="flex gap-3">
              <button onClick={() => handleResolve('resolved')} disabled={resolving || !resolution.trim()}
                className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-bold disabled:opacity-50 transition-colors">
                {resolving ? 'Processing...' : 'Resolve'}
              </button>
              <button onClick={() => handleResolve('rejected')} disabled={resolving || !resolution.trim()}
                className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-bold disabled:opacity-50 transition-colors">
                Reject
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
//  PAGE
// ═════════════════════════════════════════════════════════════════════════════
export default function SupportDisputesPage() {
  const { isAuthenticated } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabType>('support-tickets');

  // Tickets
  const [tickets,            setTickets]            = useState<SupportTicket[]>([]);
  const [ticketStats,        setTicketStats]        = useState<TicketStats | null>(null);
  const [ticketPagination,   setTicketPagination]   = useState<{ total: number; last_page: number; from: number; to: number } | null>(null);
  const [loadingTickets,     setLoadingTickets]     = useState(false);
  const [loadingTicketStats, setLoadingTicketStats] = useState(true);
  const [ticketPage,         setTicketPage]         = useState(1);
  const [ticketSearch,       setTicketSearch]       = useState('');
  const [ticketStatus,       setTicketStatus]       = useState('');
  const [ticketPriority,     setTicketPriority]     = useState('');
  const [ticketCategory,     setTicketCategory]     = useState('');
  const [selectedTicket,     setSelectedTicket]     = useState<SupportTicket | null>(null);

  // Disputes
  const [disputes,            setDisputes]            = useState<Dispute[]>([]);
  const [disputeStats,        setDisputeStats]        = useState<DisputeStats | null>(null);
  const [disputePagination,   setDisputePagination]   = useState<{ total: number; last_page: number; from: number; to: number } | null>(null);
  const [loadingDisputes,     setLoadingDisputes]     = useState(false);
  const [loadingDisputeStats, setLoadingDisputeStats] = useState(true);
  const [disputePage,         setDisputePage]         = useState(1);
  const [disputeSearch,       setDisputeSearch]       = useState('');
  const [disputeStatus,       setDisputeStatus]       = useState('');
  const [selectedDispute,     setSelectedDispute]     = useState<Dispute | null>(null);

  const [error, setError] = useState<string | null>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchTicketStats = useCallback(async () => {
    try { setLoadingTicketStats(true); const res = await supportApi.getTicketStats(); if (res.status) setTicketStats(res.data); }
    catch { /* silent */ } finally { setLoadingTicketStats(false); }
  }, []);

  const fetchTickets = useCallback(async (page: number, search: string, status: string, priority: string, category: string) => {
    try {
      setLoadingTickets(true); setError(null);
      const res = await supportApi.getTickets({ page, per_page: 15, search: search || undefined, status: status || undefined, priority: priority || undefined, category: category || undefined });
      if (res.status) {
        const d = res.data as any;
        if (d && 'data' in d) { setTickets(d.data ?? []); setTicketPagination({ total: d.total, last_page: d.last_page, from: d.from, to: d.to }); }
        else setTickets([]);
      }
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to load tickets'); }
    finally { setLoadingTickets(false); }
  }, []);

  const fetchDisputeStats = useCallback(async () => {
    try { setLoadingDisputeStats(true); const res = await supportApi.getDisputeStats(); if (res.status) setDisputeStats(res.data); }
    catch { /* silent */ } finally { setLoadingDisputeStats(false); }
  }, []);

  const fetchDisputes = useCallback(async (page: number, search: string, status: string) => {
    try {
      setLoadingDisputes(true); setError(null);
      const res = await supportApi.getDisputes({ page, per_page: 15, search: search || undefined, status: status || undefined });
      if (res.status) {
        const d = res.data as any;
        if (d && 'data' in d) { setDisputes(d.data ?? []); setDisputePagination({ total: d.total, last_page: d.last_page, from: d.from, to: d.to }); }
        else setDisputes([]);
      }
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to load disputes'); }
    finally { setLoadingDisputes(false); }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (activeTab === 'support-tickets') { fetchTicketStats(); fetchTickets(ticketPage, ticketSearch, ticketStatus, ticketPriority, ticketCategory); }
    else { fetchDisputeStats(); fetchDisputes(disputePage, disputeSearch, disputeStatus); }
  }, [isAuthenticated, activeTab]);

  useEffect(() => {
    if (!isAuthenticated || activeTab !== 'support-tickets') return;
    fetchTickets(ticketPage, ticketSearch, ticketStatus, ticketPriority, ticketCategory);
  }, [ticketPage, ticketStatus, ticketPriority, ticketCategory]);

  useEffect(() => {
    if (!isAuthenticated || activeTab !== 'disputes') return;
    fetchDisputes(disputePage, disputeSearch, disputeStatus);
  }, [disputePage, disputeStatus]);

  if (!isAuthenticated) return null;

  const handleTicketSearch = (val: string) => {
    setTicketSearch(val);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => { setTicketPage(1); fetchTickets(1, val, ticketStatus, ticketPriority, ticketCategory); }, 400);
  };

  const handleDisputeSearch = (val: string) => {
    setDisputeSearch(val);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => { setDisputePage(1); fetchDisputes(1, val, disputeStatus); }, 400);
  };

  const TABS = [
    { id: 'support-tickets' as TabType, label: 'Support Tickets' },
    { id: 'disputes'        as TabType, label: 'Disputes' },
  ];

  return (
    <div className="flex h-screen bg-[#F8F9FA] font-['DM_Sans',sans-serif]">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-8 py-5 flex-shrink-0">
          <DashboardHeader title="Support & Disputes" subtitle="Manage support tickets, customer disputes, and resolution workflows" />
        </div>

        {/* Tab bar — full width underline */}
        <div className="bg-white border-b border-gray-100 flex-shrink-0">
          <nav className="flex w-full ml-7">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex-1 py-4 text-sm font-medium text-center transition-colors ${
                  activeTab === tab.id ? 'text-emerald-600' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
                {activeTab === tab.id && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500" />}
              </button>
            ))}
          </nav>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          {error && (
            <div className="mx-8 mt-5 p-3 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {activeTab === 'support-tickets' && (
            <div className="p-8 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-emerald-600">Support Tickets</h2>
                  <p className="text-sm text-gray-500 mt-0.5">Create and manage support tickets with priority levels and assignments</p>
                </div>
                <button className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 text-white rounded-full text-sm font-semibold hover:bg-emerald-600 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
                  </svg>
                  Export
                </button>
              </div>

              {/* Stat cards */}
              <div className="grid grid-cols-4 gap-4">
                {([
                  { label: 'Total Tickets',   value: ticketStats?.total,       color: 'text-gray-900' },
                  { label: 'Open Tickets',    value: ticketStats?.open,        color: 'text-blue-600' },
                  { label: 'Resolved Today',  value: ticketStats?.resolved,    color: 'text-emerald-600' },
                  { label: 'Pending Review',  value: ticketStats?.in_progress, color: 'text-purple-600' },
                ] as { label: string; value?: number; color: string }[]).map((s) => (
                  <div key={s.label} className="bg-white rounded-2xl border border-gray-200 p-5">
                    <p className="text-xs text-gray-500 mb-2">{s.label}</p>
                    {loadingTicketStats ? <Skeleton className="h-9 w-16" /> : (
                      <p className={`text-3xl font-bold ${s.color}`}>{s.value ?? '—'}</p>
                    )}
                  </div>
                ))}
              </div>

              {/* Filters */}
              <div className="flex items-center gap-3">
                <SearchBar value={ticketSearch} onChange={handleTicketSearch} placeholder="Search by Ticket ID, name or email..." />
                <FilterSelect value={ticketStatus} onChange={(v) => { setTicketStatus(v); setTicketPage(1); }} options={[['', 'All Status'], ['open', 'Open'], ['in_progress', 'In Progress'], ['resolved', 'Resolved'], ['closed', 'Closed']]} />
                <FilterSelect value={ticketPriority} onChange={(v) => { setTicketPriority(v); setTicketPage(1); }} options={[['', 'All Priority'], ['high', 'High'], ['medium', 'Medium'], ['low', 'Low']]} />
                <FilterSelect value={ticketCategory} onChange={(v) => { setTicketCategory(v); setTicketPage(1); }} options={[['', 'All Types'], ['dispute', 'Dispute'], ['technical', 'Technical'], ['billing', 'Billing'], ['support', 'Support']]} />
              </div>

              {/* Table */}
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <TableHead cols={['Txn ID', 'Client Name', 'Subject', 'Type', 'Priority', 'Status', 'Date/time', 'Actions']} />
                    <tbody className="divide-y divide-gray-50">
                      {loadingTickets ? (
                        [...Array(6)].map((_, i) => (
                          <tr key={i}>{[...Array(8)].map((_, j) => <td key={j} className="px-5 py-4"><Skeleton className="h-5 w-full" /></td>)}</tr>
                        ))
                      ) : tickets.length === 0 ? (
                        <tr><td colSpan={8} className="px-5 py-12 text-center text-sm text-gray-400">No tickets found</td></tr>
                      ) : (
                        tickets.map((t) => (
                          <tr key={t.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-5 py-4 text-xs font-mono text-gray-600">{(t as any).reference ?? `TX-${t.id}`}</td>
                            <td className="px-5 py-4"><ClientCell name={t.user ? `${t.user.firstName ?? ''} ${t.user.lastName ?? ''}`.trim() || t.user.email : '—'} userId={t.user?.changpayId ?? t.user?.email ?? undefined} /></td>
                            <td className="px-5 py-4 text-sm text-gray-700 max-w-[180px] truncate">{t.subject}</td>
                            <td className="px-5 py-4 text-sm text-gray-600 capitalize">{t.category ?? '—'}</td>
                            <td className="px-5 py-4"><PriorityBadge priority={t.priority} /></td>
                            <td className="px-5 py-4"><StatusBadge status={t.status} /></td>
                            <td className="px-5 py-4 text-xs text-gray-500 whitespace-nowrap">{formatDate(t.createdAt)}</td>
                            <td className="px-5 py-4">
                              <button onClick={() => setSelectedTicket(t)} className="text-sm font-semibold text-emerald-600 hover:text-emerald-700">View</button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                <Pagination current={ticketPage} total={ticketPagination?.last_page ?? 1} onChange={setTicketPage} from={ticketPagination?.from} to={ticketPagination?.to} count={ticketPagination?.total} />
              </div>
            </div>
          )}

          {/* ══════════════════ DISPUTES ══════════════════ */}
          {activeTab === 'disputes' && (
            <div className="p-8 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-emerald-600">Dispute Management</h2>
                  <p className="text-sm text-gray-500 mt-0.5">Handle transaction disputes and chargebacks</p>
                </div>
                <button className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 text-white rounded-full text-sm font-semibold hover:bg-emerald-600 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
                  </svg>
                  Export
                </button>
              </div>

              {/* Stat cards */}
              <div className="grid grid-cols-4 gap-4">
                {([
                  { label: 'Total Disputes',  value: disputeStats?.total,        color: 'text-gray-900' },
                  { label: 'Open Disputes',   value: disputeStats?.open,         color: 'text-red-500' },
                  { label: 'Resolved Today',  value: disputeStats?.resolved,     color: 'text-emerald-600' },
                  { label: 'Pending Review',  value: disputeStats?.under_review, color: 'text-purple-600' },
                ] as { label: string; value?: number; color: string }[]).map((s) => (
                  <div key={s.label} className="bg-white rounded-2xl border border-gray-200 p-5">
                    <p className="text-xs text-gray-500 mb-2">{s.label}</p>
                    {loadingDisputeStats ? <Skeleton className="h-9 w-16" /> : (
                      <p className={`text-3xl font-bold ${s.color}`}>{s.value ?? '—'}</p>
                    )}
                  </div>
                ))}
              </div>

              {/* Filters */}
              <div className="flex items-center gap-3">
                <SearchBar value={disputeSearch} onChange={handleDisputeSearch} placeholder="Search by Ticket ID, name or email..." />
                <FilterSelect value={disputeStatus} onChange={(v) => { setDisputeStatus(v); setDisputePage(1); }} options={[['', 'All Status'], ['open', 'Open'], ['under_review', 'Under Review'], ['resolved', 'Resolved'], ['rejected', 'Rejected']]} />
                <FilterSelect value="" onChange={() => {}} options={[['', 'All Priority'], ['high', 'High'], ['medium', 'Medium'], ['low', 'Low']]} />
                <FilterSelect value="" onChange={() => {}} options={[['', 'All Types'], ['dispute', 'Dispute'], ['chargeback', 'Chargeback']]} />
              </div>

              {/* Table */}
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <TableHead cols={['Txn ID', 'Client Name', 'Subject', 'Type', 'Priority', 'Status', 'Date/time', 'Actions']} />
                    <tbody className="divide-y divide-gray-50">
                      {loadingDisputes ? (
                        [...Array(6)].map((_, i) => (
                          <tr key={i}>{[...Array(8)].map((_, j) => <td key={j} className="px-5 py-4"><Skeleton className="h-5 w-full" /></td>)}</tr>
                        ))
                      ) : disputes.length === 0 ? (
                        <tr><td colSpan={8} className="px-5 py-12 text-center text-sm text-gray-400">No disputes found</td></tr>
                      ) : (
                        disputes.map((d) => (
                          <tr key={d.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-5 py-4 text-xs font-mono text-gray-600">{(d as any).reference ?? `TX-${d.id}`}</td>
                            <td className="px-5 py-4"><ClientCell name={d.user ? `${d.user.firstName ?? ''} ${d.user.lastName ?? ''}`.trim() || d.user.email : '—'} userId={d.user?.changpayId ?? d.user?.email ?? undefined} /></td>
                            <td className="px-5 py-4 text-sm text-gray-700 max-w-[180px] truncate">{d.subject}</td>
                            <td className="px-5 py-4 text-sm text-gray-600 capitalize">{d.type ?? 'Dispute'}</td>
                            <td className="px-5 py-4"><PriorityBadge priority={(d as any).priority ?? 'medium'} /></td>
                            <td className="px-5 py-4"><StatusBadge status={d.status} /></td>
                            <td className="px-5 py-4 text-xs text-gray-500 whitespace-nowrap">{formatDate(d.createdAt)}</td>
                            <td className="px-5 py-4">
                              <button onClick={() => setSelectedDispute(d)} className="text-sm font-semibold text-emerald-600 hover:text-emerald-700">View</button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                <Pagination current={disputePage} total={disputePagination?.last_page ?? 1} onChange={setDisputePage} from={disputePagination?.from} to={disputePagination?.to} count={disputePagination?.total} />
              </div>
            </div>
          )}
        </div>
      </div>

      {selectedTicket && (
        <TicketPanel
          ticket={selectedTicket}
          onClose={() => setSelectedTicket(null)}
          onUpdated={(updated) => { setTickets((prev) => prev.map((t) => t.id === updated.id ? updated : t)); setSelectedTicket(updated); fetchTicketStats(); }}
        />
      )}

      {selectedDispute && (
        <DisputePanel
          dispute={selectedDispute}
          onClose={() => setSelectedDispute(null)}
          onResolved={(resolved) => { setDisputes((prev) => prev.map((d) => d.id === resolved.id ? resolved : d)); fetchDisputeStats(); }}
        />
      )}
    </div>
  );
}