export const APP_CONFIG = {
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || '/api/proxy',
  branding: {
    name: process.env.NEXT_PUBLIC_BRAND_NAME || 'ChangPay',
    supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'support@changpay.com',
  },
  currencies: {
    USD: { code: 'USD', label: 'USD', symbol: '$', flag: '/unitedstates.svg', providerCode: 'USD' },
    NGN: { code: 'NGN', label: 'NGN', symbol: '₦', flag: '/ngn.svg', providerCode: 'NGN' },
    YUAN: { code: 'YUAN', label: 'YUAN', symbol: '¥', flag: '/china.svg', providerCode: 'CNY' },
  },
  supportedCurrencies: ['USD', 'NGN', 'YUAN'] as const,
  fxProviders: {
    currencyapi: 'CurrencyAPI',
    open_exchange_rates: 'Open Exchange Rates',
    exchange_rate_api: 'ExchangeRate-API',
    abokifx: 'AbokiFX (comparison only)',
  } as const,
  statusLabels: {
    active: 'Active', inactive: 'Inactive', pending: 'Pending', approved: 'Approved', rejected: 'Rejected', disabled: 'Disabled',
  } as const,
} as const;

export type SupportedCurrency = (typeof APP_CONFIG.supportedCurrencies)[number];
