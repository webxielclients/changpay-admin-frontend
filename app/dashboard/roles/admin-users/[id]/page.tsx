'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import DashboardHeader from '@/components/DashboardHeader';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Modal } from '@/components/ui/Modal';
import { ToastAction, errorMessage } from '@/components/ui/ToastAction';
import { rolesApi2, type AdminUserAuditEntry, type AdminUserRecord2, type RoleRecord } from '@/lib/api/client';

type DetailAction = 'edit' | 'status' | 'delete' | 'password' | 'email' | 'totp' | 'sessions' | 'audit';

export default function AdminUserDetailsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = Number(params.id);
  const [admin, setAdmin] = useState<AdminUserRecord2 | null>(null);
  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [audit, setAudit] = useState<AdminUserAuditEntry[]>([]);
  const [action, setAction] = useState<DetailAction | null>(null);
  const [reason, setReason] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [roleId, setRoleId] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true); setError(null);
      const [adminResponse, rolesResponse] = await Promise.all([rolesApi2.getAdmin(id), rolesApi2.getRoles()]);
      setAdmin(adminResponse.data); setRoles(rolesResponse.data ?? []);
      setFirstName(adminResponse.data.firstName ?? ''); setLastName(adminResponse.data.lastName ?? ''); setRoleId(adminResponse.data.role?.id ? String(adminResponse.data.role.id) : '');
    } catch (e) { setError(errorMessage(e, 'Unable to load administrator details.')); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { if (id) void load(); }, [id, load]);

  const execute = async () => {
    if (!admin || !action) return;
    if (!reason.trim() && action !== 'edit') { ToastAction.error('A reason is required.'); return; }
    try {
      setBusy(true);
      if (action === 'edit') {
        const updated = await rolesApi2.updateAdmin(admin.id, { first_name: firstName, last_name: lastName, reason });
        const result = roleId && Number(roleId) !== admin.role?.id ? await rolesApi2.assignRole(admin.id, Number(roleId)) : updated;
        setAdmin(result.data);
      } else if (action === 'status') setAdmin((await rolesApi2.setAdminStatus(admin.id, reason)).data);
      else if (action === 'delete') { await rolesApi2.deleteAdmin(admin.id, reason); ToastAction.success('Administrator deleted.'); router.push('/dashboard/roles'); return; }
      else if (action === 'password') await rolesApi2.resetAdminPassword(admin.id, { password, password_confirmation: passwordConfirmation, reason });
      else if (action === 'email' || action === 'totp') await rolesApi2.resetAdminTwoFactor(admin.id, action, reason);
      else if (action === 'sessions') await rolesApi2.revokeAdminSessions(admin.id, reason);
      else if (action === 'audit') setAudit((await rolesApi2.getAdminAudit(admin.id)).data);
      ToastAction.success('Administrator action completed.'); setAction(null); setReason(''); setPassword(''); setPasswordConfirmation('');
      if (action !== 'audit') await load();
    } catch (e) { ToastAction.error(errorMessage(e, 'Administrator action failed.')); }
    finally { setBusy(false); }
  };

  const openAudit = async () => {
    try { setAudit((await rolesApi2.getAdminAudit(id)).data); setAction('audit'); }
    catch (e) { ToastAction.error(errorMessage(e, 'Unable to load audit history.')); }
  };

  if (loading) return <div className="flex h-screen"><Sidebar /><main className="flex-1 p-8"><LoadingState label="Loading administrator details…" /></main></div>;
  if (error || !admin) return <div className="flex h-screen"><Sidebar /><main className="flex-1 p-8"><ErrorState message={error ?? 'Administrator not found.'} onRetry={() => void load()} /></main></div>;

  return <div className="admin-page flex h-screen"><Sidebar /><div className="flex min-w-0 flex-1 flex-col overflow-hidden"><header className="flex-shrink-0 border-b border-gray-200 bg-white px-6 py-5 lg:px-8"><DashboardHeader title="Administrator details" subtitle="Review identity, access, security controls, and audit history." /></header><main className="min-h-0 flex-1 overflow-y-auto p-6 lg:p-8"><button type="button" onClick={() => router.push('/dashboard/roles')} className="mb-5 text-sm font-semibold text-[#009F51]">← Back to administrators</button><section className="grid gap-6 lg:grid-cols-[1fr_320px]"><div className="rounded-2xl border border-[#E1E4E6] bg-white p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-2xl font-bold text-[#012D32]">{[admin.firstName, admin.lastName].filter(Boolean).join(' ') || admin.email}</h2><p className="mt-1 text-sm text-gray-500">{admin.email}</p></div><StatusBadge status={admin.isActive ? 'active' : 'inactive'} /></div><dl className="mt-8 grid gap-5 sm:grid-cols-2"><Info label="Role" value={admin.role?.name ?? 'No role assigned'} /><Info label="Created" value={new Date(admin.createdAt).toLocaleString()} /><Info label="Last login" value={admin.lastLoginAt ? new Date(admin.lastLoginAt).toLocaleString() : 'Never'} /><Info label="Account ID" value={String(admin.id)} /></dl></div><div className="rounded-2xl border border-[#E1E4E6] bg-white p-6"><h3 className="font-bold text-[#012D32]">Account actions</h3><div className="mt-4 grid gap-2"><Button size="sm" onClick={() => setAction('edit')}>Edit profile and role</Button><Button size="sm" variant="outline" onClick={() => setAction('status')}>{admin.isActive ? 'Disable account' : 'Enable account'}</Button><Button size="sm" variant="outline" onClick={() => setAction('password')}>Reset password</Button><Button size="sm" variant="outline" onClick={() => setAction('email')}>Reset email 2FA</Button><Button size="sm" variant="outline" onClick={() => setAction('totp')}>Reset authenticator 2FA</Button><Button size="sm" variant="outline" onClick={() => setAction('sessions')}>Revoke active sessions</Button><Button size="sm" variant="outline" onClick={() => void openAudit()}>View audit history</Button><Button size="sm" variant="ghost" className="text-red-600" onClick={() => setAction('delete')}>Delete administrator</Button></div></div></section></main>
    <Modal open={Boolean(action && action !== 'audit')} title={action === 'edit' ? 'Edit administrator' : action === 'status' ? (admin.isActive ? 'Disable account' : 'Enable account') : action === 'delete' ? 'Delete administrator' : action === 'password' ? 'Reset password' : action === 'email' ? 'Reset email 2FA' : action === 'totp' ? 'Reset authenticator 2FA' : 'Revoke active sessions'} onClose={() => setAction(null)}><div className="space-y-4">{action === 'edit' && <><label className="block text-sm font-semibold">First name<input className="admin-input mt-1" value={firstName} onChange={(e) => setFirstName(e.target.value)} /></label><label className="block text-sm font-semibold">Last name<input className="admin-input mt-1" value={lastName} onChange={(e) => setLastName(e.target.value)} /></label><label className="block text-sm font-semibold">Role<select className="admin-input mt-1" value={roleId} onChange={(e) => setRoleId(e.target.value)}><option value="">No role</option>{roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select></label></>}{action === 'password' && <><input className="admin-input" type="password" placeholder="New password" value={password} onChange={(e) => setPassword(e.target.value)} /><input className="admin-input" type="password" placeholder="Confirm password" value={passwordConfirmation} onChange={(e) => setPasswordConfirmation(e.target.value)} /></>}<label className="block text-sm font-semibold">Reason<textarea className="admin-input mt-1" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Explain this administrative action" /></label><div className="flex justify-end gap-3"><Button variant="outline" onClick={() => setAction(null)}>Cancel</Button><Button isLoading={busy} variant={action === 'delete' ? 'secondary' : 'primary'} onClick={() => void execute()}>Confirm</Button></div></div></Modal>
    <Modal open={action === 'audit'} title="Audit history" onClose={() => setAction(null)}><div className="divide-y divide-gray-100">{audit.length === 0 ? <p className="py-6 text-sm text-gray-500">No audit entries loaded.</p> : audit.map((entry) => <article key={entry.id} className="py-4 text-sm"><strong>{entry.action}</strong><p className="mt-1 text-xs text-gray-500">{new Date(entry.created_at).toLocaleString()} · {entry.reason ?? 'No reason supplied'}</p><pre className="mt-2 overflow-auto rounded-xl bg-gray-50 p-3 text-xs">{JSON.stringify({ before: entry.before_state, after: entry.after_state }, null, 2)}</pre></article>)}</div></Modal></div></div>;
}

function Info({ label, value }: { label: string; value: string }) { return <div><dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</dt><dd className="mt-1 text-sm font-medium text-[#012D32]">{value}</dd></div>; }
