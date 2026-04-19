import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock firebase-admin/firestore before imports
const mockSet = vi.fn().mockResolvedValue(undefined);
const mockUpdate = vi.fn().mockResolvedValue(undefined);
const mockGet = vi.fn();
const mockWhere = vi.fn();
const mockOrderBy = vi.fn();
const mockLimit = vi.fn();

// Build a chainable mock that supports collection().doc().collection().doc() patterns
function buildMockDoc() {
  return {
    id: 'mock-insight-id',
    set: mockSet,
    update: mockUpdate,
    collection: buildMockCollection,
  };
}

function buildMockCollection(): any {
  return {
    doc: vi.fn().mockImplementation(() => buildMockDoc()),
    where: mockWhere,
    orderBy: mockOrderBy,
    limit: mockLimit,
  };
}

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({
    collection: vi.fn().mockImplementation(() => ({
      doc: vi.fn().mockImplementation(() => buildMockDoc()),
    })),
  }),
  Timestamp: {
    fromDate: (d: Date) => ({ toDate: () => d, _seconds: Math.floor(d.getTime() / 1000) }),
  },
  FieldValue: {
    serverTimestamp: () => 'SERVER_TIMESTAMP',
  },
}));

import { storeInsight, markInsightEmailed, getPreviousInsight } from '../insightStorage';

beforeEach(() => {
  vi.clearAllMocks();
  mockWhere.mockReturnValue({ orderBy: mockOrderBy });
  mockOrderBy.mockReturnValue({ limit: mockLimit });
  mockLimit.mockReturnValue({ get: mockGet });
});

describe('storeInsight', () => {
  it('stores insight and returns doc ID', async () => {
    const id = await storeInsight('user-1', {
      type: 'daily',
      periodStart: new Date('2024-01-15'),
      periodEnd: new Date('2024-01-15'),
      summary: 'Test',
      highlights: [],
      recommendations: [],
      anomalies: [],
      goalProgress: [],
      narrative: 'Test narrative',
    });

    expect(id).toBe('mock-insight-id');
    expect(mockSet).toHaveBeenCalledOnce();
    const setArg = mockSet.mock.calls[0][0];
    expect(setArg.type).toBe('daily');
    expect(setArg.isRead).toBe(false);
    expect(setArg.emailSentAt).toBeNull();
    expect(setArg.generatedAt).toBe('SERVER_TIMESTAMP');
  });
});

describe('markInsightEmailed', () => {
  it('updates emailSentAt on the correct path', async () => {
    await markInsightEmailed('user-1', 'insight-123');
    expect(mockUpdate).toHaveBeenCalledWith({ emailSentAt: 'SERVER_TIMESTAMP' });
  });
});

describe('getPreviousInsight', () => {
  it('returns narrative from most recent insight', async () => {
    mockGet.mockResolvedValueOnce({
      empty: false,
      docs: [{ data: () => ({ narrative: 'Previous analysis' }) }],
    });

    const result = await getPreviousInsight('user-1', 'daily');
    expect(result).toEqual({ narrative: 'Previous analysis' });
    expect(mockWhere).toHaveBeenCalledWith('type', '==', 'daily');
  });

  it('returns null when no previous insight', async () => {
    mockGet.mockResolvedValueOnce({ empty: true, docs: [] });

    const result = await getPreviousInsight('user-1', 'weekly');
    expect(result).toBeNull();
  });
});
