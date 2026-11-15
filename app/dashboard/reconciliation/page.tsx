'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import DashboardHeader from '@/components/DashboardHeader';
import Sidebar from '@/components/Sidebar';
import { Button } from '@/components/ui/Button';
import { DataTable } from '@/components/ui/DataTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { Modal } from '@/components/ui/Modal';
import { Pagination } from '@/components/ui/Pagination';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ToastAction, errorMessage } from '@/components/ui/ToastAction';
import { adminReconciliationApi, type AdminReconciliationAuditEntry, type ReconciliationApplyPayload, type ReconciliationSection } from '@/lib/api/client';
import { frontendConfig } from '@/config/env';

type Row = Record<string, unknown>;
type Tab = { id: ReconciliationSection; label: string; description: string; flag?: keyof typeof frontendConfig; kind?: ReconciliationApplyPayload['action'] };

const tabs: Tab[] = [
  { id: 'all', label: 'Overview', description: 'A plain-language summary of records that need attention.' },
  { id: 'dva', label: 'DVA accounts', description: 'Personal bank accounts created for customers to receive local currency.', flag: 'reconciliationDvaEnabled', kind: 'dva' },
  { id: 'deposits', label: 'Bridge deposits', description: 'Crypto deposits and virtual-account deposits received through Bridge.', flag: 'reconciliationBridgeEnabled', kind: 'deposit' },
  { id: 'withdrawals', label: 'Bridge withdrawals', description: 'Customer withdrawals and Bridge settlement transfers.', flag: 'reconciliationBridgeEnabled', kind: 'operation' },
  { id: 'ngn_withdrawals', label: 'NGN withdrawals', description: 'Naira bank withdrawals waiting for provider confirmation.', flag: 'reconciliationNgnWithdrawalsEnabled', kind: 'ngn_withdrawal' },
  { id: 'yellowcard', label: 'Yellow Card sales', description: 'Sell-crypto payouts that need provider status confirmation.', flag: 'reconciliationYellowCardEnabled', kind: 'yellowcard' },
  { id: 'consolidation', label: 'Bridge settlement', description: 'Internal movement of customer funds into the approved settlement wallet.', flag: 'reconciliationBridgeEnabled', kind: 'operation' },
  { id: 'provisioning', label: 'Account readiness', description: 'Customer verification and Bridge wallet setup status.', kind: 'provisioning' },
  { id: 'queues', label: 'Jobs and webhooks', description: 'Background work and provider messages that were delayed or failed.', flag: 'reconciliationQueueRecoveryEnabled' },
  { id: 'deployment', label: 'Deployment checks', description: 'Configuration and operational checks required before release.', flag: 'reconciliationDeploymentCheckEnabled' },
];

const sectionOrder: ReconciliationSection[] = ['dva', 'deposits', 'withdrawals', 'ngn_withdrawals', 'yellowcard', 'consolidation', 'provisioning', 'queues'];
const statusLabels: Record<string, string> = { active: 'Ready', incomplete: 'Setup incomplete', pending: 'Waiting', processing: 'Being processed', settling: 'Being settled', review: 'Needs review', in_review: 'Provider review', funds_received: 'Funds received', payment_processed: 'Provider completed', completed: 'Completed', failed: 'Failed', unknown: 'Status unclear', received: 'Received', dispatched: 'Sent to processing' };
const scalar = (value: unknown): string => value == null || value === '' ? 'Not available' : typeof value === 'object' ? JSON.stringify(value) : String(value);
const title = (key: string): string => key.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
const displayStatus = (value: unknown): string => statusLabels[String(value ?? '').toLowerCase()] ?? scalar(value);

