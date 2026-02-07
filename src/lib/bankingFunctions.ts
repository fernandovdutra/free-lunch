import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';
import type { Transaction } from '@/types';

// Types
export interface Bank {
  name: string;
  country: string;
  logo: string;
  bic: string;
}

export interface AccountInfo {
  uid: string;
  iban: string;
  name?: string;
  balance: {
    amount: number;
    currency: string;
    type: string;
    referenceDate: string;
    updatedAt: string;
  } | null;
}

export interface BankConnectionStatus {
  id: string;
  bankName: string;
  status: 'active' | 'expired' | 'error';
  accountCount: number;
  accounts: AccountInfo[];
  lastSync: string | null;
  consentExpiresAt: string | null;
}

export interface RecategorizeResult {
  processed: number;
  updated: number;
  skipped: number;
  errors: string[];
}

export interface InitConnectionResponse {
  authUrl: string;
  state: string;
}

export interface SyncResult {
  success: boolean;
  totalNew: number;
  totalUpdated: number;
  results: Array<{
    accountId: string;
    newTransactions: number;
    updatedTransactions: number;
    errors: string[];
  }>;
}

// Function wrappers
export const getAvailableBanks = httpsCallable<{ country?: string }, Bank[]>(
  functions,
  'getAvailableBanks'
);

export const initBankConnection = httpsCallable<
  { bankName: string; bankCountry?: string },
  InitConnectionResponse
>(functions, 'initBankConnection');

export const getBankStatus = httpsCallable<undefined, BankConnectionStatus[]>(
  functions,
  'getBankStatus'
);

export const syncTransactions = httpsCallable<{ connectionId: string }, SyncResult>(
  functions,
  'syncTransactions'
);

export const recategorizeTransactions = httpsCallable<undefined, RecategorizeResult>(
  functions,
  'recategorizeTransactions'
);

// ============================================================================
// Shared Cloud Functions API
// ============================================================================

// Serialized transaction (dates as ISO strings instead of Date objects)
export interface SerializedTransaction {
  id: string;
  externalId: string | null;
  date: string;
  description: string;
  amount: number;
  currency: string;
  counterparty: string | null;
  categoryId: string | null;
  categorySource: string;
  categoryConfidence: number;
  isSplit: boolean;
  splits: Array<{ amount: number; categoryId: string; note: string | null }> | null;
  reimbursement: {
    type: string;
    status: string;
    note: string | null;
    linkedTransactionId: string | null;
    clearedAt: string | null;
  } | null;
  bankAccountId: string | null;
  importedAt: string;
  updatedAt: string;
  excludeFromTotals?: boolean;
  icsStatementId?: string | null;
  source?: 'bank_sync' | 'ics_import' | 'manual';
}

export function deserializeTransaction(t: SerializedTransaction): Transaction {
  return {
    id: t.id,
    externalId: t.externalId,
    date: new Date(t.date),
    description: t.description,
    amount: t.amount,
    currency: t.currency as 'EUR',
    counterparty: t.counterparty,
    categoryId: t.categoryId,
    categorySource: t.categorySource as Transaction['categorySource'],
    categoryConfidence: t.categoryConfidence,
    isSplit: t.isSplit,
    splits: t.splits,
    reimbursement: t.reimbursement
      ? {
          type: t.reimbursement.type as 'work' | 'personal',
          note: t.reimbursement.note,
          status: t.reimbursement.status as 'pending' | 'cleared',
          linkedTransactionId: t.reimbursement.linkedTransactionId,
          clearedAt: t.reimbursement.clearedAt ? new Date(t.reimbursement.clearedAt) : null,
        }
      : null,
    excludeFromTotals: t.excludeFromTotals,
    icsStatementId: t.icsStatementId,
    source: t.source,
    bankAccountId: t.bankAccountId,
    importedAt: new Date(t.importedAt),
    updatedAt: new Date(t.updatedAt),
  };
}

