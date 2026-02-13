'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { AUTH_ROUTES } from '@/constants/auth';
import Sidebar from '@/components/Sidebar';

// ==================== TYPES ====================

type TabType = 'support-tickets' | 'disputes';

interface Ticket {
  id: string;
  txnId: string;
  clientName: string;
  clientEmail: string;
  subject: string;
  description: string;
  type: 'Dispute' | 'Technical' | 'Billing' | 'Support';
  priority: 'high' | 'medium' | 'low';
  status: 'open' | 'resolved' | 'pending';
  datetime: string;
}

// ==================== MOCK DATA ====================

const supportTickets: Ticket[] = [
  {
    id: '1',
    txnId: 'TX-9A21F',
    clientName: 'James Smith',
    clientEmail: 'CHG-77820',
    subject: 'Unauthorized transaction on my account',
    description: 'I need to export my complete transaction history for tax purposes. How can I get a CSV file with all my transactions from last year?',
    type: 'Dispute',
    priority: 'high',
    status: 'open',
    datetime: '26 Dec, 10:42am',
  },
  {
    id: '2',
    txnId: 'TX-9A21F',
    clientName: 'James Smith',
    clientEmail: 'CHG-77820',
    subject: 'Unauthorized transaction on my account',
    description: 'I need to export my complete transaction history for tax purposes.',
    type: 'Dispute',
    priority: 'high',
    status: 'open',
    datetime: '26 Dec, 10:42am',
  },
  {
    id: '3',
    txnId: 'TX-9A21F',
    clientName: 'Jessica Wilson',
    clientEmail: 'CHG-77820',
    subject: 'Unable to complete wallet top-up',
    description: 'Unable to complete wallet top-up',
    type: 'Technical',
    priority: 'medium',
    status: 'pending',
    datetime: '26 Dec, 10:42am',
  },
  {
    id: '4',
    txnId: 'TX-9A21F',
    clientName: 'Michael Taylor',
    clientEmail: 'CHG-77820',
    subject: 'Refund request for failed transaction',
    description: 'Refund request for failed transaction',
    type: 'Billing',
    priority: 'low',
    status: 'resolved',
    datetime: '26 Dec, 10:42am',
  },
  {
    id: '5',
    txnId: 'TX-9A21F',
    clientName: 'Jessica Wilson',
    clientEmail: 'CHG-77820',
    subject: 'Unable to complete wallet top-up',
    description: 'Unable to complete wallet top-up',
    type: 'Technical',
    priority: 'medium',
    status: 'pending',
    datetime: '26 Dec, 10:42am',
  },
  {
    id: '6',
    txnId: 'TX-9A21F',
    clientName: 'James Smith',
    clientEmail: 'CHG-77820',
    subject: 'Unauthorized transaction on my account',
    description: 'Unauthorized transaction on my account',
    type: 'Dispute',
    priority: 'high',
    status: 'open',
    datetime: '26 Dec, 10:42am',
  },
  {
    id: '7',
    txnId: 'TX-9A21F',
    clientName: 'Michael Taylor',
    clientEmail: 'CHG-77820',
    subject: 'Refund request for failed transaction',
    description: 'Refund request for failed transaction',
    type: 'Billing',
    priority: 'low',
    status: 'resolved',
    datetime: '26 Dec, 10:42am',
  },
  {
    id: '8',
    txnId: 'TX-9A21F',
    clientName: 'Michael Taylor',
    clientEmail: 'CHG-77820',
    subject: 'Refund request for failed transaction',
    description: 'Refund request for failed transaction',
    type: 'Billing',
    priority: 'low',
    status: 'resolved',
    datetime: '26 Dec, 10:42am',
  },
];

