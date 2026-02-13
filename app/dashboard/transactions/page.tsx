'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { AUTH_ROUTES } from '@/constants/auth';
import Sidebar from '@/components/Sidebar';

// ==================== TYPES ====================

type TransactionType = 'all' | 'crypto-cash' | 'giftcard-cash' | 'payment-china';
type TabType = 'overview' | 'conversions';

interface BaseTransaction {
  txId: string;
  clientName: string;
  clientId: string;
  status: 'completed' | 'processing' | 'on-going' | 'paid' | 'refundable' | 'returned';
  dateTime: string;
  risk?: 'none' | 'high';
}

interface AllTransaction extends BaseTransaction {
  type: 'internal-transfer' | 'crypto-cash' | 'giftcard-cash' | 'payment-china';
  amount: string;
  channelAsset: string;
  state: string;
  fees: string;
}

interface CryptoTransaction extends BaseTransaction {
  asset: 'BTC' | 'USDT' | 'ETH';
  amount: string;
  confirmations: string;
  rateLock: string;
  payout: string;
}

interface GiftCardTransaction extends BaseTransaction {
  cardType: 'Amazon' | 'Apple' | 'Steam';
  cardValue: string;
  verification: 'ai-passed' | 'manual-review' | 'fraud-flag' | 'failed-flag';
  rate: string;
  payout: string;
}

interface PaymentChinaTransaction extends BaseTransaction {
  user: string;
  userId: string;
  amount: string;
  receiver: string;
  receiverAccount: string;
  rate: string;
  fee: string;
  timestamp: string;
}

interface ConversionTransaction {
  txId: string;
  user: string;
  userId: string;
  conversion: string;
  fromAmount: string;
  toAmount: string;
  rate: string;
  fee: string;
  status: 'completed';
  timestamp: string;
  risk: 'none' | 'high';
}

// ==================== MOCK DATA ====================

const allTransactions: AllTransaction[] = [
  { txId: 'TX-9A21F', clientName: 'James Smith', clientId: 'CHG-77820', type: 'internal-transfer', amount: '₦450,000', channelAsset: 'USD Wallet + NGN Wallet', state: '7.2550', fees: '₦450,000', status: 'completed', dateTime: '28 Dec, 10:42am', risk: 'none' },
  { txId: 'TX-9A21F', clientName: 'Robert Brown', clientId: 'CHG-77820', type: 'crypto-cash', amount: '0.032 BTC', channelAsset: 'BTC', state: '7.2550', fees: '₦450,000', status: 'on-going', dateTime: '28 Dec, 10:42am', risk: 'high' },
  { txId: 'TX-9A21F', clientName: 'Jessica Wilson', clientId: 'CHG-77820', type: 'giftcard-cash', amount: '$1450.00', channelAsset: 'Amazon', state: '7.2550', fees: '₦450,000', status: 'processing', dateTime: '28 Dec, 10:42am', risk: 'none' },
  { txId: 'TX-9A21F', clientName: 'Jessica Wilson', clientId: 'CHG-77820', type: 'giftcard-cash', amount: '$1450.00', channelAsset: 'Amazon', state: '7.2550', fees: '₦450,000', status: 'processing', dateTime: '28 Dec, 10:42am', risk: 'none' },
  { txId: 'TX-9A21F', clientName: 'Robert Brown', clientId: 'CHG-77820', type: 'crypto-cash', amount: '0.032 BTC', channelAsset: 'BTC', state: '7.2550', fees: '₦450,000', status: 'on-going', dateTime: '28 Dec, 10:42am', risk: 'high' },
  { txId: 'TX-9A21F', clientName: 'Michael Taylor', clientId: 'CHG-77820', type: 'payment-china', amount: '¥18,200', channelAsset: 'RMB (Bank)', state: '7.2550', fees: '₦450,000', status: 'completed', dateTime: '28 Dec, 10:42am', risk: 'none' },
];

const cryptoTransactions: CryptoTransaction[] = [
  { txId: 'TX-9A21F', clientName: 'Monday A', clientId: 'CHG-77820', asset: 'BTC', amount: '0.024 BTC', confirmations: '2/3', rateLock: '₦1,550/BTC Locked 10:21', status: 'on-going', payout: 'Wallet → NGN (•15ans ••••213)', dateTime: '28 Dec, 10:42am', risk: 'none' },
  { txId: 'TX-9A21F', clientName: 'Sunday Chidi', clientId: 'CHG-77820', asset: 'USDT', amount: '1,200 USDT', confirmations: 'Completed', rateLock: '₦1,520/USDT Locked 09:58', status: 'paid', payout: 'Bank Transfer Access •••0032', dateTime: '28 Dec, 10:42am', risk: 'none' },
  { txId: 'TX-9A21F', clientName: 'Adeola K.', clientId: 'CHG-77820', asset: 'ETH', amount: '0.78 ETH', confirmations: 'Failed', rateLock: '₦1,480/ETH Expired', status: 'refundable', payout: 'Canceled', dateTime: '28 Dec, 10:42am', risk: 'none' },
  { txId: 'TX-9A21F', clientName: 'Monday A', clientId: 'CHG-77820', asset: 'BTC', amount: '0.024 BTC', confirmations: '1/3', rateLock: '₦1,550/BTC Locked 10:21', status: 'on-going', payout: 'Wallet → NGN (•15ans ••••213)', dateTime: '28 Dec, 10:42am', risk: 'none' },
];

