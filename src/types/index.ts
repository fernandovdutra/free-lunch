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
  members?: Record<string, MemberRole>;
  memberProfiles?: Record<string, MemberProfile>;
  pendingMembers?: Record<string, PendingMember>;
}

export interface UserSettings {
  language: 'en' | 'nl';
  currency: 'EUR';
  defaultDateRange: 'week' | 'month' | 'year';
}

export type MemberRole = 'owner' | 'editor' | 'viewer';

export interface MemberProfile {
  email: string;
  displayName: string | null;
}

export interface PendingMember {
  role: Exclude<MemberRole, 'owner'>;
  invitedAt: Date;
  invitedBy: string;
}

export interface Membership {
  ownerIds: string[];
  primaryOwnerId: string;
  updatedAt: Date;
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
  /** Full unparsed remittance text from the bank (all lines joined). */
  bankDescription?: string | null;
  amount: number;
  currency: 'EUR';
  counterparty: string | null;

  // Categorization
  categoryId: string | null;
  categoryConfidence: number;
  categorySource: 'auto' | 'manual' | 'rule' | 'merchant' | 'learned' | 'llm' | 'none';

  // Splitting
  isSplit: boolean;
  splits: TransactionSplit[] | null;

  // Reimbursement
  reimbursement: ReimbursementInfo | null;

  // Free-text user note (Phase 6 Edit Sheet writes this). Optional so existing
  // factories / fixtures that pre-date this field don't need to be updated.
  note?: string | null;

  // Free-form user tags, editable in the transaction sheet and via the MCP
  // server (both normalize identically — see src/lib/tags.ts). Optional so
  // transactions that pre-date the field read as untagged.
  tags?: string[];

  // ICS Credit Card Import
  excludeFromTotals?: boolean | undefined;
  icsStatementId?: string | null | undefined;
  source?: 'bank_sync' | 'ics_import' | 'manual' | undefined;

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
  note?: string | null;
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

// ============================================================================
// Goal Types
// ============================================================================

export interface Goal {
  id: string;
  name: string;
  type: 'savings' | 'debt_payoff' | 'spending_limit' | 'investment';
  targetAmount: number;
  currentAmount: number;
  startDate: Date;
  targetDate: Date | null;
  status: 'active' | 'completed' | 'paused' | 'abandoned';
  linkedCategoryIds: string[] | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface GoalFormData {
  name: string;
  type: Goal['type'];
  targetAmount: number;
  currentAmount: number;
  startDate: Date;
  targetDate: Date | null;
  linkedCategoryIds: string[] | null;
  notes: string | null;
}

// ============================================================================
// Investment Types
// ============================================================================

export interface InvestmentEntry {
  date: Date;
  marketValue: number;
  costBasis: number;
}

export interface Investment {
  id: string;
  name: string;
  platform: string;
  type: 'etf' | 'stock' | 'bond' | 'crypto' | 'savings' | 'pension' | 'other';
  entries: InvestmentEntry[];
  currency: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface InvestmentFormData {
  name: string;
  platform: string;
  type: Investment['type'];
  currency: string;
  notes: string | null;
}

export interface InvestmentTransaction {
  id: string;
  investmentId: string;
  date: Date;
  type: 'buy' | 'sell' | 'dividend' | 'fee' | 'deposit' | 'withdrawal';
  amount: number;
  units: number | null;
  pricePerUnit: number | null;
  notes: string | null;
}

export interface InvestmentTransactionFormData {
  investmentId: string;
  date: Date;
  type: InvestmentTransaction['type'];
  amount: number;
  units: number | null;
  pricePerUnit: number | null;
  notes: string | null;
}

// ============================================================================
// Debt / Liability Types
// ============================================================================

export interface Debt {
  id: string;
  name: string;
  type: 'mortgage' | 'personal_loan' | 'student_loan' | 'credit_card' | 'other';
  balance: number;
  originalAmount: number | null;
  interestRate: number | null;
  monthlyPayment: number | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DebtFormData {
  name: string;
  type: Debt['type'];
  balance: number;
  originalAmount: number | null;
  interestRate: number | null;
  monthlyPayment: number | null;
  notes: string | null;
}

// ============================================================================
// Insight Types
// ============================================================================

export interface InsightHighlight {
  label: string;
  value: string;
  trend?: 'up' | 'down' | 'stable';
  sentiment: 'positive' | 'negative' | 'neutral';
}

export interface InsightRecommendation {
  priority: 'high' | 'medium' | 'low';
  category: string;
  text: string;
  potentialSavings?: number;
}

export interface InsightAnomaly {
  description: string;
  severity: 'info' | 'warning' | 'alert';
  transactionId?: string;
}

export interface InsightGoalProgress {
  goalId: string;
  goalName: string;
  progressPct: number;
  onTrack: boolean;
  note: string;
}

export interface InsightInvestmentSummary {
  totalValue: number;
  totalGain: number;
  returnPct: number;
  periodChange: number;
}

export interface Insight {
  id: string;
  type: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'on_demand';
  periodStart: Date;
  periodEnd: Date;
  generatedAt: Date;
  summary: string;
  highlights: InsightHighlight[];
  recommendations: InsightRecommendation[];
  anomalies: InsightAnomaly[];
  goalProgress: InsightGoalProgress[];
  investmentSummary: InsightInvestmentSummary | null;
  narrative: string;
  emailSentAt: Date | null;
  isRead: boolean;
}

// ============================================================================
// Advisor Memory Types
// ============================================================================

export interface RecurringExpense {
  counterparty: string;
  amount: number;
  frequency: string;
}

export interface PastAdvice {
  date: Date;
  advice: string;
  outcome?: string;
}

export interface AdvisorMemory {
  financialProfile: string;
  recurringExpenses: RecurringExpense[];
  activeGoals: { goalId: string; name: string; summary: string }[];
  investmentProfile: string;
  pastAdvice: PastAdvice[];
  updatedAt: Date;
}
