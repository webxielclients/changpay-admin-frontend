'use client';

import { useCallback, useEffect, useState } from 'react';
import { fxApi, type FxPricingSettingsOverview, type FxProviderSetting } from '@/lib/api/client';

const PROVIDER_LABELS: Record<string, string> = {
  currencyapi: 'CurrencyAPI',
  open_exchange_rates: 'Open Exchange Rates',
  exchange_rate_api: 'ExchangeRate-API',
  abokifx: 'AbokiFX (comparison only)',
};

type FxPanelMode = 'all' | 'providers' | 'pairs';

export default function FxProvidersPanel({ mode = 'all' }: { mode?: FxPanelMode }) {
  const [overview, setOverview] = useState<FxPricingSettingsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fxApi.getProviderSettings();
      setOverview(response.data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load FX provider settings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const saveProvider = async (provider: FxProviderSetting, patch: Record<string, unknown>) => {
    if (!overview) return;
    try {
      setSaving(provider.key);
      setMessage(null);
      setError(null);
      const response = await fxApi.updateProvider({
        key: provider.key,
        enabled: provider.enabled,
        max_age_seconds: provider.max_age_seconds,
        max_change_percent: provider.max_change_percent ?? 25,
        parameters: provider.parameters ?? {},
        revision: overview.revision,
        reason: 'Updated from FX Engine provider settings',
        ...patch,
      });
      setOverview(response.data);
      setMessage(`${PROVIDER_LABELS[provider.key] ?? provider.key} updated.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to save provider settings.');
    } finally {
      setSaving(null);
    }
  };

  const refresh = async (provider: FxProviderSetting) => {
    try {
      setSaving(provider.key);
      setMessage(null);
      await fxApi.refreshProvider(provider.key);
      setMessage(`${PROVIDER_LABELS[provider.key] ?? provider.key} refresh queued.`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Provider refresh failed.');
    } finally {
      setSaving(null);
    }
  };

  if (loading) return <div className="p-8 text-sm text-gray-500">Loading provider settings…</div>;
  if (!overview) return <div className="p-8 text-sm text-red-600">{error ?? 'Provider settings unavailable.'}</div>;

  return (
    <div className="p-8 space-y-6">
      <div>
        <h2 className="text-lg font-bold text-gray-900">Integrated FX Providers</h2>
        <p className="text-sm text-gray-500 mt-1">Manage encrypted credentials, freshness limits and provider availability. AbokiFX remains comparison-only.</p>
      </div>
      {(error || message) && <div className={`rounded-xl px-4 py-3 text-sm ${error ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>{error ?? message}</div>}
      {mode !== 'pairs' && <div className="grid gap-4 lg:grid-cols-2">
        {overview.providers.map((provider) => (
          <ProviderCard key={provider.key} provider={provider} saving={saving === provider.key} onSave={saveProvider} onRefresh={refresh} />
        ))}
      </div>}
      {mode !== 'providers' && <PairAssignments overview={overview} onSaved={load} />}
      <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-xs text-gray-600">
        Pair direction, manual fallback and directional markup are managed in the Live rates pair editor. Provider keys are sent only over the authenticated admin API and are never returned after saving.
      </div>
    </div>
  );
}

function PairAssignments({ overview, onSaved }: { overview: FxPricingSettingsOverview; onSaved: () => Promise<void> }) {
  const providers = overview.providers.filter((provider) => !provider.comparison_only);
  const pairs = overview.pairs as Array<Record<string, unknown>>;
  if (!pairs.length) return null;
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <h3 className="font-semibold text-gray-900">Live rates by direction</h3>
      <p className="text-xs text-gray-500 mt-1">Choose the provider, manual override, and directional markup independently for every conversion direction.</p>
      <div className="mt-4 divide-y divide-gray-100">
        {pairs.map((pair) => <PairAssignmentRow key={`${String(pair.from_currency)}-${String(pair.to_currency)}`} pair={pair} providers={providers} overview={overview} onSaved={onSaved} />)}
      </div>
    </div>
  );
}

function PairAssignmentRow({
  pair,
  providers,
  overview,
  onSaved,
}: {
  pair: Record<string, unknown>;
  providers: FxProviderSetting[];
  overview: FxPricingSettingsOverview;
  onSaved: () => Promise<void>;
}) {
  const value = (key: string) => String(pair[key] ?? '');
  const [provider, setProvider] = useState(value('provider'));
  const [role, setRole] = useState(value('rate_role') || 'sell');
  const [rateSource, setRateSource] = useState(value('rate_source') || 'provider');
  const [manualRate, setManualRate] = useState(value('manual_rate'));
  const [markup, setMarkup] = useState(value('markup_percent') || '0');
  const [operation, setOperation] = useState(value('markup_operation') || 'none');
  const [minimumSpread, setMinimumSpread] = useState(value('minimum_spread_percent') || '0');
  const [feePercent, setFeePercent] = useState(value('fee_percent') || '0');
  const [enabled, setEnabled] = useState(Boolean(pair.enabled ?? true));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const pairKey = `${value('from_currency')}-${value('to_currency')}`;

  const payload = () => ({
    from_currency: value('from_currency').toUpperCase(),
    to_currency: value('to_currency').toUpperCase(),
    provider,
    rate_role: role,
    rate_source: rateSource,
    manual_rate: rateSource === 'manual' ? manualRate : null,
    markup_percent: rateSource === 'manual' ? '0' : markup,
    markup_operation: rateSource === 'manual' ? 'none' : operation,
    minimum_spread_percent: minimumSpread,
    fee_percent: feePercent,
    enabled,
  });

  const previewPair = async () => {
    try {
      setSaving(true);
      setError(null);
      const response = await fxApi.previewPair({ ...payload(), reason: `Preview ${pairKey} settings` });
      const edge = (response.data.edges as Record<string, Record<string, { rate?: unknown }>>)[value('from_currency')]?.[value('to_currency')];
      const product = String(edge?.rate ?? '');
      setPreview(response.data.safe ? `Configuration is safe. Effective rate: ${product}` : 'Configuration is not safe.');
    } catch (e) {
      setPreview(null);
      setError(e instanceof Error ? e.message : 'Unable to preview pair.');
    } finally { setSaving(false); }
  };

  const save = async () => {
    try {
      setSaving(true);
      setError(null);
      await fxApi.previewPair({ ...payload(), reason: `Preview ${pairKey} settings` });
      await fxApi.updatePair({ ...payload(), revision: overview.revision,
        reason: rateSource === 'manual' ? `Manual ${pairKey} rate override updated from FX Engine` : `FX ${pairKey} provider settings updated from FX Engine`,
      });
      setPreview('Saved after arbitrage and spread validation.');
      await onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to update pair.');
    } finally { setSaving(false); }
  };

  return <div className="py-4 space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <span className="text-sm font-semibold text-gray-800">{pairKey}</span>
      <label className="inline-flex items-center gap-2 text-xs text-gray-600">
        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} /> Enabled
      </label>
    </div>
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
      <label className="text-xs text-gray-600">Provider
        <select value={provider} onChange={(e) => setProvider(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm">
          {providers.map((item) => <option key={item.key} value={item.key}>{PROVIDER_LABELS[item.key] ?? item.key}</option>)}
        </select>
      </label>
      <label className="text-xs text-gray-600">ChangPay side
        <select value={role} onChange={(e) => setRole(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm">
          <option value="buy">Buy base currency</option>
          <option value="sell">Sell base currency</option>
        </select>
      </label>
      <label className="text-xs text-gray-600">Rate source
        <select value={rateSource} onChange={(e) => setRateSource(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm">
          <option value="provider">Provider rate</option>
          <option value="manual">Manual override</option>
        </select>
      </label>
      {rateSource === 'manual' ? <label className="text-xs text-gray-600">Manual rate
        <input value={manualRate} onChange={(e) => setManualRate(e.target.value)} inputMode="decimal" placeholder="e.g. 1500.00" className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
      </label> : <label className="text-xs text-gray-600">Markup (%)
        <input value={markup} onChange={(e) => setMarkup(e.target.value)} inputMode="decimal" className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
      </label>}
      {rateSource === 'provider' && <label className="text-xs text-gray-600">Markup direction
        <select value={operation} onChange={(e) => setOperation(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm">
          <option value="none">No markup</option>
          <option value="add">Add to provider rate</option>
          <option value="subtract">Subtract from provider rate</option>
        </select>
      </label>}
      <label className="text-xs text-gray-600">Minimum spread (%)
        <input value={minimumSpread} onChange={(e) => setMinimumSpread(e.target.value)} inputMode="decimal" className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
      </label>
      <label className="text-xs text-gray-600">Fee used in cycle check (%)
        <input value={feePercent} onChange={(e) => setFeePercent(e.target.value)} inputMode="decimal" className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
      </label>
    </div>
    {error && <p className="text-xs text-red-600">{error}</p>}
    {preview && <p className="text-xs text-blue-700">{preview}</p>}
    <div className="flex flex-wrap gap-2">
      <button type="button" disabled={saving} onClick={() => void previewPair()} className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-700 disabled:opacity-50">Preview safety</button>
      <button type="button" disabled={saving} onClick={() => void save()} className="rounded-lg bg-[#009F51] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">{saving ? 'Saving…' : 'Save direction settings'}</button>
    </div>
  </div>;
}

function ProviderCard({
  provider,
  saving,
  onSave,
  onRefresh,
}: {
  provider: FxProviderSetting;
  saving: boolean;
  onSave: (provider: FxProviderSetting, patch: Record<string, unknown>) => Promise<void>;
  onRefresh: (provider: FxProviderSetting) => Promise<void>;
}) {
  const [enabled, setEnabled] = useState(provider.enabled);
  const [maxAge, setMaxAge] = useState(String(provider.max_age_seconds));
  const [maxChange, setMaxChange] = useState(String(provider.max_change_percent ?? 25));
  const [apiKey, setApiKey] = useState('');
  const [parameters, setParameters] = useState(() => JSON.stringify(provider.parameters ?? {}, null, 2));

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold text-gray-900">{PROVIDER_LABELS[provider.key] ?? provider.key}</h3>
          <p className="text-xs text-gray-500 mt-1">{provider.credentials_configured ? 'Credentials configured' : 'Credentials not configured'}</p>
        </div>
        <button type="button" disabled={saving || provider.comparison_only} onClick={() => { setEnabled(!enabled); void onSave(provider, { enabled: !enabled }); }} className={`rounded-full px-3 py-1 text-xs font-semibold ${provider.comparison_only ? 'bg-gray-100 text-gray-500' : enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
          {provider.comparison_only ? 'Comparison only' : enabled ? 'Enabled' : 'Disabled'}
        </button>
      </div>
      <div className="mt-5 space-y-3">
        <label className="block text-xs font-medium text-gray-700">API key {provider.credentials_configured && '(leave blank to keep current)'}</label>
        <input value={apiKey} onChange={(e) => setApiKey(e.target.value)} type="password" autoComplete="new-password" placeholder="Encrypted when saved" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
        <label className="block text-xs font-medium text-gray-700">Provider parameters (JSON)</label>
        <textarea value={parameters} onChange={(e) => setParameters(e.target.value)} rows={4} placeholder={'{"base_currency":"USD"}'} className="w-full rounded-lg border border-gray-200 px-3 py-2 font-mono text-xs" />
        <label className="block text-xs font-medium text-gray-700">Maximum age (seconds)</label>
        <input value={maxAge} onChange={(e) => setMaxAge(e.target.value)} inputMode="numeric" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
        <label className="block text-xs font-medium text-gray-700">Maximum provider movement (%)</label>
        <input value={maxChange} onChange={(e) => setMaxChange(e.target.value)} inputMode="decimal" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
        <div className="flex gap-2 pt-2">
          <button type="button" disabled={saving} onClick={() => {
            try {
              const parsed = JSON.parse(parameters || '{}');
              void onSave(provider, { enabled, max_age_seconds: Number(maxAge), max_change_percent: Number(maxChange), parameters: parsed, ...(apiKey ? { api_key: apiKey } : {}) });
            } catch {
              window.alert('Provider parameters must be valid JSON.');
            }
          }} className="rounded-lg bg-[#009F51] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">{saving ? 'Saving…' : 'Save settings'}</button>
          <button type="button" disabled={saving || !enabled || provider.comparison_only} onClick={() => void onRefresh(provider)} className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-700 disabled:opacity-50">Refresh now</button>
        </div>
      </div>
    </div>
  );
}