const giftCardTransactions: GiftCardTransaction[] = [
  { txId: 'TX-9A21F', clientName: 'Monday A', clientId: 'CHG-77820', cardType: 'Amazon', cardValue: '$100', verification: 'ai-passed', rate: '₦1,520/USD', status: 'processing', payout: 'Pending...', dateTime: '28 Dec, 10:42am', risk: 'none' },
  { txId: 'TX-9A21F', clientName: 'Sunday Chidi', clientId: 'CHG-77820', cardType: 'Apple', cardValue: '$100', verification: 'manual-review', rate: '₦1,520/USD', status: 'paid', payout: 'Bank Transfer Access •••0032', dateTime: '28 Dec, 10:42am', risk: 'none' },
  { txId: 'TX-9A21F', clientName: 'Adeola K.', clientId: 'CHG-77820', cardType: 'Steam', cardValue: '$50', verification: 'fraud-flag', rate: '₦1,520/USD', status: 'refundable', payout: 'Wallet Refund NGN Wallet', dateTime: '28 Dec, 10:42am', risk: 'none' },
  { txId: 'TX-9A21F', clientName: 'Monday A', clientId: 'CHG-77820', cardType: 'Steam', cardValue: '$25', verification: 'ai-passed', rate: '₦1,520/USD', status: 'processing', payout: 'Pending...', dateTime: '28 Dec, 10:42am', risk: 'none' },
];

const paymentChinaTransactions: PaymentChinaTransaction[] = [
  {
    txId: 'TX-9A21F', user: 'David Okonkwo', userId: 'CHG-77820', amount: '¥1,687,750', receiver: 'Bank Transfer', receiverAccount: 'Bank of China ••••0032', rate: '1587.75', fee: '¥30.00', status: 'completed', timestamp: '2026-01-05 10:25:30', risk: 'none',
    clientName: '',
    clientId: '',
    dateTime: ''
  },
  {
    txId: 'TX-9A21F', user: 'Sarah Smith', userId: 'CHG-77820', amount: '¥10,942,500', receiver: 'Bank Transfer', receiverAccount: 'CITIC Bank ••••0032', rate: '218.85', fee: '¥500.00', status: 'processing', timestamp: '2026-01-05 10:25:30', risk: 'none',
    clientName: '',
    clientId: '',
    dateTime: ''
  },
  {
    txId: 'TX-9A21F', user: 'Michael Chen', userId: 'CHG-77820', amount: '¥3,162.05', receiver: 'YAN Wallet', receiverAccount: '••••2213', rate: '1587.75', fee: '¥31.62', status: 'returned', timestamp: '2026-01-05 10:25:30', risk: 'high',
    clientName: '',
    clientId: '',
    dateTime: ''
  },
];

const conversionTransactions: ConversionTransaction[] = [
  { txId: 'TX-9A21F', user: 'David Okonkwo', userId: 'CHG-271', conversion: 'USD → NGN', fromAmount: '$1,000.00', toAmount: '₦1,687,750', rate: '1587.75', fee: '¥30.00', status: 'completed', timestamp: '2026-01-05 10:25:30', risk: 'none' },
  { txId: 'TX-9A21F', user: 'Michael Chen', userId: 'CHG-771', conversion: 'NGN → USD', fromAmount: '₦5,000,000', toAmount: '$3,162.05', rate: '1580.5000', fee: '₦21.62', status: 'completed', timestamp: '2026-01-05 10:25:30', risk: 'high' },
  { txId: 'TX-9A21F', user: 'Sarah Smith', userId: 'CHG-771', conversion: 'USD → YAN', fromAmount: '$5,000.00', toAmount: '¥36,275.00', rate: '7.2550', fee: '$50.00', status: 'completed', timestamp: '2026-01-05 10:25:30', risk: 'none' },
];

