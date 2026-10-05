'use client';

import { useEffect, useRef, useState } from 'react';
import DashboardHeader from '@/components/DashboardHeader';
import Sidebar from '@/components/Sidebar';
import { useAuthStore } from '@/store/authStore';
import { adminSecurityApi } from '@/lib/api/client';

const twoFactorEnabled = process.env.NEXT_PUBLIC_ENABLE_2FA !== 'false';

type TwoFactorMethod = 'email' | 'totp';

interface TwoFactorStatus {
  email_enabled: boolean;
  totp_enabled: boolean;
}

export default function SettingsPage() {
  const { user, setAvatar, setUser } = useAuthStore();
  const input = useRef<HTMLInputElement>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState({ first_name: user?.first_name ?? '', last_name: user?.last_name ?? '' });
  const [password, setPassword] = useState({ current_password: '', password: '', password_confirmation: '' });
  const [twoFactor, setTwoFactor] = useState<TwoFactorMethod>('totp');
  const [twoFactorStatus, setTwoFactorStatus] = useState<TwoFactorStatus | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setProfile({ first_name: user?.first_name ?? '', last_name: user?.last_name ?? '' });
  }, [user?.first_name, user?.last_name]);

  useEffect(() => {
    if (!twoFactorEnabled) return;
    void adminSecurityApi.twoFactorStatus().then((response) => setTwoFactorStatus(response.data)).catch(() => undefined);
  }, []);

  const run = async (action: () => Promise<void>) => {
    try {
      setBusy(true);
      setError(null);
      setNotice(null);
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed.');
    } finally {
      setBusy(false);
    }
  };

  const uploadAvatar = async (file: File) => {
    const token = localStorage.getItem('token');
    const form = new FormData();
    form.append('avatar', file);

    try {
      const response = await fetch('/api/proxy/auth/avatar', { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: form });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message ?? 'Unable to upload profile picture.');
      setAvatar(payload.data?.avatar_url ?? payload.data?.avatarUrl ?? null);
      setNotice('Profile picture updated.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to upload profile picture.');
    }
  };

  return (
    <div className="admin-page flex h-screen">
      <Sidebar />
      <main className="admin-content">
        <DashboardHeader title="Profile & Settings" subtitle="Manage your profile and account security" large />

        {(notice || error) && <p className={`mt-5 rounded-xl px-4 py-3 text-sm ${error ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>{error ?? notice}</p>}

        <section className="admin-section space-y-6">
          <div className="admin-card">
            <h2 className="text-lg font-semibold text-gray-900">Edit profile</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <input className="admin-input" value={profile.first_name} onChange={(e) => setProfile({ ...profile, first_name: e.target.value })} placeholder="First name" />
              <input className="admin-input" value={profile.last_name} onChange={(e) => setProfile({ ...profile, last_name: e.target.value })} placeholder="Last name" />
              {/* Email editing is intentionally disabled. Re-enable only when the backend policy allows it. */}
              <button type="button" disabled={busy} onClick={() => void run(async () => { if (!user) return; const response = await adminSecurityApi.updateProfile(profile); setUser({ ...user, first_name: response.data.firstName, last_name: response.data.lastName, email: response.data.email, avatar_url: response.data.avatarUrl ?? user.avatar_url }); setNotice('Profile updated.'); })} className="admin-button admin-button-secondary w-fit">Save profile</button>
            </div>

            <div className="mt-5 flex items-center gap-4">
              {user?.avatar_url ? <img src={user.avatar_url} alt="Profile" className="h-16 w-16 rounded-full object-cover" /> : <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#E1F7EB] text-xl font-semibold text-[#009F51]">{(user?.first_name?.[0] ?? user?.email?.[0] ?? 'A').toUpperCase()}</div>}
              <div>
                <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) void uploadAvatar(file); }} />
                <button type="button" onClick={() => input.current?.click()} className="admin-button admin-button-primary">Update profile picture</button>
                <p className="mt-1 text-xs text-gray-500">{user?.first_name ?? ''} {user?.last_name ?? ''} · {user?.email ?? ''}</p>
              </div>
            </div>
          </div>

          <div className="admin-card">
            <h2 className="text-lg font-semibold text-gray-900">{twoFactorEnabled ? 'Password and two-factor authentication' : 'Password'}</h2>
            {twoFactorEnabled && <p className="mt-2 text-sm text-gray-500">Two-factor controls are enabled.</p>}

            <div className="mt-5 space-y-3">
              <input className="admin-input" value={password.current_password} onChange={(e) => setPassword({ ...password, current_password: e.target.value })} type="password" placeholder="Current password" />
              <input className="admin-input" value={password.password} onChange={(e) => setPassword({ ...password, password: e.target.value })} type="password" placeholder="New password (minimum 12 characters)" />
              <input className="admin-input" value={password.password_confirmation} onChange={(e) => setPassword({ ...password, password_confirmation: e.target.value })} type="password" placeholder="Confirm new password" />
              <button type="button" disabled={busy} onClick={() => void run(async () => { await adminSecurityApi.changePassword(password); setPassword({ current_password: '', password: '', password_confirmation: '' }); setNotice('Password updated.'); })} className="admin-button admin-button-primary">Update password</button>

              {twoFactorEnabled && <>
                <div className="flex flex-wrap items-center gap-2 pt-3">
                  <select className="admin-input w-auto" value={twoFactor} onChange={(e) => setTwoFactor(e.target.value as TwoFactorMethod)}><option value="totp">Authenticator app</option><option value="email">Email code</option></select>
                  <button type="button" disabled={busy} onClick={() => void run(async () => { const response = await adminSecurityApi.initiateTwoFactor(twoFactor); setQrCodeUrl(response.data.qr_code_url ?? null); setNotice(response.data.message ?? 'Verification started.'); })} className="admin-button admin-button-secondary">Start setup</button>
                </div>
                {qrCodeUrl && <div className="rounded-lg bg-gray-50 p-3 text-xs break-all">Scan this authenticator URI, then enter the generated six-digit code: {qrCodeUrl}</div>}
                <div className="flex gap-2">
                  <input className="admin-input" value={verificationCode} onChange={(e) => setVerificationCode(e.target.value)} maxLength={6} placeholder="6-digit verification code" />
                  <button type="button" disabled={busy || verificationCode.length !== 6} onClick={() => void run(async () => { const response = await adminSecurityApi.confirmTwoFactor(twoFactor, verificationCode); setTwoFactorStatus(response.data); setVerificationCode(''); setNotice('Two-factor authentication enabled.'); })} className="admin-button admin-button-primary whitespace-nowrap">Confirm</button>
                </div>
                <button type="button" disabled={busy} onClick={() => void run(async () => { const response = await adminSecurityApi.disableTwoFactor(twoFactor); setTwoFactorStatus(response.data); setNotice('Two-factor authentication disabled for the selected method.'); })} className="admin-button admin-button-danger">Disable selected method</button>
                {twoFactorStatus && <p className="text-xs text-gray-500">Email: {twoFactorStatus.email_enabled ? 'enabled' : 'disabled'} · Authenticator: {twoFactorStatus.totp_enabled ? 'enabled' : 'disabled'}</p>}
              </>}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
