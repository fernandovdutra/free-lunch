import { describe, it, expect } from 'vitest';
import { secureCompare } from '../secureCompare';

describe('secureCompare', () => {
  it('returns true for identical strings', () => {
    expect(secureCompare('super-secret-token', 'super-secret-token')).toBe(true);
  });

  it('returns false for same-length mismatches', () => {
    expect(secureCompare('super-secret-tokeX', 'super-secret-token')).toBe(false);
  });

  it('returns false for different-length strings without throwing', () => {
    // timingSafeEqual throws on length mismatch — the guard must prevent that.
    expect(secureCompare('short', 'a-much-longer-secret')).toBe(false);
    expect(secureCompare('a-much-longer-candidate', 'short')).toBe(false);
  });

  it('returns false for an empty candidate', () => {
    expect(secureCompare('', 'secret')).toBe(false);
  });

  it('never authenticates against an empty expected secret', () => {
    expect(secureCompare('', '')).toBe(false);
    expect(secureCompare('anything', '')).toBe(false);
  });
});
