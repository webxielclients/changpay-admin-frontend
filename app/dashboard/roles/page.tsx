'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { AUTH_ROUTES } from '@/constants/auth';
import Sidebar from '@/components/Sidebar';

type MainTab = 'roles' | 'permissions' | 'admin-user';

interface Role {
  id: string;
  name: string;
  description: string;
  email: string;
  permissions: number;
  created: string;
  suspended: boolean;
  badge?: string;
  badgeColor?: string;
}

const mockRoles: Role[] = [
  { id: 'ROLE001', name: 'Super Admin', description: 'Full system access and permissions', email: 'Olalekan.oladapo@changpay.com', permissions: 24, created: '2024-01-01', suspended: false, badge: '6 Assigned', badgeColor: 'purple' },
  { id: 'ROLE002', name: 'Operations Manager', description: 'Manages daily operations, transactions, and user accounts', email: 'Olalekan.oladapo@changpay.com', permissions: 18, created: '2024-01-16', suspended: false, badge: 'INACTIVE', badgeColor: 'gray' },
  { id: 'ROLE003', name: 'Compliance Officer', description: 'Monitors system and ensures user marketing', email: 'Olalekan.oladapo@changpay.com', permissions: 12, created: '2024-01-01', suspended: true, badge: 'ACTIVE', badgeColor: 'green' },
  { id: 'ROLE004', name: 'Finance Team', description: 'Full system control and permissions', email: 'Olalekan.oladapo@changpay.com', permissions: 15, created: '2024-01-01', suspended: false, badge: 'INACTIVE', badgeColor: 'gray' },
  { id: 'ROLE005', name: 'Customer Support', description: 'Assists users with customer assistance', email: 'Olalekan.oladapo@changpay.com', permissions: 8, created: '2024-01-01', suspended: true },
  { id: 'ROLE006', name: 'Auditor', description: 'Read only access for audit purposes', email: 'Olalekan.oladapo@changpay.com', permissions: 6, created: '2024-01-01', suspended: true, badge: 'INACTIVE', badgeColor: 'gray' },
];

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  roleColor: string;
  status: 'Active' | 'Inactive';
  lastLogin: string;
  lastLoginRelative: string;
}

const mockAdminUsers: AdminUser[] = [
  { id: '1', name: 'Olalekan O.', email: 'Olalekan@changpay.com', role: 'Super Admin', roleColor: 'blue', status: 'Active', lastLogin: '2026-01-05 10:30am', lastLoginRelative: '2 mins ago' },
  { id: '2', name: 'Chidi Okefor', email: 'chidi@changpay.com', role: 'Operations Manager', roleColor: 'blue', status: 'Active', lastLogin: '2026-01-05 10:30am', lastLoginRelative: '2 mins ago' },
  { id: '3', name: 'Sarah Johnson', email: 'sarah@changpay.com', role: 'Compliance Officer', roleColor: 'blue', status: 'Active', lastLogin: '2026-01-05 10:30am', lastLoginRelative: '2 mins ago' },
  { id: '4', name: 'Michael Chen', email: 'michael@changpay.com', role: 'Finance Team', roleColor: 'blue', status: 'Active', lastLogin: '2026-01-05 10:30am', lastLoginRelative: '2 mins ago' },
  { id: '5', name: 'Emma Williams', email: 'emma@changpay.com', role: 'Customer Support', roleColor: 'blue', status: 'Active', lastLogin: '2026-01-05 10:30am', lastLoginRelative: '2 mins ago' },
];

