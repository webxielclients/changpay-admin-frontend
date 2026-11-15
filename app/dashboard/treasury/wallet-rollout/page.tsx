'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import DashboardHeader from '@/components/DashboardHeader';
import { display, record, rows, Row, treasuryRequest } from '@/lib/api/treasury';

const button = 'rounded-xl bg-[#004D43] px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-40';
const outline = 'rounded-xl border border-gray-300 px-4 py-2 disabled:cursor-not-allowed disabled:opacity-40';

export default function TreasuryWalletRolloutPage() {
  const [wallets, setWallets] = useState<Row[]>([]);
  const [summary, setSummary] = useState<Row>({});
  const [selected, setSelected] = useState<number[]>([]);
  const [currency, setCurrency] = useState('');
  const [search, setSearch] = useState('');
  const [evidence, setEvidence] = useState('Reviewed FX rollout eligibility');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [outcome, setOutcome] = useState<Row | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = record(await treasuryRequest(`treasury/operations/wallet-rollout?${new URLSearchParams({ ...(currency ? { currency } : {}), ...(search ? { search } : {}) }).toString()}`));
      setWallets(rows(data.wallets));
      setSummary(record(data.summary));
      setSelected([]);
    } catch (cause) {
      setError(String(cause));
    } finally {
      setLoading(false);
    }
  }, [currency, search]);

  useEffect(() => { void load(); }, [load]);

  const isEligible = (wallet: Row): boolean => wallet.eligible === true || wallet.eligible === 1 || wallet.eligible === '1' || wallet.eligible === 'true';
  const eligible = useMemo(() => wallets.filter(isEligible).map((wallet) => Number(wallet.wallet_id)).filter((id) => Number.isInteger(id) && id > 0), [wallets]);

  function saveOutcome(result: Row) {
    const enrollment = record(result.enrollment);
    const reconciliation = rows(result.reconciliation)
      .filter((item) => item.state === 'pending_reconciliation')
      .map((item) => ({ ...item, state: 'failed', reason: `reconciliation: ${display(item.reason)}` }));
    setOutcome({
      ...enrollment,
      results: [...rows(enrollment.results), ...reconciliation],
    });
    return enrollment;
  }

  function toggle(id: number) {
    setSelected((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
  }

  async function enroll() {
    if (!selected.length) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const result = record(await treasuryRequest('treasury/operations/wallet-rollout/enroll', 'POST', { wallet_ids: selected, evidence, sync: true }));
      const enrollment = saveOutcome(result);
      setNotice(`Enrollment processed: ${display(enrollment.enrolled ?? 0)} enrolled, ${display(enrollment.skipped ?? 0)} skipped, ${display(enrollment.failed ?? 0)} failed.`);
      await load();
    } catch (cause) { setError(String(cause)); } finally { setBusy(false); }
  }

  async function autoEnroll() {
    setBusy(true); setError(''); setNotice('');
    try {
      if (selected.length) {
        const result = record(await treasuryRequest('treasury/operations/wallet-rollout/enroll', 'POST', { wallet_ids: selected, evidence, sync: true }));
        const enrollment = saveOutcome(result);
        setNotice(`Enrollment processed: ${display(enrollment.enrolled ?? 0)} enrolled, ${display(enrollment.skipped ?? 0)} skipped, ${display(enrollment.failed ?? 0)} failed.`);
      } else {
        const result = record(await treasuryRequest('treasury/operations/wallet-rollout/auto-enroll', 'POST', { evidence, sync: true }));
        const enrollment = saveOutcome(result);
        setNotice(`Enrollment processed: ${display(enrollment.enrolled ?? 0)} enrolled, ${display(enrollment.skipped ?? 0)} skipped, ${display(enrollment.failed ?? 0)} failed.`);
      }
      await load();
    } catch (cause) { setError(String(cause)); } finally { setBusy(false); }
  }

  return <div className="flex h-screen min-h-0 bg-[#F6F9F8]">
    <div className="hidden shrink-0 md:flex"><Sidebar /></div>
    <main className="h-screen min-h-0 min-w-0 flex-1 overflow-y-auto p-4 lg:p-8">
      <DashboardHeader title="FX wallet rollout" />
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div><h1 className="text-3xl font-semibold text-[#004D43]">FX wallet rollout</h1><p className="text-gray-600">Review eligible wallets for all six conversion directions and enroll them without duplicate records.</p></div>
          <button className={outline} disabled={loading || busy} onClick={() => void load()}>Refresh</button>
        </header>
        {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">{error}</p>}
        {notice && <p role="status" className="rounded-xl bg-green-50 p-4 text-green-800">{notice}</p>}
        {outcome && Array.isArray(outcome.results) && outcome.results.some((item: Row) => item.state === 'failed' || item.state === 'blocked') && <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"><h2 className="font-semibold">Enrollment details</h2><p className="mt-1">Some wallets were not enrolled. Resolve the listed blocker and retry.</p><ul className="mt-3 space-y-2">{(outcome.results as Row[]).filter((item) => item.state === 'failed' || item.state === 'blocked').map((item, index) => <li key={`${display(item.wallet_id)}-${index}`}><span className="font-medium">Wallet {display(item.wallet_id)}:</span> {display(item.reason ?? (Array.isArray(item.blockers) ? item.blockers.join(', ') : item.state))}</li>)}</ul></section>}
        <section className="grid gap-4 sm:grid-cols-4">
          {['total', 'eligible', 'enrolled', 'blocked'].map((key) => <div className="rounded-2xl border bg-white p-5" key={key}><p className="text-sm capitalize text-gray-500">{key}</p><p className="mt-2 text-3xl font-semibold text-[#004D43]">{display(summary[key] ?? 0)}</p></div>)}
        </section>
        <section className="rounded-2xl border bg-white p-5">
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex-1">Search<input className="mt-1 w-full rounded-lg border p-3" placeholder="Wallet ID, UID, or email" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
            <label>Currency<select className="mt-1 rounded-lg border p-3" value={currency} onChange={(event) => setCurrency(event.target.value)}><option value="">All</option><option value="NGN">NGN</option><option value="USD">USD</option><option value="YUAN">YUAN</option></select></label>
          </div>
          <label className="mt-4 block">Enrollment evidence<textarea className="mt-1 w-full rounded-lg border p-3" rows={2} value={evidence} onChange={(event) => setEvidence(event.target.value)} /></label>
          <div className="mt-4 flex flex-wrap gap-3"><button className={outline} disabled={busy || !eligible.length} onClick={() => setSelected(eligible)}>Select all eligible ({eligible.length})</button><button className={button} disabled={busy || !selected.length} onClick={() => void enroll()}>Enroll selected ({selected.length})</button><button className={button} disabled={busy || (!selected.length && !eligible.length)} onClick={() => void autoEnroll()}>{selected.length ? `Queue selected (${selected.length})` : 'Queue all eligible'}</button></div>
        </section>
        <section className="overflow-hidden rounded-2xl border bg-white">
          {loading ? <p className="p-5">Loading wallet eligibility…</p> : wallets.length === 0 ? <p className="p-5 text-gray-600">No FX wallets found.</p> : <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="bg-gray-50"><tr>{['select','wallet','user','currency','available','state','blockers','directions'].map((heading) => <th className="whitespace-nowrap p-3" key={heading}>{heading}</th>)}</tr></thead><tbody>{wallets.map((wallet) => { const id = Number(wallet.wallet_id); const enrolled = wallet.enrolled === true || wallet.enrolled === 1 || wallet.enrolled === '1' || wallet.enrolled === 'true'; const walletEligible = isEligible(wallet); return <tr className="border-b align-top last:border-0" key={id}><td className="p-3"><input type="checkbox" checked={selected.includes(id)} disabled={enrolled || !walletEligible || busy} onChange={() => toggle(id)} /></td><td className="whitespace-nowrap p-3">{id}<div className="text-xs text-gray-500">{display(wallet.uid)}</div></td><td className="whitespace-nowrap p-3">{display(wallet.user_id)}</td><td className="p-3">{display(wallet.currency)}</td><td className="whitespace-nowrap p-3">{display(wallet.available_balance)}</td><td className="p-3"><span className={enrolled ? 'text-green-700' : walletEligible ? 'text-blue-700' : 'text-amber-700'}>{display(wallet.state)}</span></td><td className="max-w-xs p-3 text-amber-800">{wallet.blockers && Array.isArray(wallet.blockers) ? wallet.blockers.join(', ') : 'None'}</td><td className="min-w-48 p-3">{Array.isArray(wallet.directions) ? wallet.directions.join(', ') : 'None'}</td></tr>; })}</tbody></table></div>}
        </section>
      </div>
    </main>
  </div>;
}
