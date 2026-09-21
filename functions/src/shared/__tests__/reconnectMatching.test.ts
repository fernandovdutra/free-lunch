import { describe, expect, it } from 'vitest';
import { matchBankConnection } from '../reconnectMatching.js';

const connections = [
  { id: 'old', accounts: [{ iban: 'NL-A' }, { iban: 'NL-B' }] },
  { id: 'duplicate', accounts: [{ iban: 'NL-A' }] },
];

describe('matchBankConnection', () => {
  it('reconnects the selected connection even when an earlier one shares an IBAN', () => {
    expect(matchBankConnection(connections, new Set(['NL-A']), 'duplicate')).toEqual({
      kind: 'matched', id: 'duplicate',
    });
  });

  it('rejects a partial consent without changing the selected connection', () => {
    expect(matchBankConnection(connections, new Set(['NL-A']), 'old')).toEqual({
      kind: 'error', reason: 'accounts_changed',
    });
  });

  it('accepts all old accounts along with newly granted accounts', () => {
    expect(matchBankConnection(connections, new Set(['NL-A', 'NL-B', 'NL-C']), 'old'))
      .toEqual({ kind: 'matched', id: 'old' });
  });

  it('refuses to recreate a removed target', () => {
    expect(matchBankConnection(connections, new Set(['NL-A']), 'deleted')).toEqual({
      kind: 'error', reason: 'connection_changed',
    });
  });

  it('does not overwrite another connection on an ordinary partial bank grant', () => {
    expect(matchBankConnection([connections[0]!], new Set(['NL-A']))).toEqual({ kind: 'new' });
  });

  it('reuses an existing connection on an ordinary full bank grant', () => {
    expect(matchBankConnection([connections[0]!], new Set(['NL-A', 'NL-B'])))
      .toEqual({ kind: 'matched', id: 'old' });
  });
});