const permissionsData = {
  'User Management': [
    { name: 'View Users', description: 'View user profiles and details', code: 'users.view' },
    { name: 'Create Users', description: 'Add new users to the system', code: 'users.create' },
    { name: 'Edit Users', description: 'Modify user information', code: 'users.edit' },
    { name: 'Delete Users', description: 'Remove users from the system', code: 'users.delete' },
    { name: 'Freeze/Unfreeze Users', description: 'Suspend or activate user accounts', code: 'users.freeze' },
  ],
  'Transactions': [
    { name: 'View Transactions', description: 'View all transaction records', code: 'transactions.view' },
    { name: 'Approve Transactions', description: 'Approve pending transactions', code: 'transactions.approve' },
    { name: 'Reject Transactions', description: 'Reject or cancel transactions', code: 'transactions.reject' },
    { name: 'Process Refunds', description: 'Issue refunds to users', code: 'transactions.refund' },
  ],
  'Wallet Management': [
    { name: 'View Wallets', description: 'View wallet balances and details', code: 'wallets.view' },
    { name: 'Adjust Wallets', description: 'Manual wallet balance adjustments', code: 'wallets.adjust' },
    { name: 'Freeze Wallets', description: 'Lock or unlock wallets', code: 'wallets.freeze' },
  ],
  'FX Engine': [
    { name: 'View FX Rates', description: 'View exchange rates', code: 'fx.view_rates' },
    { name: 'Edit FX Rates', description: 'Modify exchange rates', code: 'fx.edit_rates' },
    { name: 'Manual Override', description: 'Override automatic rate updates', code: 'fx.override' },
  ],
  'KYC/KYB': [
    { name: 'View KYC Applications', description: 'View verification requests', code: 'kyc.view' },
    { name: 'Approve KYC', description: 'Approve customer verification', code: 'kyc.approve' },
    { name: 'Reject KYC', description: 'Reject verification requests', code: 'kyc.reject' },
    { name: 'View KYB Applications', description: 'View business verification', code: 'kyb.view' },
    { name: 'Approve KYB', description: 'Approve business verification', code: 'kyb.approve' },
  ],
  'Gift Cards': [
    { name: 'View Gift Cards', description: 'View gift card transactions', code: 'giftcards.view' },
    { name: 'Manage Cards', description: 'Add/edit gift card types', code: 'giftcards.manage' },
    { name: 'Edit Rates', description: 'Modify gift card rates', code: 'giftcards.rates' },
  ],
  'Banks & Payouts': [
    { name: 'View Banks', description: 'View bank connections', code: 'banks.view' },
    { name: 'View Payouts', description: 'View payout transactions', code: 'payouts.view' },
    { name: 'Process Payouts', description: 'Approve and execute payouts', code: 'payouts.process' },
  ],
  'Compliance': [
    { name: 'View Reports', description: 'Access compliance reports', code: 'compliance.view' },
    { name: 'Export Data', description: 'Download compliance data', code: 'compliance.export' },
    { name: 'Manage Alerts', description: 'View and manage risk alerts', code: 'compliance.alerts' },
  ],
  'System Settings': [
    { name: 'View Settings', description: 'View system configuration', code: 'settings.view' },
    { name: 'Edit Settings', description: 'Modify system settings', code: 'settings.edit' },
    { name: 'Manage Roles', description: 'Create and edit roles', code: 'roles.manage' },
    { name: 'View Audit Logs', description: 'Access audit trail', code: 'audit.view' },
  ],
};

