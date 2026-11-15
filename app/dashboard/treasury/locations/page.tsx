'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import DashboardHeader from '@/components/DashboardHeader';
import { record, rows, Row, treasuryRequest } from '@/lib/api/treasury';

const input = 'w-full rounded-lg border border-gray-200 p-3';
const button = 'rounded-xl bg-[#004D43] px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-40';
const hints: Record<string, string> = {
  provider: 'NGN uses internal because the FX pool represents ChangPay combined liquidity. USD uses Bridge because the settlement asset is held in a Bridge company wallet.',
  provider_reference: 'Use the stable internal pool reference for NGN. For USD, enter the approved Bridge wallet ID.',
  kind: 'Use company bank for fiat settlement. Use custody for a Bridge wallet. Use prefunded only for an approved prefunding wallet.',
  ownership: 'Use pooled for shared internal fiat liquidity. Use company for a single company-owned custody wallet.',
  asset: 'NGN is the fiat ledger asset. USD treasury settlement is represented by USDC or USDT, depending on the approved Bridge wallet.',
  scale: 'NGN uses 2 decimal places. Bridge stablecoins use 6 decimal places.',
  chain: 'Fiat currencies have no blockchain chain. Select the Bridge network for USD stablecoin settlement.',
  evidence: 'Describe the approval, account, wallet, or statement that supports this location.',
};

function FieldHint({ field }: { field: string }) {
  return <span className="mt-1 block text-xs text-gray-500" title={hints[field]}>ⓘ {hints[field]}</span>;
}

