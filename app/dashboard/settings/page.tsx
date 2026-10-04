'use client';

import { useRef, useState } from 'react';
import DashboardHeader from '@/components/DashboardHeader';
import Sidebar from '@/components/Sidebar';
import { useAuthStore } from '@/store/authStore';

const twoFactorEnabled = process.env.NEXT_PUBLIC_ENABLE_2FA !== 'false';

export default function SettingsPage() {
  const { user, setAvatar } = useAuthStore();
  const input = useRef<HTMLInputElement>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const uploadAvatar = async (file: File) => {
    const token = localStorage.getItem('token');
    const form = new FormData();
    form.append('avatar', file);
    try {
      const response = await fetch('/api/proxy/auth/avatar', { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: form });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message ?? 'Unable to upload profile picture.');
      const avatar = payload.data?.avatar_url ?? payload.data?.avatarUrl ?? null;
      setAvatar(avatar);
      setNotice('Profile picture updated.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to upload profile picture.'); }
  };

  return <div className="flex h-screen bg-white">
    <Sidebar />
    <main className="flex-1 overflow-y-auto px-8 py-6">
      <DashboardHeader title="Profile & Settings" subtitle="Manage your profile and account security" large />
      {(notice || error) && <p className={`mt-5 rounded-xl px-4 py-3 text-sm ${error ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>{error ?? notice}</p>}
      <section className="mt-8 max-w-2xl space-y-6">
        <div className="rounded-2xl border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900">Edit profile</h2>
          <div className="mt-5 flex items-center gap-4">
            {user?.avatar_url ? <img src={user.avatar_url} alt="Profile" className="h-16 w-16 rounded-full object-cover" /> : <div className="h-16 w-16 rounded-full bg-[#E1F7EB] flex items-center justify-center text-xl font-semibold text-[#009F51]">{(user?.first_name?.[0] ?? user?.email?.[0] ?? 'A').toUpperCase()}</div>}
            <div><input ref={input} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) void uploadAvatar(file); }} /><button type="button" onClick={() => input.current?.click()} className="rounded-lg bg-[#009F51] px-4 py-2 text-sm font-semibold text-white">Update profile picture</button><p className="mt-1 text-xs text-gray-500">{user?.first_name ?? ''} {user?.last_name ?? ''} · {user?.email ?? ''}</p></div>
          </div>
        </div>
        <div className="rounded-2xl border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900">Password and two-factor authentication</h2>
          <p className="mt-2 text-sm text-gray-500">{twoFactorEnabled ? 'Two-factor controls are enabled by the frontend flag.' : 'Two-factor controls are disabled by NEXT_PUBLIC_ENABLE_2FA.'}</p>
          <div className="mt-5 space-y-3">
            <button type="button" disabled className="w-full rounded-lg border border-gray-200 px-4 py-3 text-left text-sm text-gray-400">Update password (backend admin endpoint required)</button>
            <button type="button" disabled={!twoFactorEnabled} className="w-full rounded-lg border border-gray-200 px-4 py-3 text-left text-sm text-gray-700 disabled:text-gray-400">{twoFactorEnabled ? 'Configure email or authenticator 2FA (backend admin endpoint required)' : 'Two-factor authentication disabled'}</button>
          </div>
        </div>
      </section>
    </main>
  </div>;
}
