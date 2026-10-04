'use client';

import { useCallback, useEffect, useState } from 'react';
import { fxApi, type FxPricingSettingsOverview, type FxProviderSetting } from '@/lib/api/client';

const PROVIDER_LABELS: Record<string, string> = {
  currencyapi: 'CurrencyAPI',
  open_exchange_rates: 'Open Exchange Rates',
  exchange_rate_api: 'ExchangeRate-API',
  abokifx: 'AbokiFX (comparison only)',
};

export default function FxProvidersPanel() {
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
      <div className="grid gap-4 lg:grid-cols-2">
        {overview.providers.map((provider) => (
          <ProviderCard key={provider.key} provider={provider} saving={saving === provider.key} onSave={saveProvider} onRefresh={refresh} />
        ))}
      </div>
      <PairAssignments overview={overview} onSaved={load} />
      <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-xs text-gray-600">
        Pair direction, manual fallback and directional markup are managed in the Live rates pair editor. Provider keys are sent only over the authenticated admin API and are never returned after saving.
      </div>
    </div>
  );
}

function PairAssignments({ overview, onSaved }: { overview: FxPricingSettingsOverview; onSaved: () => Promise<void> }) {
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const providers = overview.providers.filter((provider) => !provider.comparison_only);
  const pairs = overview.pairs as Array<Record<string, unknown>>;
  if (!pairs.length) return null;
  const value = (pair: Record<string, unknown>, key: string) => String(pair[key] ?? '');
  const save = async (pair: Record<string, unknown>, provider: string) => {
    const from = value(pair, 'from_currency').toUpperCase();
    const to = value(pair, 'to_currency').toUpperCase();
    const pairKey = `${from}-${to}`;
    try {
      setSaving(pairKey);
      await fxApi.updatePair({
        from_currency: from,
        to_currency: to,
        provider,
        rate_source: value(pair, 'rate_source') || 'provider',
        manual_rate: pair.manual_rate ?? null,
        markup_percent: value(pair, 'markup_percent') || '0',
        markup_operation: value(pair, 'markup_operation') || 'none',
        enabled: Boolean(pair.enabled ?? true),
        revision: overview.revision,
        reason: 'Updated provider assignment from FX Engine',
      });
      await onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to update pair.');
    } finally { setSaving(null); }
  };
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <h3 className="font-semibold text-gray-900">Provider assignment by direction</h3>
      <p className="text-xs text-gray-500 mt-1">The same provider can be used for both directions, or you can choose a different provider per pair.</p>
      {error && <p className="mt-3 text-xs text-red-600">{error}</p>}
      <div className="mt-4 divide-y divide-gray-100">
        {pairs.map((pair) => {
          const key = `${value(pair, 'from_currency')}-${value(pair, 'to_currency')}`;
          return <div key={key} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <span className="text-sm font-semibold text-gray-800">{key}</span>
            <div className="flex items-center gap-2">
              <select defaultValue={value(pair, 'provider')} onChange={(e) => { void save(pair, e.target.value); }} disabled={saving === key} className="rounded-lg border border-gray-200 px-3 py-2 text-sm">
                {providers.map((provider) => <option key={provider.key} value={provider.key}>{PROVIDER_LABELS[provider.key] ?? provider.key}</option>)}
              </select>
              <span className="text-xs text-gray-500">{value(pair, 'rate_source') || 'provider'} · {value(pair, 'markup_percent') || '0'}%</span>
            </div>
          </div>;
        })}
      </div>
    </div>
  );
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
  const [apiKey, setApiKey] = useState('');

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
        <label className="block text-xs font-medium text-gray-700">Maximum age (seconds)</label>
        <input value={maxAge} onChange={(e) => setMaxAge(e.target.value)} inputMode="numeric" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
        <div className="flex gap-2 pt-2">
          <button type="button" disabled={saving} onClick={() => void onSave(provider, { enabled, max_age_seconds: Number(maxAge), ...(apiKey ? { api_key: apiKey } : {}) })} className="rounded-lg bg-[#009F51] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">{saving ? 'Saving…' : 'Save settings'}</button>
          <button type="button" disabled={saving || !enabled || provider.comparison_only} onClick={() => void onRefresh(provider)} className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-700 disabled:opacity-50">Refresh now</button>
        </div>
      </div>
    </div>
  );
}
