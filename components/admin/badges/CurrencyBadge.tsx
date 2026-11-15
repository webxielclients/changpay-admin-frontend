import { CURRENCY_SYMBOLS, type SupportedCurrency } from '@/lib/constants/currencies';

export function CurrencyBadge({ currency }: { currency: SupportedCurrency }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
      <span>{CURRENCY_SYMBOLS[currency]}</span>{currency}
    </span>
  );
}

