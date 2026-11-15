'use client';

import { use, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { usersApi, UserTransactionItem } from '@/lib/api/client';
import Sidebar from '@/components/Sidebar';
import { formatStatusLabel } from '@/lib/formatters/status';

export default function UserTransactionsPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = use(params);
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [rows, setRows] = useState<UserTransactionItem[]>([]);
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await usersApi.getTransactions(userId, {
        ...(type ? { type: type as 'deposit' | 'withdrawal' | 'transfer' | 'conversion' } : {}),
        ...(status ? { status } : {}),
        per_page: 100,
        page: 1,
      });
      setRows(response.data.data ?? []);
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  }, [userId, type, status]);

  useEffect(() => { if (isAuthenticated) void load(); }, [isAuthenticated, load]);

  if (!isAuthenticated) return null;

  return (
    <div className="flex h-screen bg-white">
      <Sidebar />
      <main className="min-w-0 flex-1 overflow-y-auto p-6 lg:p-8">
        <button className="mb-5 text-sm font-semibold text-emerald-700" onClick={() => router.push(`/dashboard/users/${userId}`)}>← Back to user</button>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div><h1 className="text-2xl font-bold text-gray-900">All transaction history</h1><p className="text-sm text-gray-500">Deposits, withdrawals, transfers, conversions, and other wallet activity.</p></div>
          <div className="flex gap-2">
            <select value={type} onChange={(event) => setType(event.target.value)} className="rounded-full border px-3 py-2 text-sm"><option value="">All types</option><option value="deposit">Deposits</option><option value="withdrawal">Withdrawals</option><option value="transfer">Internal transfers</option><option value="conversion">FX conversions</option></select>
            <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-full border px-3 py-2 text-sm"><option value="">All statuses</option><option value="pending">Pending</option><option value="processing">Processing</option><option value="completed">Completed</option><option value="failed">Failed</option></select>
          </div>
        </div>
        {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        <div className="overflow-x-auto rounded-xl border border-gray-200"><table className="w-full text-sm"><thead className="bg-gray-50"><tr>{['Reference', 'Type', 'Counterparty', 'Amount', 'Status', 'Date'].map((heading) => <th key={heading} className="px-4 py-3 text-left text-xs uppercase text-gray-500">{heading}</th>)}</tr></thead><tbody className="divide-y divide-gray-100">
          {loading ? <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400">Loading transactions…</td></tr> : rows.length === 0 ? <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400">No transactions found</td></tr> : rows.map((row) => <tr key={row.publicId ?? row.id}><td className="px-4 py-3 font-mono text-xs">{row.reference ?? row.publicId ?? row.id}</td><td className="px-4 py-3 capitalize">{row.type}</td><td className="px-4 py-3">{row.counterparty?.name ?? '—'}</td><td className="px-4 py-3">{row.currency} {row.amount}</td><td className="px-4 py-3">{formatStatusLabel(row.status)}</td><td className="px-4 py-3">{row.createdAt ?? row.created_at ?? '—'}</td></tr>)}
        </tbody></table></div>
      </main>
    </div>
  );
}
