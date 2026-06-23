'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { authApi, dashboardApi } from '@/lib/api/client';
import { AUTH_ROUTES } from '@/constants/auth';
import Image from 'next/image';

interface DashboardHeaderProps {
  title: string;
  subtitle?: string;
}

interface NotificationItem {
  label: string;
  count: number;
  href: string;
  color: string;
}

export default function DashboardHeader({ title, subtitle }: DashboardHeaderProps) {
  const router = useRouter();
  const { user: authUser, token, logout, setAvatar } = useAuthStore();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loadingNotif, setLoadingNotif] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setAvatar(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const totalNotifications = notifications.reduce((sum, n) => sum + n.count, 0);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoadingNotif(true);
      const res = await dashboardApi.getOverview();
      if (res.status && res.data?.pending_actions) {
        const pa = res.data.pending_actions;
        setNotifications([
          { label: 'KYC Approvals', count: Number(pa.kyc_approvals ?? 0), href: '/dashboard/kyc-verification', color: 'text-orange-600' },
          { label: 'Failed Payouts', count: Number(pa.failed_payouts ?? 0), href: '/dashboard/banks-payouts', color: 'text-red-600' },
          { label: 'Flagged Transactions', count: Number(pa.flagged_transactions ?? 0), href: '/dashboard/transactions', color: 'text-red-600' },
          { label: 'Open Disputes', count: Number(pa.open_disputes ?? 0), href: '/dashboard/support-disputes', color: 'text-orange-600' },
          { label: 'Open Tickets', count: Number(pa.open_tickets ?? 0), href: '/dashboard/support-disputes', color: 'text-blue-600' },
        ].filter((n) => n.count > 0));
      }
    } catch {
      // silent
    } finally {
      setLoadingNotif(false);
    }
  }, []);

  const handleNotifOpen = () => {
    setDropdownOpen(false);
    setNotifOpen((o) => {
      if (!o) fetchNotifications();
      return !o;
    });
  };

  const getInitials = useCallback(() => {
    const first = authUser?.first_name ?? '';
    const last = authUser?.last_name ?? '';
    if (first && last) return `${first[0]}${last[0]}`.toUpperCase();
    if (first) return first.slice(0, 2).toUpperCase();
    return (authUser?.email ?? 'A').slice(0, 2).toUpperCase();
  }, [authUser]);

  const displayName = authUser?.first_name
    ? `${authUser.first_name}${authUser.last_name ? ` ${authUser.last_name[0]}.` : ''}`
    : authUser?.email ?? 'Admin';

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      if (token) {
        await authApi.logout(token).catch(() => {});
      }
    } finally {
      logout();
      localStorage.removeItem('token');
      router.push(AUTH_ROUTES.LOGIN);
    }
  };

  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-4">

        {/* Notification bell */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={handleNotifOpen}
            className="relative p-2 hover:bg-gray-100 ml-[-2px] rounded-xl transition-colors"
          >
            <Image src="/Icon.svg" alt="Notifications" width={20} height={20} />
            {totalNotifications > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {totalNotifications > 9 ? '9+' : totalNotifications}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl border border-gray-200 shadow-xl z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <p className="text-sm font-bold text-gray-900">Pending Actions</p>
                {totalNotifications > 0 && (
                  <span className="text-xs bg-red-100 text-red-600 font-semibold px-2 py-0.5 rounded-full">
                    {totalNotifications}
                  </span>
                )}
              </div>

              <div className="py-1 max-h-72 overflow-y-auto">
                {loadingNotif ? (
                  <div className="px-4 py-6 flex items-center justify-center">
                    <svg className="animate-spin w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="px-4 py-6 text-center">
                    <div className="w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-2">
                      <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    </div>
                    <p className="text-sm text-gray-500">All clear — no pending actions</p>
                  </div>
                ) : (
                  notifications.map((n) => (
                    <button
                      key={n.label}
                      onClick={() => { setNotifOpen(false); router.push(n.href); }}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-2 h-2 rounded-full bg-current flex-shrink-0" style={{ color: 'inherit' }} />
                        <span className="text-sm text-gray-700">{n.label}</span>
                      </div>
                      <span className={`text-sm font-bold ${n.color}`}>{n.count}</span>
                    </button>
                  ))
                )}
              </div>

              <div className="border-t border-gray-100 px-4 py-2.5">
                <button
                  onClick={() => { setNotifOpen(false); router.push('/dashboard'); }}
                  className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                >
                  View full dashboard →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Profile dropdown */}
        <div className="relative" ref={dropdownRef}>
          {/* Hidden file input for avatar upload */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarFileChange}
          />
          <button
            onClick={() => { setNotifOpen(false); setDropdownOpen((o) => !o); }}
            className="flex items-center gap-3 hover:bg-gray-50 rounded-xl px-2 py-1.5 transition-colors"
          >
            <div
              className="w-9 h-9 rounded-full overflow-hidden bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 cursor-pointer ring-2 ring-transparent hover:ring-emerald-400 transition-all"
              onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
              title="Click to change profile picture"
            >
              {authUser?.avatar_url
                ? <img src={authUser.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                : getInitials()
              }
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-sm font-semibold text-gray-900 leading-tight">{displayName}</p>
              <p className="text-xs text-gray-500">Admin</p>
            </div>
            <svg
              className={`w-4 h-4 text-gray-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
              fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl border border-gray-200 shadow-xl z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => { setDropdownOpen(false); fileInputRef.current?.click(); }}
                  title="Click to change profile picture"
                >
                  {authUser?.avatar_url
                    ? <img src={authUser.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                    : getInitials()
                  }
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{displayName}</p>
                  <p className="text-xs text-gray-500 truncate">{authUser?.email}</p>
                </div>
              </div>

              <div className="py-1">
                <button
                  onClick={() => { setDropdownOpen(false); router.push('/dashboard/profile'); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left"
                >
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
                  My Profile
                </button>
                <button
                  onClick={() => { setDropdownOpen(false); router.push('/dashboard/settings'); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left"
                >
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Settings
                </button>
              </div>

              <div className="border-t border-gray-100 py-1">
                <button
                  onClick={() => { setDropdownOpen(false); handleLogout(); }}
                  disabled={isLoggingOut}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors text-left disabled:opacity-50"
                >
                  {isLoggingOut ? (
                    <svg className="animate-spin w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                    </svg>
                  )}
                  {isLoggingOut ? 'Signing out...' : 'Sign Out'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}