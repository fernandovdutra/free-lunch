import { timingSafeEqual } from 'node:crypto';

/**
 * Constant-time comparison of a candidate token against an expected secret.
 *
 * Returns false for an empty expected secret (misconfiguration must never
 * authenticate) and for length mismatches. The length check itself leaks only
 * the secret's length, which is not useful to an attacker who cannot observe
 * per-character timing.
 */
export function secureCompare(candidate: string, expected: string): boolean {
  if (expected.length === 0 || candidate.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(candidate), Buffer.from(expected));
}
