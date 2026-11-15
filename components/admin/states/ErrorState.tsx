export function ErrorState({ message = 'Something went wrong.', onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="rounded-2xl border border-red-100 bg-red-50 px-6 py-8 text-center text-sm text-red-700" role="alert">
      <p>{message}</p>
      {onRetry && <button type="button" onClick={onRetry} className="mt-3 font-semibold underline">Try again</button>}
    </div>
  );
}

