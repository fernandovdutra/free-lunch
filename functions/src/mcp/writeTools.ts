import { Timestamp, FieldValue, type Firestore } from 'firebase-admin/firestore';

/**
 * Write tools exposed over MCP. Each function is scoped to a single user id
 * supplied by the caller — no tool accepts a user id argument. Field semantics
 * mirror the app's own mutation hooks (src/hooks/*) so changes made through MCP
 * are indistinguishable from changes made in the UI.
 */

// ---------------------------------------------------------------------------
// Argument helpers
// ---------------------------------------------------------------------------

function requireString(args: Record<string, unknown>, key: string): string {
  const value = args[key];
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Missing required argument: ${key}`);
  }
  return value;
}

/** A required string that is allowed to be empty (e.g. clearing a note). */
function requireText(args: Record<string, unknown>, key: string): string {
  const value = args[key];
  if (typeof value !== 'string') {
    throw new Error(`Missing required argument: ${key}`);
  }
  return value;
}

function optionalString(args: Record<string, unknown>, key: string): string | undefined {
  const value = args[key];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function requireNumber(args: Record<string, unknown>, key: string): number {
  const value = args[key];
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new Error(`Missing required argument: ${key}`);
  }
  return value;
}

function optionalNumber(args: Record<string, unknown>, key: string): number | undefined {
  const value = args[key];
  return typeof value === 'number' && !Number.isNaN(value) ? value : undefined;
}

function optionalBoolean(args: Record<string, unknown>, key: string): boolean | undefined {
  const value = args[key];
  return typeof value === 'boolean' ? value : undefined;
}

function requireEnum<T extends string>(
  args: Record<string, unknown>,
  key: string,
  allowed: readonly T[]
): T {
  const value = requireString(args, key);
  if (!allowed.includes(value as T)) {
    throw new Error(`Invalid ${key}: must be one of ${allowed.join(', ')}`);
  }
  return value as T;
}

function optionalEnum<T extends string>(
  args: Record<string, unknown>,
  key: string,
  allowed: readonly T[]
): T | undefined {
  const value = optionalString(args, key);
  if (value === undefined) return undefined;
  if (!allowed.includes(value as T)) {
    throw new Error(`Invalid ${key}: must be one of ${allowed.join(', ')}`);
  }
  return value as T;
}

function requireStringArray(args: Record<string, unknown>, key: string): string[] {
  const value = args[key];
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new Error(`Argument ${key} must be an array of strings`);
  }
  return value as string[];
}

function optionalStringArray(
  args: Record<string, unknown>,
  key: string
): string[] | undefined {
  const value = args[key];
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new Error(`Argument ${key} must be an array of strings`);
  }
  return value as string[];
}

function parseDate(value: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${value}`);
  }
  return date;
}

/** Trim, drop empties, and dedupe a list of tags. */
function normalizeTags(tags: string[]): string[] {
  return Array.from(
    new Set(tags.map((tag) => tag.trim()).filter((tag) => tag.length > 0))
  );
}

const GOAL_TYPES = ['savings', 'debt_payoff', 'spending_limit', 'investment'] as const;
const GOAL_STATUSES = ['active', 'completed', 'paused', 'abandoned'] as const;
const MATCH_TYPES = ['contains', 'exact', 'regex'] as const;

// ---------------------------------------------------------------------------
// Firestore helpers
// ---------------------------------------------------------------------------

function userCollection(db: Firestore, userId: string, name: string) {
  return db.collection('users').doc(userId).collection(name);
}

async function assertCategoryExists(db: Firestore, userId: string, categoryId: string) {
  const snap = await userCollection(db, userId, 'categories').doc(categoryId).get();
  if (!snap.exists) {
    throw new Error(`Category not found: ${categoryId}`);
  }
}

// ---------------------------------------------------------------------------
// Transaction writes
// ---------------------------------------------------------------------------

async function recategorizeTransaction(
  db: Firestore,
  userId: string,
  transactionId: string,
  categoryId: string
) {
  const ref = userCollection(db, userId, 'transactions').doc(transactionId);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new Error(`Transaction not found: ${transactionId}`);
  }
  await assertCategoryExists(db, userId, categoryId);

  await ref.update({
    categoryId,
    categorySource: 'manual',
    categoryConfidence: 1,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { id: transactionId, categoryId, categorySource: 'manual' };
}

async function updateTransactionNote(
  db: Firestore,
  userId: string,
  transactionId: string,
  note: string
) {
  const ref = userCollection(db, userId, 'transactions').doc(transactionId);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new Error(`Transaction not found: ${transactionId}`);
  }

  await ref.update({ note, updatedAt: FieldValue.serverTimestamp() });

  return { id: transactionId, note };
}