// ==================== HELPER COMPONENTS ====================

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    completed: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    processing: 'bg-orange-100 text-orange-700 border-orange-200',
    'on-going': 'bg-teal-100 text-teal-700 border-teal-200',
    paid: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    refundable: 'bg-red-100 text-red-700 border-red-200',
    returned: 'bg-red-100 text-red-700 border-red-200',
  };
  const label = status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ');
  return (
    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold border ${styles[status] || 'bg-gray-100 text-gray-700 border-gray-200'}`}>
      {label}
    </span>
  );
}

function RiskBadge({ risk }: { risk?: 'none' | 'high' }) {
  if (!risk || risk === 'none') {
    return (
      <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200">
        None
      </span>
    );
  }
  return (
    <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200">
      High
    </span>
  );
}

function VerificationBadge({ verification }: { verification: string }) {
  const styles: Record<string, string> = {
    'ai-passed': 'bg-yellow-100 text-yellow-700 border-yellow-200',
    'manual-review': 'bg-teal-100 text-teal-700 border-teal-200',
    'fraud-flag': 'bg-red-100 text-red-700 border-red-200',
    'failed-flag': 'bg-red-100 text-red-700 border-red-200',
  };
  const labels: Record<string, string> = {
    'ai-passed': 'AI Passed',
    'manual-review': 'Manual Review',
    'fraud-flag': 'Fraud Flag',
    'failed-flag': 'Failed Flag',
  };
  return (
    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold border ${styles[verification]}`}>
      {labels[verification]}
    </span>
  );
}

// ==================== MODAL COMPONENTS ====================

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: any;
  type: TransactionType | 'conversion';
}

function TransactionModal({ isOpen, onClose, transaction, type }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose}></div>
      <div className="relative bg-white w-full max-w-md h-full shadow-2xl overflow-y-auto">
        {/* Close button - positioned absolutely */}
        <button
          onClick={onClose}
          className="absolute left-[-50px] top-12 w-10 h-10 flex items-center justify-center rounded-full bg-white hover:bg-gray-100 transition-colors shadow-lg z-20"
        >
          <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="p-6 space-y-5">
          {type === 'all' && <AllTransactionModalContent transaction={transaction} />}
          {type === 'crypto-cash' && <CryptoModalContent transaction={transaction} />}
          {type === 'giftcard-cash' && <GiftCardModalContent transaction={transaction} />}
          {type === 'payment-china' && <PaymentChinaModalContent transaction={transaction} />}
          {type === 'conversion' && <ConversionModalContent transaction={transaction} />}
        </div>
      </div>
    </div>
  );
}

function AllTransactionModalContent({ transaction }: { transaction: AllTransaction }) {
  return (
    <>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-lg font-bold text-gray-900">Transaction Details</h2>
      </div>

      {/* User Card - Light pink background */}
      <div className="bg-rose-50 rounded-lg p-3 flex items-center justify-between mb-6">
        <div className="flex items-center gap-3 min-w-[200px]">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-sm font-bold">
            {transaction.clientName.split(' ').map(w => w[0]).join('')}
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">{transaction.clientName}</p>
            <p className="text-xs text-gray-500">ChangPayID: {transaction.clientId}</p>
          </div>
        </div>
        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
      </div>

      {/* Transaction Info - Single line rows */}
      <div className="space-y-4 mb-6">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Transaction ID</span>
          <span className="text-sm font-semibold text-gray-900">TXN-90122</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Product</span>
          <span className="text-sm font-semibold text-gray-900">RMB</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Amount</span>
          <span className="text-lg font-bold text-gray-900">¥420,000</span>
        </div>
      </div>

      {/* Lifecycle */}
      <div className="mb-6">
        <p className="text-sm text-gray-600 mb-3">Lifecycle</p>
        <div className="space-y-2">
          <p className="text-sm text-gray-900">Initiated - 10:12am</p>
          <p className="text-sm text-orange-600 font-medium">Processing - 10:13am</p>
        </div>
      </div>

      {/* Financials */}
      <div className="mb-6">
        <p className="text-sm text-gray-600 mb-3">Financials</p>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">FX Rate Used</span>
            <span className="text-sm font-semibold text-gray-900">₦1.550/¥</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Fees Applied</span>
            <span className="text-sm font-semibold text-gray-900">₦6,000</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-3">
        <button className="w-full py-3 border border-red-500 text-red-500 rounded-lg text-sm font-semibold hover:bg-red-50 transition-colors">
          Trigger Manual Review
        </button>
        <button className="w-full py-3 border border-gray-300 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors">
          Initiate Refund
        </button>
        <button className="w-full py-3 bg-emerald-500 text-white rounded-lg text-sm font-semibold hover:bg-emerald-600 transition-colors">
          Download Receipt
        </button>
      </div>
    </>
  );
}

