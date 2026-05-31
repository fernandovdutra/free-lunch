/**
 * Native-currency display helpers. The Wealth module stores every `value` /
 * history point in the base currency (EUR) so totals and charts stay simple;
 * these helpers render a holding's *native* amount alongside it (e.g. a BRL
 * holding shows "R$ 5.000" with "≈ €920" underneath).
 */

import type { CurrencyCode } from '@/types/wealth';
import { BASE_CURRENCY } from '@/types/wealth';

/** Locales chosen so each currency renders with its conventional grouping. */
const LOCALE_BY_CURRENCY: Record<CurrencyCode, string> = {
  EUR: 'nl-NL',
  USD: 'en-US',
  BRL: 'pt-BR',
  GBP: 'en-GB',
};

/** Format an amount in a given currency (always unsigned magnitude). */
export function formatNative(
  amount: number,
  currency: CurrencyCode,
  options?: { noCents?: boolean }
): string {
  const { noCents = false } = options ?? {};
  return new Intl.NumberFormat(LOCALE_BY_CURRENCY[currency], {
    style: 'currency',
    currency,
    minimumFractionDigits: noCents ? 0 : 2,
    maximumFractionDigits: noCents ? 0 : 2,
  }).format(Math.abs(amount));
}

/** True when the holding is denominated in something other than the base. */
export function isForeign(currency: CurrencyCode): boolean {
  return currency !== BASE_CURRENCY;
}

/** Round to cents — shared by the FX conversion paths. */
export function toCents(amount: number): number {
  return Math.round(amount * 100) / 100;
}