async function createTransaction(
  db: Firestore,
  userId: string,
  args: Record<string, unknown>
) {
  const date = parseDate(requireString(args, 'date'));
  const description = requireString(args, 'description');
  const amount = requireNumber(args, 'amount');
  const categoryId = optionalString(args, 'categoryId') ?? null;
  const note = optionalString(args, 'note') ?? null;

  if (categoryId) {
    await assertCategoryExists(db, userId, categoryId);
  }

  const ref = userCollection(db, userId, 'transactions').doc();
  await ref.set({
    externalId: null,
    date: Timestamp.fromDate(date),
    description,
    amount,
    currency: 'EUR',
    counterparty: null,
    categoryId,
    categoryConfidence: categoryId ? 1 : 0,
    categorySource: categoryId ? 'manual' : 'auto',
    isSplit: false,
    splits: null,
    reimbursement: null,
    note,
    bankAccountId: null,
    source: 'manual',
    importedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { id: ref.id, date: date.toISOString(), description, amount, categoryId };
}

async function addTransactionTags(
  db: Firestore,
  userId: string,
  transactionId: string,
  rawTags: string[]
) {
  const incoming = normalizeTags(rawTags);
  if (incoming.length === 0) {
    throw new Error('Provide at least one non-empty tag');
  }

  const ref = userCollection(db, userId, 'transactions').doc(transactionId);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new Error(`Transaction not found: ${transactionId}`);
  }

  const existing = snap.data()?.tags;
  const current = Array.isArray(existing) ? (existing as string[]) : [];
  const merged = Array.from(new Set([...current, ...incoming]));

  await ref.update({ tags: merged, updatedAt: FieldValue.serverTimestamp() });

  return { id: transactionId, tags: merged };
}

async function removeTransactionTags(
  db: Firestore,
  userId: string,
  transactionId: string,
  rawTags: string[]
) {
  const toRemove = new Set(normalizeTags(rawTags));
  if (toRemove.size === 0) {
    throw new Error('Provide at least one non-empty tag');
  }

  const ref = userCollection(db, userId, 'transactions').doc(transactionId);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new Error(`Transaction not found: ${transactionId}`);
  }

  const existing = snap.data()?.tags;
  const current = Array.isArray(existing) ? (existing as string[]) : [];
  const remaining = current.filter((tag) => !toRemove.has(tag));

  await ref.update({ tags: remaining, updatedAt: FieldValue.serverTimestamp() });

  return { id: transactionId, tags: remaining };
}

// ---------------------------------------------------------------------------
// Budget writes
// ---------------------------------------------------------------------------

async function createBudget(db: Firestore, userId: string, args: Record<string, unknown>) {
  const name = requireString(args, 'name');
  const categoryId = requireString(args, 'categoryId');
  const monthlyLimit = requireNumber(args, 'monthlyLimit');
  const alertThreshold = optionalNumber(args, 'alertThreshold') ?? 80;

  await assertCategoryExists(db, userId, categoryId);

  const ref = userCollection(db, userId, 'budgets').doc();
  await ref.set({
    name,
    categoryId,
    monthlyLimit,
    alertThreshold,
    isActive: true,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { id: ref.id, name, categoryId, monthlyLimit, alertThreshold };
}

async function updateBudget(db: Firestore, userId: string, args: Record<string, unknown>) {
  const budgetId = requireString(args, 'budgetId');
  const ref = userCollection(db, userId, 'budgets').doc(budgetId);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new Error(`Budget not found: ${budgetId}`);
  }

  const update: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };
  const name = optionalString(args, 'name');
  if (name !== undefined) update.name = name;
  const monthlyLimit = optionalNumber(args, 'monthlyLimit');
  if (monthlyLimit !== undefined) update.monthlyLimit = monthlyLimit;
  const alertThreshold = optionalNumber(args, 'alertThreshold');
  if (alertThreshold !== undefined) update.alertThreshold = alertThreshold;
  const isActive = optionalBoolean(args, 'isActive');
  if (isActive !== undefined) update.isActive = isActive;

  if (Object.keys(update).length === 1) {
    throw new Error('No fields to update');
  }

  await ref.update(update);

  return { id: budgetId, updated: Object.keys(update).filter((k) => k !== 'updatedAt') };
}

// ---------------------------------------------------------------------------
// Goal writes
// ---------------------------------------------------------------------------

