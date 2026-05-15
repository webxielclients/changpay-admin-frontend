
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { rolesApi } from '@/lib/api/client';
import type { Role } from '@/lib/api/client';
import { AUTH_ROUTES } from '@/constants/auth';

export default function AssignRolePage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();

  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchingRoles, setFetchingRoles] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);


  useEffect(() => {
    async function fetchRoles() {
      try {
        const res = await rolesApi.getRoles();
        if (res.status) {
          setRoles(res.data);
          if (res.data.length > 0) setSelectedRoleId(res.data[0].id);
        }
      } catch (err) {
        setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to load roles' });
      } finally {
        setFetchingRoles(false);
      }
    }
    if (isAuthenticated) fetchRoles();
  }, [isAuthenticated]);

  if (!isAuthenticated) return null;

  const handleAssign = async () => {
    if (!user?.id || selectedRoleId == null) return;
    try {
      setLoading(true);
      setMessage(null);
      const res = await rolesApi.assignRole(user.id, selectedRoleId);
      if (res.status) {
        setMessage({
          type: 'success',
          text: `Role assigned successfully! You now have role_id: ${res.data.role_id}. Redirecting to dashboard...`,
        });
        setTimeout(() => router.push('/dashboard'), 2000);
      }
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to assign role' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-900">Assign Role to Your Account</h1>
          <p className="text-sm text-gray-500 mt-1">
            Your account (<span className="font-medium">{user?.email}</span>) has no role assigned.
            Select a role below to grant yourself permissions.
          </p>
        </div>

        {message && (
          <div className={`mb-6 p-4 rounded-xl border text-sm ${
            message.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : 'bg-red-50 border-red-200 text-red-600'
          }`}>
            {message.text}
          </div>
        )}

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Admin ID
          </label>
          <div className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-600">
            {user?.id ?? '—'}
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Role
          </label>
          {fetchingRoles ? (
            <div className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-400 animate-pulse">
              Loading roles...
            </div>
          ) : roles.length === 0 ? (
            <div className="px-4 py-2.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
              No roles found. The GET /roles endpoint may also require permissions.
              Ask your backend dev to seed roles or assign via SQL.
            </div>
          ) : (
            <select
              value={selectedRoleId ?? ''}
              onChange={(e) => setSelectedRoleId(Number(e.target.value))}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name} {role.is_system ? '(System)' : ''} — {role.description || role.slug}
                </option>
              ))}
            </select>
          )}
        </div>

        <button
          onClick={handleAssign}
          disabled={loading || fetchingRoles || roles.length === 0 || selectedRoleId == null}
          className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Assigning...' : 'Assign Role to My Account'}
        </button>

        <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <p className="text-xs text-amber-700 font-semibold mb-1">If roles also return 403:</p>
          <p className="text-xs text-amber-600">
            Ask your backend dev to run:<br />
            <code className="bg-amber-100 px-1 rounded">
              UPDATE admins SET role_id = 1 WHERE email = '{user?.email}';
            </code>
          </p>
        </div>

        <button
          onClick={() => router.push('/dashboard')}
          className="w-full mt-3 py-2.5 border border-gray-300 text-gray-600 font-medium rounded-xl text-sm hover:bg-gray-50 transition-colors"
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}