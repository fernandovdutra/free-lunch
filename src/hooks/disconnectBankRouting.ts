/**
 * Pure routing logic for disconnecting a bank connection. Decides which of
 * the target connection's transactions should be re-pointed onto a sibling
 * connection (preserving manual categorizations, splits, reimbursement
 * info — all metadata lives on the txn doc itself) and which should be
 * deleted. Kept as a pure function so the decision can be unit-tested
 * without a Firestore harness.
 *
 * Rules:
 *   - For each IBAN on the target connection, the surviving "sibling" is
 *     another active connection that shares that IBAN. If multiple, the
 *     most recently updated one wins (ties broken by id for determinism).
 *   - A target txn whose IBAN has a sibling moves to that sibling, UNLESS
 *     the sibling already has a txn with the same externalId — in that
 *     case the target's copy is the duplicate and we drop it.
 *   - A target txn whose IBAN has no sibling is deleted (true delete: the
 *     bank connection is going away and there's nowhere to keep them).
 */

export interface ConnectionLike {
  id: string;
  status: string;
  accounts: { iban: string }[];
  /** Optional sortable timestamp (ms or ISO string) used to break ties when
   *  multiple connections share an IBAN. Larger = more recent = wins. */
  updatedAtMs?: number | undefined;
}

export interface TxnLike {
  id: string;
  bankConnectionId: string;
  bankAccountId: string | null;
  externalId: string | null;
}

export interface RouteDecision {
  toReassign: { txnId: string; newConnectionId: string }[];
  toDelete: string[];
}

export function pickSiblingsByIban(
  target: ConnectionLike,
  allConnections: ConnectionLike[]
): Map<string, ConnectionLike> {
  const targetIbans = new Set(target.accounts.map((a) => a.iban));
  const candidates = allConnections.filter(
    (c) => c.id !== target.id && c.status === 'active'
  );

  const result = new Map<string, ConnectionLike>();
  for (const iban of targetIbans) {
    const matches = candidates.filter((c) => c.accounts.some((a) => a.iban === iban));
    if (matches.length === 0) continue;
    matches.sort((a, b) => {
      const at = a.updatedAtMs ?? 0;
      const bt = b.updatedAtMs ?? 0;
      if (bt !== at) return bt - at;
      return a.id.localeCompare(b.id);
    });
    const winner = matches[0];
    if (winner) result.set(iban, winner);
  }
  return result;
}

export function routeTxnsForDisconnect(args: {
  target: ConnectionLike;
  allConnections: ConnectionLike[];
  targetTxns: TxnLike[];
  /** For each (siblingConnectionId, externalId) pair that already exists on
   *  the surviving sibling, mark it so we don't re-introduce duplicates. */
  siblingHasExternalId: (siblingConnectionId: string, externalId: string) => boolean;
}): RouteDecision {
  const { target, allConnections, targetTxns, siblingHasExternalId } = args;
  const siblingByIban = pickSiblingsByIban(target, allConnections);

  const toReassign: RouteDecision['toReassign'] = [];
  const toDelete: string[] = [];

  for (const txn of targetTxns) {
    const sibling = txn.bankAccountId ? siblingByIban.get(txn.bankAccountId) : undefined;
    if (!sibling) {
      toDelete.push(txn.id);
      continue;
    }
    if (txn.externalId && siblingHasExternalId(sibling.id, txn.externalId)) {
      // Sibling already has the canonical row — drop this duplicate.
      toDelete.push(txn.id);
      continue;
    }
    toReassign.push({ txnId: txn.id, newConnectionId: sibling.id });
  }

  return { toReassign, toDelete };
}
