import { CURRENCY_SYMBOLS, type SupportedCurrency } from '@/lib/constants/currencies';

export function formatCurrency(
  amount: number | string,
  currency: SupportedCurrency,
  options: Intl.NumberFormatOptions = {},
): string {
  const value = Number(amount);
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options,
  }).format(Number.isFinite(value) ? value : 0);

  return `${CURRENCY_SYMBOLS[currency]}${formatted}`;
}