function CryptoModalContent({ transaction }: { transaction: CryptoTransaction }) {
  return (
    <>
      {/* Total Payment - Right aligned amount */}
      <div className="flex justify-between items-start mb-6">
        <span className="text-sm text-gray-600">Total Payment</span>
        <span className="text-2xl font-bold text-gray-900">₦220,500</span>
      </div>

      {/* Status - Right aligned badge */}
      <div className="flex justify-between items-center mb-6">
        <span className="text-sm text-gray-600">Status</span>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
          Success
        </span>
      </div>

      {/* User Card - Light green/emerald background */}
      <div className="bg-emerald-50 rounded-lg p-3 flex items-center justify-between mb-6">
        <div className="flex items-center gap-3 min-w-[200px]">
          <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white text-sm font-bold">
            OA
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">Olalekan</p>
            <p className="text-xs text-gray-500">ChangPayID: CHG-983211</p>
          </div>
        </div>
        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
      </div>

      {/* Crypto Sent */}
      <div className="mb-6">
        <p className="text-sm text-gray-600 mb-3">Crypto Sent</p>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Asset</span>
            <span className="text-sm font-semibold text-gray-900">USDT (TRC20)</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Amount</span>
            <span className="text-sm font-semibold text-gray-900">150 USDT</span>
          </div>
        </div>
      </div>

      {/* Payout Destination */}
      <div className="mb-6">
        <p className="text-sm text-gray-600 mb-3">Payout Destination</p>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Wallet</span>
            <span className="text-sm font-semibold text-gray-900">USD Wallet</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Wallet ID</span>
            <span className="text-sm font-semibold text-gray-900">CP-USD-003982</span>
          </div>
        </div>
      </div>

      {/* Transaction Detail */}
      <div className="mb-6">
        <p className="text-sm text-gray-600 mb-3">Transaction Detail</p>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Transaction ID</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-900">CP-TRX-98347291</span>
              <button className="text-gray-400 hover:text-gray-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                </svg>
              </button>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">User ID</span>
            <span className="text-sm font-semibold text-gray-900">724839</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Transaction Type</span>
            <span className="text-sm font-semibold text-gray-900">Crypto→Cash</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Fee</span>
            <span className="text-sm font-semibold text-gray-900">$2.00</span>
          </div>
        </div>
      </div>

      {/* Total */}
      <div className="flex justify-between items-center mb-6">
        <span className="text-base font-bold text-gray-900">Total</span>
        <span className="text-base font-bold text-gray-900">₦220,500</span>
      </div>

      {/* Actions */}
      <div className="space-y-3">
        <button className="w-full py-3 border border-red-500 text-red-500 rounded-lg text-sm font-semibold hover:bg-red-50 transition-colors">
          Mark as failed
        </button>
        <button className="w-full py-3 border border-gray-300 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors">
          Mark as Manual Review
        </button>
        <button className="w-full py-3 bg-emerald-500 text-white rounded-lg text-sm font-semibold hover:bg-emerald-600 transition-colors">
          Download Receipt
        </button>
      </div>
    </>
  );
}

function GiftCardModalContent({ transaction }: { transaction: GiftCardTransaction }) {
  return (
    <>
      {/* Header with timestamp */}
      <div className="text-center mb-6">
        <p className="text-base font-bold text-gray-900 mb-1">Transaction Success</p>
        <p className="text-xs text-gray-400">2025-02-14 • 13:42:09 GMT</p>
      </div>

      {/* Total Payment */}
      <div className="flex justify-between items-start mb-6">
        <span className="text-sm text-gray-600">Total Payment</span>
        <span className="text-2xl font-bold text-gray-900">₦220,500</span>
      </div>

      {/* Status */}
      <div className="flex justify-between items-center mb-6">
        <span className="text-sm text-gray-600">Status</span>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
          Success
        </span>
      </div>

      {/* Card Details */}
      <div className="mb-6">
        <p className="text-sm text-gray-600 mb-3">Card Details</p>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Card Type</span>
            <span className="text-sm font-semibold text-gray-900">Amazon</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Card Value</span>
            <span className="text-sm font-semibold text-gray-900">$100</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Card Code</span>
            <span className="text-sm font-semibold text-gray-900">****F3X2</span>
          </div>
        </div>
      </div>

      {/* Payout Destination */}
      <div className="mb-6">
        <p className="text-sm text-gray-600 mb-3">Payout Destination</p>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Wallet</span>
            <span className="text-sm font-semibold text-gray-900">USD Wallet</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Wallet ID</span>
            <span className="text-sm font-semibold text-gray-900">CP-USD-003982</span>
          </div>
        </div>
      </div>

      {/* Conversion Details */}
      <div className="mb-6">
        <p className="text-sm text-gray-600 mb-3">Conversion Details</p>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Rate</span>
            <span className="text-sm font-semibold text-gray-900">$740/₦1</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Fee</span>
            <span className="text-sm font-semibold text-gray-900">$2.00</span>
          </div>
        </div>
      </div>

      {/* Transaction Detail */}
      <div className="mb-6">
        <p className="text-sm text-gray-600 mb-3">Transaction Detail</p>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Transaction ID</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-900">CP-TRX-98347291</span>
              <button className="text-gray-400 hover:text-gray-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                </svg>
              </button>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">User ID</span>
            <span className="text-sm font-semibold text-gray-900">724839</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Transaction Type</span>
            <span className="text-sm font-semibold text-gray-900">Gift Card→Cash</span>
          </div>
        </div>
      </div>

      {/* Total */}
      <div className="flex justify-between items-center mb-6">
        <span className="text-base font-bold text-gray-900">Total</span>
        <span className="text-base font-bold text-gray-900">₦220,500</span>
      </div>

      {/* Actions */}
      <div className="space-y-3">
        <button className="w-full py-3 border border-red-500 text-red-500 rounded-lg text-sm font-semibold hover:bg-red-50 transition-colors">
          Mark as failed
        </button>
        <button className="w-full py-3 border border-gray-300 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors">
          Mark as Manual Review
        </button>
        <button className="w-full py-3 bg-emerald-500 text-white rounded-lg text-sm font-semibold hover:bg-emerald-600 transition-colors">
          Download Receipt
        </button>
      </div>
    </>
  );
}

