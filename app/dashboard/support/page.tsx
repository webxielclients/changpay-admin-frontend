'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { supportApi } from '@/lib/api/client';
import type { SupportTicket, TicketStats, Dispute, DisputeStats } from '@/lib/api/client';
import { AUTH_ROUTES } from '@/constants/auth';
import Sidebar from '@/components/Sidebar';
import DashboardHeader from '@/components/DashboardHeader';

type TabType = 'support-tickets' | 'disputes';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-100 rounded-lg ${className}`} />;
}

function formatDate(s: string | null) {
  if (!s) return '—';
  try {
    return new Date(s).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return s; }
}

function PriorityBadge({ priority }: { priority: string }) {
  const p = priority?.toLowerCase();
  const styles: Record<string, string> = {
    high: 'bg-red-100 text-red-700 border-red-200',
    medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    low: 'bg-gray-100 text-gray-600 border-gray-200',
  };
  return (
    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold border ${styles[p] ?? 'bg-gray-100 text-gray-600 border-gray-200'} capitalize`}>
      {priority}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const s = status?.toLowerCase();
  const styles: Record<string, string> = {
    open: 'bg-blue-100 text-blue-700 border-blue-200',
    in_progress: 'bg-orange-100 text-orange-700 border-orange-200',
    resolved: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    closed: 'bg-gray-100 text-gray-600 border-gray-200',
    pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    under_review: 'bg-purple-100 text-purple-700 border-purple-200',
    rejected: 'bg-red-100 text-red-700 border-red-200',
  };
  const label = s === 'in_progress' ? 'In Progress' : s === 'under_review' ? 'Under Review' : status;
  return (
    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold border ${styles[s] ?? 'bg-gray-100 text-gray-600 border-gray-200'} capitalize`}>
      {label}
    </span>
  );
}

// ─── Ticket Detail Side Panel ─────────────────────────────────────────────────
function TicketPanel({
  ticket,
  onClose,
  onUpdated,
}: {
  ticket: SupportTicket;
  onClose: () => void;
  onUpdated: (t: SupportTicket) => void;
}) {
  const [fullTicket, setFullTicket] = useState<SupportTicket | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(true);
  const [response, setResponse] = useState('');
  const [sending, setSending] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoadingDetail(true);
        const res = await supportApi.getTicket(ticket.id);
        if (res.status && res.data) setFullTicket(res.data);
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
        setFullTicket((prev) => prev ? {
          ...prev,
          responses: [...(prev.responses ?? []), res.data],
        } : prev);
        setResponse('');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send response');
    } finally { setSending(false); }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    try {
      setUpdatingStatus(true);
      setError(null);
      const res = await supportApi.updateTicketStatus(ticket.id, newStatus);
      if (res.status && res.data) {
        setFullTicket(res.data);
        onUpdated(res.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    } finally { setUpdatingStatus(false); }
  };

  const t = fullTicket ?? ticket;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white w-full max-w-2xl h-full shadow-2xl flex flex-col">
        <button onClick={onClose}
          className="absolute -left-12 top-6 w-10 h-10 flex items-center justify-center rounded-full bg-white hover:bg-gray-100 shadow-lg">
          <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="flex-1 overflow-y-auto p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-6">Ticket Details</h2>

          {loadingDetail ? (
            <div className="space-y-4">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Ticket ID</p>
                  <p className="text-sm font-semibold text-gray-900">#{t.id}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium text-gray-500 mb-1">Status</p>
                  <StatusBadge status={t.status} />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Category</p>
                  <p className="text-sm font-semibold text-gray-900 capitalize">{t.category ?? '—'}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium text-gray-500 mb-1">Priority</p>
                  <PriorityBadge priority={t.priority} />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Created</p>
                  <p className="text-sm font-semibold text-gray-900">{formatDate(t.createdAt)}</p>
                </div>
                {t.closedAt && (
                  <div className="text-right">
                    <p className="text-xs font-medium text-gray-500 mb-1">Closed</p>
                    <p className="text-sm font-semibold text-gray-900">{formatDate(t.closedAt)}</p>
                  </div>
                )}
              </div>

              <div className="mb-5">
                <p className="text-sm font-bold text-gray-900 mb-1.5">Subject</p>
                <p className="text-sm font-semibold text-emerald-600">{t.subject}</p>
              </div>

              <div className="mb-5">
                <p className="text-sm font-bold text-gray-900 mb-1.5">Message</p>
                <p className="text-sm text-gray-600 leading-relaxed">{t.message}</p>
              </div>

              {/* Conversation thread */}
              {t.responses && t.responses.length > 0 && (
                <div className="mb-6">
                  <p className="text-sm font-bold text-gray-900 mb-3">Conversation ({t.responses.length})</p>
                  <div className="space-y-3">
                    {t.responses.map((r, i) => (
                      <div key={i} className={`p-3 rounded-xl text-sm ${
                        r.fromAdmin
                          ? 'bg-emerald-50 border border-emerald-200 ml-6'
                          : 'bg-gray-50 border border-gray-200 mr-6'
                      }`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-xs font-semibold ${r.fromAdmin ? 'text-emerald-700' : 'text-gray-700'}`}>
                            {r.fromAdmin ? 'Admin' : 'Customer'}
                          </span>
                          <span className="text-xs text-gray-400">{formatDate(r.createdAt)}</span>
                        </div>
                        <p className="text-gray-700">{r.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Response textarea */}
              <div className="mb-5">
                <label className="block text-sm font-bold text-gray-900 mb-2">Add Response</label>
                <textarea value={response} onChange={(e) => setResponse(e.target.value)}
                  placeholder="Type your response to the customer..."
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="border-t border-gray-200 p-6 space-y-3">
          <button onClick={handleRespond} disabled={sending || !response.trim()}
            className="w-full py-3 bg-gray-900 text-white rounded-lg text-sm font-semibold hover:bg-gray-800 disabled:opacity-50 transition-colors">
            {sending ? 'Sending...' : 'Send Response'}
          </button>
          <div className="flex gap-3">
            <button onClick={onClose}
              className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors">
              Close
            </button>
            {t.status !== 'resolved' && t.status !== 'closed' && (
              <button onClick={() => handleUpdateStatus('resolved')} disabled={updatingStatus}
                className="flex-1 py-3 bg-emerald-500 text-white rounded-lg text-sm font-semibold hover:bg-emerald-600 disabled:opacity-50 transition-colors">
                {updatingStatus ? 'Updating...' : 'Mark as Resolved'}
              </button>
            )}
            {t.status === 'open' && (
              <button onClick={() => handleUpdateStatus('closed')} disabled={updatingStatus}
                className="flex-1 py-3 bg-gray-500 text-white rounded-lg text-sm font-semibold hover:bg-gray-600 disabled:opacity-50 transition-colors">
                Close Ticket
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Dispute Detail Side Panel ────────────────────────────────────────────────
function DisputePanel({
  dispute,
  onClose,
  onResolved,
}: {
  dispute: Dispute;
  onClose: () => void;
  onResolved: (d: Dispute) => void;
}) {
  const [fullDispute, setFullDispute] = useState<Dispute | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(true);
  const [resolution, setResolution] = useState('');
  const [resolving, setResolving] = useState(false);
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoadingDetail(true);
        const res = await supportApi.getDispute(dispute.id);
        if (res.status && res.data) setFullDispute(res.data);
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
      if (res.status && res.data) {
        onResolved(res.data);
        onClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resolve dispute');
    } finally { setResolving(false); }
  };

  const d = fullDispute ?? dispute;
  const canAct = d.status !== 'resolved' && d.status !== 'rejected';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white w-full max-w-2xl h-full shadow-2xl flex flex-col">
        <button onClick={onClose}
          className="absolute -left-12 top-6 w-10 h-10 flex items-center justify-center rounded-full bg-white hover:bg-gray-100 shadow-lg">
          <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="flex-1 overflow-y-auto p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-6">Dispute Details</h2>

          {loadingDetail ? (
            <div className="space-y-4">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Dispute ID</p>
                  <p className="text-sm font-semibold text-gray-900">#{d.id}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium text-gray-500 mb-1">Status</p>
                  <StatusBadge status={d.status} />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Type</p>
                  <p className="text-sm font-semibold text-gray-900 capitalize">{d.type ?? '—'}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium text-gray-500 mb-1">Created</p>
                  <p className="text-sm font-semibold text-gray-900">{formatDate(d.createdAt)}</p>
                </div>
              </div>

              <div className="mb-5">
                <p className="text-sm font-bold text-gray-900 mb-1.5">Subject</p>
                <p className="text-sm font-semibold text-emerald-600">{d.subject}</p>
              </div>

              <div className="mb-5">
                <p className="text-sm font-bold text-gray-900 mb-1.5">Description</p>
                <p className="text-sm text-gray-600 leading-relaxed">{d.description}</p>
              </div>

              {d.resolution && (
                <div className="mb-5 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <p className="text-xs font-semibold text-emerald-700 mb-1">Resolution</p>
                  <p className="text-sm text-emerald-800">{d.resolution}</p>
                  {d.resolvedAt && <p className="text-xs text-emerald-600 mt-1">{formatDate(d.resolvedAt)}</p>}
                </div>
              )}

              {canAct && (
                <div className="mb-5">
                  <label className="block text-sm font-bold text-gray-900 mb-2">Resolution Message *</label>
                  <textarea value={resolution} onChange={(e) => setResolution(e.target.value)}
                    placeholder="Describe the resolution or reason for rejection..."
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
              )}
            </>
          )}
        </div>

        {canAct && (
          <div className="border-t border-gray-200 p-6">
            <div className="flex gap-3">
              <button onClick={onClose}
                className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors">
                Close
              </button>
              <button onClick={() => handleResolve('resolved')} disabled={resolving || !resolution.trim()}
                className="flex-1 py-3 bg-emerald-500 text-white rounded-lg text-sm font-semibold hover:bg-emerald-600 disabled:opacity-50 transition-colors">
                {resolving ? 'Processing...' : 'Resolve'}
              </button>
              <button onClick={() => handleResolve('rejected')} disabled={resolving || !resolution.trim()}
                className="flex-1 py-3 bg-red-500 text-white rounded-lg text-sm font-semibold hover:bg-red-600 disabled:opacity-50 transition-colors">
                Reject
              </button>
            </div>
          </div>
        )}
        {!canAct && (
          <div className="border-t border-gray-200 p-6">
            <button onClick={onClose} className="w-full py-3 border border-gray-300 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50">
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function SupportDisputesPage() {
  const router = useRouter();
  const { isAuthenticated, user: authUser } = useAuthStore();

  const [activeTab, setActiveTab] = useState<TabType>('support-tickets');

  // Tickets state
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [ticketStats, setTicketStats] = useState<TicketStats | null>(null);
  const [ticketPagination, setTicketPagination] = useState<{ total: number; last_page: number; from: number; to: number } | null>(null);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [loadingTicketStats, setLoadingTicketStats] = useState(true);
  const [ticketPage, setTicketPage] = useState(1);
  const [ticketSearch, setTicketSearch] = useState('');
  const [ticketStatus, setTicketStatus] = useState('');
  const [ticketPriority, setTicketPriority] = useState('');
  const [ticketCategory, setTicketCategory] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);

  // Disputes state
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [disputeStats, setDisputeStats] = useState<DisputeStats | null>(null);
  const [disputePagination, setDisputePagination] = useState<{ total: number; last_page: number; from: number; to: number } | null>(null);
  const [loadingDisputes, setLoadingDisputes] = useState(false);
  const [loadingDisputeStats, setLoadingDisputeStats] = useState(true);
  const [disputePage, setDisputePage] = useState(1);
  const [disputeSearch, setDisputeSearch] = useState('');
  const [disputeStatus, setDisputeStatus] = useState('');
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);

  const [error, setError] = useState<string | null>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchTicketStats = useCallback(async () => {
    try {
      setLoadingTicketStats(true);
      const res = await supportApi.getTicketStats();
      if (res.status) setTicketStats(res.data);
    } catch { /* silent */ } finally { setLoadingTicketStats(false); }
  }, []);

  const fetchTickets = useCallback(async (page: number, search: string, status: string, priority: string, category: string) => {
    try {
      setLoadingTickets(true);
      setError(null);
      const res = await supportApi.getTickets({
        page, per_page: 15,
        search: search || undefined,
        status: status || undefined,
        priority: priority || undefined,
        category: category || undefined,
      });
      if (res.status) {
        const d = res.data;
        if (d && typeof d === 'object' && 'data' in d) {
          const p = d as { data: SupportTicket[]; total: number; last_page: number; from: number; to: number };
          setTickets(p.data ?? []);
          setTicketPagination({ total: p.total, last_page: p.last_page, from: p.from, to: p.to });
        } else { setTickets([]); }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tickets');
    } finally { setLoadingTickets(false); }
  }, []);

  const fetchDisputeStats = useCallback(async () => {
    try {
      setLoadingDisputeStats(true);
      const res = await supportApi.getDisputeStats();
      if (res.status) setDisputeStats(res.data);
    } catch { /* silent */ } finally { setLoadingDisputeStats(false); }
  }, []);

  const fetchDisputes = useCallback(async (page: number, search: string, status: string) => {
    try {
      setLoadingDisputes(true);
      setError(null);
      const res = await supportApi.getDisputes({
        page, per_page: 15,
        search: search || undefined,
        status: status || undefined,
      });
      if (res.status) {
        const d = res.data;
        if (d && typeof d === 'object' && 'data' in d) {
          const p = d as { data: Dispute[]; total: number; last_page: number; from: number; to: number };
          setDisputes(p.data ?? []);
          setDisputePagination({ total: p.total, last_page: p.last_page, from: p.from, to: p.to });
        } else { setDisputes([]); }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load disputes');
    } finally { setLoadingDisputes(false); }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (activeTab === 'support-tickets') {
      fetchTicketStats();
      fetchTickets(ticketPage, ticketSearch, ticketStatus, ticketPriority, ticketCategory);
    } else {
      fetchDisputeStats();
      fetchDisputes(disputePage, disputeSearch, disputeStatus);
    }
  }, [isAuthenticated, activeTab]);

  useEffect(() => {
    if (!isAuthenticated || activeTab !== 'support-tickets') return;
    fetchTickets(ticketPage, ticketSearch, ticketStatus, ticketPriority, ticketCategory);
  }, [ticketPage, ticketStatus, ticketPriority, ticketCategory]);

  useEffect(() => {
    if (!isAuthenticated || activeTab !== 'disputes') return;
    fetchDisputes(disputePage, disputeSearch, disputeStatus);
  }, [disputePage, disputeStatus]);

  // ── 2. Auth guard after all hooks ──
  if (!isAuthenticated) return null;

  // ── 3. Handlers ──
  const handleTicketSearch = (val: string) => {
    setTicketSearch(val);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setTicketPage(1);
      fetchTickets(1, val, ticketStatus, ticketPriority, ticketCategory);
    }, 400);
  };

  const handleDisputeSearch = (val: string) => {
    setDisputeSearch(val);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setDisputePage(1);
      fetchDisputes(1, val, disputeStatus);
    }, 400);
  };

  const handleTicketUpdated = (updated: SupportTicket) => {
    setTickets((prev) => prev.map((t) => t.id === updated.id ? updated : t));
    setSelectedTicket(updated);
    fetchTicketStats();
  };

  const handleDisputeResolved = (resolved: Dispute) => {
    setDisputes((prev) => prev.map((d) => d.id === resolved.id ? resolved : d));
    fetchDisputeStats();
  };

  // Pagination helpers
  const buildPageNumbers = (current: number, total: number) =>
    Array.from({ length: Math.min(total, 5) }, (_, i) => {
      if (total <= 5) return i + 1;
      if (current <= 3) return i + 1;
      if (current >= total - 2) return total - 4 + i;
      return current - 2 + i;
    });

  const ticketPages = buildPageNumbers(ticketPage, ticketPagination?.last_page ?? 1);
  const disputePages = buildPageNumbers(disputePage, disputePagination?.last_page ?? 1);

  // ── 4. Render ──
  return (
    <div className="flex h-screen bg-gray-50 font-['DM_Sans']">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">

          {/* Header */}
          <div className="bg-white border-b border-gray-200 px-8 py-6">
         <DashboardHeader title="Support & Disputes" subtitle="Manage customer support tickets and disputes in one place" />
         </div>
          {/* Tabs */}
          <div className="bg-white border-b border-gray-200 px-8 py-4">
            <div className="flex items-center gap-6 border-b border-gray-200 -mb-4">
              {[
                { id: 'support-tickets', label: 'Support Tickets' },
                { id: 'disputes', label: 'Disputes' },
              ].map((tab) => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id as TabType)}
                  className={`pb-3 text-sm font-semibold transition-colors relative ${
                    activeTab === tab.id
                      ? 'text-emerald-600 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-emerald-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}>
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="p-8">
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* ── SUPPORT TICKETS ── */}
            {activeTab === 'support-tickets' && (
              <>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-bold text-emerald-700">Support Tickets</h2>
                    <p className="text-sm text-gray-500 mt-0.5">Manage and respond to customer support requests</p>
                  </div>
                  <button className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-500 text-white rounded-lg text-sm font-semibold hover:bg-emerald-600 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                    Export
                  </button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-4 gap-6 mb-6">
                  {[
                    { label: 'Total Tickets', value: ticketStats?.total ?? 0, color: 'text-gray-900' },
                    { label: 'Open Tickets', value: ticketStats?.open ?? 0, color: 'text-blue-600' },
                    { label: 'Resolved', value: ticketStats?.resolved ?? 0, color: 'text-emerald-600' },
                    { label: 'In Progress', value: ticketStats?.in_progress ?? 0, color: 'text-purple-600' },
                  ].map((s) => (
                    <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-5">
                      <p className="text-xs font-medium text-gray-500 mb-1">{s.label}</p>
                      {loadingTicketStats ? <Skeleton className="h-9 w-16" /> : (
                        <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
                      )}
                    </div>
                  ))}
                </div>

                {/* Filters */}
                <div className="flex items-center gap-3 mb-6">
                  <div className="flex-1 relative">
                    <svg className="w-4 h-4 text-gray-400 absolute left-3 top-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                    </svg>
                    <input type="text" value={ticketSearch} onChange={(e) => handleTicketSearch(e.target.value)}
                      placeholder="Search by Ticket ID, name or subject..."
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                  </div>
                  {[
                    { value: ticketStatus, setter: (v: string) => { setTicketStatus(v); setTicketPage(1); }, options: [['', 'All Status'], ['open', 'Open'], ['in_progress', 'In Progress'], ['resolved', 'Resolved'], ['closed', 'Closed']] },
                    { value: ticketPriority, setter: (v: string) => { setTicketPriority(v); setTicketPage(1); }, options: [['', 'All Priority'], ['high', 'High'], ['medium', 'Medium'], ['low', 'Low']] },
                    { value: ticketCategory, setter: (v: string) => { setTicketCategory(v); setTicketPage(1); }, options: [['', 'All Types'], ['dispute', 'Dispute'], ['technical', 'Technical'], ['billing', 'Billing'], ['support', 'Support']] },
                  ].map((f, i) => (
                    <select key={i} value={f.value} onChange={(e) => f.setter(e.target.value)}
                      className="px-4 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white">
                      {f.options.map(([val, label]) => <option key={val} value={val}>{label}</option>)}
                    </select>
                  ))}
                </div>

                {/* Table */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          {['ID', 'Subject', 'Category', 'Priority', 'Status', 'Created', 'Actions'].map((h) => (
                            <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {loadingTickets ? (
                          [...Array(6)].map((_, i) => (
                            <tr key={i}>{[...Array(7)].map((_, j) => (
                              <td key={j} className="px-6 py-4"><Skeleton className="h-5 w-full" /></td>
                            ))}</tr>
                          ))
                        ) : tickets.length === 0 ? (
                          <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-400 text-sm">No tickets found</td></tr>
                        ) : (
                          tickets.map((t) => (
                            <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-6 py-4 text-sm text-gray-600">#{t.id}</td>
                              <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">{t.subject}</td>
                              <td className="px-6 py-4 text-sm text-gray-600 capitalize">{t.category ?? '—'}</td>
                              <td className="px-6 py-4"><PriorityBadge priority={t.priority} /></td>
                              <td className="px-6 py-4"><StatusBadge status={t.status} /></td>
                              <td className="px-6 py-4 text-xs text-gray-500 whitespace-nowrap">{formatDate(t.createdAt)}</td>
                              <td className="px-6 py-4">
                                <button onClick={() => setSelectedTicket(t)}
                                  className="text-sm text-emerald-600 hover:text-emerald-700 font-medium">View</button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                    <p className="text-sm text-gray-500">
                      {ticketPagination ? `Showing ${ticketPagination.from ?? 0}–${ticketPagination.to ?? 0} of ${ticketPagination.total}` : ''}
                    </p>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setTicketPage((p) => Math.max(1, p - 1))} disabled={ticketPage === 1}
                        className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40">
                        <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                        </svg>
                      </button>
                      {ticketPages.map((p) => (
                        <button key={p} onClick={() => setTicketPage(p)}
                          className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium ${
                            ticketPage === p ? 'bg-emerald-500 text-white' : 'border border-gray-300 text-gray-600 hover:bg-gray-50'
                          }`}>{p}</button>
                      ))}
                      <button onClick={() => setTicketPage((p) => Math.min(ticketPagination?.last_page ?? 1, p + 1))} disabled={ticketPage === (ticketPagination?.last_page ?? 1)}
                        className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40">
                        <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ── DISPUTES ── */}
            {activeTab === 'disputes' && (
              <>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-bold text-emerald-700">Dispute Management</h2>
                    <p className="text-sm text-gray-500 mt-0.5">Handle transaction disputes and chargebacks</p>
                  </div>
                  <button className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-500 text-white rounded-lg text-sm font-semibold hover:bg-emerald-600 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                    Export
                  </button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-4 gap-6 mb-6">
                  {[
                    { label: 'Total Disputes', value: disputeStats?.total ?? 0, color: 'text-gray-900' },
                    { label: 'Open', value: disputeStats?.open ?? 0, color: 'text-red-600' },
                    { label: 'Resolved', value: disputeStats?.resolved ?? 0, color: 'text-emerald-600' },
                    { label: 'Under Review', value: disputeStats?.under_review ?? 0, color: 'text-purple-600' },
                  ].map((s) => (
                    <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-5">
                      <p className="text-xs font-medium text-gray-500 mb-1">{s.label}</p>
                      {loadingDisputeStats ? <Skeleton className="h-9 w-16" /> : (
                        <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
                      )}
                    </div>
                  ))}
                </div>

                {/* Filters */}
                <div className="flex items-center gap-3 mb-6">
                  <div className="flex-1 relative">
                    <svg className="w-4 h-4 text-gray-400 absolute left-3 top-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                    </svg>
                    <input type="text" value={disputeSearch} onChange={(e) => handleDisputeSearch(e.target.value)}
                      placeholder="Search by ID, subject or user..."
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                  </div>
                  <select value={disputeStatus} onChange={(e) => { setDisputeStatus(e.target.value); setDisputePage(1); }}
                    className="px-4 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white">
                    <option value="">All Status</option>
                    <option value="open">Open</option>
                    <option value="under_review">Under Review</option>
                    <option value="resolved">Resolved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>

                {/* Table */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          {['ID', 'Subject', 'Type', 'Status', 'Created', 'Actions'].map((h) => (
                            <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {loadingDisputes ? (
                          [...Array(6)].map((_, i) => (
                            <tr key={i}>{[...Array(6)].map((_, j) => (
                              <td key={j} className="px-6 py-4"><Skeleton className="h-5 w-full" /></td>
                            ))}</tr>
                          ))
                        ) : disputes.length === 0 ? (
                          <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400 text-sm">No disputes found</td></tr>
                        ) : (
                          disputes.map((d) => (
                            <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-6 py-4 text-sm text-gray-600">#{d.id}</td>
                              <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">{d.subject}</td>
                              <td className="px-6 py-4 text-sm text-gray-600 capitalize">{d.type ?? '—'}</td>
                              <td className="px-6 py-4"><StatusBadge status={d.status} /></td>
                              <td className="px-6 py-4 text-xs text-gray-500 whitespace-nowrap">{formatDate(d.createdAt)}</td>
                              <td className="px-6 py-4">
                                <button onClick={() => setSelectedDispute(d)}
                                  className="text-sm text-emerald-600 hover:text-emerald-700 font-medium">View</button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                    <p className="text-sm text-gray-500">
                      {disputePagination ? `Showing ${disputePagination.from ?? 0}–${disputePagination.to ?? 0} of ${disputePagination.total}` : ''}
                    </p>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setDisputePage((p) => Math.max(1, p - 1))} disabled={disputePage === 1}
                        className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40">
                        <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                        </svg>
                      </button>
                      {disputePages.map((p) => (
                        <button key={p} onClick={() => setDisputePage(p)}
                          className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium ${
                            disputePage === p ? 'bg-emerald-500 text-white' : 'border border-gray-300 text-gray-600 hover:bg-gray-50'
                          }`}>{p}</button>
                      ))}
                      <button onClick={() => setDisputePage((p) => Math.min(disputePagination?.last_page ?? 1, p + 1))} disabled={disputePage === (disputePagination?.last_page ?? 1)}
                        className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40">
                        <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </main>

      {/* Ticket side panel */}
      {selectedTicket && (
        <TicketPanel
          ticket={selectedTicket}
          onClose={() => setSelectedTicket(null)}
          onUpdated={handleTicketUpdated}
        />
      )}

      {/* Dispute side panel */}
      {selectedDispute && (
        <DisputePanel
          dispute={selectedDispute}
          onClose={() => setSelectedDispute(null)}
          onResolved={handleDisputeResolved}
        />
      )}
    </div>
  );
}