function rowsFor(data: Record<string, unknown>, section: ReconciliationSection | 'queues_data'): Row[] {
  if (section === 'queues') {
    const queueRows = rowsFor(data, 'queues_data');
    const webhookRows = Array.isArray(data.webhooks) ? data.webhooks.filter((row): row is Row => Boolean(row && typeof row === 'object')).map((row) => ({ ...row, _group: 'webhooks' })) : [];
    return [...queueRows, ...webhookRows];
  }
  if (section === 'queues_data') {
    const queueData = data.queues;
    if (!queueData || typeof queueData !== 'object') return [];
    return Object.entries(queueData as Record<string, unknown>).flatMap(([group, item]) => Array.isArray(item) ? item.filter((row): row is Row => Boolean(row && typeof row === 'object')).map((row) => ({ ...row, _group: group })) : []);
  }
  const value = data[section];
  if (Array.isArray(value)) return value.filter((row): row is Row => Boolean(row && typeof row === 'object'));
  if (!value || typeof value !== 'object') return [];
  return Object.entries(value as Record<string, unknown>).flatMap(([group, item]) => Array.isArray(item) ? item.filter((row): row is Row => Boolean(row && typeof row === 'object')).map((row) => ({ ...row, _group: group })) : [{ _group: group, value: item }]);
}

function recordName(row: Row): string {
  if (row.event_key) return 'Bridge deposit event';
  if (row.client_reference_id) return 'Settlement transfer';
  if (row.wallet_id) return `Wallet ${scalar(row.wallet_id)}`;
  if (row.transaction_id) return `Transaction ${scalar(row.transaction_id)}`;
  if (row.id) return `Record ${scalar(row.id)}`;
  return title(String(row._group ?? 'Operational record'));
}

function explanation(tab: Tab): string {
  if (tab.id === 'dva') return 'A DVA is the customer’s dedicated virtual bank account. Review this record when the provider created an account but ChangPay did not save it, or when account details disagree.';
  if (tab.id === 'deposits') return 'This is money received through a Bridge wallet or virtual account. A pending record means the deposit is recorded locally but has not yet been safely credited to the customer.';
  if (tab.id === 'withdrawals' || tab.id === 'consolidation') return 'This is a provider transfer used to move or pay out funds. Reconciliation checks the provider result before updating ChangPay’s ledger.';
  if (tab.id === 'ngn_withdrawals') return 'This is a Naira payout waiting for a bank provider response. Do not create a second payout while the status is unclear.';
  if (tab.id === 'yellowcard') return 'This is a crypto sale payout. Reconciliation checks Yellow Card before completing, failing, or safely retrying the local record.';
  if (tab.id === 'queues') return 'Jobs are background tasks. Webhooks are messages from providers. A failed item can be retried only after checking that the provider did not already complete it.';
  if (tab.id === 'provisioning') return 'Readiness shows whether customer verification and wallet setup are complete. It does not move money by itself.';
  return 'This check compares the current local configuration with the operational requirement.';
}

