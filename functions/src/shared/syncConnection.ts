import { createHash } from 'node:crypto';
import { HttpsError } from 'firebase-functions/v2/https';
import {
  getFirestore,
  FieldValue,
  Timestamp,
  WriteBatch,
  type CollectionReference,
  type DocumentReference,
  type Firestore,
} from 'firebase-admin/firestore';
import { EnableBankingClient } from '../enableBanking/client.js';
import type { EnableBankingTransaction } from '../enableBanking/types.js';
import { config } from '../config.js';
import { Categorizer } from '../categorization/index.js';
import {
  amsterdamDayKey,
  amsterdamNoon,
  amsterdamStartOfDay,
  amsterdamToday,
  fromAmsterdamWallClock,
  shiftDayKey,
} from './amsterdamTime.js';
import { balanceToCashHolding, todayIso, upsertHistoryPoint } from './holdings.js';
import type { HistoryPoint } from './holdings.js';

// SEPA inserts these placeholders when the payer supplies no reference, so the
// bank's entry_reference is not unique across such transactions.
const REFERENCE_PLACEHOLDERS = new Set(['NOTPROVIDED', 'NOT PROVIDED', 'NOTAVAILABLE']);

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Derive a stable, unique identifier for a bank transaction.
 *
 * `entry_reference` is used directly when the bank provides a real value, but
 * some banks omit it or return a placeholder (e.g. ABN AMRO for reference-less
 * SEPA transfers). In that case all such transactions would share the same
 * `externalId` and collide during de-duplication, so a deterministic synthetic
 * id is hashed from stable transaction fields (booking date, amount, currency,
 * direction, counterparty names/IBANs, remittance text) instead.
 *
 * NOTE: the hash inputs must never change — existing documents in Firestore
 * store `gen_<hash>` externalIds computed with exactly this recipe, and
 * de-duplication on re-sync depends on reproducing them.
 */
export function getStableExternalId(tx: EnableBankingTransaction): string {
  const ref = tx.entry_reference?.trim();
  if (ref && !REFERENCE_PLACEHOLDERS.has(ref.toUpperCase())) {
    return ref;
  }

  const remittance =
    tx.remittance_information ||
    tx.remittance_information_unstructured_array ||
    (tx.remittance_information_unstructured ? [tx.remittance_information_unstructured] : []);

  const parts = [
    tx.booking_date || tx.value_date || tx.transaction_date || '',
    tx.transaction_amount?.amount || '',
    tx.transaction_amount?.currency || '',
    tx.credit_debit_indicator || '',
    tx.creditor?.name || '',
    tx.debtor?.name || '',
    tx.creditor_account?.iban || '',
    tx.debtor_account?.iban || '',
    remittance.join('|'),
  ];

  // The join separator is a NUL character (written escaped so the file stays
  // valid text). This is load-bearing legacy compatibility: production
  // documents store gen_ ids hashed with exactly this separator, and changing
  // it would make every legacy externalId mismatch on the next sync (mass
  // duplicates). Pinned by a golden-hash regression test.
  const hash = createHash('sha1').update(parts.join('\u0000')).digest('hex');
  return `gen_${hash}`;
}

/**
 * Deterministic ordering key for transactions whose synthetic hash collides.
 * Uses raw fields that are NOT part of the hash so that near-identical
 * transactions (e.g. one pending, one booked) get a stable relative order
 * regardless of the order the bank returned them in.
 */
function syntheticTiebreaker(tx: EnableBankingTransaction): string {
  return [
    tx.status ?? '',
    tx.entry_reference ?? '',
    tx.transaction_date ?? '',
    tx.value_date ?? '',
  ].join('|');
}

export interface ExternalIdAssignment {
  tx: EnableBankingTransaction;
  externalId: string;
}

/**
 * Assign every fetched transaction a unique externalId, independent of the
 * order the bank returned the payload in.
 *
 * Transactions with a real `entry_reference` keep it as-is. Reference-less
 * transactions get the synthetic `gen_<hash>` id; when several transactions in
 * one fetch share the same hash (genuinely identical reference-less
 * transactions), occurrences after the first are suffixed `#1`, `#2`, … in a
 * deterministic order (sorted by {@link syntheticTiebreaker}), so re-fetching
 * the same set — in any order — reproduces the same ids.
 *
 * Residual limitation (inherent, documented honestly): identical
 * reference-less transactions are indistinguishable, so the suffix is an
 * occurrence index. If the *count* of identical transactions visible in the
 * fetch window changes between syncs (e.g. one falls out of the window while a
 * new identical one appears on the same booking date), a suffix can be
 * reassigned to a different physical transaction. Because the hash includes
 * the booking date, this can only happen among same-day identical
 * transactions at the edges of the fetch window.
 */
