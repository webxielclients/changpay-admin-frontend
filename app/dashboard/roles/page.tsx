'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';
import { rolesApi2 } from '@/lib/api/client';
import type { RoleRecord, Permission, AdminUserRecord2 } from '@/lib/api/client';
import Sidebar from '@/components/Sidebar';
import DashboardHeader from '@/components/DashboardHeader';

type MainTab = 'roles' | 'permissions' | 'admin-user';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-100 rounded-lg ${className ?? ''}`} />;
}

function groupPermissions(permissions: Permission[]): Record<string, Permission[]> {
  return permissions.reduce((acc, p) => {
    const mod = p.module ?? 'Other';
    if (!acc[mod]) acc[mod] = [];
    acc[mod].push(p);
    return acc;
  }, {} as Record<string, Permission[]>);
}

// ─── Toggle switch ────────────────────────────────────────────────────────────
function Toggle({ enabled, onChange, size = 'md' }: { enabled: boolean; onChange: (v: boolean) => void; size?: 'sm' | 'md' }) {
  const track = size === 'sm' ? 'h-4 w-7' : 'h-5 w-9';
  const thumb = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';
  const translate = size === 'sm' ? 'translate-x-3' : 'translate-x-4';
  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex ${track} items-center rounded-full transition-colors flex-shrink-0 ${enabled ? 'bg-emerald-500' : 'bg-gray-200'}`}
    >
      <span className={`inline-block ${thumb} transform rounded-full bg-white shadow transition-transform ${enabled ? translate : 'translate-x-0.5'}`} />
    </button>
  );
}

