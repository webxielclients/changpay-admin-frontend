'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';
import { promotionsApi } from '@/lib/api/client';
import type { Promotion, PromotionStats, CreatePromotionPayload } from '@/lib/api/client';
import Sidebar from '@/components/Sidebar';
import DashboardHeader from '@/components/DashboardHeader';

type TabType = 'all' | 'active' | 'scheduled' | 'expired' | 'draft' | 'paused';
type DiscountType = 'percentage' | 'fixed' | 'cashback';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-100 rounded-lg ${className ?? ''}`} />;
}

function formatDate(s: string | null | undefined) {
  if (!s) return '—';
  try { return new Date(s).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' }); }
  catch { return s; }
}

function StatusBadge({ status }: { status: string }) {
  const s = status?.toLowerCase();
  const styles: Record<string, string> = {
    scheduled: 'bg-purple-100 text-purple-700 border-purple-200',
    active:    'bg-emerald-100 text-emerald-700 border-emerald-200',
    expired:   'bg-gray-100 text-gray-500 border-gray-200',
    ended:     'bg-gray-100 text-gray-500 border-gray-200',
    draft:     'bg-blue-100 text-blue-700 border-blue-200',
    paused:    'bg-yellow-100 text-yellow-700 border-yellow-200',
  };
  return (
    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold border capitalize ${styles[s] ?? 'bg-gray-100 text-gray-500 border-gray-200'}`}>
      {status}
    </span>
  );
}

// ─── Green checkmark badge ────────────────────────────────────────────────────
function CheckBadge() {
  return (
    <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center shadow-sm">
      <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
      </svg>
    </div>
  );
}