function PaymentChinaModalContent({ transaction }: { transaction: PaymentChinaTransaction }) {
  return (
    <>
      {/* Header with timestamp */}
      <div className="text-center mb-6">
        <p className="text-base font-bold text-gray-900 mb-1">Transaction Success</p>
        <p className="text-xs text-gray-400">2025-02-14 • 13:42:09 GMT</p>
      </div>

      {/* Total Payment */}
      <div className="flex justify-between items-start mb-6">
        <span className="text-sm text-gray-600">Total Payment</span>
        <span className="text-2xl font-bold text-gray-900">¥14,400</span>
      </div>

      {/* Status */}
      <div className="flex justify-between items-center mb-6">
        <span className="text-sm text-gray-600">Status</span>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
          Success
        </span>
      </div>

      {/* Sender Details */}
      <div className="mb-6">
        <p className="text-sm text-gray-600 mb-2">Sender Details</p>
        <p className="text-sm font-semibold text-gray-900">Olalekan Olasehinde</p>
        <p className="text-xs text-gray-500">Yan Wallet - CP-003982</p>
      </div>

      {/* Recipient Details */}
      <div className="mb-6">
        <p className="text-sm text-gray-600 mb-2">Recipient Details</p>
        <p className="text-sm font-semibold text-gray-900">Zhang Zei</p>
        <p className="text-xs text-gray-500">Bank of China - ****7363</p>
        <p className="text-xs text-gray-500">(CN Account)</p>
      </div>

      {/* Transaction Detail */}
      <div className="mb-6">
        <p className="text-sm text-gray-600 mb-3">Transaction Detail</p>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Transaction ID</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-900">CP-TRX-98347291</span>
              <button className="text-gray-400 hover:text-gray-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                </svg>
              </button>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">User ID</span>
            <span className="text-sm font-semibold text-gray-900">724839</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">FX rate</span>
            <span className="text-sm font-semibold text-gray-900">1 USD→¥7.20</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Amount sent</span>
            <span className="text-sm font-semibold text-gray-900">¥14,400</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Amount sent</span>
            <span className="text-sm font-semibold text-gray-900">¥14,400</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Fee</span>
            <span className="text-sm font-semibold text-gray-900">$2.00</span>
          </div>
        </div>
      </div>

      {/* Total */}
      <div className="flex justify-between items-center mb-6">
        <span className="text-base font-bold text-gray-900">Total</span>
        <span className="text-base font-bold text-gray-900">¥16,400</span>
      </div>

      {/* Actions */}
      <div className="space-y-3">
        <button className="w-full py-3 border border-red-500 text-red-500 rounded-lg text-sm font-semibold hover:bg-red-50 transition-colors">
          Mark as failed
        </button>
        <button className="w-full py-3 border border-gray-300 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors">
          Mark as Manual Review
        </button>
        <button className="w-full py-3 bg-emerald-500 text-white rounded-lg text-sm font-semibold hover:bg-emerald-600 transition-colors">
          Download Receipt
        </button>
      </div>
    </>
  );
}

