'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { AUTH_ROUTES } from '@/constants/auth';
import Sidebar from '@/components/Sidebar';

type MainTab = 'overview' | 'usd-wallet' | 'ngn-wallet' | 'yuan-wallet';
type OverviewSubTab = 'live-rates' | 'spread' | 'rate-logs';

interface RateCard {
  pair: string;
  reference: string;
  midRate: string;
  buyRate: string;
  sellRate: string;
  spread: string;
  volume: string;
  changePercent: string;
  changeDirection: 'up' | 'down';
  manualOverride: boolean;
}

const mockRates: RateCard[] = [
  { pair: 'USD/NGN', reference: 'CBN Official', midRate: '1587.75', buyRate: '1580.50', sellRate: '1595.00', spread: '0.91%', volume: '$2.5M', changePercent: '+0%', changeDirection: 'up', manualOverride: true },
  { pair: 'USD/RMB', reference: 'PBOC Reference', midRate: '7.2550', buyRate: '7.2450', sellRate: '7.2650', spread: '0.28%', volume: '$8.9M', changePercent: '+0%', changeDirection: 'up', manualOverride: true },
  { pair: 'NGN/RMB', reference: 'Cross Rate', midRate: '0.00', buyRate: '0.00', sellRate: '0.00', spread: '0.67%', volume: '$0.0M', changePercent: '+0%', changeDirection: 'up', manualOverride: true },
];

const spreadConfig = [
  { pair: 'USD/NGN', base: '0.50%', dynamic: '0.41%', total: '0.91%', minMax: '0.30% - 2.00%', status: 'Active' },
  { pair: 'USD/RMB', base: '0.20%', dynamic: '0.08%', total: '0.28%', minMax: '0.15% - 0.50%', status: 'Active' },
  { pair: 'NGN/RMB', base: '0.60%', dynamic: '0.27%', total: '0.87%', minMax: '0.40% - 1.50%', status: 'Active' },
];

const rateLogs = [
  { timestamp: '2026-01-05 10:25:30', action: 'Auto Update', buyRate: '1580.50', buyFrom: '1675.00', sellRate: '1595.00', sellFrom: '1690.00', admin: { name: 'System', id: 'SYSTEM', avatar: 'SY' }, source: 'CBN Official' },
  { timestamp: '2026-01-05 10:25:30', action: 'Manual Override', buyRate: '1580.50', buyFrom: '1575.00', sellRate: '1595.00', sellFrom: '1690.00', admin: { name: 'Michael Chen', id: '2139586', avatar: 'MC' }, source: 'Manual' },
  { timestamp: '2026-01-05 10:25:30', action: 'Auto Update', buyRate: '1580.50', buyFrom: '1675.00', sellRate: '1595.00', sellFrom: '1690.00', admin: { name: 'Sarah Smith', id: '2139586', avatar: 'SS' }, source: 'CBN Official' },
  { timestamp: '2026-01-05 10:25:30', action: 'Auto Update', buyRate: '1580.50', buyFrom: '1675.00', sellRate: '1595.00', sellFrom: '1680.00', admin: { name: 'Sarah Smith', id: '2139586', avatar: 'SS' }, source: 'CBN Official' },
  { timestamp: '2026-01-05 10:25:30', action: 'Manual Override', buyRate: '1580.50', buyFrom: '1575.00', sellRate: '1595.00', sellFrom: '1690.00', admin: { name: 'Sarah Smith', id: '2139586', avatar: 'SS' }, source: 'Manual' },
];

