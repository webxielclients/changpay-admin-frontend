'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { AUTH_ROUTES } from '@/constants/auth';
import Sidebar from '@/components/Sidebar';

// ==================== TYPES ====================

type TabType = 'all' | 'active' | 'scheduled' | 'ended';
type DiscountType = 'percentage' | 'fixed' | 'cashback';

interface Promotion {
  id: string;
  name: string;
  campaignId: string;
  description: string;
  image: string;
  status: 'scheduled' | 'active' | 'ended';
  discount: string;
  type: string;
  startDate: string;
  endDate: string;
  redemptions: number;
  revenue: string;
  usage: number;
  usageMax: number;
  usagePercent: number;
}


const promotions: Promotion[] = [
  {
    id: '1',
    name: "Valentine's Day Special",
    campaignId: 'LOVE2026',
    description: 'Celebrate love with 25% off all international transfers',
    image: '/promo1.jpg',
    status: 'scheduled',
    discount: '25%',
    type: 'Percentage',
    startDate: '2/1/2026',
    endDate: '2/14/2026',
    redemptions: 3421,
    revenue: '₦28,340',
    usage: 1245,
    usageMax: 2000,
    usagePercent: 62,
  },
  {
    id: '2',
    name: "Valentine's Day Special",
    campaignId: 'LOVE2026',
    description: 'Cashback love on your first transaction',
    image: '/promo2.jpg',
    status: 'active',
    discount: '20%',
    type: 'Percentage',
    startDate: '2/1/2026',
    endDate: '2/14/2026',
    redemptions: 3421,
    revenue: '₦28,340',
    usage: 1245,
    usageMax: 2000,
    usagePercent: 62,
  },
  {
    id: '3',
    name: "Valentine's Day Special",
    campaignId: 'LOVE2026',
    description: 'Celebrate love on your first transaction',
    image: '/promo3.jpg',
    status: 'active',
    discount: '25%',
    type: 'Percentage',
    startDate: '2/1/2026',
    endDate: '2/14/2026',
    redemptions: 3421,
    revenue: '₦28,340',
    usage: 1245,
    usageMax: 2000,
    usagePercent: 62,
  },
  {
    id: '4',
    name: "Valentine's Day Special",
    campaignId: 'LOVE2026',
    description: 'Celebrate love with 25% off all international transfers',
    image: '/promo4.jpg',
    status: 'active',
    discount: '25%',
    type: 'Percentage',
    startDate: '2/1/2026',
    endDate: '2/14/2026',
    redemptions: 3421,
    revenue: '₦28,340',
    usage: 1245,
    usageMax: 2000,
    usagePercent: 62,
  },
];


