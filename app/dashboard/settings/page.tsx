'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import DashboardHeader from '@/components/DashboardHeader';
import Sidebar from '@/components/Sidebar';
import { PasswordField } from '@/components/auth/PasswordField';
import { useAuthStore } from '@/store/authStore';
import {
  adminSecurityApi,
  type AdminTwoFactorStatus,
  type TwoFactorMethod,
  type TwoFactorSetupResponse,
} from '@/lib/api/client';

const twoFactorEnabled = process.env.NEXT_PUBLIC_ENABLE_2FA !== 'false';

export default function SettingsPage() {
  const { user, setAvatar, setUser } = useAuthStore();
  const avatarInput = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState({ first_name: '', last_name: '' });
  const [password, setPassword] = useState({ current_password: '', password: '', password_confirmation: '' });
  const [pin, setPin] = useState({ current_password: '', pin: '', pin_confirmation: '' });
  const [setupPasswords, setSetupPasswords] = useState<Record<TwoFactorMethod, string>>({ email: '', totp: '' });
  const [codes, setCodes] = useState<Record<TwoFactorMethod, string>>({ email: '', totp: '' });
  const [setups, setSetups] = useState<Partial<Record<TwoFactorMethod, TwoFactorSetupResponse>>>({});
  const [status, setStatus] = useState<AdminTwoFactorStatus | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setProfile({ first_name: user?.first_name ?? '', last_name: user?.last_name ?? '' });
  }, [user?.first_name, user?.last_name]);

  useEffect(() => {
    if (twoFactorEnabled) void adminSecurityApi.twoFactorStatus().then((response) => setStatus(response.data)).catch((error) => toast.error(error instanceof Error ? error.message : 'Unable to load two-factor status.'));
  }, []);

  const run = async (action: () => Promise<void>, success?: string) => {
    setBusy(true);
    try {
      await action();
      if (success) toast.success(success);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Request failed.');
    } finally {
      setBusy(false);
    }
  };

  const uploadAvatar = (file: File) => void run(async () => {
    const response = await adminSecurityApi.uploadAvatar(file);
    const avatar = response.data.avatar_url ?? response.data.avatarUrl ?? null;
    setAvatar(avatar);
  }, 'Profile picture updated.');

  const saveProfile = () => void run(async () => {
    if (!user) return;
    const response = await adminSecurityApi.updateProfile(profile);
    setUser({ ...user, first_name: response.data.firstName, last_name: response.data.lastName, email: response.data.email, avatar_url: response.data.avatarUrl ?? user.avatar_url });
  }, 'Profile updated.');

  const startTwoFactor = (method: TwoFactorMethod) => void run(async () => {
    const response = await adminSecurityApi.initiateTwoFactor(method, setupPasswords[method]);
    setSetups((current) => ({ ...current, [method]: response.data }));
  }, `${method === 'totp' ? 'Authenticator' : 'Email'} setup started.`);

  const confirmTwoFactor = (method: TwoFactorMethod) => void run(async () => {
    const response = await adminSecurityApi.confirmTwoFactor(method, codes[method]);
    setStatus(response.data);
    setSetups((current) => ({ ...current, [method]: undefined }));
    setCodes((current) => ({ ...current, [method]: '' }));
    setSetupPasswords((current) => ({ ...current, [method]: '' }));
  }, `${method === 'totp' ? 'Authenticator' : 'Email'} two-factor authentication enabled.`);

  const disableTwoFactor = (method: TwoFactorMethod) => void run(async () => {
    const response = await adminSecurityApi.disableTwoFactor(method, setupPasswords[method]);
    setStatus(response.data);
    setSetupPasswords((current) => ({ ...current, [method]: '' }));
  }, `${method === 'totp' ? 'Authenticator' : 'Email'} two-factor authentication disabled.`);

  const renderTwoFactor = (method: TwoFactorMethod) => {
    const isTotp = method === 'totp';
    const setup = setups[method];
    const enabled = isTotp ? status?.totp_enabled : status?.email_enabled;
    return (
      <div className="rounded-2xl border border-gray-200 p-5" key={method}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-gray-900">{isTotp ? 'Authenticator app' : 'Email verification code'}</h3>
            <p className="mt-1 text-sm text-gray-500">{enabled ? 'Enabled' : 'Disabled'}</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${enabled ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{enabled ? 'Active' : 'Setup required'}</span>
        </div>

        {!enabled && !setup && <div className="mt-4 space-y-3">
          <PasswordField label="Account password" value={setupPasswords[method]} onChange={(value) => setSetupPasswords((current) => ({ ...current, [method]: value }))} autoComplete="current-password" disabled={busy} placeholder="Confirm your account password" />
          <button type="button" disabled={busy || !setupPasswords[method]} onClick={() => startTwoFactor(method)} className="admin-button admin-button-secondary">Start setup</button>
        </div>}

        {setup && <div className="mt-4 space-y-3">
          {isTotp && (setup.qr_code_data_uri || setup.qr_code_url) && <img src={setup.qr_code_data_uri ?? setup.qr_code_url ?? ''} alt="Authenticator QR code" className="h-44 w-44 rounded-lg border bg-white p-2" />}
          {isTotp && setup.secret && <p className="break-all rounded-lg bg-gray-50 p-3 text-xs text-gray-700">Secret key: {setup.secret}</p>}
          <p className="text-sm text-gray-600">{isTotp ? 'Scan the QR code or copy the secret, then enter the six-digit code.' : setup.email_sent === false ? 'Email delivery could not be confirmed. Request a new code or contact support.' : 'Enter the six-digit code sent to the administrator email address.'}</p>
          <div className="flex gap-2">
            <input className="admin-input" value={codes[method]} onChange={(event) => setCodes((current) => ({ ...current, [method]: event.target.value.replace(/\D/g, '').slice(0, 6) }))} inputMode="numeric" maxLength={6} placeholder="6-digit code" />
            <button type="button" disabled={busy || codes[method].length !== 6} onClick={() => confirmTwoFactor(method)} className="admin-button admin-button-primary whitespace-nowrap">Confirm</button>
          </div>
        </div>}

        {enabled && <div className="mt-4 space-y-3">
          <PasswordField label="Account password to disable" value={setupPasswords[method]} onChange={(value) => setSetupPasswords((current) => ({ ...current, [method]: value }))} autoComplete="current-password" disabled={busy} placeholder="Confirm your account password" />
          <button type="button" disabled={busy || !setupPasswords[method]} onClick={() => disableTwoFactor(method)} className="admin-button admin-button-danger">Disable {isTotp ? 'authenticator' : 'email'} 2FA</button>
        </div>}
      </div>
    );
  };

  return (
    <div className="admin-page flex h-screen">
      <Sidebar />
      <main className="admin-content">
        <DashboardHeader title="Profile & Settings" subtitle="Manage your profile and account security" large />
        <section className="admin-section space-y-6">
          <div className="admin-card">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              {user?.avatar_url ? <img src={user.avatar_url} alt="Profile" className="h-20 w-20 rounded-full object-cover" /> : <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#E1F7EB] text-2xl font-semibold text-[#009F51]">{(user?.first_name?.[0] ?? user?.email?.[0] ?? 'A').toUpperCase()}</div>}
              <div>
                <input ref={avatarInput} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) uploadAvatar(file); }} />
                <button type="button" onClick={() => avatarInput.current?.click()} className="admin-button admin-button-primary">Update profile picture</button>
                <p className="mt-1 text-xs text-gray-500">PNG, JPG, or WEBP</p>
              </div>
            </div>
            <div className="mt-7 border-t border-gray-100 pt-6">
              <h2 className="text-lg font-semibold text-gray-900">Edit profile details</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <input className="admin-input" value={profile.first_name} onChange={(event) => setProfile({ ...profile, first_name: event.target.value })} placeholder="First name" />
                <input className="admin-input" value={profile.last_name} onChange={(event) => setProfile({ ...profile, last_name: event.target.value })} placeholder="Last name" />
                <input className="admin-input bg-gray-50" value={user?.email ?? ''} disabled aria-label="Email address" />
              </div>
              <button type="button" disabled={busy} onClick={saveProfile} className="admin-button admin-button-secondary mt-4">Save profile</button>
            </div>
          </div>

          <div className="admin-card">
            <h2 className="text-lg font-semibold text-gray-900">Password</h2>
            <div className="mt-4 space-y-3">
              <PasswordField label="Current password" value={password.current_password} onChange={(value) => setPassword({ ...password, current_password: value })} autoComplete="current-password" disabled={busy} />
              <PasswordField label="New password" value={password.password} onChange={(value) => setPassword({ ...password, password: value })} autoComplete="new-password" disabled={busy} />
              <PasswordField label="Confirm new password" value={password.password_confirmation} onChange={(value) => setPassword({ ...password, password_confirmation: value })} autoComplete="new-password" disabled={busy} />
              <button type="button" disabled={busy} onClick={() => void run(async () => { await adminSecurityApi.changePassword(password); setPassword({ current_password: '', password: '', password_confirmation: '' }); }, 'Password updated.')} className="admin-button admin-button-primary">Update password</button>
            </div>
          </div>

          <div className="admin-card">
            <h2 className="text-lg font-semibold text-gray-900">Admin PIN</h2>
            <p className="mt-2 text-sm text-gray-500">Set a four-digit PIN. It can be used as the second factor for password recovery.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <PasswordField label="Current password" value={pin.current_password} onChange={(value) => setPin({ ...pin, current_password: value })} autoComplete="current-password" disabled={busy} />
              <input className="admin-input" inputMode="numeric" maxLength={4} placeholder="New PIN" value={pin.pin} onChange={(event) => setPin({ ...pin, pin: event.target.value.replace(/\D/g, '').slice(0, 4) })} />
              <input className="admin-input" inputMode="numeric" maxLength={4} placeholder="Confirm PIN" value={pin.pin_confirmation} onChange={(event) => setPin({ ...pin, pin_confirmation: event.target.value.replace(/\D/g, '').slice(0, 4) })} />
            </div>
            <button type="button" disabled={busy || pin.pin.length !== 4 || pin.pin !== pin.pin_confirmation || !pin.current_password} onClick={() => void run(async () => { const response = await adminSecurityApi.setPin(pin); setStatus(response.data); setPin({ current_password: '', pin: '', pin_confirmation: '' }); }, 'Admin PIN saved.')} className="admin-button admin-button-primary mt-4">Save PIN</button>
          </div>

          {twoFactorEnabled && <div className="admin-card">
            <h2 className="text-lg font-semibold text-gray-900">Two-factor authentication</h2>
            <p className="mt-2 text-sm text-gray-500">Each method has its own password confirmation and verification state.</p>
            <div className="mt-5 grid gap-4 lg:grid-cols-2">{renderTwoFactor('email')}{renderTwoFactor('totp')}</div>
          </div>}
        </section>
      </main>
    </div>
  );
}