export default function RolesPermissionsPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [mainTab, setMainTab] = useState<MainTab>('roles');
  const [showCreateRoleModal, setShowCreateRoleModal] = useState(false);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  if (!isAuthenticated) {
    router.push(AUTH_ROUTES.LOGIN);
    return null;
  }

  const togglePermission = (code: string) => {
    setSelectedPermissions(prev =>
      prev.includes(code) ? prev.filter(p => p !== code) : [...prev, code]
    );
  };

  return (
    <>
      <div className="flex h-screen bg-gray-50 font-['DM_Sans']">
        <Sidebar />

        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <header className="bg-white border-b border-gray-200 px-8 py-5">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Roles & Permissions</h1>
                <p className="text-sm text-gray-500 mt-0.5">Manage admin roles, permissions, and user assignments</p>
              </div>

              <div className="flex items-center gap-4">
                <button className="relative p-2 hover:bg-gray-100 rounded-xl">
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312.665" />
                  </svg>
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">4</span>
                </button>

                <div className="flex items-center gap-3 cursor-pointer">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white text-xs font-bold">OO</div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Olalekan. O</p>
                    <p className="text-xs text-gray-500">Ops Admin</p>
                  </div>
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="mt-6 flex items-center border-b border-gray-200">
              {[
                { id: 'roles', label: 'Roles' },
                { id: 'permissions', label: 'Permissions' },
                { id: 'admin-user', label: 'Admin user' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setMainTab(tab.id as MainTab)}
                  className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                    mainTab === tab.id
                      ? 'border-emerald-500 text-emerald-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </header>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-8">
            {/* ROLES TAB */}
            {mainTab === 'roles' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Roles Management</h2>
                    <p className="text-sm text-gray-500 mt-1">Create and manage roles with specific permissions</p>
                  </div>
                  <button
                    onClick={() => setShowCreateRoleModal(true)}
                    className="px-6 py-2.5 bg-emerald-500 text-white rounded-lg text-sm font-semibold hover:bg-emerald-600 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    Create Role
                  </button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-4 gap-6 mb-8">
                  <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <p className="text-xs text-gray-500 mb-1">Total Roles</p>
                    <p className="text-3xl font-bold text-gray-900">6</p>
                  </div>
                  <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <p className="text-xs text-gray-500 mb-1">Active Roles</p>
                    <p className="text-3xl font-bold text-emerald-600">6</p>
                  </div>
                  <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <p className="text-xs text-gray-500 mb-1">Total Admin</p>
                    <p className="text-3xl font-bold text-blue-600">5</p>
                  </div>
                  <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <p className="text-xs text-gray-500 mb-1">System Roles</p>
                    <p className="text-3xl font-bold text-gray-900">1</p>
                  </div>
                </div>

                {/* Role Cards */}
                <div className="grid grid-cols-2 gap-6">
                  {mockRoles.map((role) => (
                    <div key={role.id} className="bg-white rounded-xl border border-gray-200 p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gray-900 flex items-center justify-center text-white text-sm font-bold">
                            {role.name.charAt(0)}
                          </div>
                          <div>
                            <h3 className="text-base font-bold text-gray-900">{role.name}</h3>
                            <p className="text-xs text-gray-500">{role.id}</p>
                          </div>
                        </div>
                        {role.badge && (
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                            role.badgeColor === 'purple' ? 'bg-purple-100 text-purple-700' :
                            role.badgeColor === 'green' ? 'bg-emerald-100 text-emerald-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {role.badge}
                          </span>
                        )}
                      </div>

                      <p className="text-sm text-gray-600 mb-4">{role.description}</p>

                      <div className="space-y-2 mb-4">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-500">Email</span>
                          <span className="text-gray-900 font-medium">{role.email}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-500">Permissions</span>
                          <span className="text-gray-900 font-medium">{role.permissions}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-500">Created</span>
                          <span className="text-gray-900 font-medium">{role.created}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-500">Suspend</span>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" checked={role.suspended} readOnly className="sr-only peer" />
                            <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                          </label>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <button className="flex-1 py-2.5 bg-emerald-500 text-white rounded-lg text-sm font-semibold hover:bg-emerald-600 flex items-center justify-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                          </svg>
                          Edit
                        </button>
                        <button className="w-12 h-10 flex items-center justify-center border border-gray-200 rounded-lg hover:bg-gray-50">
                          <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* PERMISSIONS TAB */}
            {mainTab === 'permissions' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">All Permissions</h2>
                    <p className="text-sm text-gray-500 mt-1">Complete list of available system permissions</p>
                  </div>
                  <button
                    onClick={() => setShowCreateRoleModal(true)}
                    className="px-6 py-2.5 bg-emerald-500 text-white rounded-lg text-sm font-semibold hover:bg-emerald-600 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    Create Role
                  </button>
                </div>

                {/* Permission Categories */}
                <div className="space-y-8">
                  {Object.entries(permissionsData).map(([category, permissions]) => (
                    <div key={category}>
                      <h3 className="text-lg font-bold text-gray-900 mb-4">{category}</h3>
                      <div className="grid grid-cols-2 gap-4">
                        {permissions.map((permission) => (
                          <div key={permission.code} className="bg-white rounded-xl border border-gray-200 p-5">
                            <h4 className="text-base font-semibold text-gray-900 mb-1">{permission.name}</h4>
                            <p className="text-sm text-gray-500 mb-2">{permission.description}</p>
                            <p className="text-xs text-gray-400 font-mono">{permission.code}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ADMIN USER TAB */}
            {mainTab === 'admin-user' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-emerald-600">Admin Users</h2>
                    <p className="text-sm text-gray-500 mt-1">Manage admin users and their role assignments</p>
                  </div>
                  <button
                    onClick={() => setShowCreateRoleModal(true)}
                    className="px-6 py-2.5 bg-emerald-500 text-white rounded-lg text-sm font-semibold hover:bg-emerald-600 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    Create Role
                  </button>
                </div>

                {/* Search */}
                <div className="mb-6 relative">
                  <svg className="w-5 h-5 text-gray-400 absolute left-3 top-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search by name, wallet ID or transaction ID..."
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  />
                </div>

                {/* Admin Users Table */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Admin</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Role</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Last login</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {mockAdminUsers.map((admin) => (
                        <tr key={admin.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold">
                                {admin.name.charAt(0)}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900">{admin.name}</p>
                                <p className="text-xs text-gray-400">{admin.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-200">
                              {admin.role}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">
                              {admin.status}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-xs text-gray-900">{admin.lastLogin}</p>
                            <p className="text-xs text-gray-400">{admin.lastLoginRelative}</p>
                          </td>
                          <td className="px-6 py-4">
                            <button className="text-sm text-emerald-600 hover:text-emerald-700 font-medium">
                              Edit Role
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Create/Edit Role Modal */}
      {showCreateRoleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-gray-900/50"
            onClick={() => setShowCreateRoleModal(false)}
          />
          
          <div className="relative bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Create new role</h3>
              <button
                onClick={() => setShowCreateRoleModal(false)}
                className="w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-full"
              >
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Role Name */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Role Name</label>
                <input
                  type="text"
                  placeholder="Super Admin"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Description</label>
                <textarea
                  placeholder="Add role description..."
                  rows={3}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Permissions */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-3">Permissions</label>
                <div className="space-y-4">
                  {Object.entries(permissionsData).slice(0, 5).map(([category, permissions]) => (
                    <div key={category}>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-semibold text-gray-900">{category}</h4>
                        <button className="text-xs text-emerald-600 hover:text-emerald-700 font-medium">
                          Select All
                        </button>
                      </div>
                      <div className="space-y-2">
                        {permissions.slice(0, 2).map((permission) => (
                          <label key={permission.code} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedPermissions.includes(permission.code)}
                              onChange={() => togglePermission(permission.code)}
                              className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                            />
                            <span className="text-sm text-gray-700">{permission.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4">
              <button
                onClick={() => setShowCreateRoleModal(false)}
                className="w-full py-3 bg-emerald-500 text-white rounded-lg text-sm font-semibold hover:bg-emerald-600"
              >
                Create Role
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}