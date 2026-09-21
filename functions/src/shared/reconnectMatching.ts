/** Decide which connection can safely receive a fresh Enable Banking session. */
export function matchBankConnection(
  connections: Array<{ id: string; accounts: Array<{ iban?: string | null }> }>,
  sessionIbans: Set<string>,
  reconnectConnectionId?: string
): { kind: 'matched'; id: string } | { kind: 'new' } |
  { kind: 'error'; reason: 'connection_changed' | 'accounts_changed' } {
  if (reconnectConnectionId) {
    const target = connections.find((connection) => connection.id === reconnectConnectionId);
    if (!target) return { kind: 'error', reason: 'connection_changed' };
    // A partial consent must never replace the existing accounts array: the
    // omitted accounts would stop syncing, and could be lost on disconnect.
    if (target.accounts.length === 0 || target.accounts.some(
      (account) => !account.iban || !sessionIbans.has(account.iban)
    )) return { kind: 'error', reason: 'accounts_changed' };
    return { kind: 'matched', id: target.id };
  }

  // An ordinary "add bank" can reuse a connection only when its full account
  // set remains present. A partial grant creates a separate connection instead
  // of silently dropping accounts from the old one.
  const match = connections.find((connection) =>
    connection.accounts.length > 0 && connection.accounts.every(
      (account) => account.iban && sessionIbans.has(account.iban)
    )
  );
  return match ? { kind: 'matched', id: match.id } : { kind: 'new' };
}
