export const SUPPORTED_CURRENCIES = ['USD', 'NGN', 'YUAN'] as const;

export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

export const CURRENCY_SYMBOLS: Record<SupportedCurrency, string> = {
  USD: '$',
  NGN: '₦',
  YUAN: '¥',
};

export const CURRENCY_LABELS: Record<SupportedCurrency, string> = {
  USD: 'US Dollar',
  NGN: 'Nigerian Naira',
  YUAN: 'Chinese Yuan',
};

