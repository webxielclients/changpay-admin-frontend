'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { AUTH_ROUTES } from '@/constants/auth';
import Sidebar from '@/components/Sidebar';

// ==================== TYPES ====================

type TabType = 'gift-cards' | 'system-settings';

interface GiftCard {
  id: string;
  name: string;
  code: string;
  logo: string;
  active: boolean;
  status: 'active' | 'inactive';
  countries: string;
  valueRange: string;
  processingTime: string;
  fee: string;
  usdBuyRate: string;
  usdSellRate: string;
}

// ==================== MOCK DATA ====================

const giftCards: GiftCard[] = [
  {
    id: '1',
    name: 'Amazon',
    code: 'GC001',
    logo: 'a',
    active: true,
    status: 'active',
    countries: 'US, UK, CA',
    valueRange: '$10 - $500',
    processingTime: '2-5 mins',
    fee: '2.5% + ₦100',
    usdBuyRate: '₦740',
    usdSellRate: '₦760',
  },
  {
    id: '2',
    name: 'Amazon',
    code: 'GC001',
    logo: 'a',
    active: true,
    status: 'active',
    countries: 'US, UK, CA',
    valueRange: '$10 - $500',
    processingTime: '2-5 mins',
    fee: '2.5% + ₦100',
    usdBuyRate: '₦740',
    usdSellRate: '₦760',
  },
  {
    id: '3',
    name: 'Amazon',
    code: 'GC001',
    logo: 'a',
    active: false,
    status: 'inactive',
    countries: 'US, UK, CA',
    valueRange: '$10 - $500',
    processingTime: '2-4 mins',
    fee: '2.5% + ₦100',
    usdBuyRate: '₦740',
    usdSellRate: '₦760',
  },
  {
    id: '4',
    name: 'Amazon',
    code: 'GC001',
    logo: 'a',
    active: true,
    status: 'active',
    countries: 'US, UK, CA',
    valueRange: '$10 - $500',
    processingTime: '2-4 mins',
    fee: '2.5% + ₦100',
    usdBuyRate: '₦740',
    usdSellRate: '₦760',
  },
];

// ==================== HELPER COMPONENTS ====================

