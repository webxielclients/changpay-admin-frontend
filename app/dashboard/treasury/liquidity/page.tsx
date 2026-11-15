'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import DashboardHeader from '@/components/DashboardHeader';
import { display, record, rows, Row, treasuryRequest } from '@/lib/api/treasury';

const input = 'mt-1 w-full rounded-lg border border-gray-200 p-3';
const button = 'rounded-xl bg-[#004D43] px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-40';
const outline = 'rounded-xl border border-gray-300 px-4 py-2 disabled:cursor-not-allowed disabled:opacity-40';

type Pool = Row & { currency?: string; location_id?: number; balance_mode?: string; enabled?: boolean };

const defaults: Record<string, Record<string, string>> = {
  NGN: {
    observation_reference: 'ngn-central-pool-review-',
    observation_evidence: 'Verified ChangPay central NGN FX pool balance',
    funding_reference: 'ngn-fx-liquidity-',
    funding_evidence: 'Verified unallocated ChangPay NGN liquidity for FX settlement',
  },
  YUAN: {
    observation_reference: 'yuan-central-pool-review-',
    observation_evidence: 'Verified ChangPay central YUAN FX pool balance',
    funding_reference: 'yuan-fx-liquidity-',
    funding_evidence: 'Verified unallocated ChangPay YUAN liquidity for FX settlement',
  },
};

export default function TreasuryLiquidityPage() {
  const router = useRouter();
  const [currency, setCurrency] = useState('NGN');
  const [form, setForm] = useState<Record<string, string>>({ ...defaults.NGN, observed_amount: '', funding_amount: '' });
  const [pools, setPools] = useState<Pool[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = record(await treasuryRequest('treasury/operations/lists/pools'));
      setPools(rows(response.data ?? response) as Pool[]);
    } catch (cause) {
      setError(String(cause));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const pool = useMemo(() => pools.find((item) => String(item.currency) === currency), [currency, pools]);

  function changeCurrency(value: string) {
    setCurrency(value);
    setForm((current) => ({ ...current, ...defaults[value], observed_amount: '', funding_amount: '' }));
  }

  function update(key: string, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await treasuryRequest('treasury/operations/pools/internal/replenish', 'POST', { currency, ...form });
      setNotice(`${currency} internal FX liquidity was recorded and replenished. The location was re-enabled after the reviewed observation was saved.`);
      setForm((current) => ({ ...current, observed_amount: '', funding_amount: '' }));
      await load();
    } catch (cause) {
      setError(String(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-screen min-h-0 bg-[#F6F9F8]">
      <div className="hidden shrink-0 md:flex"><Sidebar /></div>
      <main className="h-screen min-h-0 min-w-0 flex-1 overflow-y-auto p-4 lg:p-8">
        <DashboardHeader title="Internal FX liquidity" />
        <div className="mx-auto max-w-7xl space-y-6">
          <header className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold text-[#004D43]">Internal FX liquidity</h1>
              <p className="text-gray-600">Record reviewed ChangPay central-pool balances for NGN and YUAN FX execution.</p>
            </div>
            <button className={outline} onClick={() => router.push('/dashboard/treasury')}>Back to Treasury</button>
          </header>

          {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">{error}</p>}
          {notice && <p role="status" className="rounded-xl bg-green-50 p-4 text-green-800">{notice}</p>}

          <section className="grid gap-4 md:grid-cols-2">
            {['NGN', 'YUAN'].map((item) => {
              const current = pools.find((value) => String(value.currency) === item);
              return <article className="rounded-2xl border bg-white p-5" key={item}>
                <h2 className="text-xl font-semibold text-[#004D43]">{item} internal pool</h2>
                <p className="mt-2 text-sm text-gray-600">Location: {display(current?.location_id ?? 'Not configured')}</p>
                <p className="text-sm text-gray-600">Mode: {display(current?.balance_mode ?? 'Not configured')}</p>
                <p className="text-sm text-gray-600">Enabled: {current?.enabled === true ? 'Yes' : 'No'}</p>
              </article>;
            })}
          </section>

          <section className="rounded-2xl border bg-white p-5">
            <h2 className="text-xl font-semibold text-[#004D43]">Replenish internal pool</h2>
            <p className="mt-1 max-w-3xl text-sm text-gray-600">Observed total is the actual reviewed balance in the ChangPay central pool. Funding amount is only the currently unallocated company liquidity. Do not enter provider withdrawal balances here.</p>
            <form onSubmit={submit} className="mt-5 grid gap-4 md:grid-cols-2">
              <label>Currency<select className={input} value={currency} onChange={(event) => changeCurrency(event.target.value)}><option value="NGN">NGN</option><option value="YUAN">YUAN</option></select></label>
              <label>Configured location<input className={input} value={String(pool?.location_id ?? 'Not configured')} readOnly /></label>
              <label>Observed total balance<input className={input} required placeholder={currency === 'NGN' ? '1000000.00' : '100000.00'} value={form.observed_amount} onChange={(event) => update('observed_amount', event.target.value)} /><span className="mt-1 block text-xs text-gray-500">Fresh reviewed balance in {currency}.</span></label>
              <label>Unallocated funding amount<input className={input} required placeholder="0.00" value={form.funding_amount} onChange={(event) => update('funding_amount', event.target.value)} /><span className="mt-1 block text-xs text-gray-500">The amount not already covering customer and company liabilities.</span></label>
              <label>Observation reference<input className={input} required value={form.observation_reference} onChange={(event) => update('observation_reference', event.target.value)} /></label>
              <label>Funding reference<input className={input} required value={form.funding_reference} onChange={(event) => update('funding_reference', event.target.value)} /></label>
              <label>Observation evidence<textarea className={input} required rows={3} value={form.observation_evidence} onChange={(event) => update('observation_evidence', event.target.value)} /></label>
              <label>Funding evidence<textarea className={input} required rows={3} value={form.funding_evidence} onChange={(event) => update('funding_evidence', event.target.value)} /></label>
              <div className="flex flex-wrap gap-3 md:col-span-2"><button className={button} disabled={busy || loading}>{busy ? 'Saving…' : `Save ${currency} liquidity`}</button><button type="button" className={outline} onClick={() => router.push('/dashboard/treasury/locations')}>Manage locations</button><button type="button" className={outline} onClick={() => router.push('/dashboard/treasury/wallet-rollout')}>FX wallet rollout</button></div>
            </form>
          </section>
        </div>
      </main>
    </div>
  );
}