// ─── Promotion modal — slides from right ──────────────────────────────────────
function PromotionModal({
  existing, onClose, onSaved,
}: {
  existing: Promotion | null;
  onClose: () => void;
  onSaved: (p: Promotion) => void;
}) {
  const [title,         setTitle]         = useState(existing?.title ?? '');
  const [description,   setDescription]   = useState(existing?.description ?? '');
  const [discountType,  setDiscountType]  = useState<DiscountType>((existing?.type as DiscountType) ?? 'percentage');
  const [discountValue, setDiscountValue] = useState(existing?.discountValue ?? '');
  const [maxDiscount,   setMaxDiscount]   = useState(existing?.maxDiscount ?? '');
  const [minOrder,      setMinOrder]      = useState(existing?.minOrderAmount ?? '');
  const [usageLimit,    setUsageLimit]    = useState(existing?.usageLimit?.toString() ?? '');
  const [startDate,     setStartDate]     = useState(existing?.startDate?.slice(0, 10) ?? '');
  const [endDate,       setEndDate]       = useState(existing?.endDate?.slice(0, 10) ?? '');
  const [bannerFile,    setBannerFile]    = useState<File | null>(null);
  const [saving,        setSaving]        = useState(false);
  const [error,         setError]         = useState<string | null>(null);

  const handleSave = async () => {
    if (!title.trim() || !discountValue || !startDate || !endDate) {
      setError('Title, discount value, start and end dates are required.');
      return;
    }
    try {
      setSaving(true);
      setError(null);
      const payload: Partial<CreatePromotionPayload> = {
        title, description: description || undefined,
        type: discountType,
        discount_value: parseFloat(String(discountValue)),
        max_discount: maxDiscount ? parseFloat(String(maxDiscount)) : undefined,
        min_order_amount: minOrder ? parseFloat(String(minOrder)) : undefined,
        usage_limit: usageLimit ? parseInt(usageLimit) : undefined,
        start_date: startDate, end_date: endDate,
        banner_image: bannerFile ?? undefined,
      };
      const res = existing
        ? await promotionsApi.update(existing.id, payload)
        : await promotionsApi.create(payload as CreatePromotionPayload);
      if (res.status && res.data) onSaved(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save promotion');
    } finally {
      setSaving(false);
    }
  };

  const INPUT_CLS = "w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400 placeholder-gray-400";

  const DISCOUNT_TYPES: { id: DiscountType; label: string; sub: string }[] = [
    { id: 'percentage', label: 'Percentage',    sub: '% off transaction' },
    { id: 'fixed',      label: 'Fixed Amount',  sub: '₦ off transaction' },
    { id: 'cashback',   label: 'Cashback',      sub: 'Wallet credit' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white w-full max-w-md h-full flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-base font-bold text-gray-900">
            {existing ? 'Edit Promotion' : 'Create New Promotion'}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
          >
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Basic Information */}
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-3">Basic Information</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Campaign Name</label>
                <input
                  type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g valentine's day special"
                  className={INPUT_CLS}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Description</label>
                <textarea
                  value={description} onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what this promotion offers..."
                  rows={3}
                  className={`${INPUT_CLS} resize-none`}
                />
              </div>
            </div>
          </div>

          {/* Discount Type — 3 selectable cards with green checkmark when active */}
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-3">Discount Type</h3>
            <div className="grid grid-cols-3 gap-3">
              {DISCOUNT_TYPES.map(({ id, label, sub }) => {
                const selected = discountType === id;
                return (
                  <button
                    key={id}
                    onClick={() => setDiscountType(id)}
                    className={`relative p-3 rounded-xl border-2 text-center transition-all ${
                      selected
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    {/* Green checkmark badge when selected */}
                    {selected && <CheckBadge />}
                    <p className="text-sm font-semibold text-gray-900 mb-0.5">{label}</p>
                    <p className="text-xs text-gray-500">{sub}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Discount Details */}
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-3">Discount Details</h3>
            <div className="grid grid-cols-2 gap-3">
              {([
                { label: 'Discount Value',       val: discountValue, set: setDiscountValue, ph: 'e.g. 20' },
                { label: 'Max Discount Cap',     val: maxDiscount,   set: setMaxDiscount,   ph: 'e.g. 50' },
                { label: 'Minimum Transaction',  val: minOrder,      set: setMinOrder,      ph: 'e.g. 100' },
                { label: 'Usage Limit',          val: usageLimit,    set: setUsageLimit,    ph: 'e.g. 50' },
              ] as { label: string; val: string | number; set: (v: string) => void; ph: string }[]).map(({ label, val, set, ph }) => (
                <div key={label}>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">{label}</label>
                  <input
                    type="number" value={val} onChange={(e) => set(e.target.value)}
                    placeholder={ph}
                    className={INPUT_CLS}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Campaign Duration */}
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-3">Campaign Duration</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Start Date</label>
                <div className="relative">
                  <input
                    type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                    className={INPUT_CLS}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">End Date</label>
                <div className="relative">
                  <input
                    type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                    className={INPUT_CLS}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Banner Upload */}
          {bannerFile ? (
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900">{bannerFile.name}</p>
                <p className="text-xs text-gray-400">{(bannerFile.size / 1024).toFixed(1)} KB</p>
              </div>
              <button onClick={() => setBannerFile(null)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ) : (
            <label className="block border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/40 transition-colors">
              <input type="file" accept=".pdf,.jpg,.png" onChange={(e) => setBannerFile(e.target.files?.[0] ?? null)} className="hidden" />
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
                <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-gray-700 mb-0.5">Choose a file</p>
              <p className="text-xs text-gray-400">PDF, JPG, PNG · Max size: 3MB</p>
            </label>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-6 py-5 border-t border-gray-100 flex-shrink-0 space-y-3">
          <button
            onClick={onClose}
            className="w-full py-3 border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 bg-emerald-500 text-white rounded-xl text-sm font-bold hover:bg-emerald-600 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving...' : existing ? 'Update Promotion' : 'Create New Promotion'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
//  PAGE
// ═════════════════════════════════════════════════════════════════════════════
export default function PromotionsPage() {
  const { isAuthenticated } = useAuthStore();

  const [activeTab,    setActiveTab]    = useState<TabType>('all');
  const [searchQuery,  setSearchQuery]  = useState('');
  const [currentPage,  setCurrentPage]  = useState(1);
  const [promotions,   setPromotions]   = useState<Promotion[]>([]);
  const [stats,        setStats]        = useState<PromotionStats | null>(null);
  const [pagination,   setPagination]   = useState<{ total: number; last_page: number; from: number; to: number } | null>(null);
  const [isLoading,    setIsLoading]    = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);
  const [error,        setError]        = useState<string | null>(null);
  const [modalOpen,    setModalOpen]    = useState(false);
  const [editingPromo, setEditingPromo] = useState<Promotion | null>(null);
  const [deletingId,   setDeletingId]   = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter,   setTypeFilter]   = useState('');
  const [sortBy,       setSortBy]       = useState('newest');

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchStats = useCallback(async () => {
    try { setLoadingStats(true); const res = await promotionsApi.getStats(); if (res.status) setStats(res.data); }
    catch { /* silent */ } finally { setLoadingStats(false); }
  }, []);

  const fetchPromotions = useCallback(async (page: number, tab: TabType, search: string) => {
    try {
      setIsLoading(true); setError(null);
      const res = await promotionsApi.getAll({ page, per_page: 12, status: tab !== 'all' ? tab : undefined, search: search || undefined });
      if (res.status) {
        const d = res.data as any;
        if (d && 'data' in d) { setPromotions(d.data ?? []); setPagination({ total: d.total, last_page: d.last_page, from: d.from, to: d.to }); }
        else setPromotions([]);
      }
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to load promotions'); }
    finally { setIsLoading(false); }
  }, []);

  useEffect(() => { if (isAuthenticated) fetchStats(); }, [isAuthenticated, fetchStats]);
  useEffect(() => { if (isAuthenticated) fetchPromotions(currentPage, activeTab, searchQuery); }, [isAuthenticated, currentPage, activeTab, fetchPromotions]);

  if (!isAuthenticated) return null;

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => { setCurrentPage(1); fetchPromotions(1, activeTab, val); }, 400);
  };

  const handleTabChange = (tab: TabType) => { setActiveTab(tab); setCurrentPage(1); };

  const handleSaved = (promo: Promotion) => {
    setPromotions((prev) => editingPromo ? prev.map((p) => p.id === promo.id ? promo : p) : [promo, ...prev]);
    setModalOpen(false); setEditingPromo(null); fetchStats();
  };

  const handleDelete = async (promo: Promotion) => {
    if (!confirm(`Delete "${promo.title}"?`)) return;
    try {
      setDeletingId(promo.id);
      const res = await promotionsApi.delete(promo.id);
      if (res.status) { setPromotions((prev) => prev.filter((p) => p.id !== promo.id)); fetchStats(); }
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to delete'); }
    finally { setDeletingId(null); }
  };

  const totalPages  = pagination?.last_page ?? 1;
  const pageNumbers = Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
    if (totalPages <= 5) return i + 1;
    if (currentPage <= 3) return i + 1;
    if (currentPage >= totalPages - 2) return totalPages - 4 + i;
    return currentPage - 2 + i;
  });

  const TABS: { id: TabType; label: string }[] = [
    { id: 'all',       label: 'All Promotions' },
    { id: 'active',    label: 'Active' },
    { id: 'scheduled', label: 'Scheduled' },
    { id: 'expired',   label: 'Ended' },
  ];

  return (
    <div className="flex h-screen bg-[#F8F9FA] font-['DM_Sans',sans-serif]">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-8 py-5 flex-shrink-0">
          <DashboardHeader title="Promotions" subtitle="Create and manage promotional campaigns" />
        </div>

        {/* Stats row */}
        <div className="bg-white border-b border-gray-100 px-8 py-5 flex-shrink-0">
          <div className="grid grid-cols-4 gap-6">
            {([
              { label: 'Active Campaigns',  value: loadingStats ? null : stats?.active,                                                     color: 'text-gray-900' },
              { label: 'Total Redemptions', value: loadingStats ? null : stats?.total,                                                      color: 'text-emerald-600' },
              { label: 'Revenue Impact',    value: loadingStats ? null : stats ? `$${((stats as any).revenue_impact ?? 0).toLocaleString()}` : null, color: 'text-emerald-600' },
              { label: 'Avg. Discount',     value: loadingStats ? null : stats ? `${(stats as any).avg_discount ?? 0}%` : null,              color: 'text-purple-600' },
            ] as { label: string; value: string | number | null; color: string }[]).map((s) => (
              <div key={s.label}>
                <p className="text-xs text-gray-500 mb-1.5">{s.label}</p>
                {loadingStats ? <Skeleton className="h-9 w-20" /> : (
                  <p className={`text-3xl font-bold ${s.color}`}>{s.value ?? '—'}</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Tab bar + filters */}
        <div className="bg-white border-b border-gray-100 flex-shrink-0">
          {/* Tabs — full width, each tab flex-1 */}
          <div className="flex w-full border-b border-gray-100">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`relative flex-1 py-4 text-sm font-medium text-center transition-colors whitespace-nowrap ${
                  activeTab === tab.id ? 'text-emerald-600' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
                {activeTab === tab.id && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500" />}
              </button>
            ))}
          </div>

          {/* Filter row — full width, search + dropdowns + Create button */}
          <div className="flex items-center gap-3 px-6 py-3 w-full">
            {/* Search — takes remaining space */}
            <div className="relative flex-1">
              <svg className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                type="text" value={searchQuery} onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search by campaign name or promo code"
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-full text-sm text-gray-700 placeholder-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>

            {/* All Status */}
            <div className="relative flex-shrink-0">
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                className="appearance-none bg-white border border-gray-200 rounded-full pl-4 pr-8 py-2.5 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-400 cursor-pointer">
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="scheduled">Scheduled</option>
                <option value="expired">Ended</option>
                <option value="paused">Paused</option>
                <option value="draft">Draft</option>
              </select>
              <svg className="w-4 h-4 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
            </div>

            {/* All Type */}
            <div className="relative flex-shrink-0">
              <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
                className="appearance-none bg-white border border-gray-200 rounded-full pl-4 pr-8 py-2.5 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-400 cursor-pointer">
                <option value="">All Type</option>
                <option value="percentage">Percentage</option>
                <option value="fixed">Fixed Amount</option>
                <option value="cashback">Cashback</option>
              </select>
              <svg className="w-4 h-4 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
            </div>

            {/* Sort by: Newest */}
            <div className="relative flex-shrink-0">
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
                className="appearance-none bg-white border border-gray-200 rounded-full pl-4 pr-8 py-2.5 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-400 cursor-pointer">
                <option value="newest">Sort by: Newest</option>
                <option value="oldest">Sort by: Oldest</option>
                <option value="discount">Sort by: Discount</option>
              </select>
              <svg className="w-4 h-4 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
            </div>

            {/* Create New Promotion — rightmost in this row */}
            <button
              onClick={() => { setEditingPromo(null); setModalOpen(true); }}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 text-white rounded-full text-sm font-semibold hover:bg-emerald-600 transition-colors flex-shrink-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Create New Promotion
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-8">
          {error && (
            <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {isLoading ? (
            <div className="grid grid-cols-2 gap-5">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-80" />)}
            </div>
          ) : promotions.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
              <p className="text-gray-400 text-sm mb-4">No promotions found</p>
              <button onClick={() => { setEditingPromo(null); setModalOpen(true); }}
                className="px-5 py-2.5 bg-emerald-500 text-white rounded-full text-sm font-semibold hover:bg-emerald-600">
                Create First Promotion
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-5">
              {promotions.map((promo) => {
                const usagePct = promo.usageLimit ? Math.round((promo.usageCount / promo.usageLimit) * 100) : 0;
                return (
                  <div key={promo.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                    {/* Banner */}
                    <div className="h-36 relative overflow-hidden">
                      {promo.bannerImage ? (
                        <img src={promo.bannerImage} alt={promo.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-r from-red-500 to-pink-500 flex items-center justify-center">
                          <span className="text-5xl opacity-20">🎁</span>
                        </div>
                      )}
                    </div>

                    <div className="p-5">
                      {/* Title + status + code */}
                      <div className="flex items-start justify-between mb-1">
                        <h3 className="text-sm font-bold text-gray-900">{promo.title}</h3>
                        <StatusBadge status={promo.status} />
                      </div>
                      {promo.code && <p className="text-xs text-gray-400 font-mono mb-3">{promo.code}</p>}

                      {promo.description && (
                        <p className="text-xs text-gray-500 mb-4 line-clamp-2">{promo.description}</p>
                      )}

                      {/* Details grid */}
                      <div className="grid grid-cols-2 gap-y-3 gap-x-4 mb-4 text-xs">
                        <div><p className="text-gray-400 mb-0.5">Discount</p><p className="font-bold text-gray-900">{promo.discountValue}{promo.type === 'percentage' ? '%' : ''}</p></div>
                        <div><p className="text-gray-400 mb-0.5">Type</p><p className="font-bold text-gray-900 capitalize">{promo.type === 'percentage' ? 'Percentage' : promo.type === 'fixed' ? 'Fixed Amount' : 'Cashback'}</p></div>
                        <div><p className="text-gray-400 mb-0.5">Start Date</p><p className="font-medium text-gray-900">{formatDate(promo.startDate)}</p></div>
                        <div><p className="text-gray-400 mb-0.5">End Date</p><p className="font-medium text-gray-900">{formatDate(promo.endDate)}</p></div>
                      </div>

                      {/* Redemptions + Revenue — green tinted box */}
                      <div className="bg-emerald-50 rounded-xl px-4 py-3 grid grid-cols-2 gap-4 mb-4 text-xs">
                        <div>
                          <p className="text-gray-500 mb-0.5">Redemptions</p>
                          <p className="text-base font-bold text-gray-900">{promo.usageCount?.toLocaleString() ?? '—'}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 mb-0.5">Revenue</p>
                          <p className="text-base font-bold text-gray-900">{promo.revenue != null ? `₦${Number(promo.revenue).toLocaleString()}` : '—'}</p>
                        </div>
                      </div>

                      {/* Usage bar */}
                      {promo.usageLimit && (
                        <div className="mb-4">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs text-gray-400">Usage: {promo.usageCount}/{promo.usageLimit}</span>
                            <span className="text-xs font-bold text-gray-700">{usagePct}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${usagePct >= 90 ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${usagePct}%` }} />
                          </div>
                        </div>
                      )}

                      {/* Actions — Edit + End */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setEditingPromo(promo); setModalOpen(true); }}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-50 transition-colors"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                          </svg>
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(promo)}
                          disabled={deletingId === promo.id}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 border border-red-200 text-red-400 rounded-xl text-xs font-semibold hover:bg-red-50 transition-colors disabled:opacity-50"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 7.5A2.25 2.25 0 017.5 5.25h9a2.25 2.25 0 012.25 2.25v9a2.25 2.25 0 01-2.25 2.25h-9a2.25 2.25 0 01-2.25-2.25v-9z" />
                          </svg>
                          {deletingId === promo.id ? '...' : 'End'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {!isLoading && promotions.length > 0 && (
            <div className="mt-8 flex flex-col items-center gap-2">
              <div className="flex items-center gap-1">
                <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}
                  className="w-7 h-7 flex items-center justify-center border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 text-gray-500">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
                </button>
                {pageNumbers.map((p) => (
                  <button key={p} onClick={() => setCurrentPage(p)}
                    className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-medium transition-colors ${currentPage === p ? 'bg-emerald-500 text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                    {p}
                  </button>
                ))}
                <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                  className="w-7 h-7 flex items-center justify-center border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 text-gray-500">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
                </button>
              </div>
              {pagination && (
                <p className="text-xs text-gray-500">Showing {pagination.from}–{pagination.to} of {pagination.total} promotions</p>
              )}
            </div>
          )}
        </div>
      </div>

      {modalOpen && (
        <PromotionModal
          existing={editingPromo}
          onClose={() => { setModalOpen(false); setEditingPromo(null); }}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}