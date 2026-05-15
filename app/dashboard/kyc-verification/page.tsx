'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { kycApi } from '@/lib/api/client';
import type { AnyVerification, KYCVerification, KYBVerification, VerificationStats } from '@/lib/api/client';
import { AUTH_ROUTES } from '@/constants/auth';
import Sidebar from '@/components/Sidebar';

type TypeFilter = 'all' | 'kyc' | 'kyb';
type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected';

function getInitials(v: AnyVerification) {
  if (v.type === 'kyb') {
    const kyb = v as KYBVerification;
    return (kyb.businessName ?? '??').slice(0, 2).toUpperCase();
  }
  const u = v.user;
  return `${u.firstName?.[0] ?? ''}${u.lastName?.[0] ?? ''}`.toUpperCase() || '??';
}

function getDisplayName(v: AnyVerification) {
  if (v.type === 'kyb') return (v as KYBVerification).businessName ?? v.user.email;
  return [v.user.firstName, v.user.lastName].filter(Boolean).join(' ') || v.user.email;
}

function formatDate(s: string | null) {
  if (!s) return '—';
  try { return new Date(s).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }); }
  catch { return s; }
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-100 rounded-lg ${className}`} />;
}

function RiskBadge({ status }: { status: string }) {
  const isHigh = status === 'rejected';
  return (
    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
      isHigh ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
    }`}>
      {isHigh ? 'HIGH RISK' : 'LOW RISK'}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    'under-review': 'bg-blue-100 text-blue-700',
    approved: 'bg-emerald-100 text-emerald-700',
    rejected: 'bg-red-100 text-red-700',
    not_started: 'bg-gray-100 text-gray-600',
  };
  const labels: Record<string, string> = {
    pending: 'PENDING',
    'under-review': 'UNDER REVIEW',
    approved: 'APPROVED',
    rejected: 'REJECTED',
    not_started: 'NOT STARTED',
  };
  return (
    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${map[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {labels[status] ?? status.toUpperCase()}
    </span>
  );
}

function StatCard({ label, value, color, loading }: {
  label: string; value: number; color: string; loading: boolean;
}) {
  const colors: Record<string, string> = {
    gray: 'text-gray-900', green: 'text-emerald-600',
    yellow: 'text-yellow-600', red: 'text-red-600', blue: 'text-blue-600',
  };
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
      {loading ? <Skeleton className="h-8 w-16 mt-1" /> : (
        <p className={`text-2xl font-bold mt-1 ${colors[color] ?? 'text-gray-900'}`}>{value}</p>
      )}
    </div>
  );
}

