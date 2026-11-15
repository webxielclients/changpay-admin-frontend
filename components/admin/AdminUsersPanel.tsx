'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';
import { rolesApi2, type AdminUserAuditEntry, type AdminUserRecord2, type RoleRecord } from '@/lib/api/client';
import { Button } from '@/components/ui/Button';

type Action = 'view' | 'edit' | 'status' | 'delete' | 'password' | 'email' | 'totp' | 'sessions' | 'audit';
type Form = { first_name: string; last_name: string; email: string; password: string; password_confirmation: string; role_id: string; reason: string };
const emptyForm: Form = { first_name: '', last_name: '', email: '', password: '', password_confirmation: '', role_id: '', reason: '' };

function Dialog({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"><div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"><div className="mb-5 flex items-center justify-between"><h3 className="text-lg font-bold text-[#012D32]">{title}</h3><button onClick={onClose} className="text-2xl text-gray-400" aria-label="Close">×</button></div>{children}</div></div>;
}

export default function AdminUsersPanel() {
  const router = useRouter();
  const { user } = useAuthStore();
  const permissions = user?.permissions ?? [];
  const isSuperAdmin = permissions.includes('roles_permissions.create') || permissions.includes('roles_permissions.edit') || permissions.includes('roles_permissions.delete');
  const canCreate = isSuperAdmin && permissions.includes('roles_permissions.create');
  const [admins, setAdmins] = useState<AdminUserRecord2[]>([]);
  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [target, setTarget] = useState<AdminUserRecord2 | null>(null);
  const [action, setAction] = useState<Action | null>(null);
  const [form, setForm] = useState<Form>(emptyForm);
  const [audit, setAudit] = useState<AdminUserAuditEntry[]>([]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [adminsResponse, rolesResponse] = await Promise.all([rolesApi2.getAdmins({ search, page: 1 }), rolesApi2.getRoles()]);
      const page = adminsResponse.data;
      setAdmins(Array.isArray(page) ? page : page?.data ?? []);
      setRoles(rolesResponse.data ?? []);
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to load administrators.'); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const close = () => { setTarget(null); setAction(null); setForm(emptyForm); setAudit([]); };

  const submit = async () => {
    if (!target && action !== 'edit') return;
    if (!form.reason.trim() && action !== 'view') return toast.error('A reason is required.');
    try {
      setBusy(true);
      if (action === 'edit' && target) {
        const response = await rolesApi2.updateAdmin(target.id, { first_name: form.first_name, last_name: form.last_name, email: form.email, reason: form.reason });
        let updated = response.data;
        if (form.role_id && Number(form.role_id) !== target.role?.id) updated = (await rolesApi2.assignRole(target.id, Number(form.role_id))).data;
        setAdmins((items) => items.map((item) => item.id === target.id ? updated : item));
      } else if (action === 'status' && target) {
        const response = await rolesApi2.setAdminStatus(target.id, form.reason); setAdmins((items) => items.map((item) => item.id === target.id ? response.data : item));
      } else if (action === 'delete' && target) {
        await rolesApi2.deleteAdmin(target.id, form.reason); setAdmins((items) => items.filter((item) => item.id !== target.id));
      } else if (action === 'password' && target) {
        await rolesApi2.resetAdminPassword(target.id, { password: form.password, password_confirmation: form.password_confirmation, reason: form.reason });
      } else if ((action === 'email' || action === 'totp') && target) {
        await rolesApi2.resetAdminTwoFactor(target.id, action, form.reason);
      } else if (action === 'sessions' && target) {
        await rolesApi2.revokeAdminSessions(target.id, form.reason);
      }
      toast.success('Administrator action completed.'); close();
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Administrator action failed.'); }
    finally { setBusy(false); }
  };

  const view = async (admin: AdminUserRecord2) => {
    router.push(`/dashboard/roles/admin-users/${admin.id}`);
  };

  const add = () => { setTarget(null); setAction('edit'); setForm({ ...emptyForm, role_id: roles[0] ? String(roles[0].id) : '' }); };
  if (!isSuperAdmin) return <div className="rounded-2xl border border-gray-100 bg-white p-8 text-sm text-gray-500">Administrator management is restricted to Super Admin.</div>;

  return <div className="space-y-5 p-8"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-bold text-[#009F51]">Admin Users</h2><p className="mt-1 text-sm text-gray-500">Manage admin users and their role assignments</p></div>{canCreate && <Button onClick={add}>Create Admin</Button>}</div><div className="rounded-2xl border border-gray-100 bg-white p-3"><input className="w-full rounded-full border border-gray-200 bg-gray-50 px-4 py-3 text-sm" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name, wallet ID or transaction ID..." /></div><div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white"><table className="min-w-full text-sm"><thead><tr className="border-b border-gray-100 text-left text-xs text-gray-500"><th className="px-4 py-3">Admin</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Last login</th><th className="px-4 py-3">Action</th></tr></thead><tbody>{loading ? <tr><td colSpan={5} className="p-8 text-center text-gray-500">Loading administrators...</td></tr> : admins.length === 0 ? <tr><td colSpan={5} className="p-8 text-center text-gray-500">No administrators found.</td></tr> : admins.map((admin) => <tr key={admin.id} className="border-b border-gray-50"><td className="px-4 py-4"><strong>{[admin.firstName, admin.lastName].filter(Boolean).join(' ') || admin.email}</strong><div className="text-xs text-gray-500">{admin.email}</div></td><td className="px-4 py-4"><span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">{admin.role?.name ?? 'No role'}</span></td><td className="px-4 py-4"><span className={admin.isActive ? 'rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700' : 'rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-semibold text-gray-500'}>{admin.isActive ? 'Active' : 'Inactive'}</span></td><td className="px-4 py-4 text-xs text-gray-600">{admin.lastLoginAt ? new Date(admin.lastLoginAt).toLocaleString() : 'Never'}</td><td className="px-4 py-4"><button className="font-semibold text-[#009F51] hover:underline" onClick={() => void view(admin)}>View</button></td></tr>)}</tbody></table></div>

    {target && action === 'view' && <Dialog title="Administrator details" onClose={close}><div className="space-y-2 text-sm"><p><strong>Name:</strong> {[target.firstName, target.lastName].filter(Boolean).join(' ') || 'Not supplied'}</p><p><strong>Email:</strong> {target.email}</p><p><strong>Role:</strong> {target.role?.name ?? 'No role'}</p><p><strong>Status:</strong> {target.isActive ? 'Active' : 'Inactive'}</p><p><strong>Last login:</strong> {target.lastLoginAt ? new Date(target.lastLoginAt).toLocaleString() : 'Never'}</p></div></Dialog>}
    {target && action === 'audit' && <Dialog title={`Audit history: ${target.email}`} onClose={close}><div className="divide-y divide-gray-100">{audit.length === 0 ? <p className="py-4 text-sm text-gray-500">No audit entries found.</p> : audit.map((entry) => <article key={entry.id} className="py-3 text-sm"><strong>{entry.action}</strong><p className="text-xs text-gray-500">{new Date(entry.created_at).toLocaleString()} · {entry.reason ?? 'No reason'}</p><pre className="mt-2 overflow-auto rounded bg-gray-50 p-2 text-xs">{JSON.stringify({ before: entry.before_state, after: entry.after_state }, null, 2)}</pre></article>)}</div></Dialog>}
    {action === 'edit' && <Dialog title={target ? 'Edit administrator' : 'Add administrator'} onClose={close}><div className="space-y-3"><div className="grid gap-3 sm:grid-cols-2"><input className="w-full rounded-xl border border-gray-200 px-3 py-2" placeholder="First name" value={form.first_name} onChange={(event) => setForm({ ...form, first_name: event.target.value })} /><input className="w-full rounded-xl border border-gray-200 px-3 py-2" placeholder="Last name" value={form.last_name} onChange={(event) => setForm({ ...form, last_name: event.target.value })} /></div><input className="w-full rounded-xl border border-gray-200 px-3 py-2" placeholder="Email" value={form.email} disabled={!!target} onChange={(event) => setForm({ ...form, email: event.target.value })} />{!target && <><input className="w-full rounded-xl border border-gray-200 px-3 py-2" type="password" placeholder="Password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /><input className="w-full rounded-xl border border-gray-200 px-3 py-2" type="password" placeholder="Confirm password" value={form.password_confirmation} onChange={(event) => setForm({ ...form, password_confirmation: event.target.value })} /></>}<select className="w-full rounded-xl border border-gray-200 px-3 py-2" value={form.role_id} onChange={(event) => setForm({ ...form, role_id: event.target.value })}><option value="">Select role</option>{roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select><textarea className="w-full rounded-xl border border-gray-200 px-3 py-2" placeholder="Reason" value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} /><div className="flex justify-end"><Button onClick={() => void (target ? submit() : (async () => { try { setBusy(true); const response = await rolesApi2.createAdmin({ ...form, role_id: Number(form.role_id), reason: form.reason }); setAdmins((items) => [response.data, ...items]); toast.success('Administrator created.'); close(); } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to create administrator.'); } finally { setBusy(false); } })())} isLoading={busy}>{target ? 'Save changes' : 'Create administrator'}</Button></div></div></Dialog>}
    {target && action && !['view', 'edit', 'audit'].includes(action) && <Dialog title={action === 'status' ? (target.isActive ? 'Disable administrator' : 'Enable administrator') : action === 'delete' ? 'Delete administrator' : action === 'password' ? 'Reset administrator password' : action === 'email' ? 'Reset email 2FA' : action === 'totp' ? 'Reset authenticator 2FA' : 'Revoke administrator sessions'} onClose={close}><div className="space-y-3">{action === 'password' && <><input className="w-full rounded-xl border border-gray-200 px-3 py-2" type="password" placeholder="New password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /><input className="w-full rounded-xl border border-gray-200 px-3 py-2" type="password" placeholder="Confirm password" value={form.password_confirmation} onChange={(event) => setForm({ ...form, password_confirmation: event.target.value })} /></>}<textarea className="w-full rounded-xl border border-gray-200 px-3 py-2" placeholder="Reason" value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} /><div className="flex justify-end"><Button onClick={() => void submit()} isLoading={busy} variant={action === 'delete' ? 'secondary' : 'primary'}>Confirm</Button></div></div></Dialog>}
  </div>;
}