function StatusBadge({ status }: { status: 'scheduled' | 'active' | 'ended' }) {
  const styles: Record<string, string> = {
    scheduled: 'bg-purple-100 text-purple-700 border-purple-200',
    active: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    ended: 'bg-gray-100 text-gray-700 border-gray-200',
  };

  const labels: Record<string, string> = {
    scheduled: 'Scheduled',
    active: 'ACTIVE',
    ended: 'Ended',
  };

  return (
    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold border ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}


export default function PromotionsPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('All Status');
  const [filterType, setFilterType] = useState('All Type');
  const [sortBy, setSortBy] = useState('Newest');

  const [campaignName, setCampaignName] = useState('');
  const [description, setDescription] = useState('');
  const [discountType, setDiscountType] = useState<DiscountType>('percentage');
  const [discountValue, setDiscountValue] = useState('');
  const [maxDiscountCap, setMaxDiscountCap] = useState('');
  const [minTransaction, setMinTransaction] = useState('');
  const [usageLimit, setUsageLimit] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  if (!isAuthenticated) {
    router.push(AUTH_ROUTES.LOGIN);
    return null;
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadedFile(e.target.files[0]);
    }
  };

  const filteredPromotions = promotions.filter((promo) => {
    if (activeTab !== 'all' && promo.status !== activeTab) return false;
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
                <h1 className="text-2xl font-bold text-gray-900">Promotions</h1>
                <p className="text-sm text-gray-500 mt-0.5">Create and manage promotional campaigns</p>
              </div>

              <div className="flex items-center gap-4">
                <button
                  onClick={() => setCreateModalOpen(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-500 text-white rounded-lg text-sm font-semibold hover:bg-emerald-600 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  Create New Promotion
                </button>

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

          {/* Stats */}
          <div className="bg-white border-b border-gray-200 px-8 py-6">
            <div className="grid grid-cols-4 gap-6">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Active Campaigns</p>
                <p className="text-3xl font-bold text-gray-900">404</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Total Redemptions</p>
                <p className="text-3xl font-bold text-blue-600">8,547</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Revenue (YTD)</p>
                <p className="text-3xl font-bold text-emerald-600">₦42.5k</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Avg Discount</p>
                <p className="text-3xl font-bold text-gray-900">15.2%</p>
              </div>
            </div>
          </div>

          {/* Tabs and Filters */}
          <div className="bg-white border-b border-gray-200 px-8 py-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-6 border-b border-gray-200 -mb-4">
                <button
                  onClick={() => setActiveTab('all')}
                  className={`pb-3 text-sm font-semibold transition-colors relative ${
                    activeTab === 'all'
                      ? 'text-emerald-600 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-emerald-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  All Promotions
                </button>
                <button
                  onClick={() => setActiveTab('active')}
                  className={`pb-3 text-sm font-semibold transition-colors relative ${
                    activeTab === 'active'
                      ? 'text-emerald-600 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-emerald-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Active
                </button>
                <button
                  onClick={() => setActiveTab('scheduled')}
                  className={`pb-3 text-sm font-semibold transition-colors relative ${
                    activeTab === 'scheduled'
                      ? 'text-emerald-600 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-emerald-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Scheduled
                </button>
                <button
                  onClick={() => setActiveTab('ended')}
                  className={`pb-3 text-sm font-semibold transition-colors relative ${
                    activeTab === 'ended'
                      ? 'text-emerald-600 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-emerald-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Ended
                </button>
              </div>
            </div>

            {/* Search and Filters */}
            <div className="flex items-center gap-3">
              <div className="flex-1 relative">
                <svg
                  className="w-4 h-4 text-gray-400 absolute left-3 top-3"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by campaign name or promo code"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              >
                <option>All Status</option>
                <option>Active</option>
                <option>Scheduled</option>
                <option>Ended</option>
              </select>

              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              >
                <option>All Type</option>
                <option>Percentage</option>
                <option>Fixed Amount</option>
                <option>Cashback</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              >
                <option>Sort by: Newest</option>
                <option>Sort by: Oldest</option>
                <option>Sort by: Name</option>
              </select>
            </div>
          </div>

          {/* Promotions Grid */}
          <div className="p-8">
            <div className="grid grid-cols-2 gap-6">
              {filteredPromotions.map((promo) => (
                <div key={promo.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  {/* Image */}
                  <div className="h-40 bg-gradient-to-r from-red-500 to-pink-500 relative">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-white text-6xl opacity-20">🎁</div>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-base font-bold text-gray-900 mb-0.5">{promo.name}</h3>
                        <p className="text-xs text-gray-500">{promo.campaignId}</p>
                      </div>
                      <StatusBadge status={promo.status} />
                    </div>

                    <p className="text-sm text-gray-600 mb-4">{promo.description}</p>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Discount</p>
                        <p className="text-sm font-bold text-gray-900">{promo.discount}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Type</p>
                        <p className="text-sm font-medium text-gray-900">{promo.type}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Start Date</p>
                        <p className="text-sm font-medium text-gray-900">{promo.startDate}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">End Date</p>
                        <p className="text-sm font-medium text-gray-900">{promo.endDate}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Redemptions</p>
                        <p className="text-sm font-bold text-gray-900">{promo.redemptions.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Revenue</p>
                        <p className="text-sm font-bold text-gray-900">{promo.revenue}</p>
                      </div>
                    </div>

                    {/* Usage Progress */}
                    <div className="mb-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs text-gray-500">Usage: {promo.usage}/{promo.usageMax}</span>
                        <span className="text-xs font-bold text-gray-900">{promo.usagePercent}%</span>
                      </div>
                      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500"
                          style={{ width: `${promo.usagePercent}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                        </svg>
                        Edit
                      </button>
                      <button className="flex-1 py-2.5 border border-red-300 text-red-600 rounded-lg text-sm font-semibold hover:bg-red-50 transition-colors flex items-center justify-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        End
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Create Promotion Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setCreateModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden">
            <button
              onClick={() => setCreateModalOpen(false)}
              className="absolute -right-12 top-0 w-10 h-10 flex items-center justify-center rounded-full bg-white hover:bg-gray-100 transition-colors shadow-lg"
            >
              <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="max-h-[90vh] overflow-y-auto p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-6">Create New Promotion</h2>

              {/* Basic Information */}
              <div className="mb-6">
                <h3 className="text-base font-bold text-gray-900 mb-4">Basic Information</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Campaign Name</label>
                    <input
                      type="text"
                      value={campaignName}
                      onChange={(e) => setCampaignName(e.target.value)}
                      placeholder="e.g. valentine's day special"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Describe what this promotion offers..."
                      rows={3}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Discount Type */}
              <div className="mb-6">
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => setDiscountType('percentage')}
                    className={`p-4 rounded-lg border-2 transition-colors text-center ${
                      discountType === 'percentage'
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-center mb-1">
                      {discountType === 'percentage' && (
                        <svg className="w-5 h-5 text-emerald-600" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                        </svg>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-gray-900">Percentage</p>
                    <p className="text-xs text-gray-500">% off transaction</p>
                  </button>
                  <button
                    onClick={() => setDiscountType('fixed')}
                    className={`p-4 rounded-lg border-2 transition-colors text-center ${
                      discountType === 'fixed'
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-center mb-1">
                      {discountType === 'fixed' && (
                        <svg className="w-5 h-5 text-emerald-600" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                        </svg>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-gray-900">Fixed Amount</p>
                    <p className="text-xs text-gray-500">₦ off transaction</p>
                  </button>
                  <button
                    onClick={() => setDiscountType('cashback')}
                    className={`p-4 rounded-lg border-2 transition-colors text-center ${
                      discountType === 'cashback'
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-center mb-1">
                      {discountType === 'cashback' && (
                        <svg className="w-5 h-5 text-emerald-600" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                        </svg>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-gray-900">Cashback</p>
                    <p className="text-xs text-gray-500">Wallet credit</p>
                  </button>
                </div>
              </div>

              {/* Discount Details */}
              <div className="mb-6">
                <h3 className="text-base font-bold text-gray-900 mb-4">Discount Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Discount Value</label>
                    <input
                      type="text"
                      value={discountValue}
                      onChange={(e) => setDiscountValue(e.target.value)}
                      placeholder="e.g. 20"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Max Discount Cap</label>
                    <input
                      type="text"
                      value={maxDiscountCap}
                      onChange={(e) => setMaxDiscountCap(e.target.value)}
                      placeholder="e.g. 50"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Minimum Transaction</label>
                    <input
                      type="text"
                      value={minTransaction}
                      onChange={(e) => setMinTransaction(e.target.value)}
                      placeholder="e.g. 100"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Usage Limit</label>
                    <input
                      type="text"
                      value={usageLimit}
                      onChange={(e) => setUsageLimit(e.target.value)}
                      placeholder="e.g. 50"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Campaign Duration */}
              <div className="mb-6">
                <h3 className="text-base font-bold text-gray-900 mb-4">Campaign Duration</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      placeholder="mm/dd/yyyy"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      placeholder="mm/dd/yyyy"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* File Upload */}
              {uploadedFile ? (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{uploadedFile.name}</p>
                      <p className="text-xs text-gray-500">{(uploadedFile.size / 1024).toFixed(2)} KB • Uploaded successfully</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setUploadedFile(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  </button>
                </div>
              ) : (
                <label className="block mb-6 p-8 border-2 border-dashed border-gray-300 rounded-lg text-center cursor-pointer hover:border-emerald-500 hover:bg-emerald-50 transition-colors">
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                  <p className="text-sm font-semibold text-gray-900 mb-1">Choose a file</p>
                  <p className="text-xs text-gray-500">PDF, JPG, PNG • Max size: 5MB</p>
                </label>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => setCreateModalOpen(false)}
                  className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => setCreateModalOpen(false)}
                  className="flex-1 py-3 bg-emerald-500 text-white rounded-lg text-sm font-semibold hover:bg-emerald-600 transition-colors"
                >
                  Create New Promotion
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}