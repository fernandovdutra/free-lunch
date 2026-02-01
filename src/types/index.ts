/**
 * Core type definitions for Free Lunch
 */

// ============================================================================
// User Types
// ============================================================================

export interface User {
  id: string;
  email: string;
  displayName: string | null;
  createdAt: Date;
  settings: UserSettings;
  bankConnections: BankConnection[];
}

export interface UserSettings {
  language: 'en' | 'nl';
  currency: 'EUR';
  defaultDateRange: 'week' | 'month' | 'year';
  theme: 'light' | 'dark' | 'system';
}

export interface BankConnection {
  id: string;
  provider: 'enable_banking';
  bankId: 'abn_amro' | 'ing' | 'rabobank';
  bankName: string;
  status: 'active' | 'expired' | 'error';
  lastSync: Date | null;
  consentExpiresAt: Date | null;
  accountIds: string[];
}

// ============================================================================
// Category Types
// ============================================================================

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  parentId: string | null;
  order: number;
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CategoryWithChildren extends Category {
  children: CategoryWithChildren[];
}

// ============================================================================
// Transaction Types
// ============================================================================

export interface Transaction {
  id: string;
  externalId: string | null;
  date: Date;
  /** Official bank booking date */
  bookingDate?: Date | null;
  /** Actual transaction date/time extracted from remittance info */
  transactionDate?: Date | null;
  description: string;
  amount: number;
  currency: 'EUR';
  counterparty: string | null;

  // Categorization
  categoryId: string | null;
  categoryConfidence: number;
  categorySource: 'auto' | 'manual' | 'rule' | 'merchant' | 'learned' | 'none';

  // Splitting
  isSplit: boolean;
  splits: TransactionSplit[] | null;

  // Reimbursement
  reimbursement: ReimbursementInfo | null;

  // Metadata
  bankAccountId: string | null;
  importedAt: Date;
  updatedAt: Date;
}

export interface TransactionSplit {
  amount: number;
  categoryId: string;
  note: string | null;
}

export interface ReimbursementInfo {
  type: 'work' | 'personal';
  note: string | null;
  status: 'pending' | 'cleared';
  linkedTransactionId: string | null;
  clearedAt: Date | null;
}

// ============================================================================
// Categorization Rules
// ============================================================================

export interface CategorizationRule {
  id: string;
  pattern: string;
  matchType: 'contains' | 'exact' | 'regex';
  categoryId: string;
  priority: number;
  isLearned: boolean;
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Budget Types
// ============================================================================

export interface Budget {
  id: string;
  name: string;
  categoryId: string;
  /** Monthly spending limit in EUR */
  monthlyLimit: number;
  /** Percentage threshold for warning (default 80) */
  alertThreshold: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface BudgetFormData {
  name: string;
  categoryId: string;
  monthlyLimit: number;
  alertThreshold: number;
}

export interface BudgetProgress {
  budget: Budget;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  spent: number;
  remaining: number;
  percentage: number;
  status: 'safe' | 'warning' | 'exceeded';
}

// ============================================================================
// Dashboard & Analytics Types
// ============================================================================

export interface SpendingSummary {
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
  pendingReimbursements: number;
  transactionCount: number;
}

export interface CategorySpending {
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  amount: number;
  percentage: number;
  transactionCount: number;
}

export interface TimelineData {
  date: string;
  income: number;
  expenses: number;
}

// ============================================================================
// Form Types
// ============================================================================

export interface TransactionFormData {
  date: Date;
  description: string;
  amount: number;
  categoryId: string | null;
  note?: string;
}

export interface CategoryFormData {
  name: string;
  icon: string;
  color: string;
  parentId: string | null;
}

export interface SplitFormData {
  splits: Array<{
    amount: number;
    categoryId: string;
    note: string | null;
  }>;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
