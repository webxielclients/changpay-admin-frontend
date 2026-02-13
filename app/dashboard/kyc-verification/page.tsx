'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { AUTH_ROUTES } from '@/constants/auth';
import Sidebar from '@/components/Sidebar';


type ApplicationType = 'all' | 'kyc' | 'kyb';
type ApplicationStatus = 'all' | 'pending' | 'under-review' | 'rejected';
type RiskLevel = 'low-risk' | 'high-risk';

interface Application {
  id: string;
  name: string;
  email: string;
  type: 'kyc' | 'kyb';
  kycId: string;
  documents: number;
  country: string;
  submitted: string;
  riskLevel: RiskLevel;
  status: 'pending' | 'under-review' | 'approved' | 'rejected';
}


const applications: Application[] = [
  {
    id: '1',
    name: 'Olalekan Olasehinde',
    email: 'Olalekan@example.com',
    type: 'kyc',
    kycId: 'E-KYC-003',
    documents: 5,
    country: 'Nigeria',
    submitted: '2026-01-17',
    riskLevel: 'low-risk',
    status: 'pending',
  },
  {
    id: '2',
    name: 'Global Payments Inc',
    email: 'compliance@globalpay.com',
    type: 'kyb',
    kycId: 'E-KYC-003',
    documents: 5,
    country: 'Nigeria',
    submitted: '2026-01-17',
    riskLevel: 'high-risk',
    status: 'rejected',
  },
  {
    id: '3',
    name: 'TechCorp Ltd',
    email: 'admin@techcorp.com',
    type: 'kyb',
    kycId: 'E-KYC-003',
    documents: 8,
    country: 'Nigeria',
    submitted: '2026-01-17',
    riskLevel: 'low-risk',
    status: 'under-review',
  },
  {
    id: '4',
    name: 'Jane Smith',
    email: 'jane.smith@example.com',
    type: 'kyc',
    kycId: 'E-KYC-003',
    documents: 6,
    country: 'Nigeria',
    submitted: '2026-01-17',
    riskLevel: 'low-risk',
    status: 'approved',
  },
  {
    id: '5',
    name: 'Global Payments Inc',
    email: 'compliance@globalpay.com',
    type: 'kyb',
    kycId: 'E-KYC-003',
    documents: 5,
    country: 'Nigeria',
    submitted: '2026-01-17',
    riskLevel: 'high-risk',
    status: 'rejected',
  },
];


