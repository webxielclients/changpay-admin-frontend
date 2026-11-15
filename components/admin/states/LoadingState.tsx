export function LoadingState({ label = 'Loading...' }: { label?: string }) {
  return <div className="rounded-2xl border border-slate-100 bg-white px-6 py-12 text-center text-sm text-slate-500" role="status">{label}</div>;
}

