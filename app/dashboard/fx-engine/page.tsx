'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { fxApi } from '@/lib/api/client';
import type { ConversionRate, CryptoRate, FxOverviewSummary } from '@/lib/api/client';
import { AUTH_ROUTES } from '@/constants/auth';
import DashboardHeader from '@/components/DashboardHeader';
import Sidebar from '@/components/Sidebar';

type MainTab = 'overview' | 'usd-wallet' | 'ngn-wallet' | 'yuan-wallet';
type OverviewSubTab = 'live-rates' | 'spread' | 'rate-logs';

export default function FXEnginePage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  const [mainTab, setMainTab] = useState<MainTab>('overview');
  const [overviewSubTab, setOverviewSubTab] = useState<OverviewSubTab>('live-rates');
  const [showSystemRateModal, setShowSystemRateModal] = useState(false);
  const [showConfigureSpreadModal, setShowConfigureSpreadModal] = useState(false);
  const [selectedPair, setSelectedPair] = useState('');
  const [selectedCurrencyPair, setSelectedCurrencyPair] = useState('');
  const [timeRange, setTimeRange] = useState('All Time');

  const [conversionRates, setConversionRates] = useState<ConversionRate[]>([]);
  const [cryptoRates, setCryptoRates] = useState<CryptoRate[]>([]);
  const [summary, setSummary] = useState<FxOverviewSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');


  const fetchOverview = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fxApi.getOverview();
      if (res.status) {
        setConversionRates(res.data.conversion_rates);
        setCryptoRates(res.data.crypto_rates);
        setSummary(res.data.summary);
        setLastUpdated(new Date().toLocaleTimeString());
        if (res.data.conversion_rates.length > 0) {
          setSelectedCurrencyPair(res.data.conversion_rates[0].pair);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load FX data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  if (!isAuthenticated) return null;

  const handleSystemRateClick = (pair: string) => {
    setSelectedPair(pair);
    setShowSystemRateModal(true);
  };

  const handleConfigureClick = (pair: string) => {
    setSelectedPair(pair);
    setShowConfigureSpreadModal(true);
  };

  return (
    <div className="flex h-screen bg-gray-50 font-['DM_Sans']">
      <Sidebar />

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-8 py-6">
       <DashboardHeader title="FX Engine" subtitle="Real-time foreign exchange rate management and conversion engine" />
       </div>
        {/* Content */}
        <div className="flex-1 overflow-y-auto">

          {/* Error banner */}
          {error && (
            <div className="mx-8 mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {mainTab === 'overview' && (
            <>
              {/* Summary Cards */}
              <div className="bg-white border-b border-gray-200 px-8 py-6">
                <h3 className="text-base font-bold text-gray-900 mb-4">Rate Engine Status</h3>
                {isLoading ? (
                  <div className="grid grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="bg-gray-100 rounded-xl p-4 animate-pulse h-20" />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-4">
                    <div className="bg-emerald-50 rounded-xl p-4">
                      <p className="text-xs text-gray-500 mb-1">Active Pairs</p>
                      <p className="text-3xl font-bold text-emerald-600">
                        {summary?.active_conversion_pairs ?? 0}
                      </p>
                    </div>
                    <div className="bg-blue-50 rounded-xl p-4">
                      <p className="text-xs text-gray-500 mb-1">Total Pairs</p>
                      <p className="text-3xl font-bold text-blue-600">
                        {summary?.total_conversion_pairs ?? 0}
                      </p>
                    </div>
                    <div className="bg-purple-50 rounded-xl p-4">
                      <p className="text-xs text-gray-500 mb-1">Crypto Rates</p>
                      <p className="text-3xl font-bold text-purple-600">
                        {summary?.active_crypto_rates ?? 0}
                      </p>
                    </div>
                    <div className="bg-orange-50 rounded-xl p-4">
                      <p className="text-xs text-gray-500 mb-1">Last Update</p>
                      <p className="text-xl font-bold text-orange-600">{lastUpdated || '—'}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Sub-tabs */}
              <div className="bg-white border-b border-gray-200 px-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    {[
                      { id: 'live-rates', label: 'Live Rates' },
                      { id: 'spread', label: 'Spread' },
                      { id: 'rate-logs', label: 'Rate Logs' },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setOverviewSubTab(tab.id as OverviewSubTab)}
                        className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                          overviewSubTab === tab.id
                            ? 'border-emerald-500 text-emerald-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                  {(overviewSubTab === 'live-rates' || overviewSubTab === 'spread') && (
                    <button
                      onClick={fetchOverview}
                      disabled={isLoading}
                      className="my-3 px-6 py-2 bg-emerald-500 text-white rounded-lg text-sm font-semibold hover:bg-emerald-600 flex items-center gap-2 disabled:opacity-50"
                    >
                      <svg className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                      </svg>
                      {isLoading ? 'Refreshing...' : 'Refresh Now'}
                    </button>
                  )}
                </div>
              </div>

              <div className="p-8">
                {/* Live Rates */}
                {overviewSubTab === 'live-rates' && (
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <h2 className="text-lg font-bold text-gray-900">FX Rates</h2>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-semibold">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><circle cx="10" cy="10" r="8" /></svg>
                          LIVE
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">Last updated: {lastUpdated || '—'}</p>
                    </div>

                    {isLoading ? (
                      <div className="space-y-6">
                        {[...Array(3)].map((_, i) => (
                          <div key={i} className="bg-white rounded-2xl border border-gray-200 p-6 animate-pulse h-64" />
                        ))}
                      </div>
                    ) : conversionRates.length === 0 ? (
                      <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
                        <p className="text-gray-500">No conversion rates available.</p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {conversionRates.map((rate) => (
                          <div key={rate.id} className="bg-white rounded-2xl border border-gray-200 p-6">
                            <div className="flex items-start justify-between mb-6">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center">
                                  <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                                  </svg>
                                </div>
                                <div>
                                  <h3 className="text-xl font-bold text-gray-900">{rate.pair}</h3>
                                  <p className="text-sm text-gray-500">{rate.from_currency} → {rate.to_currency}</p>
                                </div>
                              </div>
                              <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-semibold ${
                                rate.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                              }`}>
                                {rate.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </div>

                            <div className="mb-6">
                              <p className="text-sm text-gray-500 mb-1">Rate</p>
                              <p className="text-4xl font-bold text-gray-900">{rate.rate}</p>
                            </div>

                            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                              <p className="text-xs text-gray-400">
                                Updated: {new Date(rate.updated_at).toLocaleString()}
                              </p>
                              <button
                                onClick={() => handleSystemRateClick(rate.pair)}
                                className="px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-semibold hover:bg-emerald-600 transition-colors"
                              >
                                Manual Override
                              </button>
                            </div>
                          </div>
                        ))}

                        {/* Crypto rates section */}
                        {cryptoRates.length > 0 && (
                          <>
                            <h2 className="text-lg font-bold text-gray-900 mt-8 mb-4">Crypto Rate Markups</h2>
                            {cryptoRates.map((rate) => (
                              <div key={rate.id} className="bg-white rounded-2xl border border-gray-200 p-6">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <h3 className="text-xl font-bold text-gray-900">{rate.pair}</h3>
                                    <p className="text-sm text-gray-500">{rate.crypto_currency}</p>
                                  </div>
                                  <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-semibold ${
                                    rate.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                                  }`}>
                                    {rate.is_active ? 'Active' : 'Inactive'}
                                  </span>
                                </div>
                                <div className="mt-4">
                                  <p className="text-sm text-gray-500 mb-1">Rate Markup</p>
                                  <p className="text-3xl font-bold text-purple-600">{rate.rate_percentage}%</p>
                                </div>
                                <p className="text-xs text-gray-400 mt-4">
                                  Updated: {new Date(rate.updated_at).toLocaleString()}
                                </p>
                              </div>
                            ))}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Spread tab — static config UI, no endpoint yet */}
                {overviewSubTab === 'spread' && (
                  <div>
                    <div className="mb-6">
                      <h2 className="text-xl font-bold text-gray-900">Spread Configuration</h2>
                      <p className="text-sm text-gray-500 mt-1">Manage base and dynamic spreads for each currency pair</p>
                    </div>
                    {isLoading ? (
                      <div className="bg-white rounded-xl border border-gray-200 p-12 animate-pulse" />
                    ) : conversionRates.length === 0 ? (
                      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                        <p className="text-gray-500">No pairs available.</p>
                      </div>
                    ) : (
                      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-gray-200 bg-gray-50">
                              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Currency Pair</th>
                              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Rate</th>
                              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {conversionRates.map((rate) => (
                              <tr key={rate.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 text-sm font-bold text-gray-900">{rate.pair}</td>
                                <td className="px-6 py-4 text-sm text-gray-900">{rate.rate}</td>
                                <td className="px-6 py-4">
                                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                                    rate.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                                  }`}>
                                    {rate.is_active ? 'Active' : 'Inactive'}
                                  </span>
                                </td>
                                <td className="px-6 py-4">
                                  <button
                                    onClick={() => handleConfigureClick(rate.pair)}
                                    className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                                  >
                                    Configure
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                      <h3 className="text-base font-bold text-blue-900 mb-4">How Spreads Work</h3>
                      <div className="space-y-2 text-sm text-blue-900">
                        <p><span className="font-semibold">Base Spread:</span> Fixed spread percentage applied to all transactions</p>
                        <p><span className="font-semibold">Dynamic Spread:</span> Variable spread based on market volatility, liquidity, and volume</p>
                        <p><span className="font-semibold">Total Spread:</span> Base + Dynamic = Final spread applied to conversions</p>
                        <p><span className="font-semibold">Min/Max Limits:</span> Safeguards to prevent extreme spread values</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Rate Logs tab — endpoint not yet available */}
                {overviewSubTab === 'rate-logs' && (
                  <div>
                    <div className="mb-6">
                      <h2 className="text-xl font-bold text-gray-900">Rate Change History</h2>
                      <p className="text-sm text-gray-500 mt-1">Complete audit trail of all rate changes and admin actions</p>
                    </div>
                    <div className="flex items-center gap-4 mb-6">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Currency Pair</label>
                        <select
                          value={selectedCurrencyPair}
                          onChange={(e) => setSelectedCurrencyPair(e.target.value)}
                          className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        >
                          {conversionRates.map((r) => (
                            <option key={r.id} value={r.pair}>{r.pair}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Time Range</label>
                        <select
                          value={timeRange}
                          onChange={(e) => setTimeRange(e.target.value)}
                          className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        >
                          <option>All Time</option>
                          <option>Last 24 Hours</option>
                          <option>Last 7 Days</option>
                          <option>Last 30 Days</option>
                        </select>
                      </div>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                      <p className="text-gray-400 text-sm">Rate change history endpoint not yet available.</p>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {(mainTab === 'usd-wallet' || mainTab === 'ngn-wallet' || mainTab === 'yuan-wallet') && (
            <div className="p-8">
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <p className="text-lg text-gray-500">
                  {mainTab === 'usd-wallet' && 'USD Wallet Management'}
                  {mainTab === 'ngn-wallet' && 'NGN Wallet Management'}
                  {mainTab === 'yuan-wallet' && 'YUAN Wallet Management'}
                </p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Modals */}
      {(showSystemRateModal || showConfigureSpreadModal) && (
        <>
          <div
            className="fixed inset-0 bg-gray-900 bg-opacity-50 z-40"
            onClick={() => { setShowSystemRateModal(false); setShowConfigureSpreadModal(false); }}
          />

          {showSystemRateModal && (
            <div className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-none">
              <div className="bg-white rounded-2xl max-w-md w-full p-6 relative pointer-events-auto shadow-2xl">
                <button onClick={() => setShowSystemRateModal(false)} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-full transition-colors">
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Manual Override</h3>
                <p className="text-sm text-gray-500 mb-6">Currency Pair: <span className="font-semibold text-emerald-600">{selectedPair}</span></p>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-900 mb-2">New Rate</label>
                  <input type="text" placeholder="0.00" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-900 mb-2">Reason for Override</label>
                  <textarea placeholder="Provide reason..." rows={3} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-6 flex items-start gap-2">
                  <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
                  <p className="text-xs text-red-700">Manual overrides bypass automatic rate updates and will be logged in the audit trail.</p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setShowSystemRateModal(false)} className="flex-1 px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50">Cancel</button>
                  <button onClick={() => setShowSystemRateModal(false)} className="flex-1 px-6 py-2.5 bg-emerald-500 text-white rounded-lg text-sm font-semibold hover:bg-emerald-600">Apply Override</button>
                </div>
              </div>
            </div>
          )}

          {showConfigureSpreadModal && (
            <div className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-none">
              <div className="bg-white rounded-2xl max-w-md w-full p-6 relative pointer-events-auto shadow-2xl">
                <button onClick={() => setShowConfigureSpreadModal(false)} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-full transition-colors">
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Configure Spread</h3>
                <p className="text-sm text-gray-500 mb-6">Currency Pair: <span className="font-semibold text-emerald-600">{selectedPair}</span></p>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-900 mb-2">Base Spread (%)</label>
                  <input type="text" defaultValue="0.2" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-900 mb-2">Minimum Spread (%)</label>
                  <input type="text" defaultValue="0.15" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-900 mb-2">Maximum Spread (%)</label>
                  <input type="text" defaultValue="0.5" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6">
                  <p className="text-xs text-blue-700">Dynamic spread is calculated automatically based on market conditions and will be added to the base spread.</p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setShowConfigureSpreadModal(false)} className="flex-1 px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50">Cancel</button>
                  <button onClick={() => setShowConfigureSpreadModal(false)} className="flex-1 px-6 py-2.5 bg-emerald-500 text-white rounded-lg text-sm font-semibold hover:bg-emerald-600">Save Changes</button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}