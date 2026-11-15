import type { ReactNode } from 'react';

const statusClasses: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-700',
  approved: 'bg-emerald-50 text-emerald-700',
  completed: 'bg-emerald-50 text-emerald-700',
  pending: 'bg-amber-50 text-amber-700',
  processing: 'bg-amber-50 text-amber-700',
  failed: 'bg-red-50 text-red-700',
  rejected: 'bg-red-50 text-red-700',
  inactive: 'bg-slate-100 text-slate-600',
};

export function StatusBadge({ status, children }: { status: string; children?: ReactNode }) {
  const label = children ?? status.replaceAll('_', ' ').replaceAll('-', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusClasses[status.toLowerCase()] ?? 'bg-slate-100 text-slate-600'}`}>
      {label}
    </span>
  );
}

