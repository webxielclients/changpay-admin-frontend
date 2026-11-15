export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return <div className="flex items-center justify-center gap-3 rounded-2xl bg-white px-6 py-12 text-sm text-gray-500" role="status"><span className="h-5 w-5 animate-spin rounded-full border-2 border-[#009F51] border-t-transparent" />{label}</div>;
}