export default function FXEnginePage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [mainTab, setMainTab] = useState<MainTab>('overview');
  const [overviewSubTab, setOverviewSubTab] = useState<OverviewSubTab>('live-rates');
  const [showSystemRateModal, setShowSystemRateModal] = useState(false);
  const [showConfigureSpreadModal, setShowConfigureSpreadModal] = useState(false);
  const [selectedPair, setSelectedPair] = useState('');
  const [selectedCurrencyPair, setSelectedCurrencyPair] = useState('USD/NGN');
  const [timeRange, setTimeRange] = useState('All Time');

  if (!isAuthenticated) {
    router.push(AUTH_ROUTES.LOGIN);
    return null;
  }

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
        <header className="bg-white border-b border-gray-200 px-8 py-5">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">FX Engine</h1>
              <p className="text-sm text-gray-500 mt-0.5">Real-time foreign exchange rate management and conversion engine</p>
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

          {/* Main Tabs */}
          <div className="mt-6 flex items-center border-b border-gray-200">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'usd-wallet', label: 'USD WALLET' },
              { id: 'ngn-wallet', label: 'NGN WALLET' },
              { id: 'yuan-wallet', label: 'YUAN WALLET' },
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
        <div className="flex-1 overflow-y-auto">
          {mainTab === 'overview' && (
            <div className="bg-white border-b border-gray-200 px-8 py-6">
              <h3 className="text-base font-bold text-gray-900 mb-4">Rate Engine Status</h3>
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-emerald-50 rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-1">Active Pairs</p>
                  <p className="text-3xl font-bold text-emerald-600">3</p>
                </div>
                <div className="bg-blue-50 rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-1">Avg Spread</p>
                  <p className="text-3xl font-bold text-blue-600">0.56%</p>
                </div>
                <div className="bg-purple-50 rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-1">24h Volume</p>
                  <p className="text-3xl font-bold text-purple-600">$26.9M</p>
                </div>
                <div className="bg-orange-50 rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-1">Last Update</p>
                  <p className="text-3xl font-bold text-orange-600">11:46:35 AM</p>
                </div>
              </div>
            </div>
          )}

          {mainTab === 'overview' && (
            <div>
              {/* Sub-tabs for Overview */}
              <div className="bg-white border-b border-gray-200 px-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    {[
                      { id: 'live-rates', label: 'Live rates' },
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
                  {overviewSubTab === 'live-rates' && (
                    <button className="my-3 px-6 py-2 bg-emerald-500 text-white rounded-lg text-sm font-semibold hover:bg-emerald-600 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                      </svg>
                      Refresh Now
                    </button>
                  )}
                  {overviewSubTab === 'spread' && (
                    <button className="my-3 px-6 py-2 bg-emerald-500 text-white rounded-lg text-sm font-semibold hover:bg-emerald-600 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                      </svg>
                      Refresh Now
                    </button>
                  )}
                </div>
              </div>

              <div className="p-8">
                {overviewSubTab === 'live-rates' && (
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <h2 className="text-lg font-bold text-gray-900">FX Rates</h2>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-semibold">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <circle cx="10" cy="10" r="8" />
                          </svg>
                          LIVE
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">Last updated: 11:25:10 AM</p>
                    </div>

                    <div className="space-y-6">
                      {mockRates.map((rate) => (
                        <div key={rate.pair} className="bg-white rounded-2xl border border-gray-200 p-6">
                          <div className="flex items-start justify-between mb-6">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center">
                                <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                                </svg>
                              </div>
                              <div>
                                <h3 className="text-xl font-bold text-gray-900">{rate.pair}</h3>
                                <p className="text-sm text-gray-500">{rate.reference}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-semibold ${
                                rate.changeDirection === 'up' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                              }`}>
                                {rate.changePercent}
                              </span>
                              <span className="inline-flex items-center px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-xs font-semibold">
                                Active
                              </span>
                            </div>
                          </div>

                          <div className="mb-6">
                            <p className="text-sm text-gray-500 mb-1">Mid Rate</p>
                            <p className="text-4xl font-bold text-gray-900">{rate.midRate}</p>
                          </div>

                          <div className="grid grid-cols-2 gap-4 mb-6">
                            <div>
                              <p className="text-sm text-gray-500 mb-2">Buy Rate</p>
                              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                                <p className="text-2xl font-bold text-emerald-600">{rate.buyRate}</p>
                              </div>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500 mb-2">Sell Rate</p>
                              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                                <p className="text-2xl font-bold text-red-600">{rate.sellRate}</p>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between mb-6">
                            <div>
                              <span className="text-sm text-gray-500">Spread: </span>
                              <span className="text-sm font-bold text-gray-900">{rate.spread}</span>
                            </div>
                            <div>
                              <span className="text-sm text-gray-500">24h Volume: </span>
                              <span className="text-sm font-bold text-gray-900">{rate.volume}</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-6 border-t border-gray-200">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-900">Manual Override</span>
                              <p className="text-xs text-gray-500">Override automatic rate updates</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input type="checkbox" checked={rate.manualOverride} readOnly className="sr-only peer" />
                              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                            </label>
                          </div>

                          <button
                            onClick={() => handleSystemRateClick(rate.pair)}
                            className="w-full mt-4 py-3 bg-emerald-500 text-white rounded-lg text-sm font-semibold hover:bg-emerald-600 transition-colors"
                          >
                            Manual Override
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {overviewSubTab === 'spread' && (
                  <div>
                    <div className="mb-6">
                      <h2 className="text-xl font-bold text-gray-900">Spread Configuration</h2>
                      <p className="text-sm text-gray-500 mt-1">Manage base and dynamic spreads for each currency pair</p>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-200 bg-gray-50">
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Currency Pair</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Base Spread</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Dynamic Spread</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Total Spread</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Min/Max</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {spreadConfig.map((config) => (
                            <tr key={config.pair} className="hover:bg-gray-50 transition-colors">
                              <td className="px-6 py-4 text-sm font-bold text-gray-900">{config.pair}</td>
                              <td className="px-6 py-4 text-sm text-gray-900">{config.base}</td>
                              <td className="px-6 py-4 text-sm text-gray-900">{config.dynamic}</td>
                              <td className="px-6 py-4 text-sm font-bold text-gray-900">{config.total}</td>
                              <td className="px-6 py-4 text-sm text-gray-500">{config.minMax}</td>
                              <td className="px-6 py-4">
                                <span className="inline-flex items-center px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-semibold">
                                  {config.status}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <button
                                  onClick={() => handleConfigureClick(config.pair)}
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

                {overviewSubTab === 'rate-logs' && (
                  <div>
                    <div className="mb-6">
                      <h2 className="text-xl font-bold text-gray-900">Rate Change History</h2>
                      <p className="text-sm text-gray-500 mt-1">Complete audit trail of all rate changes and admin actions</p>
                    </div>

                    <div className="grid grid-cols-4 gap-6 mb-6">
                      <div className="bg-white rounded-xl border border-gray-200 p-5">
                        <p className="text-xs text-gray-500 mb-1">Total Changes</p>
                        <p className="text-3xl font-bold text-gray-900">550</p>
                      </div>
                      <div className="bg-white rounded-xl border border-gray-200 p-5">
                        <p className="text-xs text-gray-500 mb-1">Manual Overrides</p>
                        <p className="text-3xl font-bold text-gray-900">400</p>
                      </div>
                      <div className="bg-white rounded-xl border border-gray-200 p-5">
                        <p className="text-xs text-gray-500 mb-1">Auto Updates</p>
                        <p className="text-3xl font-bold text-emerald-600">6</p>
                      </div>
                      <div className="bg-white rounded-xl border border-gray-200 p-5">
                        <p className="text-xs text-gray-500 mb-1">Current Rate</p>
                        <p className="text-3xl font-bold text-gray-900">1587.75</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-4">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Currency Pair</label>
                          <select
                            value={selectedCurrencyPair}
                            onChange={(e) => setSelectedCurrencyPair(e.target.value)}
                            className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          >
                            <option>USD/NGN</option>
                            <option>USD/RMB</option>
                            <option>NGN/RMB</option>
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
                      <button className="px-6 py-2 bg-emerald-500 text-white rounded-lg text-sm font-semibold hover:bg-emerald-600 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                        </svg>
                        Export History
                      </button>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-200 bg-gray-50">
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Timestamp</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Action</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Buy Rate</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Sell Rate</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Admin</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Source</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {rateLogs.map((log, i) => (
                            <tr key={i} className="hover:bg-gray-50 transition-colors">
                              <td className="px-6 py-4 text-xs text-gray-600">{log.timestamp}</td>
                              <td className="px-6 py-4 text-sm font-medium text-gray-900">{log.action}</td>
                              <td className="px-6 py-4">
                                <p className="text-sm font-bold text-gray-900">{log.buyRate}</p>
                                <p className="text-xs text-gray-500">From: {log.buyFrom}</p>
                              </td>
                              <td className="px-6 py-4">
                                <p className="text-sm font-bold text-gray-900">{log.sellRate}</p>
                                <p className="text-xs text-gray-500">From: {log.sellFrom}</p>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold">
                                    {log.admin.avatar}
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-gray-900">{log.admin.name}</p>
                                    <p className="text-xs text-gray-400">ID: {log.admin.id}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`text-sm font-medium ${log.source === 'Manual' ? 'text-orange-600' : 'text-emerald-600'}`}>
                                  {log.source}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="mt-6 bg-white rounded-xl border border-gray-200 p-6">
                      <h3 className="text-lg font-bold text-gray-900 mb-4">Latest Change Details</h3>
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <p className="text-sm font-medium text-gray-500 mb-1">Timestamp</p>
                          <p className="text-sm text-gray-900">2026-01-05 10:30:15</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500 mb-1">Action Type</p>
                          <p className="text-sm font-bold text-gray-900">Manual Override</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500 mb-1">Admin</p>
                          <p className="text-sm text-gray-900">Olalekan O (ID: 2139586)</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500 mb-1">Source</p>
                          <p className="text-sm font-bold text-gray-900">Manual</p>
                        </div>
                      </div>
                      <div className="mt-4">
                        <p className="text-sm font-medium text-gray-500 mb-1">Reason</p>
                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                          <p className="text-sm text-purple-900">Market volatility adjustment due to CBN policy announcement</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
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

      {(showSystemRateModal || showConfigureSpreadModal) && (
        <>
          <div 
            className="fixed inset-0 bg-gray-900 bg-opacity-50 z-40"
            onClick={() => {
              setShowSystemRateModal(false);
              setShowConfigureSpreadModal(false);
            }}
          />

          {showSystemRateModal && (
            <div className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-none">
              <div className="bg-white rounded-2xl max-w-md w-full p-6 relative pointer-events-auto shadow-2xl">
                <button
                  onClick={() => setShowSystemRateModal(false)}
                  className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
                >
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>

                <h3 className="text-xl font-bold text-gray-900 mb-2">System Rate</h3>
                <p className="text-sm text-gray-500 mb-6">Currency Pair: <span className="font-semibold text-emerald-600">{selectedPair}</span></p>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-900 mb-2">Buy Rate</label>
                  <input
                    type="text"
                    defaultValue="0.00462"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-900 mb-2">Sell Rate</label>
                  <input
                    type="text"
                    defaultValue="0.00462"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-900 mb-2">Reason for Override</label>
                  <textarea
                    placeholder="Provide reason..."
                    rows={3}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-6 flex items-start gap-2">
                  <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                  <p className="text-xs text-red-700">Manual overrides bypass automatic rate updates and will be logged in the audit trail.</p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowSystemRateModal(false)}
                    className="flex-1 px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => setShowSystemRateModal(false)}
                    className="flex-1 px-6 py-2.5 bg-emerald-500 text-white rounded-lg text-sm font-semibold hover:bg-emerald-600 transition-colors"
                  >
                    Apply Override
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Configure Spread Modal */}
          {showConfigureSpreadModal && (
            <div className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-none">
              <div className="bg-white rounded-2xl max-w-md w-full p-6 relative pointer-events-auto shadow-2xl">
                <button
                  onClick={() => setShowConfigureSpreadModal(false)}
                  className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
                >
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>

                <h3 className="text-xl font-bold text-gray-900 mb-2">Configure Spread</h3>
                <p className="text-sm text-gray-500 mb-6">Currency Pair: <span className="font-semibold text-emerald-600">{selectedPair}</span></p>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-900 mb-2">Base Spread (%)</label>
                  <input
                    type="text"
                    defaultValue="0.2"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-900 mb-2">Minimum Spread (%)</label>
                  <input
                    type="text"
                    defaultValue="0.15"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-900 mb-2">Maximum Spread (%)</label>
                  <input
                    type="text"
                    defaultValue="0.5"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6">
                  <p className="text-xs text-blue-700">Dynamic spread is calculated automatically based on market conditions and will be added to the base spread.</p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowConfigureSpreadModal(false)}
                    className="flex-1 px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => setShowConfigureSpreadModal(false)}
                    className="flex-1 px-6 py-2.5 bg-emerald-500 text-white rounded-lg text-sm font-semibold hover:bg-emerald-600 transition-colors"
                  >
                    Saves Changes
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}