// Dashboard
export interface DashboardDataResponse {
  summary: {
    totalIncome: number;
    totalExpenses: number;
    netBalance: number;
    pendingReimbursements: number;
    transactionCount: number;
  };
  categorySpending: Array<{
    categoryId: string;
    categoryName: string;
    categoryColor: string;
    amount: number;
    percentage: number;
    transactionCount: number;
  }>;
  timeline: Array<{
    date: string;
    dateKey: string;
    income: number;
    expenses: number;
  }>;
  recentTransactions: SerializedTransaction[];
}

export const getDashboardData = httpsCallable<
  { startDate: string; endDate: string },
  DashboardDataResponse
>(functions, 'getDashboardData');

// Budget Progress
export interface BudgetProgressItem {
  budgetId: string;
  budgetName: string;
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  monthlyLimit: number;
  alertThreshold: number;
  spent: number;
  remaining: number;
  percentage: number;
  status: 'safe' | 'warning' | 'exceeded';
}

export interface BudgetProgressResponse {
  budgetProgress: BudgetProgressItem[];
  suggestions?: Record<string, number>;
}

export const getBudgetProgressFn = httpsCallable<
  { startDate?: string; endDate?: string; suggestions?: boolean },
  BudgetProgressResponse
>(functions, 'getBudgetProgress');

// Reimbursement Summary
export interface ReimbursementSummaryResponse {
  summary: {
    pendingCount: number;
    pendingTotal: number;
    pendingWorkTotal: number;
    pendingPersonalTotal: number;
    clearedCount: number;
    clearedTotal: number;
  };
  pendingTransactions: SerializedTransaction[];
  clearedTransactions: SerializedTransaction[];
}

export const getReimbursementSummaryFn = httpsCallable<
  { clearedLimit?: number },
  ReimbursementSummaryResponse
>(functions, 'getReimbursementSummary');

// Default Categories
export const createDefaultCategoriesFn = httpsCallable<
  undefined,
  { created: boolean; count: number }
>(functions, 'createDefaultCategories');

// ============================================================================
// Spending Explorer
// ============================================================================

export interface SpendingExplorerRequest {
  direction: 'expenses' | 'income';
  startDate: string;
  endDate: string;
  categoryId?: string | undefined;
  subcategoryId?: string | undefined;
  counterparty?: string | undefined;
  breakdownMonthKey?: string | undefined; // 'yyyy-MM' — show breakdown for this month instead of startDate month
}

export interface MonthlyTotal {
  month: string;      // 'MMM yyyy' display format
  monthKey: string;   // 'yyyy-MM' sortable key
  amount: number;
  transactionCount: number;
}

export interface CategoryBreakdownItem {
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  amount: number;
  percentage: number;
  transactionCount: number;
}

export interface SpendingExplorerResponse {
  currentTotal: number;
  currentMonth: string;
  monthlyTotals: MonthlyTotal[];
  categories?: CategoryBreakdownItem[] | undefined;
  transactions?: SerializedTransaction[] | undefined;
}

export const getSpendingExplorerFn = httpsCallable<
  SpendingExplorerRequest,
  SpendingExplorerResponse
>(functions, 'getSpendingExplorer');

// ============================================================================
// ICS Credit Card Import
// ============================================================================

export interface ImportIcsRequest {
  statementId: string;
  statementDate: string;
  customerNumber: string;
  totalNewExpenses: number;
  estimatedDebitDate: string;
  debitIban: string;
  transactions: Array<{
    transactionDate: string;
    bookingDate: string;
    description: string;
    city: string;
    country: string;
    foreignAmount: number | null;
    foreignCurrency: string | null;
    exchangeRate: number | null;
    amountEur: number;
    direction: 'Af' | 'Bij';
  }>;
}

export interface ImportIcsResponse {
  transactionsCreated: number;
  lumpSumMatched: boolean;
  lumpSumTransactionId: string | null;
  message: string;
}

export const importIcsStatementFn = httpsCallable<ImportIcsRequest, ImportIcsResponse>(
  functions,
  'importIcsStatement'
);
