'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { rolesApi2 } from '@/lib/api/client';
import type { RoleRecord, Permission, AdminUserRecord2 } from '@/lib/api/client';
import { AUTH_ROUTES } from '@/constants/auth';
import Sidebar from '@/components/Sidebar';
import DashboardHeader from '@/components/DashboardHeader';

type MainTab = 'roles' | 'permissions' | 'admin-user';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-100 rounded-lg ${className}`} />;
}

function groupPermissions(permissions: Permission[]): Record<string, Permission[]> {
  return permissions.reduce((acc, p) => {
    const mod = p.module ?? 'Other';
    if (!acc[mod]) acc[mod] = [];
    acc[mod].push(p);
    return acc;
  }, {} as Record<string, Permission[]>);
}

// ─── Role Modal (Create / Edit) ───────────────────────────────────────────────
function RoleModal({
  existing,
  allPermissions,
  onClose,
  onSaved,
}: {
  existing: RoleRecord | null;
  allPermissions: Permission[];
  onClose: () => void;
  onSaved: (role: RoleRecord) => void;
}) {
  const [name, setName] = useState(existing?.name ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [selectedIds, setSelectedIds] = useState<number[]>(
    existing?.permissions?.map((p) => p.id) ?? []
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const grouped = groupPermissions(allPermissions);

  const toggle = (id: number) =>
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const toggleModule = (perms: Permission[]) => {
    const ids = perms.map((p) => p.id);
    const allSelected = ids.every((id) => selectedIds.includes(id));
    setSelectedIds((prev) =>
      allSelected ? prev.filter((id) => !ids.includes(id)) : [...new Set([...prev, ...ids])]
    );
  };

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-bold text-gray-900">{existing ? 'Edit Role' : 'Create New Role'}</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-full">
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1.5">Role Name *</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Operations Manager" maxLength={50}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1.5">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this role can do..."
              rows={2}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-gray-900">Permissions ({selectedIds.length} selected)</label>
              <button onClick={() => setSelectedIds(allPermissions.map((p) => p.id))}
                className="text-xs text-emerald-600 hover:text-emerald-700 font-medium">Select All</button>
            </div>
            <div className="space-y-4 max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-4">
              {Object.entries(grouped).map(([module, perms]) => {
                const allSelected = perms.every((p) => selectedIds.includes(p.id));
                return (
                  <div key={module}>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">{module}</h4>
                      <button onClick={() => toggleModule(perms)}
                        className="text-xs text-emerald-600 hover:text-emerald-700 font-medium">
                        {allSelected ? 'Deselect' : 'Select All'}
                      </button>
                    </div>
                    <div className="space-y-1.5">
                      {perms.map((p) => (
                        <label key={p.id} className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={selectedIds.includes(p.id)} onChange={() => toggle(p.id)}
                            className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500" />
                          <span className="text-sm text-gray-700">{p.action}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200">
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50">
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving}
              className="flex-1 py-2.5 bg-emerald-500 text-white rounded-lg text-sm font-semibold hover:bg-emerald-600 disabled:opacity-50">
              {saving ? 'Saving...' : existing ? 'Update Role' : 'Create Role'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Assign Role Modal ────────────────────────────────────────────────────────
function AssignRoleModal({
  admin,
  roles,
  onClose,
  onAssigned,
}: {
  admin: AdminUserRecord2;
  roles: RoleRecord[];
  onClose: () => void;
  onAssigned: (updated: AdminUserRecord2) => void;
}) {
  const [selectedRoleId, setSelectedRoleId] = useState<number>(admin.role?.id ?? 0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      <div className="absolute inset-0 bg-gray-900/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6">
        <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-full">
          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <h3 className="text-lg font-bold text-gray-900 mb-1">Assign Role</h3>
        <p className="text-sm text-gray-500 mb-5">{admin.firstName} {admin.lastName} — {admin.email}</p>

        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg"><p className="text-sm text-red-600">{error}</p></div>}

        <div className="mb-5">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Select Role</label>
          <select value={selectedRoleId} onChange={(e) => setSelectedRoleId(Number(e.target.value))}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white">
            <option value={0}>— Choose a role —</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50">Cancel</button>
          <button onClick={handleAssign} disabled={saving || !selectedRoleId}
            className="flex-1 py-2.5 bg-emerald-500 text-white rounded-lg text-sm font-semibold hover:bg-emerald-600 disabled:opacity-50">
            {saving ? 'Assigning...' : 'Assign Role'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function RolesPermissionsPage() {
  const router = useRouter();
  const { isAuthenticated, user: authUser } = useAuthStore();

  const [mainTab, setMainTab] = useState<MainTab>('roles');

  // Roles tab
  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [roleModal, setRoleModal] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleRecord | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Permissions tab
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [loadingPerms, setLoadingPerms] = useState(false);

  // Admin Users tab
  const [admins, setAdmins] = useState<AdminUserRecord2[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(false);
  const [adminSearch, setAdminSearch] = useState('');
  const [assignModal, setAssignModal] = useState<AdminUserRecord2 | null>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [error, setError] = useState<string | null>(null);

  // ── 1. All hooks before return ──
  useEffect(() => {
    if (!isAuthenticated) router.push(AUTH_ROUTES.LOGIN);
  }, [isAuthenticated, router]);

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
        const d = res.data;
        if (d && typeof d === 'object' && 'data' in d) {
          setAdmins((d as { data: AdminUserRecord2[] }).data ?? []);
        } else {
          setAdmins([]);
        }
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
    if (mainTab === 'permissions') {
      fetchPermissions();
    }
    if (mainTab === 'admin-user') {
      fetchAdmins();
      if (roles.length === 0) fetchRoles(); // need roles for assign modal
    }
  }, [isAuthenticated, mainTab]);

  // Also fetch permissions when roles modal is opened (needed for role creation)
  useEffect(() => {
    if (!isAuthenticated || !roleModal) return;
    if (allPermissions.length === 0) fetchPermissions();
  }, [isAuthenticated, roleModal]);

  // ── 2. Auth guard after all hooks ──
  if (!isAuthenticated) return null;

  // ── 3. Handlers ──
  const handleRoleSaved = (role: RoleRecord) => {
    if (editingRole) {
      setRoles((prev) => prev.map((r) => r.id === role.id ? role : r));
    } else {
      setRoles((prev) => [role, ...prev]);
    }
    setRoleModal(false);
    setEditingRole(null);
  };

  const handleDeleteRole = async (role: RoleRecord) => {
    if (role.isSystem) { setError('System roles cannot be deleted.'); return; }
    if (!confirm(`Delete role "${role.name}"? This cannot be undone.`)) return;
    try {
      setDeletingId(role.id);
      setError(null);
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

  const handleRoleAssigned = (updated: AdminUserRecord2) => {
    setAdmins((prev) => prev.map((a) => a.id === updated.id ? updated : a));
    setAssignModal(null);
  };

  const grouped = groupPermissions(allPermissions);
  const totalAdmins = roles.reduce((sum, r) => sum + r.adminsCount, 0);
  const systemRoles = roles.filter((r) => r.isSystem).length;

  // ── 4. Render ──
  return (
    <>
      <div className="flex h-screen bg-gray-50 font-['DM_Sans']">
        <Sidebar />
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-white border-b border-gray-200 px-8 py-6">
         <DashboardHeader title="Roles & Permissions" subtitle="Manage admin roles, permissions, and user assignments" />
          </div>
          <div className="flex-1 overflow-y-auto p-8">
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* ── ROLES TAB ── */}
            {mainTab === 'roles' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Roles Management</h2>
                    <p className="text-sm text-gray-500 mt-0.5">Create and manage roles with specific permissions</p>
                  </div>
                  <button onClick={() => { setEditingRole(null); setRoleModal(true); }}
                    className="px-6 py-2.5 bg-emerald-500 text-white rounded-lg text-sm font-semibold hover:bg-emerald-600 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    Create Role
                  </button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-4 gap-6 mb-8">
                  {[
                    { label: 'Total Roles', value: roles.length, color: 'text-gray-900' },
                    { label: 'Active Roles', value: roles.length, color: 'text-emerald-600' },
                    { label: 'Total Admins', value: totalAdmins, color: 'text-blue-600' },
                    { label: 'System Roles', value: systemRoles, color: 'text-gray-900' },
                  ].map((s) => (
                    <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-5">
                      <p className="text-xs text-gray-500 mb-1">{s.label}</p>
                      {loadingRoles ? <Skeleton className="h-9 w-12" /> : (
                        <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
                      )}
                    </div>
                  ))}
                </div>

                {/* Role Cards */}
                {loadingRoles ? (
                  <div className="grid grid-cols-2 gap-6">
                    {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-56" />)}
                  </div>
                ) : roles.length === 0 ? (
                  <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                    <p className="text-gray-400 text-sm">No roles found</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-6">
                    {roles.map((role) => (
                      <div key={role.id} className="bg-white rounded-xl border border-gray-200 p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gray-900 flex items-center justify-center text-white text-sm font-bold">
                              {role.name.charAt(0)}
                            </div>
                            <div>
                              <h3 className="text-base font-bold text-gray-900">{role.name}</h3>
                              <p className="text-xs text-gray-400 font-mono">{role.slug}</p>
                            </div>
                          </div>
                          {role.isSystem && (
                            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">
                              System
                            </span>
                          )}
                        </div>

                        <p className="text-sm text-gray-600 mb-4">{role.description || '—'}</p>

                        <div className="space-y-2 mb-4">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-500">Permissions</span>
                            <span className="text-gray-900 font-semibold">{role.permissionsCount}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-500">Admins Assigned</span>
                            <span className="text-gray-900 font-semibold">{role.adminsCount}</span>
                          </div>
                        </div>

                        <div className="flex gap-3">
                          <button onClick={() => { setEditingRole(role); setRoleModal(true); }}
                            className="flex-1 py-2.5 bg-emerald-500 text-white rounded-lg text-sm font-semibold hover:bg-emerald-600 flex items-center justify-center gap-1.5">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                            </svg>
                            Edit
                          </button>
                          {!role.isSystem && (
                            <button onClick={() => handleDeleteRole(role)}
                              disabled={deletingId === role.id}
                              className="w-11 h-10 flex items-center justify-center border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50">
                              {deletingId === role.id ? (
                                <svg className="animate-spin w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                              ) : (
                                <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                </svg>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── PERMISSIONS TAB ── */}
            {mainTab === 'permissions' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">All Permissions</h2>
                    <p className="text-sm text-gray-500 mt-0.5">Available system permissions grouped by module</p>
                  </div>
                  <button onClick={() => { setEditingRole(null); setRoleModal(true); }}
                    className="px-6 py-2.5 bg-emerald-500 text-white rounded-lg text-sm font-semibold hover:bg-emerald-600 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    Create Role
                  </button>
                </div>

                {loadingPerms ? (
                  <div className="space-y-6">
                    {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-40" />)}
                  </div>
                ) : Object.keys(grouped).length === 0 ? (
                  <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                    <p className="text-gray-400 text-sm">No permissions found</p>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {Object.entries(grouped).map(([module, perms]) => (
                      <div key={module}>
                        <h3 className="text-base font-bold text-gray-900 mb-4 capitalize">{module}</h3>
                        <div className="grid grid-cols-2 gap-4">
                          {perms.map((p) => (
                            <div key={p.id} className="bg-white rounded-xl border border-gray-200 p-5">
                              <h4 className="text-sm font-semibold text-gray-900 mb-1 capitalize">{p.action}</h4>
                              <p className="text-xs text-gray-400 font-mono">{p.module}.{p.action}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── ADMIN USERS TAB ── */}
            {mainTab === 'admin-user' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-emerald-600">Admin Users</h2>
                    <p className="text-sm text-gray-500 mt-0.5">Manage admin users and their role assignments</p>
                  </div>
                </div>

                <div className="mb-6 relative">
                  <svg className="w-5 h-5 text-gray-400 absolute left-3 top-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                  </svg>
                  <input type="text" value={adminSearch} onChange={(e) => handleAdminSearch(e.target.value)}
                    placeholder="Search by name or email..."
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white" />
                </div>

                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        {['Admin', 'Role', 'Status', 'Last Login', 'Action'].map((h) => (
                          <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {loadingAdmins ? (
                        [...Array(4)].map((_, i) => (
                          <tr key={i}>{[...Array(5)].map((_, j) => (
                            <td key={j} className="px-6 py-4"><Skeleton className="h-5 w-full" /></td>
                          ))}</tr>
                        ))
                      ) : admins.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center text-gray-400 text-sm">No admin users found</td>
                        </tr>
                      ) : (
                        admins.map((admin) => (
                          <tr key={admin.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold">
                                  {(admin.firstName?.[0] ?? '') + (admin.lastName?.[0] ?? '')}
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-900">{admin.firstName} {admin.lastName}</p>
                                  <p className="text-xs text-gray-400">{admin.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              {admin.role ? (
                                <span className="inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-200">
                                  {admin.role.name}
                                </span>
                              ) : (
                                <span className="text-xs text-gray-400">No role</span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold border ${
                                admin.isActive
                                  ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                                  : 'bg-gray-100 text-gray-600 border-gray-200'
                              }`}>
                                {admin.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-xs text-gray-900">
                                {admin.lastLoginAt
                                  ? new Date(admin.lastLoginAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
                                  : '—'}
                              </p>
                            </td>
                            <td className="px-6 py-4">
                              <button onClick={() => setAssignModal(admin)}
                                className="text-sm text-emerald-600 hover:text-emerald-700 font-medium">
                                Assign Role
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Role Create/Edit Modal */}
      {roleModal && (
        <RoleModal
          existing={editingRole}
          allPermissions={allPermissions}
          onClose={() => { setRoleModal(false); setEditingRole(null); }}
          onSaved={handleRoleSaved}
        />
      )}

      {/* Assign Role Modal */}
      {assignModal && (
        <AssignRoleModal
          admin={assignModal}
          roles={roles}
          onClose={() => setAssignModal(null)}
          onAssigned={handleRoleAssigned}
        />
      )}
    </>
  );
}