async function createGoal(db: Firestore, userId: string, args: Record<string, unknown>) {
  const name = requireString(args, 'name');
  const type = requireEnum(args, 'type', GOAL_TYPES);
  const targetAmount = requireNumber(args, 'targetAmount');
  const currentAmount = optionalNumber(args, 'currentAmount') ?? 0;
  const startDate = optionalString(args, 'startDate');
  const targetDate = optionalString(args, 'targetDate');
  const linkedCategoryIds = optionalStringArray(args, 'linkedCategoryIds') ?? null;
  const notes = optionalString(args, 'notes') ?? null;

  const ref = userCollection(db, userId, 'goals').doc();
  await ref.set({
    name,
    type,
    targetAmount,
    currentAmount,
    startDate: Timestamp.fromDate(startDate ? parseDate(startDate) : new Date()),
    targetDate: targetDate ? Timestamp.fromDate(parseDate(targetDate)) : null,
    status: 'active',
    linkedCategoryIds,
    notes,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { id: ref.id, name, type, targetAmount, currentAmount, status: 'active' };
}

async function updateGoal(db: Firestore, userId: string, args: Record<string, unknown>) {
  const goalId = requireString(args, 'goalId');
  const ref = userCollection(db, userId, 'goals').doc(goalId);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new Error(`Goal not found: ${goalId}`);
  }

  const update: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };
  const currentAmount = optionalNumber(args, 'currentAmount');
  if (currentAmount !== undefined) update.currentAmount = currentAmount;
  const targetAmount = optionalNumber(args, 'targetAmount');
  if (targetAmount !== undefined) update.targetAmount = targetAmount;
  const status = optionalEnum(args, 'status', GOAL_STATUSES);
  if (status !== undefined) update.status = status;
  const name = optionalString(args, 'name');
  if (name !== undefined) update.name = name;
  const notes = optionalString(args, 'notes');
  if (notes !== undefined) update.notes = notes;
  const targetDate = optionalString(args, 'targetDate');
  if (targetDate !== undefined) update.targetDate = Timestamp.fromDate(parseDate(targetDate));

  if (Object.keys(update).length === 1) {
    throw new Error('No fields to update');
  }

  await ref.update(update);

  return { id: goalId, updated: Object.keys(update).filter((k) => k !== 'updatedAt') };
}

// ---------------------------------------------------------------------------
// Rule writes
// ---------------------------------------------------------------------------

