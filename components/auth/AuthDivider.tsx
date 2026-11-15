export function AuthDivider({ label = 'Or continue with' }: { label?: string }) {
  return (
    <div className="my-6 flex items-center gap-4" aria-hidden="true">
      <div className="h-px flex-1 bg-gray-200" />
      <span className="text-xs text-gray-400">{label}</span>
      <div className="h-px flex-1 bg-gray-200" />
    </div>
  );
}
