'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { promotionsApi } from '@/lib/api/client';
import type { Promotion, PromotionStats, CreatePromotionPayload } from '@/lib/api/client';
import { AUTH_ROUTES } from '@/constants/auth';
import Sidebar from '@/components/Sidebar';
import DashboardHeader from '@/components/DashboardHeader';

type TabType = 'all' | 'active' | 'scheduled' | 'expired' | 'draft' | 'paused';
type DiscountType = 'percentage' | 'fixed' | 'cashback';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-100 rounded-lg ${className}`} />;
}

function formatDate(s: string | null) {
  if (!s) return '—';
  try { return new Date(s).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' }); }
  catch { return s; }
}

function StatusBadge({ status }: { status: string }) {
  const s = status?.toLowerCase();
  const styles: Record<string, string> = {
    scheduled: 'bg-purple-100 text-purple-700 border-purple-200',
    active: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    expired: 'bg-gray-100 text-gray-600 border-gray-200',
    ended: 'bg-gray-100 text-gray-600 border-gray-200',
    draft: 'bg-blue-100 text-blue-700 border-blue-200',
    paused: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  };
  return (
    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold border capitalize ${styles[s] ?? 'bg-gray-100 text-gray-600 border-gray-200'}`}>
      {status}
    </span>
  );
}

