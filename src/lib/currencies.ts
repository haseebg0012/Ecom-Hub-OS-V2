export interface CurrencyConfig {
  code: string;
  name: string;
  symbol: string;
  label: string;
  shortLabel: string;
}

/**
 * Centralized list of supported currencies across EcomHub OS.
 * PKR is the primary/default currency and must be the FIRST option in all dropdowns.
 */
export const SUPPORTED_CURRENCIES: CurrencyConfig[] = [
  {
    code: 'PKR',
    name: 'Pakistani Rupee',
    symbol: '₨',
    label: 'PKR — Pakistani Rupee (₨)',
    shortLabel: 'PKR (₨)',
  },
  {
    code: 'USD',
    name: 'US Dollar',
    symbol: '$',
    label: 'USD — US Dollar ($)',
    shortLabel: 'USD ($)',
  },
  {
    code: 'EUR',
    name: 'Euro',
    symbol: '€',
    label: 'EUR — Euro (€)',
    shortLabel: 'EUR (€)',
  },
  {
    code: 'GBP',
    name: 'British Pound',
    symbol: '£',
    label: 'GBP — British Pound (£)',
    shortLabel: 'GBP (£)',
  },
  {
    code: 'CAD',
    name: 'Canadian Dollar',
    symbol: 'C$',
    label: 'CAD — Canadian Dollar (C$)',
    shortLabel: 'CAD (C$)',
  },
  {
    code: 'AUD',
    name: 'Australian Dollar',
    symbol: 'A$',
    label: 'AUD — Australian Dollar (A$)',
    shortLabel: 'AUD (A$)',
  },
  {
    code: 'AED',
    name: 'UAE Dirham',
    symbol: 'د.إ',
    label: 'AED — UAE Dirham (د.إ)',
    shortLabel: 'AED (د.إ)',
  },
  {
    code: 'SAR',
    name: 'Saudi Riyal',
    symbol: '﷼',
    label: 'SAR — Saudi Riyal (﷼)',
    shortLabel: 'SAR (﷼)',
  },
  {
    code: 'TRY',
    name: 'Turkish Lira',
    symbol: '₺',
    label: 'TRY — Turkish Lira (₺)',
    shortLabel: 'TRY (₺)',
  },
];

export const DEFAULT_CURRENCY = 'PKR';

export const SUPPORTED_CURRENCY_CODES = SUPPORTED_CURRENCIES.map((c) => c.code);

/**
 * Baseline conversion rates relative to USD for multi-currency conversion fallback
 */
export const BASELINE_USD_RATES: Record<string, number> = {
  USD: 1.0,
  PKR: 280.0,
  EUR: 0.92,
  GBP: 0.79,
  CAD: 1.36,
  AUD: 1.52,
  AED: 3.67,
  SAR: 3.75,
  TRY: 34.0,
};

/**
 * Validates if a currency code is supported
 */
export function isValidCurrency(code?: string | null): boolean {
  if (!code) return false;
  return SUPPORTED_CURRENCY_CODES.includes(code.toUpperCase());
}

/**
 * Resolves a currency code with automatic fallback to PKR if missing or invalid
 */
export function resolveCurrency(currency?: string | null): string {
  if (currency && isValidCurrency(currency)) {
    return currency.toUpperCase();
  }
  return DEFAULT_CURRENCY;
}

/**
 * Retrieves configuration for a given currency code
 */
export function getCurrencyConfig(code?: string | null): CurrencyConfig {
  const resolved = resolveCurrency(code);
  return (
    SUPPORTED_CURRENCIES.find((c) => c.code === resolved) || SUPPORTED_CURRENCIES[0]
  );
}

/**
 * Formats a numeric amount with appropriate currency positioning and symbol.
 * For PKR display: "PKR 250,000"
 */
export function formatCurrency(
  amount: number,
  currencyCode?: string | null,
  options?: { minimumFractionDigits?: number; maximumFractionDigits?: number }
): string {
  const code = resolveCurrency(currencyCode);
  const minDigits = options?.minimumFractionDigits ?? 0;
  const maxDigits = options?.maximumFractionDigits ?? 0;

  if (code === 'PKR') {
    const formattedNum =
      maxDigits > 0
        ? amount.toLocaleString('en-US', {
            minimumFractionDigits: minDigits,
            maximumFractionDigits: maxDigits,
          })
        : Math.round(amount).toLocaleString('en-US');
    return `PKR ${formattedNum}`;
  }

  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: code,
      minimumFractionDigits: minDigits,
      maximumFractionDigits: maxDigits,
    }).format(amount);
  } catch {
    const formattedNum =
      maxDigits > 0
        ? amount.toLocaleString('en-US', {
            minimumFractionDigits: minDigits,
            maximumFractionDigits: maxDigits,
          })
        : Math.round(amount).toLocaleString('en-US');
    return `${code} ${formattedNum}`;
  }
}
