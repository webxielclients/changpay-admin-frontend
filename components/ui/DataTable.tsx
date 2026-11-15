import type { ReactNode } from 'react';

export function DataTable({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`overflow-x-auto rounded-2xl border border-[#E1E4E6] bg-white ${className}`}><table className="min-w-full divide-y divide-[#E1E4E6]">{children}</table></div>;
}
