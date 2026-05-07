import { describe, it, expect } from 'vitest';
import {
  pickSiblingsByIban,
  routeTxnsForDisconnect,
  type ConnectionLike,
  type TxnLike,
} from '../disconnectBankRouting';

const conn = (
  id: string,
  status: ConnectionLike['status'],
  ibans: string[],
  updatedAtMs?: number
): ConnectionLike => ({
  id,
  status,
  accounts: ibans.map((iban) => ({ iban })),
  updatedAtMs,
});

const txn = (id: string, connId: string, iban: string | null, externalId: string | null): TxnLike => ({
  id,
  bankConnectionId: connId,
  bankAccountId: iban,
  externalId,
});

const noDuplicates = () => false;

describe('pickSiblingsByIban', () => {
  it('returns empty when no other active connection shares an IBAN', () => {
    const target = conn('A', 'expired', ['NL01']);
    const others = [conn('B', 'active', ['NL99'])];
    expect(pickSiblingsByIban(target, [target, ...others]).size).toBe(0);
  });

  it('skips expired/error siblings', () => {
    const target = conn('A', 'expired', ['NL01']);
    const others = [conn('B', 'expired', ['NL01']), conn('C', 'error', ['NL01'])];
    expect(pickSiblingsByIban(target, [target, ...others]).size).toBe(0);
  });

  it('picks the most recently updated active sibling on tie', () => {
    const target = conn('A', 'expired', ['NL01']);
    const older = conn('B', 'active', ['NL01'], 1000);
    const newer = conn('C', 'active', ['NL01'], 2000);
    const map = pickSiblingsByIban(target, [target, older, newer]);
    expect(map.get('NL01')?.id).toBe('C');
  });

  it('breaks ties deterministically by id when timestamps match', () => {
    const target = conn('A', 'expired', ['NL01']);
    const b = conn('B', 'active', ['NL01'], 1000);
    const c = conn('C', 'active', ['NL01'], 1000);
    const map = pickSiblingsByIban(target, [target, c, b]);
    expect(map.get('NL01')?.id).toBe('B');
  });
});

describe('routeTxnsForDisconnect', () => {
  it('deletes every txn when there is no sibling', () => {
    const target = conn('A', 'expired', ['NL01']);
    const txns = [txn('t1', 'A', 'NL01', 'x1'), txn('t2', 'A', 'NL01', 'x2')];
    const out = routeTxnsForDisconnect({
      target,
      allConnections: [target],
      targetTxns: txns,
      siblingHasExternalId: noDuplicates,
    });
    expect(out.toReassign).toEqual([]);
    expect(out.toDelete.sort()).toEqual(['t1', 't2']);
  });

  it('reassigns txns whose IBAN has an active sibling', () => {
    const target = conn('A', 'expired', ['NL01']);
    const sibling = conn('B', 'active', ['NL01']);
    const txns = [txn('t1', 'A', 'NL01', 'x1')];
    const out = routeTxnsForDisconnect({
      target,
      allConnections: [target, sibling],
      targetTxns: txns,
      siblingHasExternalId: noDuplicates,
    });
    expect(out.toReassign).toEqual([{ txnId: 't1', newConnectionId: 'B' }]);
    expect(out.toDelete).toEqual([]);
  });

  it('drops a target txn when the sibling already has the same externalId', () => {
    const target = conn('A', 'expired', ['NL01']);
    const sibling = conn('B', 'active', ['NL01']);
    const txns = [txn('t1', 'A', 'NL01', 'shared'), txn('t2', 'A', 'NL01', 'unique')];
    const out = routeTxnsForDisconnect({
      target,
      allConnections: [target, sibling],
      targetTxns: txns,
      siblingHasExternalId: (siblingId, externalId) =>
        siblingId === 'B' && externalId === 'shared',
    });
    expect(out.toDelete).toEqual(['t1']);
    expect(out.toReassign).toEqual([{ txnId: 't2', newConnectionId: 'B' }]);
  });

  it('handles mixed accounts where only some IBANs have siblings', () => {
    const target = conn('A', 'expired', ['NL01', 'NL02']);
    const sibling = conn('B', 'active', ['NL01']); // covers NL01 only
    const txns = [
      txn('t1', 'A', 'NL01', 'x1'),
      txn('t2', 'A', 'NL02', 'x2'),
      txn('t3', 'A', null, 'x3'),
    ];
    const out = routeTxnsForDisconnect({
      target,
      allConnections: [target, sibling],
      targetTxns: txns,
      siblingHasExternalId: noDuplicates,
    });
    expect(out.toReassign).toEqual([{ txnId: 't1', newConnectionId: 'B' }]);
    expect(out.toDelete.sort()).toEqual(['t2', 't3']);
  });
});
