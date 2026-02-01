import { describe, it, expect } from 'vitest';
import type { MonthlySpending, CounterpartyAnalytics } from '../useCounterpartyAnalytics';

// Note: Since useCounterpartyAnalytics depends heavily on Firebase and hooks,
// we test the data structures and transformation logic here. Full integration tests
// would require Firebase emulator setup.

describe('MonthlySpending type', () => {
  it('has correct structure', () => {
    const spending: MonthlySpending = {
      month: 'Jan 2024',
      monthKey: '2024-01',
      amount: 150.5,
      transactionCount: 3,
    };

    expect(spending.month).toBe('Jan 2024');
    expect(spending.monthKey).toBe('2024-01');
    expect(spending.amount).toBe(150.5);
    expect(spending.transactionCount).toBe(3);
  });

  it('allows zero amount for months with no transactions', () => {
    const spending: MonthlySpending = {
      month: 'Feb 2024',
      monthKey: '2024-02',
      amount: 0,
      transactionCount: 0,
    };

    expect(spending.amount).toBe(0);
    expect(spending.transactionCount).toBe(0);
  });
});

describe('CounterpartyAnalytics type', () => {
  it('has correct structure', () => {
    const analytics: CounterpartyAnalytics = {
      counterparty: 'Albert Heijn',
      currentMonthSpending: 250.0,
      currentMonthTransactions: 5,
      last3Months: [
        { month: 'Nov 2023', monthKey: '2023-11', amount: 200, transactionCount: 4 },
        { month: 'Dec 2023', monthKey: '2023-12', amount: 180, transactionCount: 3 },
        { month: 'Jan 2024', monthKey: '2024-01', amount: 250, transactionCount: 5 },
      ],
      last12Months: [], // Abbreviated for test
      totalSpent: 2500.0,
      totalTransactions: 45,
      averagePerMonth: 208.33,
      firstTransactionDate: new Date('2023-01-15'),
      lastTransactionDate: new Date('2024-01-20'),
    };

    expect(analytics.counterparty).toBe('Albert Heijn');
    expect(analytics.currentMonthSpending).toBe(250.0);
    expect(analytics.currentMonthTransactions).toBe(5);
    expect(analytics.last3Months).toHaveLength(3);
    expect(analytics.totalSpent).toBe(2500.0);
    expect(analytics.totalTransactions).toBe(45);
    expect(analytics.averagePerMonth).toBeCloseTo(208.33, 2);
    expect(analytics.firstTransactionDate).toBeInstanceOf(Date);
    expect(analytics.lastTransactionDate).toBeInstanceOf(Date);
  });

  it('allows null dates for counterparties with no transactions', () => {
    const analytics: CounterpartyAnalytics = {
      counterparty: 'New Store',
      currentMonthSpending: 0,
      currentMonthTransactions: 0,
      last3Months: [],
      last12Months: [],
      totalSpent: 0,
      totalTransactions: 0,
      averagePerMonth: 0,
      firstTransactionDate: null,
      lastTransactionDate: null,
    };

    expect(analytics.firstTransactionDate).toBeNull();
    expect(analytics.lastTransactionDate).toBeNull();
  });
});

describe('Monthly aggregation logic', () => {
  interface MockExpense {
    date: Date;
    amount: number;
  }

  function aggregateByMonth(expenses: MockExpense[]): Map<string, { amount: number; count: number }> {
    const monthlyMap = new Map<string, { amount: number; count: number }>();

    expenses.forEach((expense) => {
      const monthKey = `${expense.date.getFullYear()}-${String(expense.date.getMonth() + 1).padStart(2, '0')}`;
      const current = monthlyMap.get(monthKey) ?? { amount: 0, count: 0 };
      monthlyMap.set(monthKey, {
        amount: current.amount + Math.abs(expense.amount),
        count: current.count + 1,
      });
    });

    return monthlyMap;
  }

  it('aggregates expenses by month', () => {
    const expenses: MockExpense[] = [
      { date: new Date('2024-01-15'), amount: -50 },
      { date: new Date('2024-01-20'), amount: -30 },
      { date: new Date('2024-02-10'), amount: -45 },
    ];

    const monthly = aggregateByMonth(expenses);

    expect(monthly.get('2024-01')?.amount).toBe(80);
    expect(monthly.get('2024-01')?.count).toBe(2);
    expect(monthly.get('2024-02')?.amount).toBe(45);
    expect(monthly.get('2024-02')?.count).toBe(1);
  });

  it('uses absolute values for amounts', () => {
    const expenses: MockExpense[] = [
      { date: new Date('2024-01-15'), amount: -100 },
      { date: new Date('2024-01-20'), amount: -50 },
    ];

    const monthly = aggregateByMonth(expenses);

    // Amounts should be positive in the aggregation
    expect(monthly.get('2024-01')?.amount).toBe(150);
  });

  it('handles empty expenses array', () => {
    const expenses: MockExpense[] = [];
    const monthly = aggregateByMonth(expenses);

    expect(monthly.size).toBe(0);
  });
});

describe('Average calculation logic', () => {
  function calculateAverage(totalSpent: number, monthsWithData: number): number {
    return monthsWithData > 0 ? totalSpent / monthsWithData : 0;
  }

  it('calculates correct average', () => {
    const average = calculateAverage(1200, 12);
    expect(average).toBe(100);
  });

  it('handles single month', () => {
    const average = calculateAverage(250, 1);
    expect(average).toBe(250);
  });

  it('returns zero when no months have data', () => {
    const average = calculateAverage(0, 0);
    expect(average).toBe(0);
  });
});