export function assignStableExternalIds(
  transactions: EnableBankingTransaction[]
): ExternalIdAssignment[] {
  const baseIds = transactions.map(getStableExternalId);
  const assigned = [...baseIds];

  // Group indices of colliding synthetic ids.
  const groups = new Map<string, number[]>();
  baseIds.forEach((id, index) => {
    if (!id.startsWith('gen_')) return;
    const group = groups.get(id);
    if (group) group.push(index);
    else groups.set(id, [index]);
  });

  for (const indices of groups.values()) {
    if (indices.length < 2) continue;
    const ordered = [...indices].sort((a, b) => {
      const ka = syntheticTiebreaker(transactions[a]);
      const kb = syntheticTiebreaker(transactions[b]);
      if (ka < kb) return -1;
      if (ka > kb) return 1;
      return 0; // fully identical transactions are interchangeable
    });
    ordered.forEach((originalIndex, occurrence) => {
      if (occurrence > 0) assigned[originalIndex] = `${baseIds[originalIndex]}#${occurrence}`;
    });
  }

  return transactions.map((tx, index) => ({ tx, externalId: assigned[index] }));
}

/**
 * Deterministic Firestore document id for a bank transaction, derived from its
 * externalId. Re-syncing the same external transaction always targets the same
 * document, which makes inserts naturally idempotent (create-if-absent) even
 * across concurrent syncs.
 *
 * The externalId is hashed rather than used directly because bank references
 * may contain characters that are invalid in Firestore document ids (`/`) or
 * exceed length limits. 128 bits of SHA-256 make collisions a non-concern.
 */
export function transactionDocId(externalId: string): string {
  return `tx_${createHash('sha256').update(externalId).digest('hex').slice(0, 32)}`;
}

export interface SyncResult {
  accountId: string;
  newTransactions: number;
  updatedTransactions: number;
  errors: string[];
}

export interface ConnectionSyncResult {
  success: boolean;
  results: SyncResult[];
  totalNew: number;
  totalUpdated: number;
}

/**
 * Build a concise, UI-friendly summary of per-account sync errors, suitable
 * for storing in `lastAutoSyncError` (rendered verbatim by the settings UI).
 */
export function summarizeSyncErrors(results: SyncResult[]): string {
  const parts = results
    .filter((r) => r.errors.length > 0)
    .map(
      (r) =>
        `${r.accountId}: ${r.errors[0]}${r.errors.length > 1 ? ` (+${r.errors.length - 1} more)` : ''}`
    );
  const summary = parts.join('; ') || 'Sync reported errors';
  return summary.length > 300 ? `${summary.slice(0, 297)}...` : summary;
}

// Firestore batch limit is 500 operations
const BATCH_SIZE = 249; // Each item = 2 writes (transaction + raw); 249 × 2 = 498, safely under Firestore's 500 limit

// Maximum lookback when deriving the fetch window from a stale lastSync.
// Enable Banking rejects date_from older than ~90 days for unattended access;
// 85 leaves headroom. (The initial sync's 365-day window is different: it runs
// inside the authorization window, where banks allow the full history.)
const MAX_SYNC_LOOKBACK_DAYS = 85;

// Extra days added on both sides of the fetch window when bulk-loading
// existing externalIds, to absorb timezone drift between the bank's dates and
// the locally-constructed `bookingDate` timestamps.
const DEDUP_WINDOW_BUFFER_DAYS = 2;

// An ICS statement only matches a synced lump-sum debit when the debit's
// booking date falls inside this window around the statement date. ICS issues
// the statement first and direct-debits the linked account afterwards
// (typically within a few weeks), hence the asymmetric window.
const ICS_MATCH_MAX_DAYS_BEFORE_STATEMENT = 7;
const ICS_MATCH_MAX_DAYS_AFTER_STATEMENT = 35;

function pointDateToIso(date: Timestamp | string): string {
  return date instanceof Timestamp ? date.toDate().toISOString().slice(0, 10) : date.slice(0, 10);
}

/** Midnight-UTC Timestamp for an ISO `YYYY-MM-DD`, matching how the client
 * mutations stamp history points. */
function isoToTimestamp(iso: string): Timestamp {
  return Timestamp.fromDate(new Date(`${iso}T00:00:00.000Z`));
}

/** Amsterdam-noon Timestamp for a bank `YYYY-MM-DD` booking date — the same
 * convention `transformTransaction` uses for the stored `bookingDate`.
 * (Amsterdam, not server-local: Cloud Functions run in UTC, and noon keeps
 * the instant on the same calendar day in both zones.) */
function bookingDateToTimestamp(iso: string): Timestamp {
  return Timestamp.fromDate(amsterdamNoon(iso));
}

/**
 * Upsert the bank-synced Cash holding for an account from its latest balance,
 * reusing the `balanceToCashHolding` mapper. Keyed deterministically by the
 * account uid (`bank-${accountUid}`) so repeated syncs update one holding
 * rather than duplicating. These holdings are `updateSource: 'bank'`; the
 * write shape mirrors the client holding mutations (history points stamped as
 * Timestamps, denormalized `value`/`lastValueAt`).
 */
