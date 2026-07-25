import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { CallableRequest } from 'firebase-functions/v2/https';

interface MockRef {
  _col: string;
  _id: string;
}

let ownerData: Record<string, unknown>;
let lookupExists: boolean;
const txSet = vi.fn();

const mockDb = {
  collection: (name: string) => ({
    doc: (id: string): MockRef => ({ _col: name, _id: id }),
  }),
  runTransaction: async (
    fn: (tx: {
      get: (ref: MockRef) => Promise<{ exists: boolean; data: () => Record<string, unknown> }>;
      set: typeof txSet;
    }) => Promise<void>
  ) =>
    fn({
      get: async (ref: MockRef) =>
        ref._col === 'users'
          ? { exists: true, data: () => ownerData }
          : { exists: lookupExists, data: () => ({}) },
      set: txSet,
    }),
};

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => mockDb,
  FieldValue: { serverTimestamp: () => 'SERVER_TS' },
}));

vi.mock('../../config.js', () => ({
  config: { appUrl: 'https://app.test' },
}));

import { inviteMember } from '../inviteMember.js';

type InviteRequest = CallableRequest<{ email: string; role: string }>;

function makeRequest(overrides: Record<string, unknown> = {}): InviteRequest {
  return {
    auth: {
      uid: 'owner1',
      token: { email: 'owner@test.com', name: 'Owner Name' },
    },
    data: { email: 'invitee@test.com', role: 'editor' },
    ...overrides,
  } as unknown as InviteRequest;
}

describe('inviteMember', () => {
  const originalEnv = process.env;
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    vi.stubGlobal('fetch', mockFetch);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    ownerData = {};
    lookupExists = false;
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('sends an invitation email with the invitee address and accept guidance', async () => {
    process.env.RESEND_API_KEY = 'test-key';
    mockFetch.mockResolvedValueOnce({ ok: true });

    const result = await inviteMember.run(makeRequest());

    expect(result).toEqual({ email: 'invitee@test.com', role: 'editor', status: 'invited' });
    expect(mockFetch).toHaveBeenCalledOnce();

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe('https://api.resend.com/emails');
    const body = JSON.parse(options.body);
    expect(body.to).toEqual(['invitee@test.com']);
    expect(body.subject).toContain('Owner Name');
    expect(body.subject).toContain('invited you to Free Lunch');
    // Who invited them, to what, and their role.
    expect(body.html).toContain('Owner Name');
    expect(body.html).toContain('owner@test.com');
    expect(body.html).toContain('household');
    expect(body.html).toContain('editor');
    // What to do: sign in / register at the app URL with this email address.
    expect(body.html).toContain('sign in');
    expect(body.html).toContain('invitee@test.com');
    expect(body.html).toContain('https://app.test');
  });

  it('describes the viewer role and falls back to inviter email when no name is set', async () => {
    process.env.RESEND_API_KEY = 'test-key';
    mockFetch.mockResolvedValueOnce({ ok: true });

    await inviteMember.run(
      makeRequest({
        auth: { uid: 'owner1', token: { email: 'owner@test.com' } },
        data: { email: 'invitee@test.com', role: 'viewer' },
      })
    );

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.subject).toContain('owner@test.com');
    expect(body.html).toContain('viewer');
  });

  it('still creates the invitation when the email send fails', async () => {
    process.env.RESEND_API_KEY = 'test-key';
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => 'Server error',
    });

    const result = await inviteMember.run(makeRequest());

    expect(result).toEqual({ email: 'invitee@test.com', role: 'editor', status: 'invited' });
    // The invite doc + lookup doc were still written.
    expect(txSet).toHaveBeenCalledTimes(2);
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('Invitation email to invitee@test.com failed'),
      expect.any(Error)
    );
  });

  it('skips the email gracefully when RESEND_API_KEY is not configured', async () => {
    delete process.env.RESEND_API_KEY;

    const result = await inviteMember.run(makeRequest());

    expect(result).toEqual({ email: 'invitee@test.com', role: 'editor', status: 'invited' });
    expect(mockFetch).not.toHaveBeenCalled();
    expect(txSet).toHaveBeenCalledTimes(2);
  });

  it('does not attempt to send an email when the invitation is rejected', async () => {
    process.env.RESEND_API_KEY = 'test-key';
    ownerData = { pendingMembers: { 'invitee@test.com': { role: 'editor' } } };

    await expect(inviteMember.run(makeRequest())).rejects.toThrow(
      'An invitation for that email is already pending'
    );
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
