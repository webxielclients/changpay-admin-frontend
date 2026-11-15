'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { authApi } from '@/lib/api/client';

type Step = 'email' | 'code' | 'factor' | 'password';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [factor, setFactor] = useState<'pin' | 'totp'>('pin');
  const [methods, setMethods] = useState<Array<'pin' | 'totp'>>([]);
  const [factorCode, setFactorCode] = useState('');
  const [recoveryToken, setRecoveryToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const run = async (action: () => Promise<void>) => {
    setBusy(true); setError('');
    try { await action(); } catch (err) { setError(err instanceof Error ? err.message : 'Request failed.'); } finally { setBusy(false); }
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-6 py-10">
      <section className="w-full rounded-3xl bg-white p-8 shadow-xl">
        <h1 className="text-2xl font-semibold text-gray-900">Reset admin password</h1>
        <p className="mt-2 text-sm text-gray-500">Email verification and a configured PIN or authenticator are required.</p>
        {error && <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</div>}
        {step === 'email' && <form className="mt-6 space-y-4" onSubmit={(event) => { event.preventDefault(); void run(async () => { await authApi.forgotPassword(email); setStep('code'); toast.success('Reset code sent.'); }); }}><input className="admin-input w-full" type="email" required placeholder="Admin email" value={email} onChange={(event) => setEmail(event.target.value)} /><button className="admin-button admin-button-primary w-full" disabled={busy}>{busy ? 'Sending…' : 'Send reset code'}</button></form>}
        {step === 'code' && <form className="mt-6 space-y-4" onSubmit={(event) => { event.preventDefault(); void run(async () => { const result = await authApi.verifyPasswordReset(email, code); setRecoveryToken(result.recovery_token); setMethods(result.methods); setFactor(result.methods[0] ?? 'pin'); setStep('factor'); }); }}><input className="admin-input w-full" inputMode="numeric" maxLength={6} required placeholder="6-digit email code" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} /><button className="admin-button admin-button-primary w-full" disabled={busy}>{busy ? 'Verifying…' : 'Verify code'}</button></form>}
        {step === 'factor' && <form className="mt-6 space-y-4" onSubmit={(event) => { event.preventDefault(); setStep('password'); }}><select className="admin-input w-full" value={factor} onChange={(event) => setFactor(event.target.value as 'pin' | 'totp')}><option value="pin" disabled={!methods.includes('pin')}>Admin PIN</option><option value="totp" disabled={!methods.includes('totp')}>Authenticator</option></select><input className="admin-input w-full" inputMode="numeric" required placeholder={factor === 'pin' ? '4-digit PIN' : 'Authenticator code'} value={factorCode} onChange={(event) => setFactorCode(event.target.value.replace(/\D/g, '').slice(0, factor === 'pin' ? 4 : 6))} /><button className="admin-button admin-button-primary w-full" disabled={busy}>{busy ? 'Checking…' : 'Continue'}</button></form>}
        {step === 'password' && <form className="mt-6 space-y-4" onSubmit={(event) => { event.preventDefault(); void run(async () => { if (password !== confirmation) throw new Error('Passwords do not match.'); await authApi.resetPassword({ recovery_token: recoveryToken, password, password_confirmation: confirmation, factor, factor_code: factorCode }); toast.success('Password reset successfully.'); router.push('/login'); }); }}><input className="admin-input w-full" type="password" minLength={12} required placeholder="New password" value={password} onChange={(event) => setPassword(event.target.value)} /><input className="admin-input w-full" type="password" minLength={12} required placeholder="Confirm new password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /><button className="admin-button admin-button-primary w-full" disabled={busy}>{busy ? 'Saving…' : 'Reset password'}</button></form>}
        <button type="button" className="mt-6 w-full text-sm text-gray-500" onClick={() => router.push('/login')}>Back to login</button>
      </section>
    </main>
  );
}
