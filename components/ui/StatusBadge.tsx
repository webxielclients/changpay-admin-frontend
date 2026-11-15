import { cn } from '@/lib/utils';

const tones: Record<string, string> = {
  active: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  approved: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  completed: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  pending: 'border-amber-200 bg-amber-50 text-amber-700',
  processing: 'border-amber-200 bg-amber-50 text-amber-700',
  inactive: 'border-gray-200 bg-gray-50 text-gray-600',
  rejected: 'border-red-200 bg-red-50 text-red-700',
  failed: 'border-red-200 bg-red-50 text-red-700',
};

export function StatusBadge({ status, label, className }: { status?: string | null; label?: string; className?: string }) {
  const value = (status ?? 'unknown').toLowerCase();
  const display = label ?? (status ?? 'Unknown').replaceAll('_', ' ').replaceAll('-', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
  return <span className={cn('inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold capitalize', tones[value] ?? 'border-gray-200 bg-gray-50 text-gray-600', className)}>{display}</span>;
}