export default function TreasuryLocationsPage() {
  const [locations, setLocations] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [bridgeCustomerId, setBridgeCustomerId] = useState('');
  const [bridgeBusy, setBridgeBusy] = useState<number | null>(null);
  const [form, setForm] = useState<Record<string, string>>({
    currency: 'NGN',
    provider: 'internal',
    provider_reference: 'changpay-ngn-central-pool',
    kind: 'company_bank',
    ownership: 'pooled',
    asset: 'NGN',
    scale: '2',
    chain: '',
    evidence: 'Approved ChangPay central NGN settlement pool',
  });

  function applyCurrency(currency: string) {
    const isUsd = currency === 'USD';
    const isYuan = currency === 'YUAN';
    setForm((current) => ({
      ...current,
      currency,
      ...(isUsd
        ? {
            provider: 'bridge',
            provider_reference: '',
            kind: 'custody',
            ownership: 'company',
            asset: 'USDC',
            scale: '6',
            chain: 'base',
            evidence: 'Approved ChangPay company Bridge treasury wallet',
          }
        : isYuan ? {
            provider: 'internal',
            provider_reference: 'changpay-yuan-central-pool',
            kind: 'company_bank',
            ownership: 'pooled',
            asset: 'CNY',
            scale: '2',
            chain: '',
            evidence: 'Approved ChangPay central YUAN settlement pool',
          } : {
            provider: 'internal',
            provider_reference: 'changpay-ngn-central-pool',
            kind: 'company_bank',
            ownership: 'pooled',
            asset: 'NGN',
            scale: '2',
            chain: '',
            evidence: 'Approved ChangPay central NGN settlement pool',
          }),
    }));
  }

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = record(await treasuryRequest('treasury/locations'));
      setLocations(rows(response.data ?? response));
    } catch (cause) {
      setError(String(cause));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function update(key: string, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const payload: Row = {
        ...form,
        scale: Number(form.scale),
      };
      delete payload.currency;
      if (!form.chain) delete payload.chain;
      const result = record(await treasuryRequest('treasury/locations', 'POST', payload));
      setNotice(`Location ${String(result.id ?? '')} registered successfully.`);
      await load();
    } catch (cause) {
      setError(String(cause));
    } finally {
      setBusy(false);
    }
  }

  async function toggle(location: Row) {
    const id = Number(location.id);
    const enabled = String(location.status) === 'disabled';
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await treasuryRequest(`treasury/locations/${id}`, 'PATCH', { enabled });
      setNotice(`Location ${id} ${enabled ? 'enabled' : 'disabled'}.`);
      await load();
    } catch (cause) {
      setError(String(cause));
    } finally {
      setBusy(false);
    }
  }

  async function remove(location: Row) {
    const id = Number(location.id);
    if (!window.confirm(`Delete treasury location ${id}? Locations with financial history can only be disabled.`)) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await treasuryRequest(`treasury/locations/${id}`, 'DELETE');
      setNotice(`Location ${id} deleted.`);
      await load();
    } catch (cause) {
      setError(String(cause));
    } finally {
      setBusy(false);
    }
  }

  async function registerBridge(location: Row) {
    const id = Number(location.id);
    if (!bridgeCustomerId.trim()) {
      setError('Enter the Bridge company customer ID first.');
      return;
    }
    setBridgeBusy(id);
    setError('');
    setNotice('');
    try {
      await treasuryRequest(`treasury/bridge/locations/${id}/register`, 'POST', { customer_id: bridgeCustomerId.trim() });
      setNotice(`Bridge company wallet registration completed for location ${id}.`);
      await load();
    } catch (cause) {
      setError(String(cause));
    } finally {
      setBridgeBusy(null);
    }
  }

  return (
    <div className="h-screen min-h-0 bg-[#F6F9F8] flex">
      <div className="hidden shrink-0 md:flex"><Sidebar /></div>
      <main className="h-screen min-h-0 min-w-0 flex-1 overflow-y-auto p-4 lg:p-8">
        <DashboardHeader title="Treasury locations" />
        <div className="mx-auto max-w-7xl space-y-6">
          <header>
            <h1 className="text-3xl font-semibold text-[#004D43]">Treasury locations</h1>
            <p className="text-gray-600">Register company, provider, custody, and deposit-route locations before configuring pools.</p>
          </header>

          {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">{error}</p>}
          {notice && <p role="status" className="rounded-xl bg-green-50 p-4 text-green-800">{notice}</p>}

          <section className="rounded-2xl border bg-white p-5">
            <h2 className="mb-1 text-xl font-semibold text-[#004D43]">Register a location</h2>
            <p className="mb-5 text-sm text-gray-600">Select a currency to load the recommended treasury setup. Review each field before saving, especially the external wallet or account reference.</p>
            <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
              <label>Currency<select className={input} value={form.currency} onChange={(event) => applyCurrency(event.target.value)}><option value="NGN">NGN: internal pooled liquidity</option><option value="YUAN">YUAN: internal pooled liquidity, CNY asset</option><option value="USD">USD: Bridge company custody</option></select><span className="mt-1 block text-xs text-gray-500" title="USD uses an approved Bridge company wallet. NGN and YUAN use ChangPay central internal pools.">ⓘ Switch currency to load the recommended setup.</span></label>
              <label>Provider<input className={input} required value={form.provider} onChange={(event) => update('provider', event.target.value)} /><FieldHint field="provider" /></label>
              <label>Provider or internal reference<input className={input} required placeholder={form.currency === 'USD' ? 'Approved Bridge wallet ID' : 'changpay-ngn-central-pool'} value={form.provider_reference} onChange={(event) => update('provider_reference', event.target.value)} /><FieldHint field="provider_reference" /></label>
              <label>Location kind<select className={input} value={form.kind} onChange={(event) => update('kind', event.target.value)}><option value="custody">Custody</option><option value="prefunded">Prefunded</option><option value="company_bank">Company bank</option><option value="deposit_route">Deposit route</option></select><FieldHint field="kind" /></label>
              <label>Ownership<select className={input} value={form.ownership} onChange={(event) => update('ownership', event.target.value)}><option value="company">Company</option><option value="pooled">Pooled</option><option value="customer">Customer</option><option value="unknown">Unknown</option></select><FieldHint field="ownership" /></label>
              <label>Asset / currency<input className={input} required value={form.asset} onChange={(event) => update('asset', event.target.value.toUpperCase())} /><FieldHint field="asset" /></label>
              <label>Asset scale<input className={input} required min="0" max="8" type="number" value={form.scale} onChange={(event) => update('scale', event.target.value)} /><FieldHint field="scale" /></label>
              <label>Chain, if applicable<select className={input} value={form.chain} onChange={(event) => update('chain', event.target.value)}><option value="">No blockchain chain</option><option value="base">Base</option><option value="ethereum">Ethereum</option><option value="polygon">Polygon</option><option value="solana">Solana</option><option value="tron">Tron</option><option value="tempo">Tempo</option><option value="stellar">Stellar</option></select><FieldHint field="chain" /></label>
              <label className="md:col-span-2">Evidence<textarea className={input} required rows={3} value={form.evidence} onChange={(event) => update('evidence', event.target.value)} /><FieldHint field="evidence" /></label>
              <button className={button} disabled={busy} type="submit">{busy ? 'Registering…' : 'Register location'}</button>
            </form>
          </section>

          <section className="overflow-hidden rounded-2xl border bg-white">
            <div className="flex items-center justify-between border-b p-5"><h2 className="text-xl font-semibold text-[#004D43]">Registered locations</h2><button className="underline" disabled={loading} onClick={() => void load()}>Refresh</button></div>
            {loading ? <p className="p-5">Loading locations…</p> : locations.length === 0 ? <p className="p-5 text-gray-600">No treasury locations registered.</p> : <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead><tr className="border-b bg-gray-50">{['id','provider','provider_reference','kind','ownership','asset','chain','scale','status','actions'].map((heading) => <th className="whitespace-nowrap p-3" key={heading}>{heading.replaceAll('_', ' ')}</th>)}</tr></thead><tbody>{locations.map((location, index) => { const id = Number(location.id); const isBridge = String(location.provider).toLowerCase() === 'bridge'; const isDisabled = String(location.status) === 'disabled'; return <tr className="border-b align-top last:border-0" key={String(location.id ?? index)}>{['id','provider','provider_reference','kind','ownership','asset','chain','scale','status'].map((field) => <td className="whitespace-nowrap p-3" key={field}>{String(location[field] ?? 'Not provided')}</td>)}<td className="min-w-72 p-3"><div className="flex flex-wrap gap-2"><button className="rounded-lg border px-3 py-1.5" disabled={busy} onClick={() => void toggle(location)}>{isDisabled ? 'Enable' : 'Disable'}</button><button className="rounded-lg border border-red-200 px-3 py-1.5 text-red-700" disabled={busy} onClick={() => void remove(location)}>Delete</button>{isBridge && <button className="rounded-lg bg-[#004D43] px-3 py-1.5 text-white disabled:opacity-40" disabled={bridgeBusy === id || busy} onClick={() => void registerBridge(location)}>{bridgeBusy === id ? 'Registering…' : 'Register Bridge company'}</button>}</div></td></tr>; })}</tbody></table></div>}
          </section>

          <section className="rounded-2xl border bg-white p-5">
            <h2 className="text-xl font-semibold text-[#004D43]">Bridge company registration</h2>
            <p className="mt-1 text-sm text-gray-600">Enter the Bridge company customer ID, then use “Register Bridge company” beside the approved Bridge custody location. The existing wallet mapping is immutable and will not be relabelled.</p>
            <input className={`${input} mt-4 max-w-xl`} placeholder="Bridge company customer ID" value={bridgeCustomerId} onChange={(event) => setBridgeCustomerId(event.target.value)} />
          </section>
        </div>
      </main>
    </div>
  );
}