async function upsertBankCashHolding(
  db: Firestore,
  userId: string,
  params: {
    accountUid: string;
    name: string;
    platform: string;
    amount: number;
    connectionId: string;
  }
): Promise<void> {
  const { accountUid, name, platform, amount, connectionId } = params;
  const ref = db.collection('users').doc(userId).collection('holdings').doc(`bank-${accountUid}`);

  const date = todayIso();
  const existing = await ref.get();

  if (!existing.exists) {
    const seed = balanceToCashHolding(amount, { name, platform, date });
    const ts = isoToTimestamp(date);
    await ref.set({
      name: seed.name,
      platform: seed.platform,
      type: seed.type,
      kind: seed.kind,
      value: seed.value,
      cost: seed.cost,
      units: seed.units,
      liquidity: seed.liquidity,
      updateSource: seed.updateSource,
      notes: seed.notes,
      symbol: seed.symbol,
      bankConnectionId: connectionId,
      bankAccountUid: accountUid,
      history: seed.history.map((p) => ({ date: isoToTimestamp(p.date), value: p.value })),
      lastValueAt: ts,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return;
  }

  // Upsert today's point into the existing history (one point per day) so the
  // 4×/day auto-sync doesn't bloat the series with intraday duplicates.
  const stored =
    (existing.data()?.history as Array<{ date: Timestamp | string; value: number }>) ?? [];
  const isoHistory: HistoryPoint[] = stored.map((p) => ({
    date: pointDateToIso(p.date),
    value: p.value,
  }));
  const nextHistory = upsertHistoryPoint(isoHistory, { date, value: amount }).map((p) => ({
    date: isoToTimestamp(p.date),
    value: p.value,
  }));

  await ref.update({
    value: amount,
    history: nextHistory,
    updateSource: 'bank',
    bankConnectionId: connectionId,
    bankAccountUid: accountUid,
    lastValueAt: isoToTimestamp(date),
    updatedAt: FieldValue.serverTimestamp(),
  });
}

/**
 * Resolve the date range to fetch from the bank for this sync.
 *
 * All dates are AMSTERDAM calendar dates: the bank's `date_from`/`date_to`
 * params are day-granular and ABN AMRO books on the Dutch calendar, while the
 * Functions runtime clock is UTC. Around Amsterdam midnight the UTC date is
 * still "yesterday" (from 22:00/23:00 UTC), so deriving `dateTo` from the
 * server-local date would briefly exclude same-day transactions.
 */
function resolveSyncWindow(
  connection: FirebaseFirestore.DocumentData,
  now: Date = new Date()
): {
  dateFrom: string;
  dateTo: string;
} {
  const dateTo = amsterdamToday(now);

  let dateFrom: string;
  if (connection.lastSync) {
    const lastSync =
      connection.lastSync instanceof Timestamp
        ? connection.lastSync.toDate()
        : new Date(connection.lastSync);
    // Overlap by 1 (Amsterdam) day.
    const overlapFrom = shiftDayKey(amsterdamDayKey(lastSync), -1);

    // Clamp the lookback: lastSync is frozen while syncs fail, and Enable
    // Banking rejects date_from older than ~90 days outside the initial auth
    // window — without a clamp, one persistently-failing account would grow
    // the window until the fetch itself starts failing for every account on
    // the connection.
    const maxLookback = shiftDayKey(dateTo, -MAX_SYNC_LOOKBACK_DAYS);
    // ISO day keys compare chronologically as strings.
    dateFrom = overlapFrom > maxLookback ? overlapFrom : maxLookback;
  } else {
    // Fetch up to 1 year of history on initial sync (banks typically support this during auth window)
    dateFrom = shiftDayKey(dateTo, -365);
  }

  return { dateFrom, dateTo };
}

/** Fetch all transactions for an account in the window, following pagination. */
async function fetchAllTransactions(
  client: EnableBankingClient,
  accountUid: string,
  dateFrom: string,
  dateTo: string
): Promise<EnableBankingTransaction[]> {
  let continuationKey: string | undefined;
  const allTransactions: EnableBankingTransaction[] = [];

  do {
    const response = await client.getTransactions(accountUid, {
      date_from: dateFrom,
      date_to: dateTo,
      continuation_key: continuationKey,
    });

    allTransactions.push(...response.transactions);
    continuationKey = response.continuation_key;
  } while (continuationKey);

  return allTransactions;
}

interface ExistingTransactionInfo {
  ref: DocumentReference;
  status?: string;
}

/**
 * Bulk-load the externalIds of transactions already stored in the fetch
 * window: bounded range queries per account per sync (on the automatically
 * indexed `bookingDate` field, so no composite index is needed) instead of one
 * indexed query per fetched transaction. This is how legacy documents —
 * written with random ids before deterministic ids existed — keep being
 * de-duplicated without a migration.
 *
 * Two queries are needed because Firestore range queries are type-bracketed:
 * `bookingDate` is a Timestamp on normally-written docs, but the old
 * pending→booked update path clobbered it to a raw `yyyy-MM-dd` STRING on the
 * docs it touched, and those would be invisible to the Timestamp range. ISO
 * date strings sort chronologically, so an equivalent string-bounded range
 * over the same window picks them up.
 */
async function loadExistingTransactionsByExternalId(
  transactionsRef: CollectionReference,
  dateFrom: string,
  dateTo: string
): Promise<Map<string, ExistingTransactionInfo>> {
  // Buffered Amsterdam day keys bounding the window. The Timestamp bounds are
  // Amsterdam midnights of those days; with `bookingDate` stored at Amsterdam
  // noon, the ±2-day buffer keeps every stored variant inside the range —
  // including legacy documents written as server-local (UTC) noon.
  const startKey = shiftDayKey(dateFrom, -DEDUP_WINDOW_BUFFER_DAYS);
  const endKey = shiftDayKey(dateTo, DEDUP_WINDOW_BUFFER_DAYS + 1);

  const [timestampSnapshot, stringSnapshot] = await Promise.all([
    transactionsRef
      .where('bookingDate', '>=', Timestamp.fromDate(amsterdamStartOfDay(startKey)))
      .where('bookingDate', '<=', Timestamp.fromDate(amsterdamStartOfDay(endKey)))
      .select('externalId', 'status')
      .get(),
    transactionsRef
      .where('bookingDate', '>=', startKey)
      .where('bookingDate', '<=', endKey)
      .select('externalId', 'status')
      .get(),
  ]);

  const byExternalId = new Map<string, ExistingTransactionInfo>();
  for (const doc of [...timestampSnapshot.docs, ...stringSnapshot.docs]) {
    const data = doc.data();
    const externalId = data.externalId as string | undefined;
    if (externalId) {
      byExternalId.set(externalId, { ref: doc.ref, status: data.status as string | undefined });
    }
  }
  return byExternalId;
}

interface PendingTransaction {
  tx: EnableBankingTransaction;
  externalId: string;
  docId: string;
  transactionData: ReturnType<typeof transformTransaction>;
}

/** Firestore surfaces failed create-preconditions as gRPC 6 / ALREADY_EXISTS. */
function isAlreadyExistsError(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false;
  const e = err as { code?: unknown; message?: unknown };
  return (
    e.code === 6 ||
    e.code === 'already-exists' ||
    (typeof e.message === 'string' && /already[ _-]?exists/i.test(e.message))
  );
}

/**
 * Write the new transactions (plus raw audit copies) at their deterministic
 * document ids using create-only semantics, and return the subset that was
 * actually created.
 *
 * `create()` fails with ALREADY_EXISTS when the document is already there, so
 * a concurrent sync that raced past the bulk existence check cannot insert a
 * duplicate — and, just as important, cannot overwrite a document the user may
 * already have edited (categoryId, notes, tags, …). Because a batch is
 * atomic, a single conflict aborts the whole batch; in that case we retry the
 * chunk document-by-document, skipping only the docs that already exist.
 */
async function commitNewTransactions(
  db: Firestore,
  transactionsRef: CollectionReference,
  rawTransactionsRef: CollectionReference,
  accountUid: string,
  connectionId: string,
  items: PendingTransaction[]
): Promise<PendingTransaction[]> {
  const buildTransactionDoc = (item: PendingTransaction) => ({
    ...item.transactionData,
    importedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  // Raw audit copy shares the transaction's doc id, so it is idempotent too.
  const buildRawDoc = (item: PendingTransaction) => ({
    transactionId: item.docId,
    accountUid,
    connectionId,
    rawData: item.tx,
    importedAt: FieldValue.serverTimestamp(),
  });

  const created: PendingTransaction[] = [];

  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const chunk = items.slice(i, i + BATCH_SIZE);
    const batch: WriteBatch = db.batch();

    for (const item of chunk) {
      batch.create(transactionsRef.doc(item.docId), buildTransactionDoc(item));
      batch.set(rawTransactionsRef.doc(item.docId), buildRawDoc(item));
    }

    try {
      await batch.commit();
      created.push(...chunk);
    } catch (err) {
      if (!isAlreadyExistsError(err)) throw err;
      // A concurrent sync created at least one of these documents between our
      // bulk existence check and this commit. Retry per document; existing
      // documents are left untouched.
      for (const item of chunk) {
        try {
          await transactionsRef.doc(item.docId).create(buildTransactionDoc(item));
          await rawTransactionsRef.doc(item.docId).set(buildRawDoc(item));
          created.push(item);
        } catch (itemErr) {
          if (!isAlreadyExistsError(itemErr)) throw itemErr;
        }
      }
    }
  }

  return created;
}

/**
 * LLM categorization pass: batch-categorize transactions no rule/merchant
 * matched. Best-effort — failures are logged and the sync continues.
 */
async function applyLlmCategorization(
  categorizer: Categorizer,
  items: PendingTransaction[]
): Promise<void> {
  const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicApiKey) return;

  const uncategorized = items
    .map((item, idx) => ({ item, idx }))
    .filter(({ item }) => item.transactionData.categorySource === 'none');
  if (uncategorized.length === 0) return;

  try {
    const llmResults = await categorizer.categorizeBatchWithLLM(
      uncategorized.map(({ item, idx }) => ({
        index: idx,
        description: item.transactionData.description,
        counterparty: item.transactionData.counterparty,
        amount: item.transactionData.amount,
      })),
      anthropicApiKey
    );

    for (const [idx, llmResult] of llmResults) {
      if (llmResult.categoryId) {
        items[idx].transactionData.categoryId = llmResult.categoryId;
        items[idx].transactionData.categoryConfidence = llmResult.confidence;
        items[idx].transactionData.categorySource = 'llm';
      }
    }

    console.log(
      `LLM categorized ${llmResults.size}/${uncategorized.length} uncategorized transactions`
    );
  } catch (err) {
    console.warn('LLM categorization failed, continuing without:', err);
  }
}

/**
 * Pick the ICS statement a lump-sum debit belongs to: only statements whose
 * date is close enough to the debit's booking date qualify (ICS statements are
 * issued first, then direct-debited within a few weeks), and among qualifying
 * statements the closest-dated one wins. This prevents an unrelated
 * transaction that merely has an equal amount from being auto-excluded.
 */
export function selectIcsStatementMatch<T extends { statementDate: Date }>(
  candidates: T[],
  bookingDate: Date
): T | null {
  let best: T | null = null;
  let bestDistance = Infinity;

  for (const candidate of candidates) {
    const diffDays = (bookingDate.getTime() - candidate.statementDate.getTime()) / MS_PER_DAY;
    if (
      diffDays < -ICS_MATCH_MAX_DAYS_BEFORE_STATEMENT ||
      diffDays > ICS_MATCH_MAX_DAYS_AFTER_STATEMENT
    ) {
      continue;
    }
    const distance = Math.abs(diffDays);
    if (distance < bestDistance) {
      best = candidate;
      bestDistance = distance;
    }
  }

  return best;
}

function isIcsLumpSumCandidate(transactionData: ReturnType<typeof transformTransaction>): boolean {
  if (transactionData.amount >= 0) return false;
  const desc = (transactionData.description ?? '').toUpperCase();
  const cp = (transactionData.counterparty ?? '').toUpperCase();
  const searchFields = desc + ' ' + cp;
  return (
    searchFields.includes('INT CARD SERVICES') ||
    searchFields.includes('INTERNATIONAL CARD SERVICES') ||
    searchFields.includes('ICS')
  );
}

/**
 * Check newly synced transactions for ICS lump sums that should be excluded
 * (when a PDF was imported before the bank sync brought in the lump sum).
 * Matching requires both an equal amount (±0.05) and date proximity — see
 * {@link selectIcsStatementMatch}.
 */
async function applyIcsLumpSumExclusions(
  db: Firestore,
  userId: string,
  transactionsRef: CollectionReference,
  created: PendingTransaction[]
): Promise<void> {
  for (const item of created) {
    const { transactionData } = item;
    if (!isIcsLumpSumCandidate(transactionData)) continue;

    // Check if there's an imported ICS statement matching this amount
    const absAmount = Math.abs(transactionData.amount);
    const statementsSnapshot = await db
      .collection('users')
      .doc(userId)
      .collection('icsStatements')
      .where('totalNewExpenses', '>=', absAmount - 0.05)
      .where('totalNewExpenses', '<=', absAmount + 0.05)
      .get();
    if (statementsSnapshot.empty) continue;

    const candidates = statementsSnapshot.docs.flatMap((doc) => {
      const raw = doc.data().statementDate;
      const statementDate =
        raw instanceof Timestamp ? raw.toDate() : raw ? new Date(raw as string | Date) : null;
      // A statement without a usable date can't be matched safely — skip it.
      return statementDate && !Number.isNaN(statementDate.getTime())
        ? [{ doc, statementDate }]
        : [];
    });

    const match = selectIcsStatementMatch(candidates, transactionData.bookingDate.toDate());
    if (!match) continue;

    await transactionsRef.doc(item.docId).update({
      excludeFromTotals: true,
      icsStatementId: match.doc.id,
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Also update the statement record with the lump sum ID if not already set
    if (!match.doc.data().lumpSumTransactionId) {
      await match.doc.ref.update({ lumpSumTransactionId: item.docId });
    }

    console.log(
      `Auto-excluded ICS lump sum transaction (${transactionData.externalId}) ` +
        `matching statement ${match.doc.id}`
    );
  }
}

/** Fetch the account's balance and mirror it onto the connection + holdings. */
async function syncAccountBalance(
  db: Firestore,
  client: EnableBankingClient,
  userId: string,
  connectionRef: DocumentReference,
  connection: FirebaseFirestore.DocumentData,
  connectionId: string,
  account: { uid: string; iban: string }
): Promise<void> {
  const balanceResponse = await client.getBalances(account.uid);

  // Find the most relevant balance (prefer CLBD = closing booked balance)
  const primaryBalance =
    balanceResponse.balances.find((b) => b.balance_type === 'CLBD') ||
    balanceResponse.balances.find((b) => b.balance_type === 'AVBL') ||
    balanceResponse.balances[0];
  if (!primaryBalance) return;

  const amount = parseFloat(primaryBalance.balance_amount.amount);

  // Update the account with balance info
  await connectionRef.update({
    [`accountBalances.${account.uid}`]: {
      amount,
      currency: primaryBalance.balance_amount.currency,
      type: primaryBalance.balance_type,
      referenceDate: primaryBalance.reference_date || new Date().toISOString().split('T')[0],
      updatedAt: FieldValue.serverTimestamp(),
    },
  });

  // Upsert a bank-synced Cash holding for this account (Wealth module).
  const bankName = (connection.bankName as string) || 'Bank';
  const ibanTail = account.iban ? account.iban.slice(-4) : '';
  await upsertBankCashHolding(db, userId, {
    accountUid: account.uid,
    name: ibanTail ? `${bankName} ••${ibanTail}` : bankName,
    platform: bankName,
    amount,
    connectionId,
  });
}

/**
 * Core bank-connection sync routine, shared by the on-demand callable
 * (`syncTransactions`) and the scheduled background sync (`autoSyncTransactions`).
 *
 * Throws `HttpsError('failed-precondition')` when the bank consent has expired
 * (and marks the connection `status: 'expired'`); callers should handle that.
 *
 * Returns `success: false` when any account reported errors — callers must
 * surface this (the scheduled sync stamps `lastAutoSyncError`).
 */
export async function syncBankConnection(
  userId: string,
  connectionId: string
): Promise<ConnectionSyncResult> {
  const db = getFirestore();

  // Get bank connection
  const connectionRef = db
    .collection('users')
    .doc(userId)
    .collection('bankConnections')
    .doc(connectionId);

  const connectionDoc = await connectionRef.get();

  if (!connectionDoc.exists) {
    throw new HttpsError('not-found', 'Bank connection not found');
  }

  const connection = connectionDoc.data()!;

  // Check if consent is still valid
  const consentExpiry =
    connection.consentExpiresAt instanceof Timestamp
      ? connection.consentExpiresAt.toDate()
      : new Date(connection.consentExpiresAt);
  if (new Date() > consentExpiry) {
    await connectionRef.update({
      status: 'expired',
      updatedAt: FieldValue.serverTimestamp(),
    });
    throw new HttpsError('failed-precondition', 'Bank consent has expired');
  }

  const client = new EnableBankingClient(config.enableBankingApiUrl, {
    privateKey: config.enableBankingPrivateKey,
    applicationId: config.enableBankingAppId,
  });

  // Initialize categorizer for this user
  const categorizer = new Categorizer(userId);
  await categorizer.initialize();

  const results: SyncResult[] = [];
  const accounts = connection.accounts as Array<{ uid: string; iban: string }>;

  const transactionsRef = db.collection('users').doc(userId).collection('transactions');
  const rawTransactionsRef = db.collection('users').doc(userId).collection('rawBankTransactions');

  // Sync each account
  for (const account of accounts) {
    const result: SyncResult = {
      accountId: account.uid,
      newTransactions: 0,
      updatedTransactions: 0,
      errors: [],
    };

    try {
      const { dateFrom, dateTo } = resolveSyncWindow(connection);

      const allTransactions = await fetchAllTransactions(client, account.uid, dateFrom, dateTo);

      // ONE bulk lookup of already-stored externalIds in the fetch window
      // (catches legacy random-id documents), instead of a per-transaction
      // query. Combined with deterministic doc ids + create-only writes below,
      // this makes the sync idempotent even under concurrent runs.
      const existingByExternalId = await loadExistingTransactionsByExternalId(
        transactionsRef,
        dateFrom,
        dateTo
      );

      // Collect new transactions for batch processing
      const newTransactionsToCreate: PendingTransaction[] = [];
      // Guard against the bank returning the same row twice in one fetch
      // (e.g. pagination overlap): the first occurrence wins. Note the
      // limitation: this only catches repeats of REAL entry_references —
      // duplicated reference-less rows already received distinct `#n` suffixes
      // in assignStableExternalIds (they are indistinguishable from genuinely
      // identical transactions), matching the pre-refactor behavior.
      const seenInFetch = new Set<string>();

      for (const { tx, externalId } of assignStableExternalIds(allTransactions)) {
        try {
          if (seenInFetch.has(externalId)) continue;
          seenInFetch.add(externalId);

          const existing = existingByExternalId.get(externalId);
          if (existing) {
            // Only update if status changed from pending to booked — never
            // touch anything else on an existing document (user edits like
            // categoryId/notes/tags must survive re-syncs).
            if (existing.status === 'pending' && tx.status === 'booked') {
              await existing.ref.update({
                status: tx.status,
                ...(tx.booking_date
                  ? { bookingDate: bookingDateToTimestamp(tx.booking_date) }
                  : {}),
                updatedAt: FieldValue.serverTimestamp(),
              });
              result.updatedTransactions++;
            }
            continue;
          }

          const transactionData = transformTransaction(tx, account.iban, connectionId, externalId);

          // Apply auto-categorization
          const categorizationResult = categorizer.categorize(
            transactionData.description,
            transactionData.counterparty
          );

          transactionData.categoryId = categorizationResult.categoryId;
          transactionData.categoryConfidence = categorizationResult.confidence;
          transactionData.categorySource =
            categorizationResult.source === 'none' ? 'none' : categorizationResult.source;

          newTransactionsToCreate.push({
            tx,
            externalId,
            docId: transactionDocId(externalId),
            transactionData,
          });
        } catch (txErr) {
          // Isolate per-transaction failures so one bad record cannot abort the
          // account loop (which would discard every transaction queued so far).
          const msg = txErr instanceof Error ? txErr.message : 'Unknown error';
          result.errors.push(`Skipped transaction: ${msg}`);
          console.warn('Skipped malformed transaction during sync:', msg);
        }
      }

      await applyLlmCategorization(categorizer, newTransactionsToCreate);

      const created = await commitNewTransactions(
        db,
        transactionsRef,
        rawTransactionsRef,
        account.uid,
        connectionId,
        newTransactionsToCreate
      );
      result.newTransactions += created.length;

      await applyIcsLumpSumExclusions(db, userId, transactionsRef, created);

      // Fetch and store account balances
      try {
        await syncAccountBalance(
          db,
          client,
          userId,
          connectionRef,
          connection,
          connectionId,
          account
        );
      } catch (balanceErr) {
        console.warn(`Failed to fetch balance for account ${account.uid}:`, balanceErr);
        // Non-fatal - continue with sync
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown error';
      result.errors.push(error);
      console.error(`Error syncing account ${account.uid}:`, error);
    }

    results.push(result);
  }

  const success = results.every((r) => r.errors.length === 0);

  // Only advance the lastSync watermark on a fully clean run: if an account
  // failed, keeping the old watermark makes the next sync re-fetch the failed
  // window, and the idempotent dedup above makes that re-fetch safe.
  await connectionRef.update({
    ...(success ? { lastSync: FieldValue.serverTimestamp() } : {}),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return {
    success,
    results,
    totalNew: results.reduce((sum, r) => sum + r.newTransactions, 0),
    totalUpdated: results.reduce((sum, r) => sum + r.updatedTransactions, 0),
  };
}

/**
 * Returns the fullest unparsed remittance text the bank provides, with all
 * lines joined. Unlike the parsed `description`, this keeps disambiguating
 * detail (e.g. the SEPA `Omschrijving:` line) intact.
 */
export function extractBankDescription(tx: EnableBankingTransaction): string | null {
  const lines = tx.remittance_information || tx.remittance_information_unstructured_array;
  if (lines && lines.length > 0) {
    return lines.join('\n');
  }
  if (tx.remittance_information_unstructured) {
    return tx.remittance_information_unstructured;
  }
  return null;
}

export function transformTransaction(
  tx: EnableBankingTransaction,
  accountIban: string,
  connectionId: string,
  externalId: string
) {
  // 1. Parse amount (always positive from API)
  const rawAmount = parseFloat(tx.transaction_amount.amount);

  // 2. Determine direction using multiple strategies in priority order:
  // Strategy A: Use credit_debit_indicator if present (most reliable - standard PSD2 field)
  // Strategy B: Check IBAN to see if user is debtor or creditor
  // Strategy C: Fallback to checking if creditor name exists

  let isDebit: boolean; // true = money going out (expense), false = money coming in (income)

  if (tx.credit_debit_indicator) {
    // DBIT = debit = money out = expense, CRDT = credit = money in = income
    isDebit = tx.credit_debit_indicator === 'DBIT';
  } else {
    // Fallback: check IBAN matching
    const userIsDebtor = tx.debtor_account?.iban === accountIban;
    const userIsCreditor = tx.creditor_account?.iban === accountIban;

    if (userIsDebtor || userIsCreditor) {
      // If user's account is in debtor_account, they sent money (expense)
      isDebit = userIsDebtor;
    } else {
      // Last fallback: if creditor name exists, assume we paid them (expense)
      isDebit = !!tx.creditor?.name;
    }
  }

  // 3. Set amount sign: negative for expenses (debit), positive for income (credit)
  const amount = isDebit ? -Math.abs(rawAmount) : Math.abs(rawAmount);

  // 4. Get counterparty: for debits (expenses), show who we paid; for credits (income), show who paid us
  let counterparty = isDebit ? tx.creditor?.name || null : tx.debtor?.name || null;

  // 5. Extract description from remittance_information
  // The API returns remittance_information as an array with multiple lines
  const remittanceInfo =
    tx.remittance_information || tx.remittance_information_unstructured_array || [];
  const remittanceText = tx.remittance_information_unstructured || '';

  let description = 'Bank transaction';

  if (remittanceText) {
    description = remittanceText;
  } else if (remittanceInfo.length > 0) {
    // For POS transactions, the format is often:
    // ["BEA, Apple Pay", "Albert Heijn 1657,PAS462", "NR:BS158124, 31.01.26/15:33", "EINDHOVEN"]
    // The merchant name is typically in the second line for POS, or first line for others

    // Check if first line indicates POS/card payment
    const firstLine = remittanceInfo[0] || '';
    const isPOS =
      firstLine.startsWith('BEA') ||
      firstLine.includes('Apple Pay') ||
      firstLine.includes('Google Pay');

    if (isPOS && remittanceInfo.length > 1) {
      // For POS: use second line as description (contains merchant name)
      // Extract just the merchant name (before any comma with PAS number)
      const merchantLine = remittanceInfo[1] || '';
      const merchantMatch = merchantLine.match(/^([^,]+)/);
      description = merchantMatch ? merchantMatch[1].trim() : merchantLine;

      // Also use as counterparty if not set
      if (!counterparty) {
        counterparty = description;
      }
    } else if (firstLine.startsWith('SEPA') && remittanceInfo.length > 3) {
      // For SEPA: look for "Naam:" line which contains the merchant name
      const naamLine = remittanceInfo.find((line) => line.startsWith('Naam:'));
      if (naamLine) {
        description = naamLine.replace('Naam:', '').trim();
        if (!counterparty) {
          counterparty = description;
        }
      } else {
        // Fallback: use first non-SEPA line
        description =
          remittanceInfo.find(
            (line) =>
              !line.startsWith('SEPA') && !line.startsWith('IBAN') && !line.startsWith('BIC')
          ) || firstLine;
      }
    } else {
      // Generic: join first 2 lines
      description = remittanceInfo.slice(0, 2).join(' - ');
    }
  } else if (tx.bank_transaction_code) {
    // Fallback to bank_transaction_code
    if (typeof tx.bank_transaction_code === 'string') {
      description = tx.bank_transaction_code;
    } else if (typeof tx.bank_transaction_code === 'object' && tx.bank_transaction_code !== null) {
      const btc = tx.bank_transaction_code as { description?: string; code?: string };
      description = btc.description || `Transaction ${btc.code || ''}`.trim();
    }
  }

  // Use counterparty as description if description is still generic
  if (
    counterparty &&
    (description === 'Bank transaction' ||
      description.startsWith('SEPA iDEAL') ||
      !description.trim())
  ) {
    description = counterparty;
  }

  // 6. Parse booking date (official bank date)
  const bookingDateStr = tx.booking_date || tx.value_date || tx.transaction_date;
  if (!bookingDateStr) {
    throw new Error('Transaction has no date');
  }

  // Parse booking date at Amsterdam noon (date-only field; noon keeps the
  // instant on the same calendar day in any nearby zone).
  const bookingDateObj = amsterdamNoon(bookingDateStr);

  // 7. Try to extract actual transaction date/time from remittance_information
  // Formats seen in the data:
  // - "NR:BS158124, 31.01.26/15:33" (POS transactions)
  // - "Kenmerk: 31-01-2026 18:24 714056" (SEPA transactions)
  // These are AMSTERDAM wall-clock times (ABN AMRO prints Dutch local time),
  // so they must be converted DST-aware — parsing them in the server's zone
  // (UTC on Cloud Functions) would store instants 1–2 h late and could push a
  // late-evening purchase onto the next calendar day.
  let transactionDateObj: Date | null = null;

  for (const line of remittanceInfo) {
    // Try POS format: "31.01.26/15:33" or "31.01.2026/15:33"
    const posMatch = line.match(/(\d{2})\.(\d{2})\.(\d{2,4})\/(\d{2}):(\d{2})/);
    if (posMatch) {
      const [, d, m, y, hour, min] = posMatch;
      const fullYear = y.length === 2 ? 2000 + parseInt(y) : parseInt(y);
      transactionDateObj = fromAmsterdamWallClock(
        fullYear,
        parseInt(m),
        parseInt(d),
        parseInt(hour),
        parseInt(min)
      );
      break;
    }

    // Try SEPA format: "31-01-2026 18:24"
    const sepaMatch = line.match(/(\d{2})-(\d{2})-(\d{4})\s+(\d{2}):(\d{2})/);
    if (sepaMatch) {
      const [, d, m, y, hour, min] = sepaMatch;
      transactionDateObj = fromAmsterdamWallClock(
        parseInt(y),
        parseInt(m),
        parseInt(d),
        parseInt(hour),
        parseInt(min)
      );
      break;
    }
  }

  // Use transaction date if found, otherwise fall back to booking date
  const primaryDate = transactionDateObj || bookingDateObj;

  return {
    externalId,
    date: Timestamp.fromDate(primaryDate),
    bookingDate: Timestamp.fromDate(bookingDateObj),
    transactionDate: transactionDateObj ? Timestamp.fromDate(transactionDateObj) : null,
    description,
    bankDescription: extractBankDescription(tx),
    amount,
    currency: tx.transaction_amount.currency as 'EUR',
    counterparty,
    categoryId: null as string | null,
    categoryConfidence: 0,
    categorySource: 'auto' as 'auto' | 'rule' | 'merchant' | 'learned' | 'llm' | 'none',
    isSplit: false,
    splits: null,
    reimbursement: null,
    bankAccountId: accountIban,
    bankConnectionId: connectionId,
    status: tx.status,
  };
}
