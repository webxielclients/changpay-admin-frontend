'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { AUTH_ROUTES } from '@/constants/auth';
import { useAuth } from '@/hooks/useAuth';

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const { handleLogout } = useAuth();

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!isAuthenticated) {
      router.push(AUTH_ROUTES.LOGIN);
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center">
                <div className="w-5 h-5 bg-white rounded"></div>
              </div>
              <span className="text-xl font-bold text-gray-900">Changpay Admin</span>
            </div>

            {/* User Menu */}
            <div className="flex items-center space-x-4">
              <div className="text-sm">
                <p className="font-medium text-gray-900">{user.email}</p>
                <p className="text-gray-500 capitalize">{user.role}</p>
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-teal-500 to-teal-600 rounded-2xl p-8 mb-8 text-white">
          <h1 className="text-3xl font-bold mb-2">
            Welcome back, {user.firstName || 'Admin'}! 👋
          </h1>
          <p className="text-teal-100">
            Your authentication flow is working perfectly. Let's build the dashboard!
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-500">Total Users</h3>
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900">1,234</p>
            <p className="text-sm text-green-600 mt-2">↑ 12% from last month</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-500">Transactions</h3>
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900">5,678</p>
            <p className="text-sm text-green-600 mt-2">↑ 8% from last month</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-500">Revenue</h3>
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900">$89,234</p>
            <p className="text-sm text-green-600 mt-2">↑ 23% from last month</p>
          </div>
        </div>

        {/* Info Card */}
        <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            🎉 Authentication Flow Complete!
          </h2>
          <div className="space-y-4 text-gray-600">
            <p>
              <strong className="text-gray-900">Congratulations!</strong> Your authentication system is fully functional. Here's what's working:
            </p>
            <ul className="space-y-2 ml-6">
              <li className="flex items-start">
                <span className="text-teal-600 mr-2">✓</span>
                <span>User registration with email validation</span>
              </li>
              <li className="flex items-start">
                <span className="text-teal-600 mr-2">✓</span>
                <span>OTP verification system</span>
              </li>
              <li className="flex items-start">
                <span className="text-teal-600 mr-2">✓</span>
                <span>PIN setup for security</span>
              </li>
              <li className="flex items-start">
                <span className="text-teal-600 mr-2">✓</span>
                <span>Persistent authentication state</span>
              </li>
              <li className="flex items-start">
                <span className="text-teal-600 mr-2">✓</span>
                <span>Protected routes and redirects</span>
              </li>
              <li className="flex items-start">
                <span className="text-teal-600 mr-2">✓</span>
                <span>Logout functionality</span>
              </li>
            </ul>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
              <p className="text-blue-900 font-medium mb-2">📝 Next Steps:</p>
              <ol className="list-decimal ml-6 space-y-1 text-blue-800">
                <li>Connect to your backend API</li>
                <li>Implement real database integration</li>
                <li>Set up email service for OTP</li>
                <li>Add more dashboard features</li>
                <li>Build out admin functionality</li>
              </ol>
            </div>
          </div>
        </div>

        {/* User Info Card */}
        <div className="mt-8 bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Profile</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">User ID:</span>
              <span className="font-medium text-gray-900">{user.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Email:</span>
              <span className="font-medium text-gray-900">{user.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Role:</span>
              <span className="font-medium text-gray-900 capitalize">{user.role}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Account Created:</span>
              <span className="font-medium text-gray-900">
                {new Date(user.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}