// ─── Review Modal ─────────────────────────────────────────────────────────────
function ReviewModal({
  verification,
  onClose,
  onApprove,
  onReject,
  isActing,
}: {
  verification: AnyVerification;
  onClose: () => void;
  onApprove: () => void;
  onReject: (reason: string) => void;
  isActing: boolean;
}) {
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
  const isKYB = verification.type === 'kyb';
  const kyb = isKYB ? (verification as KYBVerification) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white w-full max-w-lg rounded-xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
        >
          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <div className="mb-5">
          <h2 className="text-lg font-bold text-gray-900">{getDisplayName(verification)}</h2>
          <p className="text-sm text-gray-500">{verification.type.toUpperCase()} • ID: {verification.id}</p>
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-2 gap-4 mb-5">
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Type</p>
            <p className="text-sm font-semibold text-gray-900">{isKYB ? 'KYB (Business)' : 'KYC (Individual)'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Status</p>
            <StatusBadge status={verification.status} />
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Email</p>
            <p className="text-sm font-medium text-gray-900">{verification.user.email}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Submitted</p>
            <p className="text-sm font-medium text-gray-900">{formatDate(verification.submittedAt)}</p>
          </div>
          {isKYB && kyb && (
            <>
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Business Type</p>
                <p className="text-sm font-medium text-gray-900 capitalize">{kyb.businessType?.replace(/_/g, ' ')}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Country</p>
                <p className="text-sm font-medium text-gray-900">{kyb.country ?? '—'}</p>
              </div>
            </>
          )}
          {verification.rejectionReason && (
            <div className="col-span-2">
              <p className="text-xs text-gray-400 mb-0.5">Rejection Reason</p>
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-700">{verification.rejectionReason}</p>
              </div>
            </div>
          )}
        </div>

        {/* KYB Directors */}
        {isKYB && kyb && kyb.directors?.length > 0 && (
          <div className="mb-5">
            <h3 className="text-sm font-bold text-gray-900 mb-3">Directors</h3>
            <div className="space-y-2">
              {kyb.directors.map((d) => (
                <div key={d.id} className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium text-gray-900">{d.name}</p>
                  <p className="text-xs text-gray-500">{d.email}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Documents */}
        <div className="mb-6">
          <h3 className="text-sm font-bold text-gray-900 mb-3">
            Documents ({verification.documents?.length ?? 0})
          </h3>
          {verification.documents?.length ? (
            <div className="space-y-2">
              {verification.documents.map((doc, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                    <span className="text-sm font-medium text-gray-700">Document {i + 1}</span>
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
          ) : (
            <p className="text-sm text-gray-400">No documents submitted</p>
          )}
        </div>

        {/* Reject reason input */}
        {showRejectInput && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Rejection *</label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Provide a clear reason..."
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
        )}

        {/* Action buttons */}
        {verification.status !== 'approved' && (
          <div className="flex gap-3">
            {!showRejectInput ? (
              <>
                <button
                  onClick={onApprove}
                  disabled={isActing}
                  className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  {isActing ? 'Processing...' : 'Approve'}
                </button>
                <button
                  onClick={() => setShowRejectInput(true)}
                  disabled={isActing}
                  className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  Reject
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setShowRejectInput(false)}
                  className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => onReject(rejectReason)}
                  disabled={isActing || !rejectReason.trim()}
                  className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  {isActing ? 'Rejecting...' : 'Confirm Reject'}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function KYCVerificationPage() {
  const router = useRouter();
  const { isAuthenticated, user: authUser } = useAuthStore();

  // Filters
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [currentPage, setCurrentPage] = useState(1);

  // Data
  const [verifications, setVerifications] = useState<AnyVerification[]>([]);
  const [stats, setStats] = useState<VerificationStats | null>(null);
  const [pagination, setPagination] = useState<{ total: number; last_page: number; from: number; to: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal
  const [selectedVerification, setSelectedVerification] = useState<AnyVerification | null>(null);
  const [isActing, setIsActing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);


  const fetchVerifications = useCallback(async (
    page: number, type: TypeFilter, status: StatusFilter
  ) => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await kycApi.getAll({
        page,
        per_page: 15,
        type: type !== 'all' ? type : undefined,
        status: status !== 'all' ? status : undefined,
      });
      if (res.status) {
        const d = res.data;
        if (d && typeof d === 'object' && 'data' in d) {
          const p = d as { data: AnyVerification[]; total: number; last_page: number; from: number; to: number };
          setVerifications(p.data ?? []);
          setPagination({ total: p.total, last_page: p.last_page, from: p.from, to: p.to });
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

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchStats();
  }, [isAuthenticated, fetchStats]);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchVerifications(currentPage, typeFilter, statusFilter);
  }, [isAuthenticated, currentPage, typeFilter, statusFilter, fetchVerifications]);

  // ── 2. Auth guard — after all hooks ──
  if (!isAuthenticated) return null;

  // ── 3. Handlers ──
  const handleApprove = async () => {
    if (!selectedVerification) return;
    try {
      setIsActing(true);
      setActionError(null);
      if (selectedVerification.type === 'kyb') {
        await kycApi.approveKYB(selectedVerification.id);
      } else {
        await kycApi.approveKYC(selectedVerification.id);
      }
      // Update in list
      setVerifications((prev) =>
        prev.map((v) => v.id === selectedVerification.id ? { ...v, status: 'approved' as const } : v)
      );
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
      if (selectedVerification.type === 'kyb') {
        await kycApi.rejectKYB(selectedVerification.id, reason);
      } else {
        await kycApi.rejectKYC(selectedVerification.id, reason);
      }
      setVerifications((prev) =>
        prev.map((v) => v.id === selectedVerification.id ? { ...v, status: 'rejected' as const, rejectionReason: reason } : v)
      );
      setSelectedVerification(null);
      fetchStats();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setIsActing(false);
    }
  };

  const totalPages = pagination?.last_page ?? 1;
  const pageNumbers = Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
    if (totalPages <= 5) return i + 1;
    if (currentPage <= 3) return i + 1;
    if (currentPage >= totalPages - 2) return totalPages - 4 + i;
    return currentPage - 2 + i;
  });

  // ── 4. Render ──
  return (
    <div className="flex h-screen bg-gray-50 font-['DM_Sans']">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">

          {/* Header */}
          <div className="bg-white border-b border-gray-200 px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">KYC/KYB Verification</h1>
                <p className="text-sm text-gray-500 mt-0.5">Review and approve customer and business verifications</p>
              </div>
              <div className="flex items-center gap-4">
                <button className="relative p-2 hover:bg-gray-100 rounded-xl">
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312.665" />
                  </svg>
                </button>
                <div className="flex items-center gap-3 cursor-pointer">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white text-xs font-bold">
                    {((authUser?.first_name?.[0] ?? '') + (authUser?.last_name?.[0] ?? '')) || 'A'}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{authUser?.first_name ?? authUser?.email ?? 'Admin'}</p>
                    <p className="text-xs text-gray-500">Admin</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="bg-white border-b border-gray-200 px-8 py-5">
            <div className="grid grid-cols-8 gap-4">
              <StatCard label="KYC Total" value={stats?.kyc.total ?? 0} color="gray" loading={loadingStats} />
              <StatCard label="KYC Pending" value={stats?.kyc.pending ?? 0} color="yellow" loading={loadingStats} />
              <StatCard label="KYC Approved" value={stats?.kyc.approved ?? 0} color="green" loading={loadingStats} />
              <StatCard label="KYC Rejected" value={stats?.kyc.rejected ?? 0} color="red" loading={loadingStats} />
              <StatCard label="KYB Total" value={stats?.kyb.total ?? 0} color="gray" loading={loadingStats} />
              <StatCard label="KYB Pending" value={stats?.kyb.pending ?? 0} color="yellow" loading={loadingStats} />
              <StatCard label="KYB Approved" value={stats?.kyb.approved ?? 0} color="green" loading={loadingStats} />
              <StatCard label="KYB Rejected" value={stats?.kyb.rejected ?? 0} color="red" loading={loadingStats} />
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white border-b border-gray-200 px-8 py-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-600">Type:</span>
                {(['all', 'kyc', 'kyb'] as TypeFilter[]).map((t) => (
                  <button key={t} onClick={() => { setTypeFilter(t); setCurrentPage(1); }}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                      typeFilter === t ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}>
                    {t === 'all' ? 'All' : t === 'kyc' ? 'KYC (Individual)' : 'KYB (Business)'}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-sm font-medium text-gray-600">Status:</span>
                {(['all', 'pending', 'approved', 'rejected'] as StatusFilter[]).map((s) => (
                  <button key={s} onClick={() => { setStatusFilter(s); setCurrentPage(1); }}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold capitalize transition-colors ${
                      statusFilter === s ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}>
                    {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* List */}
          <div className="p-8">
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
            {actionError && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-sm text-red-600">{actionError}</p>
              </div>
            )}

            <p className="text-sm text-gray-500 mb-6">
              {isLoading ? 'Loading...' : `Showing ${pagination?.from ?? 0}–${pagination?.to ?? 0} of ${pagination?.total ?? 0} verifications`}
            </p>

            <div className="space-y-4">
              {isLoading ? (
                [...Array(5)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)
              ) : verifications.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                  <p className="text-gray-400 text-sm">No verifications found</p>
                </div>
              ) : (
                verifications.map((v) => (
                  <div key={`${v.type}-${v.id}`} className="bg-white rounded-xl border border-gray-200 p-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        v.type === 'kyc' ? 'bg-blue-100' : 'bg-purple-100'
                      }`}>
                        <span className={`text-sm font-bold ${v.type === 'kyc' ? 'text-blue-700' : 'text-purple-700'}`}>
                          {getInitials(v)}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="text-base font-bold text-gray-900">{getDisplayName(v)}</h3>
                          <RiskBadge status={v.status} />
                          <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${
                            v.type === 'kyc' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                          }`}>
                            {v.type.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 mb-2">{v.user.email}</p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>{v.documents?.length ?? 0} documents</span>
                          <span>ID: {v.id}</span>
                          {v.type === 'kyb' && <span>{(v as KYBVerification).country ?? '—'}</span>}
                          <span>Submitted: {formatDate(v.submittedAt)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge status={v.status} />
                      <button
                        onClick={() => { setActionError(null); setSelectedVerification(v); }}
                        className="px-5 py-2.5 bg-emerald-500 text-white rounded-lg text-sm font-semibold hover:bg-emerald-600 transition-colors"
                      >
                        Review
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Pagination */}
            {!isLoading && verifications.length > 0 && (
              <div className="mt-6 flex items-center justify-center gap-1">
                <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}
                  className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40">
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                  </svg>
                </button>
                {pageNumbers.map((p) => (
                  <button key={p} onClick={() => setCurrentPage(p)}
                    className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium ${
                      currentPage === p ? 'bg-emerald-500 text-white' : 'border border-gray-300 text-gray-600 hover:bg-gray-50'
                    }`}>
                    {p}
                  </button>
                ))}
                <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                  className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40">
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </button>
              </div>
            )}
            {pagination && (
              <p className="text-center text-sm text-gray-500 mt-3">
                Showing {pagination.from ?? 0} to {pagination.to ?? 0} of {pagination.total} results
              </p>
            )}
          </div>
        </div>
      </main>

      {/* Review Modal */}
      {selectedVerification && (
        <ReviewModal
          verification={selectedVerification}
          onClose={() => setSelectedVerification(null)}
          onApprove={handleApprove}
          onReject={handleReject}
          isActing={isActing}
        />
      )}
    </div>
  );
}