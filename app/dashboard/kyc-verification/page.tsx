'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store/authStore';
import { kycApi } from '@/lib/api/client';
import type { AnyVerification, KYCVerification, KYBVerification, VerificationStats } from '@/lib/api/client';
import Sidebar from '@/components/Sidebar';
import DashboardHeader from '@/components/DashboardHeader';

// ─── Types ────────────────────────────────────────────────────────────────────
type TypeFilter   = 'all' | 'kyc' | 'kyb';
type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected' | 'under_review';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getInitials(v: AnyVerification) {
  if (v.type === 'kyb') return (v as KYBVerification).businessName?.slice(0, 2).toUpperCase() ?? '??';
  const u = v.user;
  if (!u) return '??';
  return `${u.firstName?.[0] ?? ''}${u.lastName?.[0] ?? ''}`.toUpperCase() || '??';
}

function getDisplayName(v: AnyVerification) {
  if (v.type === 'kyb') return (v as KYBVerification).businessName ?? v.user?.email ?? '—';
  if (!v.user) return '—';
  return [v.user.firstName, v.user.lastName].filter(Boolean).join(' ') || v.user.email || '—';
}

function formatDate(s: string | null | undefined) {
  if (!s) return '—';
  try { return new Date(s).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }); }
  catch { return s; }
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-100 rounded-lg ${className ?? ''}`} />;
}

// ─── Risk badge ───────────────────────────────────────────────────────────────
function RiskBadge({ status }: { status: string }) {
  const isHigh = status === 'rejected';
  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-bold ${
      isHigh ? 'text-red-500' : 'text-emerald-600'
    }`}>
      {isHigh ? 'HIGH RISK' : 'LOW RISK'}
    </span>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const s = status?.toLowerCase().replace('-', '_');
  const map: Record<string, { bg: string; text: string; label: string }> = {
    pending:       { bg: 'bg-amber-400',   text: 'text-white', label: 'PENDING' },
    under_review:  { bg: 'bg-blue-500',    text: 'text-white', label: 'UNDER REVIEW' },
    'under-review':{ bg: 'bg-blue-500',    text: 'text-white', label: 'UNDER REVIEW' },
    approved:      { bg: 'bg-emerald-500', text: 'text-white', label: 'APPROVED' },
    rejected:      { bg: 'bg-red-400',     text: 'text-white', label: 'REJECTED' },
    not_started:   { bg: 'bg-gray-200',    text: 'text-gray-600', label: 'NOT STARTED' },
  };
  const style = map[s] ?? { bg: 'bg-gray-200', text: 'text-gray-600', label: status.toUpperCase() };
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap ${style.bg} ${style.text}`}>
      {style.label}
    </span>
  );
}

// ─── Filter pill button ────────────────────────────────────────────────────────
function FilterPill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${
        active ? 'bg-emerald-500 text-white' : 'bg-transparent text-gray-500 hover:text-gray-700'
      }`}
    >
      {children}
    </button>
  );
}

