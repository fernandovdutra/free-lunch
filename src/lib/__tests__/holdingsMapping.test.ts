import { describe, it, expect } from 'vitest';
import {
  balanceToCashHolding,
  debtToHolding,
  deriveUpdatedDaysAgo,
  investmentToHolding,
  quoteToHoldingUpdate,
  todayIso,
} from '@/lib/holdingsMapping';
import type { Debt, Investment } from '@/types';

const DAY = 86_400_000;

describe('deriveUpdatedDaysAgo', () => {
  it('floors the day difference', () => {
    const now = 10 * DAY;
    expect(deriveUpdatedDaysAgo(now - 3 * DAY, now)).toBe(3);
    expect(deriveUpdatedDaysAgo(now - (3 * DAY + DAY / 2), now)).toBe(3);
  });

  it('clamps future / same-instant / invalid to 0', () => {
    const now = 10 * DAY;
    expect(deriveUpdatedDaysAgo(now, now)).toBe(0);
    expect(deriveUpdatedDaysAgo(now + DAY, now)).toBe(0);
    expect(deriveUpdatedDaysAgo(NaN, now)).toBe(0);
  });
});

describe('todayIso', () => {
  it('formats YYYY-MM-DD', () => {
    expect(todayIso(new Date('2026-05-31T14:00:00Z'))).toBe('2026-05-31');
  });
});

describe('quoteToHoldingUpdate', () => {
  it('computes value = price × units and carries prevPrice', () => {
    expect(quoteToHoldingUpdate(10, 98.8, 97.2)).toEqual({
      value: 988,
      livePrice: 98.8,
      prevPrice: 97.2,
    });
  });

  it('rounds value to cents', () => {
    expect(quoteToHoldingUpdate(0.42, 66667, 63900).value).toBe(28000.14);
  });

  it('treats null units as 0 and missing prev price as null', () => {
    expect(quoteToHoldingUpdate(null, 100, undefined)).toEqual({
      value: 0,
      livePrice: 100,
      prevPrice: null,
    });
  });
});

describe('balanceToCashHolding', () => {
  it('builds a liquid bank cash holding with a single dated point', () => {
    const h = balanceToCashHolding(18_500, {
      name: 'Savings',
      platform: 'ABN AMRO',
      date: '2026-05-31',
    });
    expect(h).toMatchObject({
      type: 'Cash',
      kind: 'asset',
      updateSource: 'bank',
      liquidity: 'liquid',
      units: null,
      value: 18_500,
    });
    expect(h.history).toEqual([{ date: '2026-05-31', value: 18_500 }]);
  });
});

describe('investmentToHolding', () => {
  const inv: Investment = {
    id: 'i1',
    name: 'World ETF',
    platform: 'DEGIRO',
    type: 'etf',
    entries: [
      { date: new Date('2026-03-01'), marketValue: 80_000, costBasis: 62_000 },
      { date: new Date('2026-01-01'), marketValue: 70_000, costBasis: 62_000 },
    ],
    currency: 'EUR',
    notes: 'core position',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-03-01'),
  };

  it('maps type, takes value/cost from latest entry, and builds sorted history', () => {
    const h = investmentToHolding(inv);
    expect(h.type).toBe('Equities');
    expect(h.kind).toBe('asset');
    expect(h.value).toBe(80_000); // latest by date
    expect(h.cost).toBe(62_000);
    expect(h.notes).toBe('core position');
    expect(h.history.map((p) => p.value)).toEqual([70_000, 80_000]);
  });

  it('marks crypto investments as auto-priced', () => {
    const crypto = investmentToHolding({ ...inv, type: 'crypto', entries: inv.entries });
    expect(crypto.type).toBe('Crypto');
    expect(crypto.updateSource).toBe('auto');
  });
});

describe('debtToHolding', () => {
  const debt: Debt = {
    id: 'd1',
    name: 'Mortgage',
    type: 'mortgage',
    balance: 294_500,
    originalAmount: 318_000,
    interestRate: 1.8,
    monthlyPayment: 1_200,
    notes: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2026-05-01'),
  };

  it('maps to a liability holding with a single balance point', () => {
    const h = debtToHolding(debt, '2026-05-31');
    expect(h.kind).toBe('liability');
    expect(h.type).toBe('Mortgage');
    expect(h.value).toBe(294_500);
    expect(h.liquidity).toBe('illiquid');
    expect(h.history).toEqual([{ date: '2026-05-31', value: 294_500 }]);
  });

  it('maps debt subtypes to the right asset type and liquidity', () => {
    expect(debtToHolding({ ...debt, type: 'credit_card' }).type).toBe('Credit');
    expect(debtToHolding({ ...debt, type: 'credit_card' }).liquidity).toBe('liquid');
    expect(debtToHolding({ ...debt, type: 'student_loan' }).type).toBe('Loan');
    expect(debtToHolding({ ...debt, type: 'personal_loan' }).type).toBe('Loan');
  });
});
