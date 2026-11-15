export function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (page: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between gap-3 py-4 text-sm text-slate-600">
      <button type="button" disabled={page <= 1} onClick={() => onChange(page - 1)} className="rounded-lg border border-slate-200 px-3 py-2 disabled:cursor-not-allowed disabled:opacity-40">Previous</button>
      <span>Page {page} of {totalPages}</span>
      <button type="button" disabled={page >= totalPages} onClick={() => onChange(page + 1)} className="rounded-lg border border-slate-200 px-3 py-2 disabled:cursor-not-allowed disabled:opacity-40">Next</button>
    </div>
  );
}