function RiskBadge({ level }: { level: RiskLevel }) {
  return (
    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
      level === 'low-risk'
        ? 'bg-emerald-100 text-emerald-700'
        : 'bg-red-100 text-red-700'
    }`}>
      {level === 'low-risk' ? 'LOW RISK' : 'HIGH RISK'}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    'under-review': 'bg-blue-100 text-blue-700',
    approved: 'bg-emerald-100 text-emerald-700',
    rejected: 'bg-red-100 text-red-700',
  };

  const labels: Record<string, string> = {
    pending: 'PENDING',
    'under-review': 'UNDER REVIEW',
    approved: 'APPROVED',
    rejected: 'REJECTED',
  };

  return (
    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}


export default function KYCVerificationPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [typeFilter, setTypeFilter] = useState<ApplicationType>('all');
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus>('all');
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [reviewStatus, setReviewStatus] = useState('pending');

  if (!isAuthenticated) {
    router.push(AUTH_ROUTES.LOGIN);
    return null;
  }

  const handleReview = (application: Application) => {
    setSelectedApplication(application);
    setReviewStatus(application.status);
    setReviewModalOpen(true);
  };

  const filteredApplications = applications.filter((app) => {
    if (typeFilter !== 'all' && app.type !== typeFilter) return false;
    if (statusFilter !== 'all' && app.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="flex h-screen bg-gray-50 font-['DM_Sans']">
      <Sidebar />

      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          {/* Header */}
          <div className="bg-white border-b border-gray-200 px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">KYC/KYB Verification</h1>
                <p className="text-sm text-gray-500 mt-0.5">Review and approve customer and business verifications</p>
              </div>

              {/* Notifications + Admin avatar */}
              <div className="flex items-center gap-4">
                <button className="relative p-2 hover:bg-gray-100 rounded-xl">
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312.665M14.857 17.082a23.848 23.848 0 00-5.454-1.31m5.454 1.31A6.976 6.976 0 0112 17.25c-2.676 0-5.216-.584-7.545-1.668M14.857 17.082L15 17.25m-3 3.75h.01M5.25 6h13.5" />
                  </svg>
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">4</span>
                </button>

                <div className="flex items-center gap-3 cursor-pointer">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white text-xs font-bold">OO</div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 leading-tight">Olalekan. O</p>
                    <p className="text-xs text-gray-500">Ops Admin</p>
                  </div>
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white border-b border-gray-200 px-8 py-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-600">Type:</span>
                <button
                  onClick={() => setTypeFilter('all')}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    typeFilter === 'all'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setTypeFilter('kyc')}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 ${
                    typeFilter === 'kyc'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
                  KYC (Individual)
                </button>
                <button
                  onClick={() => setTypeFilter('kyb')}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 ${
                    typeFilter === 'kyb'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
                  </svg>
                  KYB (Business)
                </button>
              </div>

              <div className="flex items-center gap-2 ml-auto">
                <span className="text-sm font-medium text-gray-600">Status:</span>
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    statusFilter === 'all'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setStatusFilter('pending')}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    statusFilter === 'pending'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Pending
                </button>
                <button
                  onClick={() => setStatusFilter('under-review')}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    statusFilter === 'under-review'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Under Review
                </button>
                <button
                  onClick={() => setStatusFilter('rejected')}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    statusFilter === 'rejected'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Rejected
                </button>
              </div>
            </div>
          </div>

          {/* Applications List */}
          <div className="p-8">
            <p className="text-sm text-gray-500 mb-6">Showing {filteredApplications.length} applications</p>

            <div className="space-y-4">
              {filteredApplications.map((app) => (
                <div key={app.id} className="bg-white rounded-xl border border-gray-200 p-6 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      app.type === 'kyc' ? 'bg-blue-100' : 'bg-purple-100'
                    }`}>
                      {app.type === 'kyc' ? (
                        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                        </svg>
                      ) : (
                        <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
                        </svg>
                      )}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-base font-bold text-gray-900">{app.name}</h3>
                        <RiskBadge level={app.riskLevel} />
                      </div>
                      <p className="text-sm text-gray-500 mb-2">{app.email}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                          </svg>
                          {app.documents} documents
                        </span>
                        <span>ID: {app.kycId}</span>
                        <span>Country: {app.country}</span>
                        <span>Submitted: {app.submitted}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <StatusBadge status={app.status} />
                    <button
                      onClick={() => handleReview(app)}
                      className="px-5 py-2.5 bg-emerald-500 text-white rounded-lg text-sm font-semibold hover:bg-emerald-600 transition-colors"
                    >
                      Review
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className="mt-6 flex items-center justify-center gap-1">
              <button className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded-lg hover:bg-gray-50">
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
              </button>
              {[1, 2, 3, 4, 5].map((p) => (
                <button
                  key={p}
                  className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                    p === 3 ? 'bg-emerald-500 text-white' : 'border border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {p}
                </button>
              ))}
              <button className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded-lg hover:bg-gray-50">
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </button>
            </div>

            <p className="text-center text-sm text-gray-500 mt-3">Showing 1 to 8 of 200 results</p>
          </div>
        </div>
      </main>

      {/* Review Modal */}
      {reviewModalOpen && selectedApplication && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setReviewModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-lg rounded-xl shadow-2xl p-6">
            <button
              onClick={() => setReviewModalOpen(false)}
              className="absolute -right-12 top-0 w-10 h-10 flex items-center justify-center rounded-full bg-white hover:bg-gray-100 transition-colors shadow-lg"
            >
              <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="mb-6">
              <h2 className="text-lg font-bold text-gray-900">{selectedApplication.name}</h2>
              <p className="text-sm text-gray-500">{selectedApplication.kycId}</p>
            </div>

            <div className="space-y-5 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                <select className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white">
                  <option>{selectedApplication.type === 'kyc' ? 'KYC' : 'KYB'}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={reviewStatus}
                  onChange={(e) => setReviewStatus(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                >
                  <option value="pending">Pending</option>
                  <option value="under-review">Under Review</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Risk Level</label>
                <p className="text-base font-semibold text-emerald-600">{selectedApplication.riskLevel === 'low-risk' ? 'LOW' : 'HIGH'}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
                <p className="text-base font-semibold text-gray-900">{selectedApplication.country}</p>
              </div>
            </div>

            <div className="mb-6">
              <h3 className="text-sm font-bold text-gray-900 mb-3">Documents</h3>
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                      </svg>
                      <span className="text-sm font-medium text-gray-700">Document {i}</span>
                    </div>
                    <button className="text-sm font-semibold text-emerald-600 hover:text-emerald-700">View</button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button className="flex-1 py-3 bg-emerald-500 text-white rounded-lg text-sm font-semibold hover:bg-emerald-600 transition-colors">
                Approve
              </button>
              <button className="flex-1 py-3 bg-red-500 text-white rounded-lg text-sm font-semibold hover:bg-red-600 transition-colors">
                Reject
              </button>
              <button className="flex-1 py-3 bg-orange-500 text-white rounded-lg text-sm font-semibold hover:bg-orange-600 transition-colors">
                Request Resubmit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}