function StatusBadge({ status }: { status: 'active' | 'inactive' }) {
  return (
    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold border ${
      status === 'active' 
        ? 'bg-emerald-100 text-emerald-700 border-emerald-200' 
        : 'bg-gray-100 text-gray-600 border-gray-200'
    }`}>
      {status}
    </span>
  );
}


export default function GiftCardEnginePage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabType>('gift-cards');
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState<GiftCard | null>(null);
  const [buyRate, setBuyRate] = useState('740');

  const [autoApproval, setAutoApproval] = useState(true);
  const [manualReview, setManualReview] = useState(true);
  const [walletPayout, setWalletPayout] = useState(true);
  const [bankPayout, setBankPayout] = useState(false);
  const [requireCardPhoto, setRequireCardPhoto] = useState(true);
  const [requireReceipt, setRequireReceipt] = useState(false);
  const [aiValidation, setAiValidation] = useState(true);

  if (!isAuthenticated) {
    router.push(AUTH_ROUTES.LOGIN);
    return null;
  }

  const handleEditRates = (card: GiftCard) => {
    setSelectedCard(card);
    setEditModalOpen(true);
  };

  return (
    <div className="flex h-screen bg-gray-50 font-['DM_Sans']">
      <Sidebar />

      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          {/* Header */}
          <div className="bg-white border-b border-gray-200 px-8 py-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Gift Card Engine</h1>
                <p className="text-sm text-gray-500 mt-0.5">Manage gift card settings, rates, and system configuration</p>
              </div>

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

            {/* Tabs */}
            <div className="flex items-center gap-4 border-b border-gray-200 -mb-px">
              <button
                onClick={() => setActiveTab('gift-cards')}
                className={`pb-3 text-sm font-semibold transition-colors relative ${
                  activeTab === 'gift-cards'
                    ? 'text-emerald-600 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-emerald-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Gift Cards
              </button>
              <button
                onClick={() => setActiveTab('system-settings')}
                className={`pb-3 text-sm font-semibold transition-colors relative ${
                  activeTab === 'system-settings'
                    ? 'text-emerald-600 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-emerald-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Systems Settings
              </button>
            </div>
          </div>

          {/* Page Content */}
          <div className="p-8">
            {activeTab === 'gift-cards' && (
              <>
                {/* Gift Card Management Header */}
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-bold text-emerald-700">Gift Card Management</h2>
                    <p className="text-sm text-gray-500 mt-0.5">Configure supported gift cards and their rates</p>
                  </div>
                  <button className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-500 text-white rounded-lg text-sm font-semibold hover:bg-emerald-600 transition-colors">
                    Add Gift Card
                  </button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-4 gap-5 mb-8">
                  <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <p className="text-xs font-medium text-gray-500 mb-2">Total Cards</p>
                    <p className="text-3xl font-bold text-gray-900">5</p>
                  </div>
                  <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <p className="text-xs font-medium text-gray-500 mb-2">Active</p>
                    <p className="text-3xl font-bold text-emerald-600">4</p>
                  </div>
                  <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <p className="text-xs font-medium text-gray-500 mb-2">Inactive</p>
                    <p className="text-3xl font-bold text-gray-900">1</p>
                  </div>
                  <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <p className="text-xs font-medium text-gray-500 mb-2">Avg Processing</p>
                    <p className="text-3xl font-bold text-cyan-600">3 mins</p>
                  </div>
                </div>

                {/* Gift Card Grid */}
                <div className="grid grid-cols-2 gap-6">
                  {giftCards.map((card) => (
                    <div key={card.id} className="bg-white rounded-xl border border-gray-200 p-6">
                      <div className="flex items-start justify-between mb-5">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-gray-900 rounded-lg flex items-center justify-center">
                            <span className="text-white text-2xl font-bold">{card.logo}</span>
                          </div>
                          <div>
                            <h3 className="text-base font-bold text-gray-900">{card.name}</h3>
                            <p className="text-sm text-gray-500">{card.code}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" checked={card.active} className="sr-only peer" readOnly />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                          </label>
                          <StatusBadge status={card.status} />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Countries</p>
                          <p className="text-sm font-medium text-gray-900">{card.countries}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Value Range</p>
                          <p className="text-sm font-medium text-gray-900">{card.valueRange}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Processing Time</p>
                          <p className="text-sm font-medium text-gray-900">{card.processingTime}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Fee</p>
                          <p className="text-sm font-medium text-gray-900">{card.fee}</p>
                        </div>
                      </div>

                      <div className="border-t border-gray-200 pt-4">
                        <p className="text-xs font-semibold text-gray-700 mb-3">Exchange Rates</p>
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-sm text-gray-600">USD</span>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-semibold text-emerald-600">Buy: {card.usdBuyRate}</span>
                            <span className="text-sm font-semibold text-red-600">Sell: {card.usdSellRate}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEditRates(card)}
                            className="flex-1 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-semibold hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                            </svg>
                            Edit Rates
                          </button>
                          <button className="p-2.5 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {activeTab === 'system-settings' && (
              <>
                <div className="mb-6">
                  <h2 className="text-lg font-bold text-emerald-700">System Settings</h2>
                  <p className="text-sm text-gray-500 mt-0.5">Configure gift card rules (Advanced)</p>
                </div>

                <div className="max-w-3xl space-y-6">
                  {/* Auto Approval */}
                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-base font-bold text-gray-900 mb-1">Auto Approval</h3>
                        <p className="text-sm text-gray-500">Automatically approve gift cards below threshold</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={autoApproval} onChange={(e) => setAutoApproval(e.target.checked)} className="sr-only peer" />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                      </label>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Maximum Amount for Auto Approval</label>
                      <div className="flex items-center gap-3">
                        <input type="number" defaultValue="100" className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                        <select className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white">
                          <option>USD</option>
                          <option>NGN</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Manual Review */}
                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-base font-bold text-gray-900 mb-1">Manual Review</h3>
                        <p className="text-sm text-gray-500">Threshold for Manual Review</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={manualReview} onChange={(e) => setManualReview(e.target.checked)} className="sr-only peer" />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                      </label>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Maximum Amount for Auto Approval</label>
                      <div className="flex items-center gap-3">
                        <input type="number" defaultValue="200" className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                        <select className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white">
                          <option>USD</option>
                          <option>NGN</option>
                        </select>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">Transactions above this amount require manual review</p>
                    </div>
                  </div>

                  {/* Payout Options */}
                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h3 className="text-base font-bold text-gray-900 mb-4">Payout Options</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">Wallet Payout</p>
                          <p className="text-xs text-gray-500">Allow payout to user wallets</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" checked={walletPayout} onChange={(e) => setWalletPayout(e.target.checked)} className="sr-only peer" />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                        </label>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">Bank Payout</p>
                          <p className="text-xs text-gray-500">Allow payout to bank accounts</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" checked={bankPayout} onChange={(e) => setBankPayout(e.target.checked)} className="sr-only peer" />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Verification Requirement */}
                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h3 className="text-base font-bold text-gray-900 mb-4">Verification Requirement</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">Require Card Photo</p>
                          <p className="text-xs text-gray-500">User must upload card image</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" checked={requireCardPhoto} onChange={(e) => setRequireCardPhoto(e.target.checked)} className="sr-only peer" />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                        </label>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">Require Receipt</p>
                          <p className="text-xs text-gray-500">User must upload purchase receipt</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" checked={requireReceipt} onChange={(e) => setRequireReceipt(e.target.checked)} className="sr-only peer" />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                        </label>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">AI Validation</p>
                          <p className="text-xs text-gray-500">Use AI to validate card authenticity</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" checked={aiValidation} onChange={(e) => setAiValidation(e.target.checked)} className="sr-only peer" />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Save Button */}
                  <button className="w-full py-3 bg-emerald-500 text-white rounded-lg text-sm font-semibold hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 16v2a2 2 0 01-2 2H5a2 2 0 01-2-2v-7a2 2 0 012-2h2m3-4H5a2 2 0 00-2 2v7a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-1m-1 4l-3 3m0 0l-3-3m3 3V3" />
                    </svg>
                    Save Settings
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </main>

      {/* Edit Rates Modal */}
      {editModalOpen && selectedCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setEditModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-md rounded-xl shadow-2xl p-6">
            <button
              onClick={() => setEditModalOpen(false)}
              className="absolute -left-12 top-0 w-10 h-10 flex items-center justify-center rounded-full bg-white hover:bg-gray-100 transition-colors shadow-lg"
            >
              <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h2 className="text-lg font-bold text-gray-900 mb-6">Edit Rates - {selectedCard.name}</h2>

            <div className="mb-5">
              <label className="block text-sm font-semibold text-gray-900 mb-2">USD</label>
              <div className="mb-2">
                <p className="text-xs text-gray-500 mb-2">Buy Rate (₦)</p>
                <input
                  type="number"
                  value={buyRate}
                  onChange={(e) => setBuyRate(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg mb-5">
              <div className="flex gap-2">
                <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
                <p className="text-xs text-yellow-800">Manual overrides bypass automatic rate updates and will be logged in the audit trail.</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setEditModalOpen(false)}
                className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => setEditModalOpen(false)}
                className="flex-1 py-2.5 bg-emerald-500 text-white rounded-lg text-sm font-semibold hover:bg-emerald-600 transition-colors"
              >
                Apply Override
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}