function ConversionModalContent({ transaction }: { transaction: ConversionTransaction }) {
  return (
    <>
      {/* Success checkmark icon */}
      <div className="flex justify-center mb-4">
        <div className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
      </div>

      {/* Header with timestamp */}
      <div className="text-center mb-6">
        <p className="text-base font-bold text-gray-900 mb-1">Transaction Success</p>
        <p className="text-xs text-gray-400">2025-02-14 • 13:42:09 GMT</p>
      </div>

      {/* Total Payment */}
      <div className="flex justify-between items-start mb-6">
        <span className="text-sm text-gray-600">Total Payment</span>
        <span className="text-2xl font-bold text-gray-900">₦220,500</span>
      </div>

      {/* Status */}
      <div className="flex justify-between items-center mb-6">
        <span className="text-sm text-gray-600">Status</span>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
          Success
        </span>
      </div>

      {/* From/To */}
      <div className="space-y-3 mb-6">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">From</span>
          <span className="text-sm font-semibold text-gray-900">Chisom • USD Wallet</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">To</span>
          <span className="text-sm font-semibold text-gray-900">Chisom • Yan Wallet</span>
        </div>
      </div>

      {/* Transaction Detail */}
      <div className="mb-6">
        <p className="text-sm text-gray-600 mb-3">Transaction Detail</p>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Transaction ID</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-900">4Z341675671661</span>
              <button className="text-gray-400 hover:text-gray-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                </svg>
              </button>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Wallet ID</span>
            <span className="text-sm font-semibold text-gray-900">CP-USD-003982</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Amount</span>
            <span className="text-sm font-semibold text-gray-900">$1,000</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Exchange Rate</span>
            <span className="text-sm font-semibold text-gray-900">$1→¥7.40</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Fee</span>
            <span className="text-sm font-semibold text-gray-900">$2.00</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Discount</span>
            <span className="text-sm font-semibold text-gray-900">$0.00</span>
          </div>
        </div>
      </div>

      {/* Total */}
      <div className="flex justify-between items-center mb-6">
        <span className="text-base font-bold text-gray-900">Total</span>
        <span className="text-base font-bold text-gray-900">₦220,500</span>
      </div>

      {/* Actions */}
      <div className="space-y-3">
        <button className="w-full py-3 border border-red-500 text-red-500 rounded-lg text-sm font-semibold hover:bg-red-50 transition-colors">
          Mark as failed
        </button>
        <button className="w-full py-3 border border-gray-300 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors">
          Mark as Manual Review
        </button>
        <button className="w-full py-3 bg-emerald-500 text-white rounded-lg text-sm font-semibold hover:bg-emerald-600 transition-colors">
          Download Receipt
        </button>
      </div>
    </>
  );
}

// ==================== MAIN PAGE COMPONENT ====================