async function createRule(db: Firestore, userId: string, args: Record<string, unknown>) {
  const pattern = requireString(args, 'pattern');
  const matchType = requireEnum(args, 'matchType', MATCH_TYPES);
  const categoryId = requireString(args, 'categoryId');

  await assertCategoryExists(db, userId, categoryId);

  const ref = userCollection(db, userId, 'rules').doc();
  await ref.set({
    pattern,
    matchType,
    categoryId,
    priority: Date.now(),
    isLearned: true,
    isSystem: false,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { id: ref.id, pattern, matchType, categoryId };
}

// ---------------------------------------------------------------------------
// MCP tool definitions + dispatch
// ---------------------------------------------------------------------------

const WRITE_ANNOTATIONS = { readOnlyHint: false, destructiveHint: false } as const;

export const WRITE_TOOL_DEFINITIONS = [
  {
    name: 'recategorize_transaction',
    description: "Change a transaction's category. Marks the change as manual.",
    inputSchema: {
      type: 'object' as const,
      properties: {
        transactionId: { type: 'string', description: 'Transaction ID' },
        categoryId: { type: 'string', description: 'New category ID' },
      },
      required: ['transactionId', 'categoryId'],
    },
    annotations: WRITE_ANNOTATIONS,
  },
  {
    name: 'update_transaction_note',
    description: "Set or replace a transaction's free-text note (empty string clears it)",
    inputSchema: {
      type: 'object' as const,
      properties: {
        transactionId: { type: 'string', description: 'Transaction ID' },
        note: { type: 'string', description: 'Note text (empty string clears the note)' },
      },
      required: ['transactionId', 'note'],
    },
    annotations: WRITE_ANNOTATIONS,
  },
  {
    name: 'create_transaction',
    description: 'Create a manual transaction (negative amount = expense, positive = income)',
    inputSchema: {
      type: 'object' as const,
      properties: {
        date: { type: 'string', description: 'Transaction date (ISO, e.g. 2026-05-17)' },
        description: { type: 'string', description: 'Transaction description' },
        amount: {
          type: 'number',
          description: 'Amount in EUR — negative for expense, positive for income',
        },
        categoryId: { type: 'string', description: 'Optional category ID' },
        note: { type: 'string', description: 'Optional free-text note' },
      },
      required: ['date', 'description', 'amount'],
    },
    annotations: WRITE_ANNOTATIONS,
  },
  {
    name: 'add_transaction_tags',
    description: 'Add one or more free-form tags to a transaction (existing tags are kept)',
    inputSchema: {
      type: 'object' as const,
      properties: {
        transactionId: { type: 'string', description: 'Transaction ID' },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Tags to add',
        },
      },
      required: ['transactionId', 'tags'],
    },
    annotations: WRITE_ANNOTATIONS,
  },
  {
    name: 'remove_transaction_tags',
    description: 'Remove one or more tags from a transaction',
    inputSchema: {
      type: 'object' as const,
      properties: {
        transactionId: { type: 'string', description: 'Transaction ID' },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Tags to remove',
        },
      },
      required: ['transactionId', 'tags'],
    },
    annotations: WRITE_ANNOTATIONS,
  },
  {
    name: 'create_budget',
    description: 'Create a monthly budget for a category',
    inputSchema: {
      type: 'object' as const,
      properties: {
        name: { type: 'string', description: 'Budget name' },
        categoryId: { type: 'string', description: 'Category ID the budget tracks' },
        monthlyLimit: { type: 'number', description: 'Monthly spending limit in EUR' },
        alertThreshold: {
          type: 'number',
          description: 'Percentage threshold for a warning (default 80)',
        },
      },
      required: ['name', 'categoryId', 'monthlyLimit'],
    },
    annotations: WRITE_ANNOTATIONS,
  },
  {
    name: 'update_budget',
    description: 'Update an existing budget (provide only the fields to change)',
    inputSchema: {
      type: 'object' as const,
      properties: {
        budgetId: { type: 'string', description: 'Budget ID' },
        name: { type: 'string', description: 'New name' },
        monthlyLimit: { type: 'number', description: 'New monthly limit in EUR' },
        alertThreshold: { type: 'number', description: 'New warning threshold percentage' },
        isActive: { type: 'boolean', description: 'Whether the budget is active' },
      },
      required: ['budgetId'],
    },
    annotations: WRITE_ANNOTATIONS,
  },
  {
    name: 'create_goal',
    description: 'Create a financial goal',
    inputSchema: {
      type: 'object' as const,
      properties: {
        name: { type: 'string', description: 'Goal name' },
        type: {
          type: 'string',
          enum: [...GOAL_TYPES],
          description: 'Goal type',
        },
        targetAmount: { type: 'number', description: 'Target amount in EUR' },
        currentAmount: { type: 'number', description: 'Current amount (default 0)' },
        startDate: { type: 'string', description: 'Start date (ISO, default today)' },
        targetDate: { type: 'string', description: 'Optional target date (ISO)' },
        linkedCategoryIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional category IDs linked to the goal',
        },
        notes: { type: 'string', description: 'Optional notes' },
      },
      required: ['name', 'type', 'targetAmount'],
    },
    annotations: WRITE_ANNOTATIONS,
  },
  {
    name: 'update_goal',
    description:
      'Update a financial goal — progress (currentAmount), status, target, or details',
    inputSchema: {
      type: 'object' as const,
      properties: {
        goalId: { type: 'string', description: 'Goal ID' },
        currentAmount: { type: 'number', description: 'New current amount in EUR' },
        status: {
          type: 'string',
          enum: [...GOAL_STATUSES],
          description: 'New status',
        },
        targetAmount: { type: 'number', description: 'New target amount in EUR' },
        targetDate: { type: 'string', description: 'New target date (ISO)' },
        name: { type: 'string', description: 'New name' },
        notes: { type: 'string', description: 'New notes' },
      },
      required: ['goalId'],
    },
    annotations: WRITE_ANNOTATIONS,
  },
  {
    name: 'create_rule',
    description:
      'Create a categorization rule that auto-categorizes matching transactions',
    inputSchema: {
      type: 'object' as const,
      properties: {
        pattern: { type: 'string', description: 'Text pattern to match' },
        matchType: {
          type: 'string',
          enum: [...MATCH_TYPES],
          description: 'How the pattern is matched',
        },
        categoryId: { type: 'string', description: 'Category to assign on a match' },
      },
      required: ['pattern', 'matchType', 'categoryId'],
    },
    annotations: WRITE_ANNOTATIONS,
  },
];

export async function callWriteTool(
  db: Firestore,
  userId: string,
  name: string,
  args: Record<string, unknown>
): Promise<unknown> {
  switch (name) {
    case 'recategorize_transaction':
      return recategorizeTransaction(
        db,
        userId,
        requireString(args, 'transactionId'),
        requireString(args, 'categoryId')
      );
    case 'update_transaction_note':
      return updateTransactionNote(
        db,
        userId,
        requireString(args, 'transactionId'),
        requireText(args, 'note')
      );
    case 'create_transaction':
      return createTransaction(db, userId, args);
    case 'add_transaction_tags':
      return addTransactionTags(
        db,
        userId,
        requireString(args, 'transactionId'),
        requireStringArray(args, 'tags')
      );
    case 'remove_transaction_tags':
      return removeTransactionTags(
        db,
        userId,
        requireString(args, 'transactionId'),
        requireStringArray(args, 'tags')
      );
    case 'create_budget':
      return createBudget(db, userId, args);
    case 'update_budget':
      return updateBudget(db, userId, args);
    case 'create_goal':
      return createGoal(db, userId, args);
    case 'update_goal':
      return updateGoal(db, userId, args);
    case 'create_rule':
      return createRule(db, userId, args);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
