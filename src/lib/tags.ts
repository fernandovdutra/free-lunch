/**
 * Tag helpers shared by the web UI.
 *
 * IMPORTANT: normalization MUST stay byte-for-byte consistent with the MCP
 * server's write path (functions/src/mcp/writeTools.ts `normalizeTags`), so a
 * tag written from the web app is indistinguishable from one written via
 * `add_transaction_tags`: trim each tag, drop empties, and dedupe
 * case-sensitively while preserving first-seen order. Tags keep their
 * original casing — neither write path lowercases.
 */
export function normalizeTags(tags: string[]): string[] {
  return Array.from(new Set(tags.map((tag) => tag.trim()).filter((tag) => tag.length > 0)));
}

/**
 * Distinct tags across a set of loaded transactions, most frequent first
 * (alphabetical tiebreak). Used for suggestion chips and the tag filter sheet —
 * derived from the already-fetched window, so it costs no extra reads and
 * needs no separate tags collection.
 */
export function collectExistingTags(
  transactions: readonly { tags?: string[] | undefined }[]
): string[] {
  const counts = new Map<string, number>();
  for (const t of transactions) {
    for (const tag of t.tags ?? []) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([tag]) => tag);
}