// ─── Create / Edit Modal ──────────────────────────────────────────────────────
function PromotionModal({
  existing,
  onClose,
  onSaved,
}: {
  existing: Promotion | null;
  onClose: () => void;
  onSaved: (p: Promotion) => void;
}) {
  const [title, setTitle] = useState(existing?.title ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [discountType, setDiscountType] = useState<DiscountType>(
    (existing?.type as DiscountType) ?? 'percentage'
  );
  const [discountValue, setDiscountValue] = useState(existing?.discountValue ?? '');
  const [maxDiscount, setMaxDiscount] = useState(existing?.maxDiscount ?? '');
  const [minOrder, setMinOrder] = useState(existing?.minOrderAmount ?? '');
  const [usageLimit, setUsageLimit] = useState(existing?.usageLimit?.toString() ?? '');
  const [startDate, setStartDate] = useState(existing?.startDate?.slice(0, 10) ?? '');
  const [endDate, setEndDate] = useState(existing?.endDate?.slice(0, 10) ?? '');
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!title.trim() || !discountValue || !startDate || !endDate) {
      setError('Title, discount value, start and end dates are required.');
      return;
    }
    try {
      setSaving(true);
      setError(null);
      const payload: Partial<CreatePromotionPayload> = {
        title,
        description: description || undefined,
        type: discountType,
        discount_value: parseFloat(discountValue),
        max_discount: maxDiscount ? parseFloat(maxDiscount) : undefined,
        min_order_amount: minOrder ? parseFloat(minOrder) : undefined,
        usage_limit: usageLimit ? parseInt(usageLimit) : undefined,
        start_date: startDate,
        end_date: endDate,
        banner_image: bannerFile ?? undefined,
      };

      let res;
      if (existing) {
        res = await promotionsApi.update(existing.id, payload);
      } else {
        res = await promotionsApi.create(payload as CreatePromotionPayload);
      }
      if (res.status && res.data) onSaved(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save promotion');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden">
        <button onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-full transition-colors z-10">
          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="max-h-[90vh] overflow-y-auto p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-6">
            {existing ? 'Edit Promotion' : 'Create New Promotion'}
          </h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Basic Info */}
          <div className="mb-6">
            <h3 className="text-sm font-bold text-gray-900 mb-4">Basic Information</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Campaign Name *</label>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Valentine's Day Special"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what this promotion offers..."
                  rows={3}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
            </div>
          </div>

          {/* Discount Type */}
          <div className="mb-6">
            <h3 className="text-sm font-bold text-gray-900 mb-3">Discount Type</h3>
            <div className="grid grid-cols-3 gap-3">
              {([['percentage', '% off transaction'], ['fixed', '₦ off transaction'], ['cashback', 'Wallet credit']] as [DiscountType, string][]).map(([t, sub]) => (
                <button key={t} onClick={() => setDiscountType(t)}
                  className={`p-4 rounded-lg border-2 transition-colors text-center ${
                    discountType === t ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-gray-300'
                  }`}>
                  <p className="text-sm font-semibold text-gray-900 capitalize">{t === 'fixed' ? 'Fixed Amount' : t.charAt(0).toUpperCase() + t.slice(1)}</p>
                  <p className="text-xs text-gray-500">{sub}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Discount Details */}
          <div className="mb-6">
            <h3 className="text-sm font-bold text-gray-900 mb-4">Discount Details</h3>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Discount Value *', value: discountValue, setter: setDiscountValue, placeholder: 'e.g. 20' },
                { label: 'Max Discount Cap', value: maxDiscount, setter: setMaxDiscount, placeholder: 'e.g. 5000' },
                { label: 'Minimum Transaction', value: minOrder, setter: setMinOrder, placeholder: 'e.g. 1000' },
                { label: 'Usage Limit', value: usageLimit, setter: setUsageLimit, placeholder: 'e.g. 500' },
              ].map((f) => (
                <div key={f.label}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
                  <input type="number" value={f.value} onChange={(e) => f.setter(e.target.value)}
                    placeholder={f.placeholder}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
              ))}
            </div>
          </div>

          {/* Duration */}
          <div className="mb-6">
            <h3 className="text-sm font-bold text-gray-900 mb-4">Campaign Duration</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date *</label>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
            </div>
          </div>

          {/* Banner Upload */}
          {bannerFile ? (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900">{bannerFile.name}</p>
                <p className="text-xs text-gray-500">{(bannerFile.size / 1024).toFixed(1)} KB</p>
              </div>
              <button onClick={() => setBannerFile(null)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ) : (
            <label className="block mb-6 p-8 border-2 border-dashed border-gray-300 rounded-lg text-center cursor-pointer hover:border-emerald-500 hover:bg-emerald-50 transition-colors">
              <input type="file" accept=".jpg,.jpeg,.png,.webp" onChange={(e) => setBannerFile(e.target.files?.[0] ?? null)} className="hidden" />
              <svg className="w-10 h-10 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              <p className="text-sm font-semibold text-gray-900 mb-0.5">Upload banner image</p>
              <p className="text-xs text-gray-500">JPG, PNG, WEBP • Max 5MB</p>
            </label>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button onClick={onClose}
              className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving}
              className="flex-1 py-3 bg-emerald-500 text-white rounded-lg text-sm font-semibold hover:bg-emerald-600 disabled:opacity-50 transition-colors">
              {saving ? 'Saving...' : existing ? 'Update Promotion' : 'Create Promotion'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function PromotionsPage() {
  const router = useRouter();
  const { isAuthenticated, user: authUser } = useAuthStore();

  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [stats, setStats] = useState<PromotionStats | null>(null);
  const [pagination, setPagination] = useState<{ total: number; last_page: number; from: number; to: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<Promotion | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoadingStats(true);
      const res = await promotionsApi.getStats();
      if (res.status) setStats(res.data);
    } catch { /* silent */ } finally {
      setLoadingStats(false);
    }
  }, []);

  const fetchPromotions = useCallback(async (page: number, tab: TabType, search: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await promotionsApi.getAll({
        page,
        per_page: 12,
        status: tab !== 'all' ? tab : undefined,
        search: search || undefined,
      });
      if (res.status) {
        const d = res.data;
        if (d && typeof d === 'object' && 'data' in d) {
          const p = d as { data: Promotion[]; total: number; last_page: number; from: number; to: number };
          setPromotions(p.data ?? []);
          setPagination({ total: p.total, last_page: p.last_page, from: p.from, to: p.to });
        } else {
          setPromotions([]);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load promotions');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchStats();
  }, [isAuthenticated, fetchStats]);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchPromotions(currentPage, activeTab, searchQuery);
  }, [isAuthenticated, currentPage, activeTab, fetchPromotions]);

  // ── 2. Auth guard — after all hooks ──
  if (!isAuthenticated) return null;

  // ── 3. Handlers ──
  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setCurrentPage(1);
      fetchPromotions(1, activeTab, val);
    }, 400);
  };

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  const handleSaved = (promo: Promotion) => {
    if (editingPromo) {
      setPromotions((prev) => prev.map((p) => p.id === promo.id ? promo : p));
    } else {
      setPromotions((prev) => [promo, ...prev]);
    }
    setModalOpen(false);
    setEditingPromo(null);
    fetchStats();
  };

  const handleDelete = async (promo: Promotion) => {
    if (!confirm(`Delete "${promo.title}"? This cannot be undone.`)) return;
    try {
      setDeletingId(promo.id);
      const res = await promotionsApi.delete(promo.id);
      if (res.status) {
        setPromotions((prev) => prev.filter((p) => p.id !== promo.id));
        fetchStats();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete promotion');
    } finally {
      setDeletingId(null);
    }
  };

  const totalPages = pagination?.last_page ?? 1;
  const pageNumbers = Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
    if (totalPages <= 5) return i + 1;
    if (currentPage <= 3) return i + 1;
    if (currentPage >= totalPages - 2) return totalPages - 4 + i;
    return currentPage - 2 + i;
  });

  const tabs: { id: TabType; label: string }[] = [
    { id: 'all', label: 'All Promotions' },
    { id: 'active', label: 'Active' },
    { id: 'scheduled', label: 'Scheduled' },
    { id: 'draft', label: 'Draft' },
    { id: 'paused', label: 'Paused' },
    { id: 'expired', label: 'Expired' },
  ];

  // ── 4. Render ──
  return (
    <div className="flex h-screen bg-gray-50 font-['DM_Sans']">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">

          {/* Header */}
          <div className="bg-white border-b border-gray-200 px-8 py-6">
         <DashboardHeader title="Promotions Management" subtitle="Create and manage promotional campaigns" />
</div>
          {/* Stats */}
          <div className="bg-white border-b border-gray-200 px-8 py-6">
            <div className="grid grid-cols-4 gap-6">
              {[
                { label: 'Active Campaigns', value: loadingStats ? '—' : String(stats?.active ?? 0), color: 'text-gray-900' },
                { label: 'Total Promotions', value: loadingStats ? '—' : String(stats?.total ?? 0), color: 'text-blue-600' },
                { label: 'Total Discount Value', value: loadingStats ? '—' : `₦${(stats?.total_discount_value ?? 0).toLocaleString()}`, color: 'text-emerald-600' },
                { label: 'Active Rate', value: loadingStats ? '—' : `${stats?.active_rate ?? 0}%`, color: 'text-gray-900' },
              ].map((s) => (
                <div key={s.label}>
                  <p className="text-xs font-medium text-gray-500 mb-1">{s.label}</p>
                  {loadingStats ? <Skeleton className="h-9 w-20" /> : (
                    <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Tabs + Filters */}
          <div className="bg-white border-b border-gray-200 px-8 pt-4">
            <div className="flex items-center gap-6 border-b border-gray-200 mb-4">
              {tabs.map((tab) => (
                <button key={tab.id} onClick={() => handleTabChange(tab.id)}
                  className={`pb-3 text-sm font-semibold transition-colors relative whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'text-emerald-600 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-emerald-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}>
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3 pb-4">
              <div className="flex-1 relative">
                <svg className="w-4 h-4 text-gray-400 absolute left-3 top-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                <input type="text" value={searchQuery} onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Search by campaign name or promo code"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
            </div>
          </div>

          {/* Grid */}
          <div className="p-8">
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {isLoading ? (
              <div className="grid grid-cols-2 gap-6">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-80" />)}
              </div>
            ) : promotions.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
                <p className="text-gray-400 text-sm">No promotions found</p>
                <button onClick={() => { setEditingPromo(null); setModalOpen(true); }}
                  className="mt-4 px-5 py-2.5 bg-emerald-500 text-white rounded-lg text-sm font-semibold hover:bg-emerald-600">
                  Create First Promotion
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-6">
                {promotions.map((promo) => {
                  const usagePct = promo.usageLimit
                    ? Math.round((promo.usageCount / promo.usageLimit) * 100)
                    : 0;
                  return (
                    <div key={promo.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                      {/* Banner */}
                      <div className="h-40 relative overflow-hidden">
                        {promo.bannerImage ? (
                          <img src={promo.bannerImage} alt={promo.title}
                            className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-r from-red-500 to-pink-500 flex items-center justify-center">
                            <span className="text-6xl opacity-20">🎁</span>
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="p-5">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="text-base font-bold text-gray-900 mb-0.5">{promo.title}</h3>
                            {promo.code && <p className="text-xs text-gray-500 font-mono">{promo.code}</p>}
                          </div>
                          <StatusBadge status={promo.status} />
                        </div>

                        {promo.description && (
                          <p className="text-sm text-gray-600 mb-4 line-clamp-2">{promo.description}</p>
                        )}

                        <div className="grid grid-cols-2 gap-3 mb-4 text-xs">
                          <div>
                            <p className="text-gray-500 mb-0.5">Discount</p>
                            <p className="font-bold text-gray-900">{promo.discountValue}{promo.type === 'percentage' ? '%' : ''}</p>
                          </div>
                          <div>
                            <p className="text-gray-500 mb-0.5">Type</p>
                            <p className="font-medium text-gray-900 capitalize">{promo.type}</p>
                          </div>
                          <div>
                            <p className="text-gray-500 mb-0.5">Start</p>
                            <p className="font-medium text-gray-900">{formatDate(promo.startDate)}</p>
                          </div>
                          <div>
                            <p className="text-gray-500 mb-0.5">End</p>
                            <p className="font-medium text-gray-900">{formatDate(promo.endDate)}</p>
                          </div>
                          <div>
                            <p className="text-gray-500 mb-0.5">Used</p>
                            <p className="font-bold text-gray-900">{promo.usageCount.toLocaleString()}{promo.usageLimit ? `/${promo.usageLimit}` : ''}</p>
                          </div>
                          <div>
                            <p className="text-gray-500 mb-0.5">Audience</p>
                            <p className="font-medium text-gray-900 capitalize">{promo.targetAudience ?? 'All'}</p>
                          </div>
                        </div>

                        {/* Usage bar */}
                        {promo.usageLimit && (
                          <div className="mb-4">
                            <div className="flex justify-between items-center mb-1.5">
                              <span className="text-xs text-gray-500">Usage: {promo.usageCount}/{promo.usageLimit}</span>
                              <span className="text-xs font-bold text-gray-900">{usagePct}%</span>
                            </div>
                            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${usagePct >= 90 ? 'bg-red-500' : 'bg-emerald-500'}`}
                                style={{ width: `${usagePct}%` }} />
                            </div>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-2">
                          <button onClick={() => { setEditingPromo(promo); setModalOpen(true); }}
                            className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors flex items-center justify-center gap-1.5">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                            </svg>
                            Edit
                          </button>
                          <button onClick={() => handleDelete(promo)}
                            disabled={deletingId === promo.id}
                            className="flex-1 py-2.5 border border-red-300 text-red-600 rounded-lg text-sm font-semibold hover:bg-red-50 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                            </svg>
                            {deletingId === promo.id ? '...' : 'Delete'}
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
                    className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40">
                    <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                    </svg>
                  </button>
                  {pageNumbers.map((p) => (
                    <button key={p} onClick={() => setCurrentPage(p)}
                      className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium ${
                        currentPage === p ? 'bg-emerald-500 text-white' : 'border border-gray-300 text-gray-600 hover:bg-gray-50'
                      }`}>{p}</button>
                  ))}
                  <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                    className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40">
                    <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </button>
                </div>
                {pagination && (
                  <p className="text-sm text-gray-500">
                    Showing {pagination.from}–{pagination.to} of {pagination.total} promotions
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Create / Edit Modal */}
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