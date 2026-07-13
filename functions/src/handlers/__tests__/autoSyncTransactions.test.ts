import { describe, it, expect, vi, beforeEach } from 'vitest';

const { MockTimestamp } = vi.hoisted(() => {
  class MockTimestamp {
    constructor(public _date: Date) {}
    toDate() {
      return this._date;
    }
    static fromDate(d: Date) {
      return new MockTimestamp(d);
    }
  }
  return { MockTimestamp };
});

let mockDb: {
  collectionGroup: ReturnType<typeof vi.fn>;
  collection: ReturnType<typeof vi.fn>;
};

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => mockDb,
  FieldValue: {
    serverTimestamp: () => 'SERVER_TS',
    delete: () => 'DELETE',
  },
  Timestamp: MockTimestamp,
}));

const syncBankConnection = vi.fn();
vi.mock('../../shared/syncConnection.js', () => ({
  syncBankConnection: (...args: unknown[]) => syncBankConnection(...args),
  summarizeSyncErrors: (results: Array<{ accountId: string; errors: string[] }>) =>
    results
      .filter((r) => r.errors.length > 0)
      .map((r) => `${r.accountId}: ${r.errors[0]}`)
      .join('; '),
}));

const sendInsightEmail = vi.fn();
vi.mock('../../shared/emailSender.js', () => ({
  sendInsightEmail: (...args: unknown[]) => sendInsightEmail(...args),
}));

vi.mock('../../config.js', () => ({
  config: { appUrl: 'https://app.test' },
}));

import { runAutoSync } from '../autoSyncTransactions.js';

const DAY = 24 * 60 * 60 * 1000;

interface ConnData {
  status: string;
  bankName?: string;
  consentExpiresAt?: Date | null;
  expiryReminderSentAt?: unknown;
}

function makeConnDoc(userId: string, id: string, data: ConnData) {
  const ref = {
    id,
    parent: { parent: { id: userId } },
    update: vi.fn().mockResolvedValue(undefined),
  };
  return { id, ref, data: () => data };
}

function setupDb(
  docs: ReturnType<typeof makeConnDoc>[],
  users: Record<string, { email?: string }> = {}
) {
  mockDb = {
    collectionGroup: vi.fn(() => ({
      get: async () => ({ docs, size: docs.length }),
    })),
    collection: vi.fn(() => ({
      doc: vi.fn((id: string) => ({
        get: async () => ({ data: () => users[id] }),
      })),
    })),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  syncBankConnection.mockResolvedValue({
    success: true,
    results: [],
    totalNew: 0,
    totalUpdated: 0,
  });
});

describe('runAutoSync', () => {
  it('syncs active connections and stamps lastAutoSyncAt', async () => {
    const doc = makeConnDoc('user1', 'conn1', { status: 'active' });
    setupDb([doc]);

    await runAutoSync();

    expect(syncBankConnection).toHaveBeenCalledWith('user1', 'conn1');
    expect(doc.ref.update).toHaveBeenCalledWith(
      expect.objectContaining({ lastAutoSyncAt: 'SERVER_TS', lastAutoSyncError: 'DELETE' })
    );
  });

  it('skips connections that are not active', async () => {
    const doc = makeConnDoc('user1', 'conn1', { status: 'expired' });
    setupDb([doc]);

    await runAutoSync();

    expect(syncBankConnection).not.toHaveBeenCalled();
  });

  it('stamps lastAutoSyncError when the sync resolves with account-level errors', async () => {
    const doc = makeConnDoc('user1', 'conn1', { status: 'active' });
    setupDb([doc]);
    syncBankConnection.mockResolvedValue({
      success: false,
      results: [
        {
          accountId: 'acc1',
          newTransactions: 0,
          updatedTransactions: 0,
          errors: ['Enable Banking API error: 500'],
        },
      ],
      totalNew: 0,
      totalUpdated: 0,
    });

    await runAutoSync();

    expect(doc.ref.update).toHaveBeenCalledWith(
      expect.objectContaining({
        lastAutoSyncAt: 'SERVER_TS',
        lastAutoSyncError: expect.stringContaining('Enable Banking API error: 500'),
      })
    );
  });

  it('records the error when a connection sync fails without aborting others', async () => {
    const failing = makeConnDoc('user1', 'conn1', { status: 'active' });
    const ok = makeConnDoc('user2', 'conn2', { status: 'active' });
    setupDb([failing, ok]);
    syncBankConnection
      .mockRejectedValueOnce(new Error('Bank consent has expired'))
      .mockResolvedValueOnce({ success: true, results: [], totalNew: 1, totalUpdated: 0 });

    await runAutoSync();

    expect(failing.ref.update).toHaveBeenCalledWith(
      expect.objectContaining({ lastAutoSyncError: 'Bank consent has expired' })
    );
    expect(syncBankConnection).toHaveBeenCalledWith('user2', 'conn2');
  });

  it('emails an expiry reminder when consent is within 7 days', async () => {
    const doc = makeConnDoc('user1', 'conn1', {
      status: 'active',
      bankName: 'ABN AMRO',
      consentExpiresAt: new Date(Date.now() + 3 * DAY),
    });
    setupDb([doc], { user1: { email: 'me@test.com' } });

    await runAutoSync();

    expect(sendInsightEmail).toHaveBeenCalledOnce();
    expect(sendInsightEmail.mock.calls[0][0]).toBe('me@test.com');
    expect(doc.ref.update).toHaveBeenCalledWith(
      expect.objectContaining({ expiryReminderSentAt: 'SERVER_TS' })
    );
  });

  it('does not re-send the reminder once already sent', async () => {
    const doc = makeConnDoc('user1', 'conn1', {
      status: 'active',
      bankName: 'ABN AMRO',
      consentExpiresAt: new Date(Date.now() + 3 * DAY),
      expiryReminderSentAt: 'SERVER_TS',
    });
    setupDb([doc], { user1: { email: 'me@test.com' } });

    await runAutoSync();

    expect(sendInsightEmail).not.toHaveBeenCalled();
  });

  it('does not email when consent is comfortably far from expiry', async () => {
    const doc = makeConnDoc('user1', 'conn1', {
      status: 'active',
      bankName: 'ABN AMRO',
      consentExpiresAt: new Date(Date.now() + 60 * DAY),
    });
    setupDb([doc], { user1: { email: 'me@test.com' } });

    await runAutoSync();

    expect(sendInsightEmail).not.toHaveBeenCalled();
  });
});
