import type { ReactNode, TableHTMLAttributes } from 'react';

export function DataTable({ children, ...props }: TableHTMLAttributes<HTMLTableElement> & { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white">
      <table {...props} className={`min-w-full divide-y divide-slate-100 text-left text-sm ${props.className ?? ''}`}>
        {children}
      </table>
    </div>
  );
}