// ─── Verification card avatar ─────────────────────────────────────────────────
function VerificationAvatar({ v }: { v: AnyVerification }) {
  const isKYB = v.type === 'kyb';
  return (
    <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
      isKYB ? 'bg-purple-100' : 'bg-blue-50'
    }`}>
      {isKYB ? (
        <svg className="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
        </svg>
      ) : (
        <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
        </svg>
      )}
    </div>
  );
}

// ─── Review Modal (slide-in from right) ───────────────────────────────────────
interface ReviewModalProps {
  verification: AnyVerification;
  onClose: () => void;
  onApprove: () => void;
  onReject: (reason: string) => void;
  onResubmit: (reason: string) => void;
  isActing: boolean;
}

function ReviewModal({ verification, onClose, onApprove, onReject, onResubmit, isActing }: ReviewModalProps) {
  const [rejectReason,      setRejectReason]      = useState('');
  const [resubmitReason,    setResubmitReason]    = useState('');
  const [showRejectInput,   setShowRejectInput]   = useState(false);
  const [showResubmitInput, setShowResubmitInput] = useState(false);
  const isKYB = verification.type === 'kyb';
  const kyb   = isKYB ? (verification as KYBVerification) : null;

  const isApproved = verification.status === 'approved';
  const isRejected = verification.status === 'rejected';

  // Field row component
  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="border border-gray-200 rounded-xl px-4 py-3">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <div className="text-sm font-semibold text-gray-900">{children}</div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white w-full max-w-md h-full overflow-y-auto shadow-2xl flex flex-col">

        {/* Close button — top left of modal */}
        <div className="flex items-center p-5 border-b border-gray-100">
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-full transition-colors mr-4"
          >
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div>
            <h2 className="text-base font-bold text-gray-900">{getDisplayName(verification)}</h2>
            <p className="text-xs text-gray-400">
              {verification.type === 'kyc'
                ? `KYC-${String(verification.id).padStart(3, '0')}`
                : `KYB-${String(verification.id).padStart(3, '0')}`}
            </p>
          </div>
        </div>

        <div className="flex-1 p-5 space-y-3 overflow-y-auto">
          {/* Type */}
          <Field label="Type">
            {isKYB ? 'KYB' : 'KYC'}
          </Field>

          {/* Status */}
          <Field label="Status">
            <div className="flex items-center justify-between">
              <span>{verification.status.charAt(0).toUpperCase() + verification.status.slice(1).replace('-', ' ')}</span>
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </div>
          </Field>

          {/* Risk Level */}
          <Field label="Risk Level">
            <span className={verification.status === 'rejected' ? 'text-red-500' : 'text-emerald-500'}>
              {verification.status === 'rejected' ? 'HIGH' : 'LOW'}
            </span>
          </Field>

          {/* Country */}
          <Field label="Country">
            {(verification as any).country ?? kyb?.country ?? 'Nigeria'}
          </Field>

          {/* Rejection reason if present */}
          {verification.rejectionReason && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <p className="text-xs text-gray-400 mb-1">Rejection Reason</p>
              <p className="text-sm text-red-700">{verification.rejectionReason}</p>
            </div>
          )}

          {/* KYB extras */}
          {isKYB && kyb?.businessType && (
            <Field label="Business Type">
              {kyb.businessType.replace(/_/g, ' ')}
            </Field>
          )}

          {/* Directors */}
          {isKYB && kyb && (kyb.directors?.length ?? 0) > 0 && (
            <div>
              <p className="text-sm font-bold text-gray-900 mb-2">Directors</p>
              <div className="space-y-2">
                {kyb.directors.map((d) => (
                  <div key={d.id} className="border border-gray-200 rounded-xl px-4 py-3">
                    <p className="text-sm font-semibold text-gray-900">{d.name}</p>
                    <p className="text-xs text-gray-400">{d.email}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Documents */}
          <div>
            <p className="text-sm font-bold text-gray-900 mb-2">Documents</p>
            {(verification.documents?.length ?? 0) === 0 ? (
              <p className="text-sm text-gray-400">No documents submitted</p>
            ) : (
              <div className="space-y-2">
                {verification.documents!.map((doc, i) => (
                  <div key={i} className="flex items-center justify-between border border-gray-200 rounded-xl px-4 py-3">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                      </svg>
                      <span className="text-sm text-gray-700">Document {i + 1}</span>
                    </div>
                    {typeof doc === 'string' && (
                      <a href={doc} target="_blank" rel="noopener noreferrer"
                        className="text-sm font-semibold text-emerald-600 hover:text-emerald-700">
                        View
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Reject reason textarea */}
          {showRejectInput && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Rejection *</label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Provide a clear reason..."
                rows={3}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-400"
              />
            </div>
          )}
        </div>

        {/* Action buttons */}
        {!isApproved && (
          <div className="p-5 border-t border-gray-100 space-y-3">
            {/* Reject reason input */}
            {showRejectInput && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Rejection *</label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Provide a clear reason..."
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-400"
                />
              </div>
            )}
            {/* Resubmit reason input */}
            {showResubmitInput && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Resubmission *</label>
                <textarea
                  value={resubmitReason}
                  onChange={(e) => setResubmitReason(e.target.value)}
                  placeholder="Explain what needs to be corrected..."
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
            )}
            {!showRejectInput && !showResubmitInput ? (
              <div className="flex gap-3">
                <button onClick={onApprove} disabled={isActing} className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-50">
                  {isActing ? 'Processing...' : 'Approve'}
                </button>
                <button onClick={() => setShowRejectInput(true)} disabled={isActing} className="flex-1 py-3 bg-red-400 hover:bg-red-500 text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-50">
                  Reject
                </button>
                <button onClick={() => setShowResubmitInput(true)} disabled={isActing} className="flex-1 py-3 bg-amber-50 hover:bg-amber-100 text-amber-600 rounded-xl text-sm font-bold transition-colors disabled:opacity-50 whitespace-nowrap">
                  Request Resubmit
                </button>
              </div>
            ) : showRejectInput ? (
              <div className="flex gap-3">
                <button onClick={() => setShowRejectInput(false)} className="flex-1 py-3 border border-gray-200 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-50 transition-colors">Cancel</button>
                <button onClick={() => onReject(rejectReason)} disabled={isActing || !rejectReason.trim()} className="flex-1 py-3 bg-red-400 hover:bg-red-500 text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-50">
                  {isActing ? 'Rejecting...' : 'Confirm Reject'}
                </button>
              </div>
            ) : (
              <div className="flex gap-3">
                <button onClick={() => setShowResubmitInput(false)} className="flex-1 py-3 border border-gray-200 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-50 transition-colors">Cancel</button>
                <button onClick={() => onResubmit(resubmitReason)} disabled={isActing || !resubmitReason.trim()} className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-50">
                  {isActing ? 'Sending...' : 'Send Request'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
//  PAGE
// ═════════════════════════════════════════════════════════════════════════════
export default function KYCVerificationPage() {
  const { isAuthenticated } = useAuthStore();

  const [typeFilter,   setTypeFilter]   = useState<TypeFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [currentPage,  setCurrentPage]  = useState(1);

  const [verifications, setVerifications] = useState<AnyVerification[]>([]);
  const [stats,         setStats]         = useState<VerificationStats | null>(null);
  const [pagination,    setPagination]    = useState<{ total: number; last_page: number; from: number; to: number } | null>(null);
  const [isLoading,     setIsLoading]     = useState(true);
  const [loadingStats,  setLoadingStats]  = useState(true);
  const [error,         setError]         = useState<string | null>(null);

  const [selectedVerification, setSelectedVerification] = useState<AnyVerification | null>(null);
  const [isActing,             setIsActing]             = useState(false);
  const [actionError,          setActionError]          = useState<string | null>(null);

  const fetchVerifications = useCallback(async (page: number, type: TypeFilter, status: StatusFilter) => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await kycApi.getAll({
        page, per_page: 8,
        type:   type   !== 'all' ? type   : undefined,
        status: status !== 'all' ? status : undefined,
      });
      if (res.status) {
        const d = res.data as any;
        if (d && 'data' in d) {
          setVerifications(d.data ?? []);
          setPagination({ total: d.total, last_page: d.last_page, from: d.from, to: d.to });
        } else {
          setVerifications([]);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load verifications');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      setLoadingStats(true);
      const res = await kycApi.getStats();
      if (res.status) setStats(res.data);
    } catch { /* silent */ } finally {
      setLoadingStats(false);
    }
  }, []);

  useEffect(() => { if (isAuthenticated) fetchStats(); }, [isAuthenticated, fetchStats]);
  useEffect(() => {
    if (isAuthenticated) fetchVerifications(currentPage, typeFilter, statusFilter);
  }, [isAuthenticated, currentPage, typeFilter, statusFilter, fetchVerifications]);

  if (!isAuthenticated) return null;

  const handleApprove = async () => {
    if (!selectedVerification) return;
    try {
      setIsActing(true);
      setActionError(null);
      if (selectedVerification.type === 'kyb') await kycApi.approveKYB(selectedVerification.id);
      else await kycApi.approveKYC(selectedVerification.id);
      setVerifications((prev) => prev.map((v) => v.id === selectedVerification.id ? { ...v, status: 'approved' as const } : v));
      setSelectedVerification(null);
      fetchStats();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setIsActing(false);
    }
  };

  const handleReject = async (reason: string) => {
    if (!selectedVerification || !reason.trim()) return;
    try {
      setIsActing(true);
      setActionError(null);
      if (selectedVerification.type === 'kyb') await kycApi.rejectKYB(selectedVerification.id, reason);
      else await kycApi.rejectKYC(selectedVerification.id, reason);
      setVerifications((prev) => prev.map((v) => v.id === selectedVerification.id ? { ...v, status: 'rejected' as const, rejectionReason: reason } : v));
      setSelectedVerification(null);
      fetchStats();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setIsActing(false);
    }
  };

  const handleResubmit = async (reason: string) => {
    if (!selectedVerification || !reason.trim()) return;
    try {
      setIsActing(true);
      setActionError(null);
      await kycApi.requestResubmit(selectedVerification.id, reason);
      setVerifications((prev) => prev.map((v) => v.id === selectedVerification.id ? { ...v, status: 'not_started' as const } : v));
      setSelectedVerification(null);
      fetchStats();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Resubmit request failed');
    } finally {
      setIsActing(false);
    }
  };

  const totalPages  = pagination?.last_page ?? 1;
  const pageNumbers = Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
    if (totalPages <= 5) return i + 1;
    if (currentPage <= 3) return i + 1;
    if (currentPage >= totalPages - 2) return totalPages - 4 + i;
    return currentPage - 2 + i;
  });

  const TYPE_FILTERS: { id: TypeFilter; label: string; icon?: React.ReactNode }[] = [
    { id: 'all', label: 'All' },
    {
      id: 'kyc', label: 'KYC (Individual)',
      icon: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0" /></svg>,
    },
    {
      id: 'kyb', label: 'KYB (Business)',
      icon: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" /></svg>,
    },
  ];

  const STATUS_FILTERS: { id: StatusFilter; label: string }[] = [
    { id: 'all',          label: 'All' },
    { id: 'pending',      label: 'Pending' },
    { id: 'under_review', label: 'Under Review' },
    { id: 'rejected',     label: 'Rejected' },
  ];

  const showingCount = pagination ? pagination.to - (pagination.from - 1) : verifications.length;

  return (
    <div className="flex h-screen bg-[#F8F9FA] font-['DM_Sans',sans-serif]">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* ── Page header */}
        <div className="bg-white border-b border-gray-200 px-8 py-5 flex-shrink-0">
          <DashboardHeader
            title="KYC/KYB Verification"
            subtitle="Review and approve customer and business verifications"
          />
        </div>

        {/* ── Filter bar */}
        <div className="bg-white border-b border-gray-100 px-8 py-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            {/* Type filters */}
            <div className="flex items-center gap-1">
              <span className="text-sm text-gray-500 mr-2">Type</span>
              <div className="flex items-center border border-gray-200 rounded-full p-0.5 bg-white">
                {TYPE_FILTERS.map((f) => (
                  <FilterPill key={f.id} active={typeFilter === f.id} onClick={() => { setTypeFilter(f.id); setCurrentPage(1); }}>
                    {f.icon}
                    {f.label}
                  </FilterPill>
                ))}
              </div>
            </div>

            {/* Status filters */}
            <div className="flex items-center gap-1">
              <span className="text-sm text-gray-500 mr-2">Status</span>
              <div className="flex items-center border border-gray-200 rounded-full p-0.5 bg-white">
                {STATUS_FILTERS.map((f) => (
                  <FilterPill key={f.id} active={statusFilter === f.id} onClick={() => { setStatusFilter(f.id); setCurrentPage(1); }}>
                    {f.label}
                  </FilterPill>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-8 py-6 space-y-3">

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl mb-2">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
            {actionError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl mb-2">
                <p className="text-sm text-red-600">{actionError}</p>
              </div>
            )}

            {/* "Showing X applications" pill */}
            <div className="bg-gray-100 rounded-lg px-4 py-2 inline-block mb-1">
              <p className="text-sm text-gray-600">
                {isLoading ? 'Loading...' : `Showing ${pagination?.total ?? verifications.length} applications`}
              </p>
            </div>

            {/* Verification cards */}
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-2xl" />)}
              </div>
            ) : verifications.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
                <p className="text-gray-400 text-sm">No verifications found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {verifications.map((v) => (
                  <div
                    key={`${v.type}-${v.id}`}
                    className="bg-white rounded-2xl border border-gray-200 px-6 py-5 flex items-center justify-between"
                  >
                    {/* Left — avatar + info */}
                    <div className="flex items-start gap-4 min-w-0">
                      <VerificationAvatar v={v} />
                      <div className="min-w-0">
                        {/* Name + risk badge */}
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <h3 className="text-base font-bold text-gray-900">{getDisplayName(v)}</h3>
                          <RiskBadge status={v.status} />
                        </div>
                        {/* Email */}
                        <p className="text-sm text-gray-400 mb-2">{v.user?.email ?? '—'}</p>
                        {/* Meta row */}
                        <div className="flex items-center gap-4 flex-wrap">
                          <span className="flex items-center gap-1 text-xs text-gray-400">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25" />
                            </svg>
                            {v.documents?.length ?? 0} documents
                          </span>
                          <span className="text-xs text-gray-400">
                            ID: {v.type.toUpperCase()}-{String(v.id).padStart(3, '0')}
                          </span>
                          {((v as any).country ?? (v as KYBVerification).country) && (
                            <span className="text-xs text-gray-400">
                              Country: {(v as any).country ?? (v as KYBVerification).country}
                            </span>
                          )}
                          <span className="text-xs text-gray-400">
                            Submitted: {formatDate(v.submittedAt)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right — status badge + Review button */}
                    <div className="flex items-center gap-3 flex-shrink-0 ml-6">
                      <StatusBadge status={v.status} />
                      <button
                        onClick={() => { setActionError(null); setSelectedVerification(v); }}
                        className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-semibold transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Review
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination — "Showing X to Y of Z results" left, page numbers right */}
            {!isLoading && verifications.length > 0 && (
              <div className="flex items-center justify-between pt-4">
                <p className="text-sm text-gray-500">
                  Showing {pagination?.from ?? 1} to {pagination?.to ?? verifications.length} of {(pagination?.total ?? 0).toLocaleString()} results
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 text-gray-600"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                    </svg>
                  </button>
                  {pageNumbers.map((p) => (
                    <button
                      key={p}
                      onClick={() => setCurrentPage(p)}
                      className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                        currentPage === p ? 'bg-emerald-500 text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                  {totalPages > 5 && currentPage < totalPages - 2 && (
                    <>
                      <span className="w-8 h-8 flex items-center justify-center text-gray-400 text-sm">…</span>
                      <button
                        onClick={() => setCurrentPage(totalPages)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50"
                      >
                        {totalPages}
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 text-gray-600"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Review modal */}
      {selectedVerification && (
        <ReviewModal
          verification={selectedVerification}
          onClose={() => setSelectedVerification(null)}
          onApprove={handleApprove}
          onReject={handleReject}
          onResubmit={handleResubmit}
          isActing={isActing}
        />
      )}
    </div>
  );
}