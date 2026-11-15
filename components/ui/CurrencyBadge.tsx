import { cn } from '@/lib/utils';

export function CurrencyBadge({ currency, className }: { currency: string; className?: string }) {
  return <span className={cn('inline-flex items-center rounded-md bg-[#E1F7EB] px-2 py-1 text-xs font-bold text-[#006B3C]', className)}>{currency}</span>;
}
