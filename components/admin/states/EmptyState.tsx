import type { ReactNode } from 'react';

export function EmptyState({ title = 'Nothing to show', description, action }: { title?: string; description?: string; action?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center">
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