// ─── Admin avatar ─────────────────────────────────────────────────────────────
function AdminAvatar({ name, size = 9 }: { name: string; size?: number }) {
  const initials = name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
  const COLORS = ['bg-emerald-600', 'bg-blue-600', 'bg-violet-600', 'bg-amber-600', 'bg-rose-600'];
  const color  = COLORS[name.charCodeAt(0) % COLORS.length];
  return (
    <div className={`w-${size} h-${size} rounded-full ${color} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
      {initials || 'A'}
    </div>
  );
}

// ─── Create/Edit Role Modal ───────────────────────────────────────────────────
function RoleModal({
  existing, allPermissions, onClose, onSaved,
}: {
  existing: RoleRecord | null;
  allPermissions: Permission[];
  onClose: () => void;
  onSaved: (role: RoleRecord) => void;
}) {
  const [name,        setName]        = useState(existing?.name ?? '');
  const [email,       setEmail]       = useState((existing as any)?.email ?? '');
  const [roleType,    setRoleType]    = useState((existing as any)?.type ?? 'custom');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [selectedIds, setSelectedIds] = useState<number[]>(existing?.permissions?.map((p) => p.id) ?? []);
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  const grouped = groupPermissions(allPermissions);

  const toggle = (id: number) =>
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const toggleModule = (perms: Permission[], all: boolean) =>
    setSelectedIds((prev) =>
      all
        ? prev.filter((id) => !perms.map((p) => p.id).includes(id))
        : [...new Set([...prev, ...perms.map((p) => p.id)])]
    );

  const handleSave = async () => {
    if (!name.trim()) { setError('Role name is required'); return; }
    try {
      setSaving(true);
      setError(null);
      const payload = { name, description, permissions: selectedIds };
      const res = existing
        ? await rolesApi2.updateRole(existing.id, payload)
        : await rolesApi2.createRole(payload);
      if (res.status && res.data) onSaved(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save role');
    } finally {
      setSaving(false);
    }
  };

  // Group labels mapped to display names
  const groupLabel: Record<string, string> = {
    users: 'User Management', transactions: 'Transactions', wallets: 'Wallet Management',
    kyc: 'KYC / KYB', kyb: 'KYC / KYB', giftcards: 'Gift Cards',
    banks: 'Banks & Payouts', payouts: 'Banks & Payouts',
    compliance: 'Compliance', settings: 'System Settings', roles: 'Roles & Permissions',
    fx: 'FX Engine',
  };

  // Static fallback groups — shown immediately, replaced by API data when loaded
  const STATIC_GROUPS: Record<string, string[]> = {
    'User Management':    ['View Users', 'Create Users', 'Edit Users', 'Delete Users', 'Freeze / Unfreeze Users'],
    'Transactions':       ['View Transactions', 'Approve Transactions', 'Reject Transactions', 'Process Refunds'],
    'Wallet Management':  ['View Wallets', 'Adjust Wallet Balances', 'Freeze / Unfreeze Wallets'],
    'KYC / KYB':         ['View KYC Applications', 'Approve KYC', 'Reject KYC', 'View KYB Applications', 'Approve KYB'],
    'Gift Cards':         ['View Gift Cards', 'Manage Gift Cards', 'Edit Gift Card Rates'],
    'Banks & Payouts':    ['View Banks', 'View Payouts', 'Process Payouts'],
    'Compliance':         ['View Compliance Reports', 'Export Compliance Data', 'Manage Risk Alerts'],
    'System Settings':    ['View System Settings', 'Edit System Settings', 'Manage Roles & Permissions', 'View Audit Logs'],
    'Roles & Permissions':['View roles', 'Create roles', 'Edit roles', 'Delete roles', 'Assign roles'],
  };

  // Merge kyc+kyb, banks+payouts into single display groups from API
  const apiDisplayGroups: Record<string, Permission[]> = {};
  Object.entries(grouped).forEach(([mod, perms]) => {
    const label = groupLabel[mod] ?? mod.charAt(0).toUpperCase() + mod.slice(1);
    apiDisplayGroups[label] = [...(apiDisplayGroups[label] ?? []), ...perms];
  });

  // Use API groups if loaded, else show static structure for display
  const hasApiPerms = allPermissions.length > 0;
  const displayGroups: Record<string, Permission[]> = hasApiPerms ? apiDisplayGroups : {};

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white w-full max-w-lg h-full flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900">{existing ? 'Edit Role' : 'Create new role'}</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-full transition-colors">
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Role Name + Email row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Role Name</label>
              <input
                type="text" value={name} onChange={(e) => setName(e.target.value)}
                placeholder="e.g content manager"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g content manager"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
          </div>

          {/* Role type dropdown */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Role type *</label>
            <div className="relative">
              <select
                value={roleType} onChange={(e) => setRoleType(e.target.value)}
                className="w-full appearance-none px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white cursor-pointer"
              >
                <option value="custom">Custom role</option>
                <option value="system">System role</option>
              </select>
              <svg className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </div>
          </div>

          {/* Permissions */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-3">Permissions *</p>
            <div className="space-y-3">
              {hasApiPerms ? (
                Object.entries(displayGroups).map(([groupName, perms]) => {
                  const uniquePerms = perms.filter((p, i, arr) => arr.findIndex((x) => x.id === p.id) === i);
                  const allSelected = uniquePerms.every((p) => selectedIds.includes(p.id));
                  return (
                    <div key={groupName} className="border border-gray-200 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-bold text-gray-800">{groupName}</h4>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">Select All</span>
                          <Toggle enabled={allSelected} onChange={() => toggleModule(uniquePerms, allSelected)} size="sm" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-y-2.5 gap-x-4">
                        {uniquePerms.map((p) => {
                          const checked = selectedIds.includes(p.id);
                          return (
                            <label key={p.id} className="flex items-center gap-2 cursor-pointer" onClick={() => toggle(p.id)}>
                              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${checked ? 'border-emerald-500 bg-emerald-500' : 'border-gray-300 bg-white'}`}>
                                {checked && (
                                  <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                  </svg>
                                )}
                              </div>
                              <span className="text-sm text-gray-700">{p.action}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              ) : (
                // Static groups shown while API permissions are loading
                Object.entries(STATIC_GROUPS).map(([groupName, actions]) => (
                  <div key={groupName} className="border border-gray-200 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-bold text-gray-800">{groupName}</h4>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">Select All</span>
                        <Toggle enabled={false} onChange={() => {}} size="sm" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-y-2.5 gap-x-4">
                      {actions.map((action) => (
                        <label key={action} className="flex items-center gap-2 cursor-not-allowed opacity-50">
                          <div className="w-4 h-4 rounded-full border-2 border-gray-300 bg-white flex-shrink-0" />
                          <span className="text-sm text-gray-500">{action}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>{/* end scrollable */}

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 bg-emerald-500 text-white rounded-xl text-sm font-bold hover:bg-emerald-600 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving...' : existing ? 'Update Role' : 'Create Role'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Assign Role Modal ────────────────────────────────────────────────────────
function AssignRoleModal({
  admin, roles, onClose, onAssigned,
}: {
  admin: AdminUserRecord2;
  roles: RoleRecord[];
  onClose: () => void;
  onAssigned: (updated: AdminUserRecord2) => void;
}) {
  const [selectedRoleId, setSelectedRoleId] = useState<number>(admin.role?.id ?? 0);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  const handleAssign = async () => {
    if (!selectedRoleId) { setError('Please select a role'); return; }
    try {
      setSaving(true);
      setError(null);
      const res = await rolesApi2.assignRole(admin.id, selectedRoleId);
      if (res.status && res.data) onAssigned(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign role');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6">
        <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-full">
          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <h3 className="text-base font-bold text-gray-900 mb-1">Assign Role</h3>
        <p className="text-sm text-gray-500 mb-5">{admin.firstName} {admin.lastName} — {admin.email}</p>
        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl"><p className="text-sm text-red-600">{error}</p></div>}
        <div className="mb-5">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Select Role</label>
          <select
            value={selectedRoleId}
            onChange={(e) => setSelectedRoleId(Number(e.target.value))}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white"
          >
            <option value={0}>— Choose a role —</option>
            {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50">Cancel</button>
          <button onClick={handleAssign} disabled={saving || !selectedRoleId}
            className="flex-1 py-2.5 bg-emerald-500 text-white rounded-xl text-sm font-semibold hover:bg-emerald-600 disabled:opacity-50">
            {saving ? 'Assigning...' : 'Assign Role'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
//  PAGE
// ═════════════════════════════════════════════════════════════════════════════
export default function RolesPermissionsPage() {
  const { isAuthenticated } = useAuthStore();
  const [mainTab, setMainTab] = useState<MainTab>('roles');

  // Roles
  const [roles,        setRoles]        = useState<RoleRecord[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [roleModal,    setRoleModal]    = useState(false);
  const [editingRole,  setEditingRole]  = useState<RoleRecord | null>(null);
  const [deletingId,   setDeletingId]   = useState<number | null>(null);
  const [suspendMap,   setSuspendMap]   = useState<Record<number, boolean>>({});

  // Permissions
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [loadingPerms,   setLoadingPerms]   = useState(false);

  // Admin users
  const [admins,        setAdmins]        = useState<AdminUserRecord2[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(false);
  const [adminSearch,   setAdminSearch]   = useState('');
  const [assignModal,   setAssignModal]   = useState<AdminUserRecord2 | null>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [error, setError] = useState<string | null>(null);

  const fetchRoles = useCallback(async () => {
    try {
      setLoadingRoles(true);
      setError(null);
      const res = await rolesApi2.getRoles();
      if (res.status) setRoles(res.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load roles');
    } finally {
      setLoadingRoles(false);
    }
  }, []);

  const fetchPermissions = useCallback(async () => {
    try {
      setLoadingPerms(true);
      const res = await rolesApi2.getPermissions();
      if (res.status) setAllPermissions(res.data ?? []);
    } catch { /* silent */ } finally {
      setLoadingPerms(false);
    }
  }, []);

  const fetchAdmins = useCallback(async (search?: string) => {
    try {
      setLoadingAdmins(true);
      setError(null);
      const res = await rolesApi2.getAdmins({ search, page: 1 });
      if (res.status) {
        const d = res.data as any;
        setAdmins(d && 'data' in d ? d.data ?? [] : []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load admins');
    } finally {
      setLoadingAdmins(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (mainTab === 'roles') fetchRoles();
    if (mainTab === 'permissions') fetchPermissions();
    if (mainTab === 'admin-user') { fetchAdmins(); if (roles.length === 0) fetchRoles(); }
  }, [isAuthenticated, mainTab]);

  useEffect(() => {
    if (isAuthenticated && roleModal && allPermissions.length === 0) fetchPermissions();
  }, [isAuthenticated, roleModal]);

  if (!isAuthenticated) return null;

  const handleRoleSaved = (role: RoleRecord) => {
    setRoles((prev) => editingRole ? prev.map((r) => r.id === role.id ? role : r) : [role, ...prev]);
    setRoleModal(false);
    setEditingRole(null);
  };

  const handleDeleteRole = async (role: RoleRecord) => {
    if (role.isSystem) { setError('System roles cannot be deleted.'); return; }
    if (!confirm(`Delete role "${role.name}"?`)) return;
    try {
      setDeletingId(role.id);
      const res = await rolesApi2.deleteRole(role.id);
      if (res.status) setRoles((prev) => prev.filter((r) => r.id !== role.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete role');
    } finally {
      setDeletingId(null);
    }
  };

  const handleAdminSearch = (val: string) => {
    setAdminSearch(val);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => fetchAdmins(val), 400);
  };

  const totalAdmins = roles.reduce((s, r) => s + (r.adminsCount ?? 0), 0);
  const systemRoles = roles.filter((r) => r.isSystem).length;

  const grouped = groupPermissions(allPermissions);
  // Merge display groups for permissions tab
  const groupLabel: Record<string, string> = {
    users: 'User Management', transactions: 'Transactions', wallets: 'Wallet Management',
    kyc: 'KYC/KYB', kyb: 'KYC/KYB', giftcards: 'Gift Cards',
    banks: 'Banks & Payouts', payouts: 'Banks & Payouts',
    compliance: 'Compliance', settings: 'System Settings', roles: 'System Settings', fx: 'FX Engine',
  };
  const displayGroups: Record<string, Permission[]> = {};
  Object.entries(grouped).forEach(([mod, perms]) => {
    const label = groupLabel[mod] ?? (mod.charAt(0).toUpperCase() + mod.slice(1));
    displayGroups[label] = [...(displayGroups[label] ?? []), ...perms].filter(
      (p, i, arr) => arr.findIndex((x) => x.id === p.id) === i
    );
  });

  const TABS: { id: MainTab; label: string }[] = [
    { id: 'roles',      label: 'Roles' },
    { id: 'permissions', label: 'Permissions' },
    { id: 'admin-user', label: 'Admin user' },
  ];

  return (
    <div className="flex h-screen bg-[#F8F9FA] font-['DM_Sans',sans-serif]">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-8 py-5 flex-shrink-0">
          <DashboardHeader
            title="Roles & Permissions"
            subtitle="Manage admin roles, permissions, and user assignments"
          />
        </div>

        {/* Tab bar — underline style, full width */}
        <div className="bg-white border-b border-gray-100 flex-shrink-0">
          <nav className="flex w-full">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setMainTab(tab.id)}
                className={`relative flex-1 py-4 text-sm font-medium text-center transition-colors ${
                  mainTab === tab.id ? 'text-emerald-600' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
                {mainTab === tab.id && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500" />
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          {error && (
            <div className="mx-8 mt-5 p-3 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* ══════════════════ ROLES TAB ══════════════════ */}
          {mainTab === 'roles' && (
            <div className="p-8 space-y-6">
              {/* Heading + Create Role */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-emerald-600">Roles Management</h2>
                  <p className="text-sm text-gray-500 mt-0.5">Create and manage admin roles with specific permissions</p>
                </div>
                <button
                  onClick={() => { setEditingRole(null); setRoleModal(true); }}
                  className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 text-white rounded-full text-sm font-semibold hover:bg-emerald-600 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  Create Role
                </button>
              </div>

              {/* Stat cards */}
              <div className="grid grid-cols-4 gap-4">
                {[
                  { label: 'Total Roles',   value: roles.length,  color: 'text-gray-900' },
                  { label: 'Active Roles',  value: roles.length,  color: 'text-emerald-600' },
                  { label: 'Total Admins',  value: totalAdmins,   color: 'text-blue-600' },
                  { label: 'System Roles',  value: systemRoles,   color: 'text-gray-900' },
                ].map((s) => (
                  <div key={s.label} className="bg-white rounded-2xl border border-gray-200 p-5">
                    <p className="text-xs text-gray-500 mb-2">{s.label}</p>
                    {loadingRoles ? <Skeleton className="h-9 w-12" /> : (
                      <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
                    )}
                  </div>
                ))}
              </div>

              {/* Role cards grid */}
              {loadingRoles ? (
                <div className="grid grid-cols-2 gap-5">
                  {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-64" />)}
                </div>
              ) : roles.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
                  <p className="text-gray-400 text-sm">No roles found</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-5">
                  {roles.map((role) => {
                    const isSuspended = suspendMap[role.id] ?? false;
                    return (
                      <div key={role.id} className="bg-white rounded-2xl border border-gray-200 p-6">
                        {/* Card header */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <AdminAvatar name={role.name} size={10} />
                            <div>
                              <h3 className="text-base font-bold text-gray-900">{role.name}</h3>
                              <p className="text-xs text-gray-400">{role.slug ?? `ROLE${String(role.id).padStart(3, '0')}`}</p>
                            </div>
                          </div>
                          {role.isSystem ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border border-gray-200 text-gray-500">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                              </svg>
                              System
                            </span>
                          ) : (
                            <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-400 border border-red-100">
                              Inactive
                            </span>
                          )}
                        </div>

                        <p className="text-sm text-gray-500 mb-4">{role.description || '—'}</p>

                        {/* Details */}
                        <div className="space-y-2 mb-4">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-500">Email</span>
                            <span className="text-gray-700 truncate max-w-[180px]">{(role as any).email ?? '—'}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-500">Permissions</span>
                            <span className="font-semibold text-blue-600">{role.permissionsCount ?? role.permissions?.length ?? 0}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-500">Created</span>
                            <span className="text-gray-700">{(role as any).created_at ? new Date((role as any).created_at).toLocaleDateString('en-CA') : '—'}</span>
                          </div>
                          {!role.isSystem && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-500">Suspend</span>
                              <Toggle
                                enabled={isSuspended}
                                onChange={(v) => setSuspendMap((prev) => ({ ...prev, [role.id]: v }))}
                                size="sm"
                              />
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3">
                          <button
                            onClick={() => { setEditingRole(role); setRoleModal(true); }}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-semibold transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                            </svg>
                            Edit
                          </button>
                          {!role.isSystem && (
                            <button
                              onClick={() => handleDeleteRole(role)}
                              disabled={deletingId === role.id}
                              className="w-11 h-10 flex items-center justify-center border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-colors"
                            >
                              <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ══════════════════ PERMISSIONS TAB ══════════════════ */}
          {mainTab === 'permissions' && (
            <div className="p-8 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-emerald-600">All Permissions</h2>
                  <p className="text-sm text-gray-500 mt-0.5">Complete list of available system permissions</p>
                </div>
                <button
                  onClick={() => { setEditingRole(null); setRoleModal(true); }}
                  className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 text-white rounded-full text-sm font-semibold hover:bg-emerald-600 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  Create Role
                </button>
              </div>

              {loadingPerms ? (
                <div className="space-y-6">
                  {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-48" />)}
                </div>
              ) : Object.keys(displayGroups).length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
                  <p className="text-gray-400 text-sm">No permissions found</p>
                </div>
              ) : (
                <div className="space-y-8">
                  {Object.entries(displayGroups).map(([groupName, perms]) => (
                    <div key={groupName}>
                      <h3 className="text-base font-bold text-gray-900 mb-4">{groupName}</h3>
                      <div className="grid grid-cols-2 gap-3">
                        {perms.map((p) => (
                          <div key={p.id} className="bg-white rounded-xl border border-gray-200 px-5 py-4">
                            <p className="text-sm font-bold text-gray-900 mb-1">{p.action}</p>
                            <p className="text-xs text-gray-500 mb-2">{(p as any).description ?? ''}</p>
                            <code className="text-xs text-gray-400 font-mono">{p.module}.{p.action?.toLowerCase().replace(/\s+/g, '_')}</code>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ══════════════════ ADMIN USER TAB ══════════════════ */}
          {mainTab === 'admin-user' && (
            <div className="p-8 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-emerald-600">Admin Users</h2>
                  <p className="text-sm text-gray-500 mt-0.5">Manage admin users and their role assignments</p>
                </div>
                <button
                  onClick={() => { setEditingRole(null); setRoleModal(true); }}
                  className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 text-white rounded-full text-sm font-semibold hover:bg-emerald-600 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  Create Role
                </button>
              </div>

              {/* Search */}
              <div className="relative">
                <svg className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                <input
                  type="text"
                  value={adminSearch}
                  onChange={(e) => handleAdminSearch(e.target.value)}
                  placeholder="Search by name, wallet ID or transaction ID..."
                  className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-full text-sm text-gray-700 placeholder-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>

              {/* Admins table */}
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-[#F8F9FA]">
                        {['Admin', 'Role', 'Status', 'Last login', 'Action'].map((h, idx, arr) => (
                          <th key={h} className={`px-5 py-4 text-left text-xs font-semibold text-gray-500 whitespace-nowrap ${idx === 0 ? 'rounded-tl-xl' : ''} ${idx === arr.length - 1 ? 'rounded-tr-xl' : ''}`}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {loadingAdmins ? (
                        [...Array(5)].map((_, i) => (
                          <tr key={i}>{[...Array(5)].map((_, j) => (
                            <td key={j} className="px-5 py-4"><Skeleton className="h-5 w-full" /></td>
                          ))}</tr>
                        ))
                      ) : admins.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-5 py-12 text-center text-sm text-gray-400">No admin users found</td>
                        </tr>
                      ) : (
                        admins.map((admin) => (
                          <tr key={admin.id} className="hover:bg-gray-50/50 transition-colors">
                            {/* Admin */}
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <AdminAvatar name={`${admin.firstName ?? ''} ${admin.lastName ?? ''}`} size={9} />
                                <div>
                                  <p className="text-sm font-semibold text-gray-900">{admin.firstName} {admin.lastName}</p>
                                  <p className="text-xs text-gray-400">{admin.email}</p>
                                </div>
                              </div>
                            </td>
                            {/* Role */}
                            <td className="px-5 py-4">
                              {admin.role ? (
                                <span className="inline-flex px-3 py-1 rounded-full text-xs font-semibold border border-gray-300 text-gray-700">
                                  {admin.role.name}
                                </span>
                              ) : (
                                <span className="text-xs text-gray-400">No role</span>
                              )}
                            </td>
                            {/* Status */}
                            <td className="px-5 py-4">
                              <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold border ${
                                admin.isActive
                                  ? 'border-emerald-300 text-emerald-600'
                                  : 'border-gray-300 text-gray-500'
                              }`}>
                                {admin.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            {/* Last login */}
                            <td className="px-5 py-4">
                              {admin.lastLoginAt ? (
                                <>
                                  <p className="text-xs text-gray-700">
                                    {new Date(admin.lastLoginAt).toLocaleString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                  <p className="text-xs text-gray-400">2 mins ago</p>
                                </>
                              ) : (
                                <p className="text-xs text-gray-400">Never</p>
                              )}
                            </td>
                            {/* Action */}
                            <td className="px-5 py-4">
                              <button
                                onClick={() => setAssignModal(admin)}
                                className="text-sm font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
                              >
                                Edit Role
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Role modal */}
      {roleModal && (
        <RoleModal
          existing={editingRole}
          allPermissions={allPermissions}
          onClose={() => { setRoleModal(false); setEditingRole(null); }}
          onSaved={handleRoleSaved}
        />
      )}

      {/* Assign role modal */}
      {assignModal && (
        <AssignRoleModal
          admin={assignModal}
          roles={roles}
          onClose={() => setAssignModal(null)}
          onAssigned={(updated) => {
            setAdmins((prev) => prev.map((a) => a.id === updated.id ? updated : a));
            setAssignModal(null);
          }}
        />
      )}
    </div>
  );
}