const disputes: Ticket[] = [
  {
    id: '1',
    txnId: 'TX-9A21F',
    clientName: 'James Smith',
    clientEmail: 'CHG-77820',
    subject: 'Unauthorized transaction on my account',
    description: 'I did not authorize this transaction.',
    type: 'Dispute',
    priority: 'high',
    status: 'open',
    datetime: '26 Dec, 10:42am',
  },
  {
    id: '2',
    txnId: 'TX-9A21F',
    clientName: 'James Smith',
    clientEmail: 'CHG-77820',
    subject: 'Unauthorized transaction on my account',
    description: 'I did not authorize this transaction.',
    type: 'Dispute',
    priority: 'medium',
    status: 'open',
    datetime: '26 Dec, 10:42am',
  },
  {
    id: '3',
    txnId: 'TX-9A21F',
    clientName: 'James Smith',
    clientEmail: 'CHG-77820',
    subject: 'Unauthorized transaction on my account',
    description: 'I did not authorize this transaction.',
    type: 'Dispute',
    priority: 'low',
    status: 'open',
    datetime: '26 Dec, 10:42am',
  },
  {
    id: '4',
    txnId: 'TX-9A21F',
    clientName: 'James Smith',
    clientEmail: 'CHG-77820',
    subject: 'Unauthorized transaction on my account',
    description: 'I did not authorize this transaction.',
    type: 'Dispute',
    priority: 'high',
    status: 'open',
    datetime: '26 Dec, 10:42am',
  },
  {
    id: '5',
    txnId: 'TX-9A21F',
    clientName: 'James Smith',
    clientEmail: 'CHG-77820',
    subject: 'Unauthorized transaction on my account',
    description: 'I did not authorize this transaction.',
    type: 'Dispute',
    priority: 'medium',
    status: 'open',
    datetime: '26 Dec, 10:42am',
  },
  {
    id: '6',
    txnId: 'TX-9A21F',
    clientName: 'James Smith',
    clientEmail: 'CHG-77820',
    subject: 'Unauthorized transaction on my account',
    description: 'I did not authorize this transaction.',
    type: 'Dispute',
    priority: 'high',
    status: 'open',
    datetime: '26 Dec, 10:42am',
  },
  {
    id: '7',
    txnId: 'TX-9A21F',
    clientName: 'James Smith',
    clientEmail: 'CHG-77820',
    subject: 'Unauthorized transaction on my account',
    description: 'I did not authorize this transaction.',
    type: 'Dispute',
    priority: 'high',
    status: 'open',
    datetime: '26 Dec, 10:42am',
  },
];

// ==================== HELPER COMPONENTS ====================