export default function TransactionsPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [selectedType, setSelectedType] = useState<TransactionType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('All Status');
  const [dateFilter, setDateFilter] = useState('mm/dd/yyyy');
  const [riskFilter, setRiskFilter] = useState('Risk Flag');

  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [modalType, setModalType] = useState<TransactionType | 'conversion'>('all');

  if (!isAuthenticated) {
    router.push(AUTH_ROUTES.LOGIN);
    return null;
  }

  const handleViewTransaction = (transaction: any, type: TransactionType | 'conversion') => {
    setSelectedTransaction(transaction);
    setModalType(type);
  };

  const renderStatCards = () => {
    if (activeTab === 'conversions') {
      return (
        <div className="grid grid-cols-4 gap-5 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-xs font-medium text-gray-500 mb-1">Total Conversions</p>
            <p className="text-2xl font-bold text-gray-900">17,000</p>
            <p className="text-xs text-gray-400 mt-1">Last 24 hours</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-xs font-medium text-gray-500 mb-1">Total Volume</p>
            <p className="text-2xl font-bold text-blue-600">$127K</p>
            <p className="text-xs text-gray-400 mt-1">All currencies</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-xs font-medium text-gray-500 mb-1">Avg Conversion</p>
            <p className="text-2xl font-bold text-blue-600">$127K</p>
            <p className="text-xs text-gray-400 mt-1">Per transaction</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-xs font-medium text-gray-500 mb-1">Total Fees</p>
            <p className="text-2xl font-bold text-yellow-600">$199.81</p>
            <p className="text-xs text-gray-400 mt-1">Revenue earned</p>
          </div>
        </div>
      );
    }

    if (selectedType === 'all') return null;

    return (
      <div className="grid grid-cols-4 gap-5 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs font-medium text-gray-500 mb-1">Pending confirmations</p>
          <p className="text-2xl font-bold text-gray-900">18</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs font-medium text-gray-500 mb-1">Completed today</p>
          <p className="text-2xl font-bold text-emerald-600">42</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs font-medium text-gray-500 mb-1">Flagged for review</p>
          <p className="text-2xl font-bold text-orange-600">6</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs font-medium text-gray-500 mb-1">
            {selectedType === 'crypto-cash' ? 'Refunds (24h)' : selectedType === 'giftcard-cash' ? 'AI Passed' : 'AI Passed'}
          </p>
          <p className="text-2xl font-bold text-gray-900">
            {selectedType === 'crypto-cash' ? '₦3.1M' : '29'}
          </p>
        </div>
      </div>
    );
  };

  const renderTable = () => {
    if (activeTab === 'conversions') {
      return (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {['Txn. ID', 'User', 'Conversion', 'From Amount', 'To Amount', 'Rate', 'Fee', 'Status', 'Timestamp', 'Risk', 'Actions'].map((h) => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {conversionTransactions.map((tx, i) => (
                  <tr key={i} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">{tx.txId}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3 min-w-[200px]">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex-shrink-0 flex items-center justify-center text-white text-xs font-bold">
                          {tx.user.split(' ').map(w => w[0]).join('')}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{tx.user}</p>
                          <p className="text-xs text-gray-400">{tx.userId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">{tx.conversion}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">{tx.fromAmount}</td>
                    <td className="px-6 py-4 text-sm font-bold text-emerald-600 whitespace-nowrap">{tx.toAmount}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">{tx.rate}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">{tx.fee}</td>
                    <td className="px-6 py-4 whitespace-nowrap"><StatusBadge status={tx.status} /></td>
                    <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">{tx.timestamp}</td>
                    <td className="px-6 py-4 whitespace-nowrap"><RiskBadge risk={tx.risk} /></td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleViewTransaction(tx, 'conversion')}
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
      );
    }

    if (selectedType === 'all') {
      return (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {['Txn. ID', 'Client Name', 'Type', 'Amount', 'Channel / Asset', 'State', 'Fees', 'Status', 'Date/time', 'Risk', 'Actions'].map((h) => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {allTransactions.map((tx, i) => (
                  <tr key={i} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">{tx.txId}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3 min-w-[200px]">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex-shrink-0 flex items-center justify-center text-white text-xs font-bold">
                          {tx.clientName.split(' ').map(w => w[0]).join('')}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{tx.clientName}</p>
                          <p className="text-xs text-gray-400">{tx.clientId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap capitalize">{tx.type.replace('-', ' ')}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">{tx.amount}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">{tx.channelAsset}</td>
                    <td className="px-6 py-4 text-sm text-blue-600 whitespace-nowrap">{tx.state}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">{tx.fees}</td>
                    <td className="px-6 py-4 whitespace-nowrap"><StatusBadge status={tx.status} /></td>
                    <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">{tx.dateTime}</td>
                    <td className="px-6 py-4 whitespace-nowrap"><RiskBadge risk={tx.risk} /></td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleViewTransaction(tx, 'all')}
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
      );
    }

    if (selectedType === 'crypto-cash') {
      return (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {['Txn. ID', 'Client Name', 'Asset', 'Amount', 'Confirmations', 'Rate Lock', 'Status', 'Payout', 'Action'].map((h) => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {cryptoTransactions.map((tx, i) => (
                  <tr key={i} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">{tx.txId}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3 min-w-[200px]">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex-shrink-0 flex items-center justify-center text-white text-xs font-bold">
                          {tx.clientName.split(' ').map(w => w[0]).join('')}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{tx.clientName}</p>
                          <p className="text-xs text-gray-400">{tx.clientId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">{tx.asset}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">{tx.amount}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">{tx.confirmations}</td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{tx.rateLock}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap"><StatusBadge status={tx.status} /></td>
                    <td className="px-6 py-4 text-sm text-gray-600">{tx.payout}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleViewTransaction(tx, 'crypto-cash')}
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
      );
    }

    if (selectedType === 'giftcard-cash') {
      return (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {['Txn. ID', 'Client Name', 'Card Type', 'Card Value', 'Verification', 'Rate', 'Status', 'Payout', 'Action'].map((h) => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {giftCardTransactions.map((tx, i) => (
                  <tr key={i} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">{tx.txId}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3 min-w-[200px]">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex-shrink-0 flex items-center justify-center text-white text-xs font-bold">
                          {tx.clientName.split(' ').map(w => w[0]).join('')}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{tx.clientName}</p>
                          <p className="text-xs text-gray-400">{tx.clientId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">{tx.cardType}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">{tx.cardValue}</td>
                    <td className="px-6 py-4 whitespace-nowrap"><VerificationBadge verification={tx.verification} /></td>
                    <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">{tx.rate}</td>
                    <td className="px-6 py-4 whitespace-nowrap"><StatusBadge status={tx.status} /></td>
                    <td className="px-6 py-4 text-sm text-gray-600">{tx.payout}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleViewTransaction(tx, 'giftcard-cash')}
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
      );
    }

    if (selectedType === 'payment-china') {
      return (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {['Txn. ID', 'User', 'Amount', 'Receiver', 'Rate', 'Fee', 'Status', 'Timestamp', 'Risk', 'Actions'].map((h) => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paymentChinaTransactions.map((tx, i) => (
                  <tr key={i} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">{tx.txId}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3 min-w-[200px]">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex-shrink-0 flex items-center justify-center text-white text-xs font-bold">
                          {tx.user.split(' ').map(w => w[0]).join('')}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{tx.user}</p>
                          <p className="text-xs text-gray-400">{tx.userId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-gray-900 whitespace-nowrap">{tx.amount}</td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{tx.receiver}</p>
                        <p className="text-xs text-gray-400">{tx.receiverAccount}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">{tx.rate}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">{tx.fee}</td>
                    <td className="px-6 py-4 whitespace-nowrap"><StatusBadge status={tx.status} /></td>
                    <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">{tx.timestamp}</td>
                    <td className="px-6 py-4 whitespace-nowrap"><RiskBadge risk={tx.risk} /></td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleViewTransaction(tx, 'payment-china')}
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
      );
    }
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
                <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
                <p className="text-sm text-gray-500 mt-0.5">Comprehensive wallet transactions for all users</p>
              </div>

              {/* Notifications + admin avatar */}
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
            <div className="flex items-center gap-8 border-b border-gray-200 -mb-px">
              <button
                onClick={() => setActiveTab('overview')}
                className={`pb-3 text-sm font-semibold transition-colors relative ${
                  activeTab === 'overview'
                    ? 'text-emerald-600 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-emerald-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('conversions')}
                className={`pb-3 text-sm font-semibold transition-colors relative ${
                  activeTab === 'conversions'
                    ? 'text-emerald-600 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-emerald-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Conversions
              </button>
            </div>
          </div>

          {/* Page Content */}
          <div className="p-8">
            {activeTab === 'overview' && (
              <>
                {/* Search and filters */}
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
                      placeholder="Search by name, wallet ID or transaction ID..."
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value as TransactionType)}
                    className="px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    <option value="all">All Products</option>
                    <option value="crypto-cash">Crypto → Cash</option>
                    <option value="giftcard-cash">Gift Card → Cash</option>
                    <option value="payment-china">Payment to China</option>
                  </select>

                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    <option>All Status</option>
                    <option>Completed</option>
                    <option>Processing</option>
                    <option>On Going</option>
                  </select>

                  <input
                    type="text"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    placeholder="mm/dd/yyyy"
                    className="px-4 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  />

                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                  </svg>

                  <select
                    value={riskFilter}
                    onChange={(e) => setRiskFilter(e.target.value)}
                    className="px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    <option>Risk Flag</option>
                    <option>None</option>
                    <option>High</option>
                  </select>
                </div>

                {/* Category title for filtered views */}
                {selectedType !== 'all' && (
                  <div className="mb-6">
                    <h2 className="text-xl font-bold text-gray-900">
                      {selectedType === 'crypto-cash' && 'Crypto → Cash'}
                      {selectedType === 'giftcard-cash' && 'Gift Card → Cash'}
                      {selectedType === 'payment-china' && 'Payment to China'}
                    </h2>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {selectedType === 'crypto-cash' && 'Admin view for monitoring crypto deposits and cash payouts.'}
                      {selectedType === 'giftcard-cash' && 'Admin view for monitoring Gift card deposits and cash payouts.'}
                      {selectedType === 'payment-china' && 'Admin view for monitoring YAN deposits and cash payouts.'}
                    </p>
                  </div>
                )}

                {renderStatCards()}
                {renderTable()}
              </>
            )}

            {activeTab === 'conversions' && (
              <>
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-gray-900">Inter-Wallet Conversions</h2>
                  <p className="text-sm text-gray-500 mt-0.5">Track all wallet-to-wallet currency conversions</p>
                </div>

                {/* Search and filters */}
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
                      placeholder="Search by name, wallet ID or transaction ID..."
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    <option>All Status</option>
                    <option>Completed</option>
                  </select>

                  <input
                    type="text"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    placeholder="mm/dd/yyyy"
                    className="px-4 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  />

                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                  </svg>

                  <button className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-500 text-white rounded-xl text-sm font-semibold hover:bg-emerald-600 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                    Export
                  </button>
                </div>

                {renderStatCards()}
                {renderTable()}
              </>
            )}

            {/* Pagination */}
            <div className="mt-6 flex items-center justify-between">
              <p className="text-sm text-gray-500">Showing 1 to 10 of 500 results</p>
              <div className="flex items-center gap-1">
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
            </div>
          </div>
        </div>
      </main>

      {/* Transaction Detail Modal */}
      <TransactionModal
        isOpen={!!selectedTransaction}
        onClose={() => setSelectedTransaction(null)}
        transaction={selectedTransaction}
        type={modalType}
      />
    </div>
  );
}