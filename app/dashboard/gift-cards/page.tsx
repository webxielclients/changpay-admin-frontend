'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuthStore } from '@/store/authStore';
import { AUTH_ROUTES } from '@/constants/auth';
import Sidebar from '@/components/Sidebar';
import DashboardHeader from '@/components/DashboardHeader';

const FONT = { fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif" };

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

// Populated once the gift cards API is wired up — kept typed and empty until then.
const giftCards: GiftCard[] = [];

// ==================== HELPER COMPONENTS ====================

function StatusBadge({ status }: { status: 'active' | 'inactive' }) {
  return (
    <span
      className="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold border"
      style={status === 'active'
        ? { backgroundColor: '#E1F7EB', color: '#009F51', borderColor: '#009F5133' }
        : { backgroundColor: '#F8F9FA', color: '#6B7280', borderColor: '#E5E7EB' }}
    >
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
    <div className="flex h-screen bg-white" style={FONT}>
      <Sidebar />

      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          {/* Header */}
          <div className="bg-white border-b border-gray-200 px-8 py-6">
          <DashboardHeader title="Gift Card Engine" subtitle="Manage gift card settings, rates, and system configuration" />
</div>

          {/* Tab bar — full width, underline style */}
          <div className="px-8">
            <div className="flex border-b border-gray-200">
              {([
                { id: 'gift-cards' as TabType, label: 'Gift Cards' },
                { id: 'system-settings' as TabType, label: 'Systems Settings' },
              ]).map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`flex-1 py-3.5 text-center text-sm font-semibold transition-colors relative ${activeTab === t.id ? '' : 'text-gray-500 hover:text-gray-700'}`}
                  style={activeTab === t.id ? { color: '#009F51' } : undefined}
                >
                  {t.label}
                  {activeTab === t.id && <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full" style={{ backgroundColor: '#009F51' }} />}
                </button>
              ))}
            </div>
          </div>

          {/* Page Content */}
          <div className="p-8">
            {activeTab === 'gift-cards' && (
              <>
                {/* Gift Card Management Header */}
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-bold" style={{ color: '#009F51' }}>Gift Card Management</h2>
                    <p className="text-sm text-gray-500 mt-0.5">Configure supported gift cards and their rates</p>
                  </div>
                  <button
                    className="inline-flex items-center justify-center transition-colors"
                    style={{ ...FONT, width: 181, height: 56, gap: 8, borderRadius: 200, padding: 12, backgroundColor: '#009F51', color: '#E1F7EB', fontWeight: 600, fontSize: 15 }}
                  >
                    <Image src="/circleadd.png" alt="" width={20} height={20} />
                    Add Gift Card
                  </button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-4 gap-5 mb-8">
                  <div className="rounded-xl p-5" style={{ backgroundColor: '#F8F9FA' }}>
                    <p className="text-xs font-medium text-gray-500 mb-2">Total Cards</p>
                    <p className="text-3xl font-bold text-gray-900">{giftCards.length}</p>
                  </div>
                  <div className="rounded-xl p-5" style={{ backgroundColor: '#F8F9FA' }}>
                    <p className="text-xs font-medium text-gray-500 mb-2">Active</p>
                    <p className="text-3xl font-bold" style={{ color: '#009F51' }}>{giftCards.filter((c) => c.status === 'active').length}</p>
                  </div>
                  <div className="rounded-xl p-5" style={{ backgroundColor: '#F8F9FA' }}>
                    <p className="text-xs font-medium text-gray-500 mb-2">Inactive</p>
                    <p className="text-3xl font-bold" style={{ color: '#FF756B' }}>{giftCards.filter((c) => c.status === 'inactive').length}</p>
                  </div>
                  <div className="rounded-xl p-5" style={{ backgroundColor: '#F8F9FA' }}>
                    <p className="text-xs font-medium text-gray-500 mb-2">Avg Processing</p>
                    <p className="text-3xl font-bold" style={{ color: '#0274D8' }}>—</p>
                  </div>
                </div>

                {/* Gift Card Grid */}
                {giftCards.length === 0 ? (
                  <div className="rounded-xl border border-gray-200 p-16 text-center">
                    <p className="text-gray-400 text-sm">No gift cards added yet</p>
                  </div>
                ) : (
                <div className="grid grid-cols-2 gap-6">
                  {giftCards.map((card) => (
                    <div key={card.id} className="bg-white rounded-xl border border-gray-200 p-6">
                      <div className="flex items-start justify-between mb-5">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 flex items-center justify-center overflow-hidden flex-shrink-0">
                            <Image src="/amazon.png" alt={card.name} width={36} height={36} />
                          </div>
                          <div>
                            <h3 className="text-base font-bold text-gray-900">{card.name}</h3>
                            <p className="text-sm text-gray-500">{card.code}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" checked={card.active} className="sr-only peer" readOnly />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#009F51]"></div>
                          </label>
                          <StatusBadge status={card.status} />
                        </div>
                      </div>

                      <div className="space-y-3 mb-4">
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-gray-500">Countries</p>
                          <p className="text-sm font-medium text-gray-900">{card.countries}</p>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-gray-500">Value Range</p>
                          <p className="text-sm font-medium text-gray-900">{card.valueRange}</p>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-gray-500">Processing Time</p>
                          <p className="text-sm font-medium text-gray-900">{card.processingTime}</p>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-gray-500">Fee</p>
                          <p className="text-sm font-medium text-gray-900">{card.fee}</p>
                        </div>
                      </div>

                      <div className="border-t border-gray-200 pt-4">
                        <p className="text-xs font-semibold text-gray-700 mb-3">Exchange Rates</p>
                        <div className="flex items-center justify-between mb-4 px-4 py-3 rounded-lg" style={{ backgroundColor: '#F8F9FA' }}>
                          <span className="text-sm text-gray-600">USD</span>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-semibold" style={{ color: '#009F51' }}>Buy: {card.usdBuyRate}</span>
                            <span className="text-sm font-semibold" style={{ color: '#FF756B' }}>Sell: {card.usdSellRate}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEditRates(card)}
                            className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                            style={{ backgroundColor: '#012D32', color: '#D9F5DB' }}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                            </svg>
                            Edit Rates
                          </button>
                          <button className="p-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center">
                            <Image src="/del.png" alt="Delete" width={18} height={18} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                )}
              </>
            )}

            {activeTab === 'system-settings' && (
              <>
                <div className="mb-6">
                  <h2 className="text-lg font-bold" style={{ color: '#009F51' }}>System Settings</h2>
                  <p className="text-sm text-gray-500 mt-0.5">Configure gift card rules (Advanced)</p>
                </div>

                <div
                  className="space-y-6"
                  style={{ backgroundColor: '#F8F9FA', border: '1.05px solid #E1E4E6', borderRadius: 16, paddingTop: 16, paddingBottom: 16, paddingLeft: 24, paddingRight: 24 }}
                >
                  {/* Auto Approval */}
                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-base font-bold text-gray-900 mb-1">Auto Approval</h3>
                        <p className="text-sm text-gray-500">Automatically approve gift cards below threshold</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={autoApproval} onChange={(e) => setAutoApproval(e.target.checked)} className="sr-only peer" />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#009F51]"></div>
                      </label>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Maximum Amount for Auto Approval</label>
                      <div className="flex items-center gap-3">
                        <input type="number" defaultValue="100" className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009F51]" />
                        <select className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#009F51] bg-white">
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
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#009F51]"></div>
                      </label>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Maximum Amount for Auto Approval</label>
                      <div className="flex items-center gap-3">
                        <input type="number" defaultValue="200" className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009F51]" />
                        <select className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#009F51] bg-white">
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
                    <div className="space-y-3">
                      <div className="flex items-center justify-between rounded-xl px-4 py-4" style={{ backgroundColor: '#F8F9FA' }}>
                        <div>
                          <p className="text-sm font-medium text-gray-900">Wallet Payout</p>
                          <p className="text-xs text-gray-500">Allow payout to user wallets</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" checked={walletPayout} onChange={(e) => setWalletPayout(e.target.checked)} className="sr-only peer" />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#009F51]"></div>
                        </label>
                      </div>
                      <div className="flex items-center justify-between rounded-xl px-4 py-4" style={{ backgroundColor: '#F8F9FA' }}>
                        <div>
                          <p className="text-sm font-medium text-gray-900">Bank Payout</p>
                          <p className="text-xs text-gray-500">Allow payout to bank accounts</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" checked={bankPayout} onChange={(e) => setBankPayout(e.target.checked)} className="sr-only peer" />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#009F51]"></div>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Verification Requirement */}
                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h3 className="text-base font-bold text-gray-900 mb-4">Verification Requirement</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between rounded-xl px-4 py-4" style={{ backgroundColor: '#F8F9FA' }}>
                        <div>
                          <p className="text-sm font-medium text-gray-900">Require Card Photo</p>
                          <p className="text-xs text-gray-500">User must upload card image</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" checked={requireCardPhoto} onChange={(e) => setRequireCardPhoto(e.target.checked)} className="sr-only peer" />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#009F51]"></div>
                        </label>
                      </div>
                      <div className="flex items-center justify-between rounded-xl px-4 py-4" style={{ backgroundColor: '#F8F9FA' }}>
                        <div>
                          <p className="text-sm font-medium text-gray-900">Require Receipt</p>
                          <p className="text-xs text-gray-500">User must upload purchase receipt</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" checked={requireReceipt} onChange={(e) => setRequireReceipt(e.target.checked)} className="sr-only peer" />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#009F51]"></div>
                        </label>
                      </div>
                      <div className="flex items-center justify-between rounded-xl px-4 py-4" style={{ backgroundColor: '#F8F9FA' }}>
                        <div>
                          <p className="text-sm font-medium text-gray-900">AI Validation</p>
                          <p className="text-xs text-gray-500">Use AI to validate card authenticity</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" checked={aiValidation} onChange={(e) => setAiValidation(e.target.checked)} className="sr-only peer" />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#009F51]"></div>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Save Button */}
                  <button className="w-full py-3 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2" style={{ backgroundColor: '#009F51', color: '#E1F7EB' }}>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={FONT}>
          <div className="absolute inset-0 bg-black/40" onClick={() => setEditModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl p-8 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-normal text-gray-900 mb-8">Edit Rates - {selectedCard.name}</h2>

            <div className="mb-6">
              <label className="block text-2xl font-extrabold text-gray-900 mb-3">USD</label>
              <div>
                <p className="text-base text-gray-700 mb-2">Buy Rate (₦)</p>
                <input
                  type="number"
                  value={buyRate}
                  onChange={(e) => setBuyRate(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-[#009F51]"
                />
              </div>
            </div>

            <div className="p-4 rounded-xl mb-6 border" style={{ backgroundColor: '#FFFCED', borderColor: '#FFDA44' }}>
              <div className="flex gap-2.5 items-start">
                <Image src="/overide.png" alt="" width={18} height={18} className="flex-shrink-0 mt-0.5" />
                <p className="text-sm" style={{ color: '#8A6D00' }}>Manual overrides bypass automatic rate updates and will be logged in the audit trail.</p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => setEditModalOpen(false)}
                className="w-full py-3.5 border border-gray-300 text-gray-700 rounded-xl text-base font-semibold hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => setEditModalOpen(false)}
                className="w-full py-3.5 text-white rounded-xl text-base font-semibold transition-colors" style={{ backgroundColor: '#009F51' }}
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