function PriorityBadge({ priority }: { priority: 'high' | 'medium' | 'low' }) {
  const styles: Record<string, string> = {
    high: 'bg-red-100 text-red-700 border-red-200',
    medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    low: 'bg-gray-100 text-gray-600 border-gray-200',
  };

  const labels: Record<string, string> = {
    high: 'High',
    medium: 'Medium',
    low: 'Low',
  };

  return (
    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold border ${styles[priority]}`}>
      {labels[priority]}
    </span>
  );
}

function StatusBadge({ status }: { status: 'open' | 'resolved' | 'pending' }) {
  const styles: Record<string, string> = {
    open: 'bg-blue-100 text-blue-700 border-blue-200',
    resolved: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  };

  const labels: Record<string, string> = {
    open: 'Open',
    resolved: 'Resolved',
    pending: 'Pending',
  };

  return (
    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold border ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

// ==================== MAIN PAGE COMPONENT ====================

export default function SupportDisputesPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabType>('support-tickets');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('All Status');
  const [filterPriority, setFilterPriority] = useState('All Priority');
  const [filterType, setFilterType] = useState('All Types');
  const [ticketModalOpen, setTicketModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [response, setResponse] = useState('');

  if (!isAuthenticated) {
    router.push(AUTH_ROUTES.LOGIN);
    return null;
  }

  const handleViewTicket = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setTicketModalOpen(true);
  };

  const data = activeTab === 'support-tickets' ? supportTickets : disputes;

  return (
    <div className="flex h-screen bg-gray-50 font-['DM_Sans']">
      <Sidebar />

      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          {/* Header */}
          <div className="bg-white border-b border-gray-200 px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Support & Disputes</h1>
                <p className="text-sm text-gray-500 mt-0.5">Manage support tickets, customer disputes, and resolution workflows</p>
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
          </div>

          {/* Tabs */}
          <div className="bg-white border-b border-gray-200 px-8 py-4">
            <div className="flex items-center gap-6 border-b border-gray-200 -mb-4">
              <button
                onClick={() => setActiveTab('support-tickets')}
                className={`pb-3 text-sm font-semibold transition-colors relative ${
                  activeTab === 'support-tickets'
                    ? 'text-emerald-600 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-emerald-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Support Tickets
              </button>
              <button
                onClick={() => setActiveTab('disputes')}
                className={`pb-3 text-sm font-semibold transition-colors relative ${
                  activeTab === 'disputes'
                    ? 'text-emerald-600 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-emerald-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Disputes
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-8">
            {activeTab === 'support-tickets' && (
              <>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-bold text-emerald-700">Support Tickets</h2>
                    <p className="text-sm text-gray-500 mt-0.5">Create and manage support tickets with priority levels and assignments</p>
                  </div>
                  <button className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-500 text-white rounded-lg text-sm font-semibold hover:bg-emerald-600 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                    Export
                  </button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-4 gap-6 mb-6">
                  <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <p className="text-xs font-medium text-gray-500 mb-1">Total Tickets</p>
                    <p className="text-3xl font-bold text-gray-900">404</p>
                  </div>
                  <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <p className="text-xs font-medium text-gray-500 mb-1">Open Tickets</p>
                    <p className="text-3xl font-bold text-blue-600">34</p>
                  </div>
                  <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <p className="text-xs font-medium text-gray-500 mb-1">Resolved Today</p>
                    <p className="text-3xl font-bold text-emerald-600">34</p>
                  </div>
                  <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <p className="text-xs font-medium text-gray-500 mb-1">Pending Review</p>
                    <p className="text-3xl font-bold text-purple-600">120</p>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'disputes' && (
              <>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-bold text-emerald-700">Dispute Management</h2>
                    <p className="text-sm text-gray-500 mt-0.5">Handle transaction disputes and chargebacks</p>
                  </div>
                  <button className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-500 text-white rounded-lg text-sm font-semibold hover:bg-emerald-600 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                    Export
                  </button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-4 gap-6 mb-6">
                  <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <p className="text-xs font-medium text-gray-500 mb-1">Total Disputes</p>
                    <p className="text-3xl font-bold text-gray-900">127</p>
                  </div>
                  <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <p className="text-xs font-medium text-gray-500 mb-1">Open Disputes</p>
                    <p className="text-3xl font-bold text-red-600">34</p>
                  </div>
                  <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <p className="text-xs font-medium text-gray-500 mb-1">Resolved Today</p>
                    <p className="text-3xl font-bold text-emerald-600">34</p>
                  </div>
                  <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <p className="text-xs font-medium text-gray-500 mb-1">Pending Review</p>
                    <p className="text-3xl font-bold text-purple-600">33</p>
                  </div>
                </div>
              </>
            )}

            {/* Search and Filters */}
            <div className="flex items-center gap-3 mb-6">
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
                  placeholder="Search by Ticket ID, name or email..."
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              >
                <option>All Status</option>
                <option>Open</option>
                <option>Resolved</option>
                <option>Pending</option>
              </select>

              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              >
                <option>All Priority</option>
                <option>High</option>
                <option>Medium</option>
                <option>Low</option>
              </select>

              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              >
                <option>All Types</option>
                <option>Dispute</option>
                <option>Technical</option>
                <option>Billing</option>
                <option>Support</option>
              </select>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      {['Txn. ID', 'Client Name', 'Subject', 'Type', 'Priority', 'Status', 'Date/time', 'Actions'].map((h) => (
                        <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.map((ticket) => (
                      <tr key={ticket.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">{ticket.txnId}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3 min-w-[200px]">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                              {ticket.clientName.split(' ').map(w => w[0]).join('')}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{ticket.clientName}</p>
                              <p className="text-xs text-gray-400 truncate">{ticket.clientEmail}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">{ticket.subject}</td>
                        <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">{ticket.type}</td>
                        <td className="px-6 py-4 whitespace-nowrap"><PriorityBadge priority={ticket.priority} /></td>
                        <td className="px-6 py-4 whitespace-nowrap"><StatusBadge status={ticket.status} /></td>
                        <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">{ticket.datetime}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => handleViewTicket(ticket)}
                            className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            <div className="mt-6 flex items-center justify-between">
              <p className="text-sm text-gray-500">Showing 1 to 10 of 500 results</p>
              <div className="flex items-center gap-1">
                <button className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded-lg hover:bg-gray-50">
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                  </svg>
                </button>
                {[1, 2, 3, '...', 5].map((p, i) => (
                  <button
                    key={i}
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
            </div>
          </div>
        </div>
      </main>

      {/* Ticket Details Modal */}
      {ticketModalOpen && selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setTicketModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-2xl h-full shadow-2xl p-6 overflow-y-auto">
            <button
              onClick={() => setTicketModalOpen(false)}
              className="absolute -left-12 top-6 w-10 h-10 flex items-center justify-center rounded-full bg-white hover:bg-gray-100 transition-colors shadow-lg"
            >
              <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h2 className="text-lg font-bold text-gray-900 mb-6">Ticket Details</h2>

            <div className="grid grid-cols-2 gap-6 mb-6">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Ticket ID</p>
                <p className="text-sm font-semibold text-gray-900">{selectedTicket.txnId}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-medium text-gray-500 mb-1">Status</p>
                <StatusBadge status={selectedTicket.status} />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Txn ID</p>
                <p className="text-sm font-semibold text-gray-900">{selectedTicket.txnId}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-medium text-gray-500 mb-1">Type</p>
                <p className="text-sm font-semibold text-gray-900">{selectedTicket.type}</p>
              </div>
            </div>

            <div className="mb-6">
              <p className="text-sm font-bold text-gray-900 mb-2">Subject</p>
              <p className="text-sm font-semibold text-emerald-600">{selectedTicket.subject}</p>
            </div>

            <div className="mb-6">
              <p className="text-sm font-bold text-gray-900 mb-2">Description</p>
              <p className="text-sm text-gray-600">{selectedTicket.description}</p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-bold text-gray-900 mb-2">Add Response</label>
              <textarea
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                placeholder="Type your response to the customer..."
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex gap-3 mb-3">
              <button className="flex-1 py-3 bg-gray-900 text-white rounded-lg text-sm font-semibold hover:bg-gray-800 transition-colors">
                Send Response
              </button>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setTicketModalOpen(false)}
                className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
              <button className="flex-1 py-3 bg-emerald-500 text-white rounded-lg text-sm font-semibold hover:bg-emerald-600 transition-colors">
                Mark as resolved
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}