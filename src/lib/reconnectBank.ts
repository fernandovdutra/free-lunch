/**
 * Pure helpers for re-authorizing an existing bank connection.
 *
 * Reconnecting is not a new connection: `bankCallback` looks for an existing
 * `bankConnections` doc that already covers one of the IBANs returned by the
 * fresh session and refreshes that doc in place (new sessionId, new consent
 * window, status back to `active`), leaving `lastSync` and every transaction
 * untouched. To get there, though, the client has to hand
 * `initBankConnection` an ASPSP name that Enable Banking recognises — which
 * is the entry from `getAvailableBanks`, not necessarily the display name we
 * stored on the connection.
 *
 * Kept as a pure function so the mapping can be unit-tested without a
 * Firestore or callable-function harness.
 */
import type { Bank, BankConnectionStatus } from './bankingFunctions';

/** Mirrors the slug `bankCallback` derives for `bankId`. */
export function bankSlug(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '_');
}

export interface ReconnectTarget {
  bankName: string;
  bankCountry?: string;
}

export type ReconnectCandidate = Pick<BankConnectionStatus, 'bankName'> & {
  bankId?: string | null;
};

/**
 * Map a stored connection onto the bank entry to re-authorize with.
 *
 * Resolution order, most to least trustworthy:
 *   1. exact match on the ASPSP name we display
 *   2. match on `bankId`, the slug of the name the connection was opened with
 *      (survives the bank renaming itself between sessions)
 *   3. case-insensitive name match
 *   4. the stored display name as-is — no bank list loaded yet, or an
 *      institution that has since dropped out of it. Enable Banking still
 *      accepts it if the name is current, and a wrong one fails at
 *      authorization rather than corrupting anything locally.
 *
 * Country is only ever taken from a matched bank entry; when nothing matches
 * it is left unset so the backend's `NL` default applies.
 */
export function resolveReconnectTarget(
  connection: ReconnectCandidate,
  banks: Bank[]
): ReconnectTarget {
  const exact = banks.find((b) => b.name === connection.bankName);
  if (exact) return { bankName: exact.name, bankCountry: exact.country };

  if (connection.bankId) {
    const bySlug = banks.find((b) => bankSlug(b.name) === connection.bankId);
    if (bySlug) return { bankName: bySlug.name, bankCountry: bySlug.country };
  }

  const lowered = connection.bankName.toLowerCase();
  const byLooseName = banks.find((b) => b.name.toLowerCase() === lowered);
  if (byLooseName) return { bankName: byLooseName.name, bankCountry: byLooseName.country };

  return { bankName: connection.bankName };
}

/**
 * Connections that can be re-authorized. `error` is included alongside
 * `expired`: a revoked or otherwise broken session is fixed the same way,
 * and re-authorizing an already-healthy connection is pointless.
 */
export function canReconnect(status: BankConnectionStatus['status']): boolean {
  return status === 'expired' || status === 'error';
}

/** How far ahead of consent expiry the UI starts nudging for a reconnect. */
export const CONSENT_EXPIRY_WARNING_DAYS = 7;

/**
 * Whole days left on the consent, rounded up so "expires later today" reads
 * as 1 rather than 0. `null` when the connection carries no expiry date.
 */
export function daysUntilConsentExpiry(
  consentExpiresAt: string | null | undefined,
  now: number = Date.now()
): number | null {
  if (!consentExpiresAt) return null;
  const expiry = new Date(consentExpiresAt).getTime();
  if (Number.isNaN(expiry)) return null;
  return Math.ceil((expiry - now) / 86_400_000);
}

/**
 * A still-active connection close enough to expiry to warn about. Already
 * expired connections are excluded — those are `canReconnect` instead, and
 * the card shows the stronger message.
 */
export function isConsentExpiringSoon(
  connection: Pick<BankConnectionStatus, 'status' | 'consentExpiresAt'>,
  now: number = Date.now()
): boolean {
  if (connection.status !== 'active') return false;
  const days = daysUntilConsentExpiry(connection.consentExpiresAt, now);
  return days !== null && days <= CONSENT_EXPIRY_WARNING_DAYS;
}