export default function ReconciliationPage() {
  const visibleTabs = useMemo(() => tabs.filter((tab) => !tab.flag || Boolean(frontendConfig[tab.flag])), []);
  const [active, setActive] = useState<Tab>(visibleTabs[0] ?? tabs[0]);
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [audit, setAudit] = useState<AdminReconciliationAuditEntry[]>([]);
  const [auditOpen, setAuditOpen] = useState(false);
  const [selected, setSelected] = useState<Row | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [provider, setProvider] = useState('all');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const load = useCallback(async (section: ReconciliationSection) => {
    setLoading(true); setError(null); setPage(1);
    try {
      const response = await adminReconciliationApi.preview(section);
      let nextData = response.data;
      if (section === 'queues') {
        const webhookResponse = await adminReconciliationApi.preview('webhooks');
        nextData = { ...nextData, webhooks: webhookResponse.data.webhooks ?? [] };
      }
      setData(nextData);
    } catch (e) { setError(errorMessage(e, 'Unable to load reconciliation information.')); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (frontendConfig.reconciliationEnabled) void load(active.id); }, [active.id, load]);

  const allRows = useMemo<Row[]>(() => {
    if (!data) return [];
    if (active.id === 'all') return sectionOrder.flatMap((section) => rowsFor(data, section).map((row) => ({ ...row, _section: section } as Row)));
    return rowsFor(data, active.id);
  }, [active.id, data]);
  const filteredRows = useMemo(() => allRows.filter((row) => {
    const text = JSON.stringify(row).toLowerCase();
    const matchesSearch = !search.trim() || text.includes(search.toLowerCase());
    const matchesProvider = provider === 'all' || String(row.provider ?? '').toLowerCase() === provider;
    const matchesStatus = status === 'all' || String(row.state ?? row.status ?? row.local_state ?? '').toLowerCase() === status;
    return matchesSearch && matchesProvider && matchesStatus;
  }), [allRows, provider, search, status]);
  const pageRows = filteredRows.slice((page - 1) * pageSize, page * pageSize);
  const counts = useMemo(() => Object.entries(data ?? {}).filter(([key]) => key !== 'deployment').map(([key, value]) => [key, Array.isArray(value) ? value.length : typeof value === 'object' && value ? Object.values(value as Record<string, unknown>).reduce((total: number, item: unknown): number => total + (Array.isArray(item) ? item.length : 1), 0) : Number(value) || 0] as const).filter(([, value]) => value > 0).slice(0, 5), [data]);

  const openAudit = async () => { try { setAudit((await adminReconciliationApi.audit()).data ?? []); setAuditOpen(true); } catch (e) { ToastAction.error(errorMessage(e, 'Unable to load reconciliation audit.')); } };
  const selectedAction = selected ? String(selected._action ?? selected.action ?? active.kind ?? '') : '';
  const canApply = Boolean(selected && selectedAction && ['pending', 'processing', 'settling', 'review', 'failed', 'unknown', 'incomplete', 'received', 'dispatched', 'in_review', 'payment_processed', 'funds_received'].includes(String(selected.state ?? selected.status ?? selected.local_state ?? selected.provider_state ?? '').toLowerCase()) && !String(selected.recommended_action ?? '').toLowerCase().startsWith('no action required'));
  const apply = async () => {
    if (!selected || !selectedAction || !reason.trim()) { ToastAction.error('Enter a reason before applying a reconciliation action.'); return; }
    const payload: ReconciliationApplyPayload = { action: selectedAction as ReconciliationApplyPayload['action'], id: Number(selectedAction === 'operation' ? selected.operation_id ?? selected.id : selected.id ?? selected.transaction_id ?? 0) || undefined, wallet_id: Number(selected.wallet_id ?? 0) || undefined, reason: reason.trim() };
    if (selectedAction === 'dva') payload.provider = String(selected.provider ?? 'palmpay') as ReconciliationApplyPayload['provider'];
    setBusy(true);
    try { await adminReconciliationApi.apply(payload); ToastAction.success('The reconciliation action was applied and audited.'); setSelected(null); setReason(''); await load(active.id); }
    catch (e) { ToastAction.error(errorMessage(e, 'Unable to apply reconciliation action.')); }
    finally { setBusy(false); }
  };

  if (!frontendConfig.reconciliationEnabled) return <div className="admin-page flex h-screen"><Sidebar /><main className="flex flex-1 items-center justify-center p-8"><EmptyState title="Reconciliation is disabled" description="Enable the reconciliation feature flag to show this workspace." /></main></div>;

  return <div className="admin-page flex h-screen"><Sidebar /><div className="flex min-w-0 flex-1 flex-col overflow-hidden"><header className="flex-shrink-0 border-b border-gray-200 bg-white px-6 py-5 lg:px-8"><DashboardHeader title="Reconciliation" subtitle="Review customer money movement and provider exceptions in plain language." actions={<Button size="sm" variant="outline" onClick={() => void openAudit()}>Audit history</Button>} /></header><main className="min-h-0 flex-1 overflow-y-auto p-6 lg:p-8"><div className="mb-5 rounded-2xl border border-[#D7E7E1] bg-[#F0FAF5] p-4"><p className="font-semibold text-[#012D32]">How to use this page</p><p className="mt-1 text-sm text-[#42615A]">Preview identifies what happened. View details explains the record. Apply is only available when a safe provider or local recovery action is recommended. Every apply action requires a reason and is audited.</p></div><div className="flex flex-wrap gap-2 border-b border-[#E1E4E6] pb-3">{visibleTabs.map((tab) => <button key={tab.id} type="button" onClick={() => { setActive(tab); setSearch(''); setProvider('all'); setStatus('all'); }} className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${active.id === tab.id ? 'bg-[#012D32] text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`}>{tab.label}</button>)}</div><div className="mt-4 rounded-xl bg-white px-4 py-3 text-sm text-gray-600"><strong className="text-[#012D32]">{active.label}:</strong> {active.description}</div><section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{counts.map(([key, value]) => <div key={key} className="rounded-2xl border border-[#E1E4E6] bg-white p-5"><p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{title(key)}</p><p className="mt-2 text-2xl font-bold text-[#012D32]">{value}</p><p className="mt-1 text-xs text-gray-500">Records currently returned</p></div>)}</section>{active.id !== 'deployment' && <div className="mt-6 flex flex-wrap gap-3"><input className="admin-input max-w-xs" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search by customer, wallet, reference..." />{active.id === 'dva' && <select className="admin-input max-w-xs" value={provider} onChange={(event) => { setProvider(event.target.value); setPage(1); }}><option value="all">All DVA providers</option>{['nomba', 'paystack', 'paga', 'palmpay'].map((item) => <option key={item} value={item}>{title(item)}</option>)}</select>}<select className="admin-input max-w-xs" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}><option value="all">All statuses</option>{['pending', 'processing', 'review', 'failed', 'incomplete', 'active'].map((item) => <option key={item} value={item}>{displayStatus(item)}</option>)}</select></div>}{loading ? <div className="mt-6"><LoadingState label="Checking provider and local records…" /></div> : error ? <div className="mt-6"><ErrorState message={error} onRetry={() => void load(active.id)} /></div> : active.id === 'deployment' ? <div className="mt-6"><Deployment data={data ?? {}} /></div> : filteredRows.length === 0 ? <div className="mt-6"><EmptyState title={active.id === 'queues' ? 'No delayed jobs or provider messages' : 'No records need attention'} description={active.id === 'queues' ? 'The background queue and webhook inbox are currently clear. This is a healthy state, not missing data.' : active.id === 'all' ? 'No pending Bridge deposits, virtual-account deposits, withdrawals, or provider exceptions were returned.' : 'Try a different filter or refresh the preview.'} /></div> : <div className="mt-6"><DataTable><thead><tr className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500"><th className="px-4 py-3">What was found</th><th className="px-4 py-3">Provider</th><th className="px-4 py-3">ChangPay status</th><th className="px-4 py-3">Provider update</th><th className="px-4 py-3">Recommended next step</th><th className="px-4 py-3" /></tr></thead><tbody className="divide-y divide-[#E1E4E6]">{pageRows.map((row, index) => <tr key={`${String(row.id ?? index)}-${index}`} className="text-sm"><td className="px-4 py-4"><strong className="text-[#012D32]">{recordName(row)}</strong><p className="mt-1 text-xs text-gray-500">{row._section ? title(String(row._section)) : title(String(row._group ?? 'Operational record'))}</p></td><td className="px-4 py-4">{title(String(row.provider ?? row.provider_name ?? row.kind ?? row.rail ?? 'Bridge'))}</td><td className="px-4 py-4"><StatusBadge status={String(row.state ?? row.status ?? row.local_state ?? 'unknown')} label={displayStatus(row.state ?? row.status ?? row.local_state)} /></td><td className="px-4 py-4"><StatusBadge status={String(row.provider_state ?? row.provider_status ?? row.event_object_status ?? 'unknown')} label={displayStatus(row.provider_state ?? row.provider_status ?? row.event_object_status)} /></td><td className="max-w-sm px-4 py-4 text-gray-600">{scalar(row.risk_reason ?? row.recommended_action ?? row.message ?? row.reason ?? 'Review the details before deciding.')}</td><td className="px-4 py-4 text-right"><Button size="sm" variant="outline" onClick={() => setSelected(row)}>View details</Button></td></tr>)}</tbody></DataTable><div className="mt-4 flex justify-end"><Pagination page={page} lastPage={Math.max(1, Math.ceil(filteredRows.length / pageSize))} onChange={setPage} /></div></div>}<Modal open={Boolean(selected)} title="Reconciliation details" onClose={() => { if (!busy) setSelected(null); }}><div className="rounded-xl bg-[#F0FAF5] p-4 text-sm text-[#42615A]"><strong className="text-[#012D32]">What this means</strong><p className="mt-1">{explanation(active)}</p></div><dl className="mt-4 grid gap-3 sm:grid-cols-2">{Object.entries(selected ?? {}).filter(([key]) => !key.startsWith('_') && key !== 'payload' && key !== 'response').slice(0, 14).map(([key, value]) => <div key={key} className="rounded-xl bg-gray-50 p-3"><dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">{title(key)}</dt><dd className="mt-1 break-words text-sm text-[#012D32]">{scalar(value)}</dd></div>)}</dl>{canApply ? <><label className="mt-4 block text-sm font-semibold text-[#012D32]">Reason for applying<textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={3} className="admin-input mt-2" placeholder="Explain why this recovery is safe" /></label><div className="mt-5 flex justify-end gap-3"><Button variant="outline" onClick={() => setSelected(null)} disabled={busy}>Close</Button><Button onClick={() => void apply()} isLoading={busy}>Apply recommended action</Button></div></> : <div className="mt-5 flex justify-end"><Button variant="outline" onClick={() => setSelected(null)}>Close details</Button></div>}</Modal><Modal open={auditOpen} title="Reconciliation audit history" onClose={() => setAuditOpen(false)}><div className="divide-y divide-gray-100">{audit.length === 0 ? <p className="py-8 text-sm text-gray-500">No reconciliation actions have been recorded.</p> : audit.map((entry) => <article key={entry.id} className="py-4"><div className="flex justify-between gap-4"><strong className="text-sm text-[#012D32]">{title(entry.action)}</strong><span className="text-xs text-gray-500">{new Date(entry.created_at).toLocaleString()}</span></div><p className="mt-1 text-sm text-gray-600">{entry.reason ?? 'No reason supplied'}</p></article>)}</div></Modal></main></div></div>;
}

function Deployment({ data }: { data: Record<string, unknown> }) {
  const checks = Object.entries(data.deployment && typeof data.deployment === 'object' ? data.deployment as Record<string, unknown> : data);
  return <div className="rounded-2xl border border-[#E1E4E6] bg-white p-5"><h2 className="text-lg font-bold text-[#012D32]">Deployment readiness</h2><p className="mt-1 text-sm text-gray-600">These checks help an administrator decide whether reconciliation and provider operations can run safely.</p><div className="mt-4 divide-y divide-gray-100">{checks.length === 0 ? <p className="py-6 text-sm text-gray-500">No deployment checks returned.</p> : checks.map(([key, value]) => <div key={key} className="flex items-center justify-between gap-4 py-3"><span className="text-sm font-medium text-gray-700">{title(key)}</span>{typeof value === 'boolean' ? <StatusBadge status={value ? 'approved' : 'failed'} label={value ? 'Ready' : 'Needs attention'} /> : <span className="text-right text-sm text-gray-600">{scalar(value)}</span>}</div>)}</div></div>;
}
