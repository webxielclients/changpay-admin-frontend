import type { ReactNode } from 'react';

export function EmptyState({ title = 'Nothing to show', description, action }: { title?: string; description?: string; action?: ReactNode }) {
  return <div className="rounded-2xl border border-dashed border-[#D1D5DB] bg-white px-6 py-12 text-center"><h3 className="text-base font-semibold text-[#012D32]">{title}</h3>{description && <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">{description}</p>}{action && <div className="mt-5">{action}</div>}</div>;
}
