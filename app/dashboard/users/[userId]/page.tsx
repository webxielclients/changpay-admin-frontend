'use client';

import { use, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { usersApi } from '@/lib/api/client';
import { AUTH_ROUTES } from '@/constants/auth';
import Sidebar from '@/components/Sidebar';


interface UserDetail {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string | null;
  dateOfBirth: string | null;
  country: string | null;
  state: string | null;
  city: string | null;
  address: string | null;
  changpayId: string | null;
  kycStatus: string | null;
  kybStatus: string | null;
  isActive: boolean;
  emailVerified: boolean;
  createdAt: string | null;
}

interface ApiNote {
  id: number;
  user_id: number;
  admin_id: number;
  note: string;
  created_at: string;
  updated_at: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(first: string, last: string) {
  return `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase() || '??';
}

function getFullName(user: UserDetail) {
  return [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email;
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  } catch { return dateStr; }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-100 rounded-lg ${className}`} />;
}

function KYCBadge({ status }: { status: string | null }) {
  const s = (status ?? 'pending').toLowerCase();
  const styles =
    s === 'verified' || s === 'approved'
      ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
      : s === 'rejected'
      ? 'bg-red-100 text-red-700 border-red-200'
      : 'bg-orange-100 text-orange-700 border-orange-200';
  const label =
    s === 'verified' || s === 'approved' ? 'Verified'
    : s === 'rejected' ? 'Rejected'
    : 'Pending';
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${styles}`}>
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m6 2.25a6 6 0 11-12 0 6 6 0 0112 0z" />
      </svg>
      {label}
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function UserDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = use(params);
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  const [user, setUser] = useState<UserDetail | null>(null);
  const [notes, setNotes] = useState<ApiNote[]>([]);
  const [noteInput, setNoteInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isToggling, setIsToggling] = useState(false);
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noteError, setNoteError] = useState<string | null>(null);
  const [noteSuccess, setNoteSuccess] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) router.push(AUTH_ROUTES.LOGIN);
  }, [isAuthenticated, router]);

  const fetchUser = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await usersApi.getUser(Number(userId));
      if (res.status && res.data) {
        // The detail endpoint returns camelCase — cast it
        setUser(res.data as unknown as UserDetail);
      } else {
        setError('Failed to load user details');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load user');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  const fetchNotes = useCallback(async () => {
    try {
      const res = await usersApi.getNotes(Number(userId));
      if (res.status && res.data?.data) {
        setNotes(res.data.data);
      }
    } catch {
      // Notes failing silently is acceptable
    }
  }, [userId]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchUser();
      fetchNotes();
    }
  }, [isAuthenticated, fetchUser, fetchNotes]);

  if (!isAuthenticated) return null;

  const handleToggleStatus = async () => {
    if (!user) return;
    try {
      setIsToggling(true);
      setError(null);
      const res = await usersApi.toggleStatus(user.id);
      if (res.status && res.data) {
        setUser(res.data as unknown as UserDetail);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle status');
    } finally {
      setIsToggling(false);
    }
  };

  const handleSaveNote = async () => {
    if (!noteInput.trim() || !user) return;
    try {
      setIsSavingNote(true);
      setNoteError(null);
      setNoteSuccess(false);
      const res = await usersApi.addNote(user.id, noteInput.trim());
      if (res.status && res.data) {
        setNotes((prev) => [res.data, ...prev]);
        setNoteInput('');
        setNoteSuccess(true);
        setTimeout(() => setNoteSuccess(false), 3000);
      }
    } catch (err) {
      setNoteError(err instanceof Error ? err.message : 'Failed to save note');
    } finally {
      setIsSavingNote(false);
    }
  };

  // ── Loading state ──
  if (isLoading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-8 space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        </main>
      </div>
    );
  }

  // ── Error state ──
  if (error && !user) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <button onClick={fetchUser} className="px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-semibold">
              Retry
            </button>
          </div>
        </main>
      </div>
    );
  }

  if (!user) return null;

  const isFrozen = !user.isActive;
  const kycOk = ['verified', 'approved'].includes((user.kycStatus ?? '').toLowerCase());

  return (
    <div className="flex h-screen bg-gray-50 font-['DM_Sans']">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">

          {/* Back */}
          <div className="px-8 pt-6 pb-2">
            <button
              onClick={() => router.push('/dashboard/users')}
              className="flex items-center gap-2 text-gray-700 hover:text-gray-900 transition-colors"
            >
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-800 text-white">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
              </span>
              <span className="text-sm font-semibold">Back to Users List</span>
            </button>
          </div>

          {/* Error banner */}
          {error && (
            <div className="mx-8 mt-2 mb-0 p-4 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* User header */}
          <div className="px-8 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-lg font-bold flex-shrink-0">
                {getInitials(user.firstName, user.lastName)}
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{getFullName(user)}</h2>
                <p className="text-sm text-gray-500">{user.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Active / Frozen badge */}
              {isFrozen ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-300">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 4.5h10.5a2.25 2.25 0 012.25 2.25v6.75a2.25 2.25 0 01-2.25 2.25H6.75a2.25 2.25 0 01-2.25-2.25v-6.75A2.25 2.25 0 016.75 10.5z" />
                  </svg>
                  Frozen
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                  </svg>
                  Active
                </span>
              )}
              {/* KYC badge */}
              <KYCBadge status={user.kycStatus} />
              {/* Email verified */}
              {user.emailVerified && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-200">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  Email Verified
                </span>
              )}
            </div>
          </div>

          {/* Personal Details */}
          <div className="px-8 pb-4">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-sm font-bold text-gray-900 mb-4">Personal Details</h3>
              <div className="grid grid-cols-4 gap-6">
                {[
                  { label: 'ChangPay ID',   value: user.changpayId ?? '—' },
                  { label: 'Date Created',  value: formatDate(user.createdAt) },
                  { label: 'Phone',         value: user.phoneNumber ?? '—' },
                  { label: 'Date of Birth', value: user.dateOfBirth ?? '—' },
                  { label: 'Country',       value: user.country ?? '—' },
                  { label: 'State',         value: user.state ?? '—' },
                  { label: 'City',          value: user.city ?? '—' },
                  { label: 'Address',       value: user.address ?? '—' },
                ].map((f) => (
                  <div key={f.label}>
                    <p className="text-xs text-gray-400 mb-0.5">{f.label}</p>
                    <p className="text-sm font-medium text-gray-900 break-all">{f.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* KYC Status */}
          <div className="px-8 pb-4">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-sm font-bold text-gray-900 mb-3">KYC Status</h3>
              <KYCBadge status={user.kycStatus} />
              <p className="text-xs text-gray-500 mt-2">
                {kycOk
                  ? 'Documents approved, verification complete'
                  : (user.kycStatus ?? 'pending').toLowerCase() === 'rejected'
                  ? 'Documents rejected, resubmission required'
                  : 'Awaiting document verification'}
              </p>
            </div>
          </div>

          {/* KYB Status — only show if has a value */}
          {user.kybStatus && (
            <div className="px-8 pb-4">
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-sm font-bold text-gray-900 mb-3">KYB Status</h3>
                <KYCBadge status={user.kybStatus} />
                <p className="text-xs text-gray-500 mt-2">Business verification status</p>
              </div>
            </div>
          )}

          {/* Account Actions */}
          <div className="px-8 pb-4">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-sm font-bold text-gray-900 mb-4">Account Actions</h3>
              <div className="flex gap-4">
                <button
                  onClick={handleToggleStatus}
                  disabled={isToggling}
                  className={`flex-1 inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    isFrozen
                      ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                      : 'bg-red-500 hover:bg-red-600 text-white'
                  }`}
                >
                  {isToggling ? (
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 4.5h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                  )}
                  {isFrozen ? 'Unfreeze Account' : 'Freeze Account'}
                </button>
                <button className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-gray-500 hover:bg-gray-600 text-white rounded-lg text-sm font-semibold transition-colors">
                  Reset Password
                </button>
              </div>
            </div>
          </div>

          {/* Admin Notes */}
          <div className="px-8 pb-8">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-sm font-bold text-gray-900 mb-4">Admin Notes</h3>

              {/* Existing notes */}
              {notes.length > 0 && (
                <div className="space-y-3 mb-4">
                  {notes.map((note) => (
                    <div key={note.id} className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                      <p className="text-sm text-gray-800 font-medium">{note.note}</p>
                      <p className="text-xs text-gray-400 mt-1.5">
                        {formatDate(note.created_at)} • Admin #{note.admin_id}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {noteError && (
                <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-xs text-red-600">{noteError}</p>
                </div>
              )}
              {noteSuccess && (
                <div className="mb-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <p className="text-xs text-emerald-600">Note saved successfully.</p>
                </div>
              )}

              <textarea
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                placeholder="Add internal notes... (max 2000 characters)"
                rows={3}
                maxLength={2000}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-700 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-gray-400"
              />
              <div className="flex items-center justify-between mt-1 mb-3">
                <span className="text-xs text-gray-400">{noteInput.length}/2000</span>
              </div>
              <button
                onClick={handleSaveNote}
                disabled={isSavingNote || !noteInput.trim()}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSavingNote ? 'Saving...' : 'Save Note'}
              </button>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}