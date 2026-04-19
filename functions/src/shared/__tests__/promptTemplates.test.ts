import { describe, it, expect } from 'vitest';
import { buildDailyInsightPrompt, buildWeeklyInsightPrompt } from '../promptTemplates';
import type { SpendingSummaryResult, CategorySpendingResult } from '../aggregations';

const mockSummary: SpendingSummaryResult = {
  totalIncome: 3000,
  totalExpenses: 1500,
  netBalance: 1500,
  pendingReimbursements: 100,
  transactionCount: 42,
};

const mockCategorySpending: CategorySpendingResult[] = [
  { categoryId: 'food', categoryName: 'Food', categoryColor: '#f00', amount: 500, percentage: 33, transactionCount: 15 },
  { categoryId: 'transport', categoryName: 'Transport', categoryColor: '#0f0', amount: 200, percentage: 13, transactionCount: 8 },
];

describe('buildDailyInsightPrompt', () => {
  it('contains required sections', () => {
    const result = buildDailyInsightPrompt({
      date: '2024-01-15 (Monday)',
      summary: mockSummary,
      categorySpending: mockCategorySpending,
      anomalies: [],
    });
    expect(result).toContain('DATE: 2024-01-15 (Monday)');
    expect(result).toContain('Total income: €3000.00');
    expect(result).toContain('Total expenses: €1500.00');
    expect(result).toContain('TOP SPENDING CATEGORIES:');
    expect(result).toContain('Food: €500.00');
    expect(result).toContain('ANOMALIES:');
  });

  it('shows "None detected" when no anomalies', () => {
    const result = buildDailyInsightPrompt({
      date: '2024-01-15',
      summary: mockSummary,
      categorySpending: [],
      anomalies: [],
    });
    expect(result).toContain('None detected');
  });

  it('formats anomalies with severity tags', () => {
    const result = buildDailyInsightPrompt({
      date: '2024-01-15',
      summary: mockSummary,
      categorySpending: [],
      anomalies: [
        { description: 'Big spend', severity: 'warning' },
        { description: 'Huge spend', severity: 'alert' },
      ],
    });
    expect(result).toContain('[WARNING] Big spend');
    expect(result).toContain('[ALERT] Huge spend');
  });

  it('includes previous insight for continuity when provided', () => {
    const result = buildDailyInsightPrompt({
      date: '2024-01-15',
      summary: mockSummary,
      categorySpending: [],
      anomalies: [],
      previousInsightNarrative: 'Yesterday you spent wisely.',
    });
    expect(result).toContain('PREVIOUS DAILY INSIGHT');
    expect(result).toContain('Yesterday you spent wisely.');
  });

  it('omits previous insight section when not provided', () => {
    const result = buildDailyInsightPrompt({
      date: '2024-01-15',
      summary: mockSummary,
      categorySpending: [],
      anomalies: [],
    });
    expect(result).not.toContain('PREVIOUS DAILY INSIGHT');
  });

  it('contains JSON response structure instructions', () => {
    const result = buildDailyInsightPrompt({
      date: '2024-01-15',
      summary: mockSummary,
      categorySpending: [],
      anomalies: [],
    });
    expect(result).toContain('"summary"');
    expect(result).toContain('"highlights"');
    expect(result).toContain('"recommendations"');
    expect(result).toContain('"narrative"');
  });
});

describe('buildWeeklyInsightPrompt', () => {
  it('contains required sections', () => {
    const result = buildWeeklyInsightPrompt({
      weekStart: '2024-01-08',
      weekEnd: '2024-01-14',
      summary: mockSummary,
      categorySpending: mockCategorySpending,
      anomalies: [],
    });
    expect(result).toContain('WEEK: 2024-01-08 to 2024-01-14');
    expect(result).toContain('TOP SPENDING CATEGORIES:');
  });

  it('includes WoW comparison when previous week data provided', () => {
    const prevSummary: SpendingSummaryResult = {
      totalIncome: 2500,
      totalExpenses: 1200,
      netBalance: 1300,
      pendingReimbursements: 0,
      transactionCount: 35,
    };
    const result = buildWeeklyInsightPrompt({
      weekStart: '2024-01-08',
      weekEnd: '2024-01-14',
      summary: mockSummary,
      categorySpending: mockCategorySpending,
      previousWeekSummary: prevSummary,
      previousWeekCategorySpending: mockCategorySpending,
      anomalies: [],
    });
    expect(result).toContain('WEEK-OVER-WEEK COMPARISON');
    expect(result).toContain('€1200.00');
    expect(result).toContain('€1500.00');
  });

  it('omits WoW section when no previous week data', () => {
    const result = buildWeeklyInsightPrompt({
      weekStart: '2024-01-08',
      weekEnd: '2024-01-14',
      summary: mockSummary,
      categorySpending: mockCategorySpending,
      anomalies: [],
    });
    expect(result).not.toContain('WEEK-OVER-WEEK COMPARISON');
  });

  it('includes goal progress when provided', () => {
    const result = buildWeeklyInsightPrompt({
      weekStart: '2024-01-08',
      weekEnd: '2024-01-14',
      summary: mockSummary,
      categorySpending: [],
      anomalies: [],
      goalProgress: [
        { goalName: 'Emergency Fund', progressPct: 65, onTrack: true },
      ],
    });
    expect(result).toContain('GOAL PROGRESS');
    expect(result).toContain('Emergency Fund: 65%');
    expect(result).toContain('(on track)');
  });

  it('includes investment summary when provided', () => {
    const result = buildWeeklyInsightPrompt({
      weekStart: '2024-01-08',
      weekEnd: '2024-01-14',
      summary: mockSummary,
      categorySpending: [],
      anomalies: [],
      investmentSummary: { totalValue: 50000, totalGain: 5000, returnPct: 11.1 },
    });
    expect(result).toContain('INVESTMENT PORTFOLIO');
    expect(result).toContain('€50000.00');
    expect(result).toContain('11.1%');
  });

  it('includes advisor memory when provided', () => {
    const result = buildWeeklyInsightPrompt({
      weekStart: '2024-01-08',
      weekEnd: '2024-01-14',
      summary: mockSummary,
      categorySpending: [],
      anomalies: [],
      advisorMemory: 'User prefers conservative spending.',
    });
    expect(result).toContain('ADVISOR MEMORY');
    expect(result).toContain('User prefers conservative spending.');
  });

  it('handles all optional fields empty without crashing', () => {
    const result = buildWeeklyInsightPrompt({
      weekStart: '2024-01-08',
      weekEnd: '2024-01-14',
      summary: mockSummary,
      categorySpending: [],
      anomalies: [],
    });
    expect(result).toBeTruthy();
    expect(result).not.toContain('GOAL PROGRESS');
    expect(result).not.toContain('INVESTMENT PORTFOLIO');
    expect(result).not.toContain('ADVISOR MEMORY');
  });
});
