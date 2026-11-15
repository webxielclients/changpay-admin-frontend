import { Button } from '@/components/ui/Button';

export function ErrorState({ message = 'Something went wrong.', onRetry }: { message?: string; onRetry?: () => void }) {
  return <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-8 text-center text-sm text-red-700" role="alert"><p>{message}</p>{onRetry && <Button className="mt-4" size="sm" variant="outline" onClick={onRetry}>Try again</Button>}</div>;
}
