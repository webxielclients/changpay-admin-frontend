'use client';

import { Button } from '@/components/ui/Button';

export function Pagination({ page, lastPage, onChange, disabled = false }: { page: number; lastPage: number; onChange: (page: number) => void; disabled?: boolean }) {
  if (lastPage <= 1) return null;
  return <div className="flex items-center justify-end gap-2 py-4"><Button variant="outline" size="sm" disabled={disabled || page <= 1} onClick={() => onChange(page - 1)}>Previous</Button><span className="px-2 text-sm text-gray-600">Page {page} of {lastPage}</span><Button variant="outline" size="sm" disabled={disabled || page >= lastPage} onClick={() => onChange(page + 1)}>Next</Button></div>;
}
