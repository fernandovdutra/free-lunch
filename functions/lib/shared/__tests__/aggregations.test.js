"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const firestore_1 = require("firebase-admin/firestore");
const aggregations_1 = require("../aggregations");
// Helper to create a mock Timestamp
function mockTimestamp(dateStr) {
    return firestore_1.Timestamp.fromDate(new Date(dateStr));
}
// Helper to create a transaction doc
function createTx(overrides) {
    const id = overrides.externalId ?? `tx-${Math.random().toString(36).slice(2)}`;
    return {
        id,
        doc: {
            date: mockTimestamp(overrides.date ?? '2024-01-15'),
            amount: overrides.amount,
            categoryId: overrides.categoryId ?? null,
            isSplit: overrides.isSplit ?? false,
            splits: overrides.splits ?? null,
            reimbursement: overrides.reimbursement ?? null,
            description: overrides.description ?? 'Test transaction',
            counterparty: overrides.counterparty ?? null,
            externalId: overrides.externalId ?? null,
            currency: overrides.currency ?? 'EUR',
            categorySource: overrides.categorySource ?? 'manual',
            categoryConfidence: overrides.categoryConfidence ?? 1,
            bankAccountId: overrides.bankAccountId ?? null,
            importedAt: overrides.importedAt ?? mockTimestamp('2024-01-15'),
            updatedAt: overrides.updatedAt ?? mockTimestamp('2024-01-15'),
        },
    };
}
// ============================================================================
// calculateSummary
// ============================================================================
(0, vitest_1.describe)('calculateSummary', () => {
    (0, vitest_1.it)('handles empty array', () => {
        const result = (0, aggregations_1.calculateSummary)([]);
        (0, vitest_1.expect)(result).toEqual({
            totalIncome: 0,
            totalExpenses: 0,
            netBalance: 0,
            pendingReimbursements: 0,
            transactionCount: 0,
        });
    });
    (0, vitest_1.it)('sums income correctly', () => {
        const transactions = [
            createTx({ amount: 100 }),
            createTx({ amount: 200 }),
        ];
        const result = (0, aggregations_1.calculateSummary)(transactions);
        (0, vitest_1.expect)(result.totalIncome).toBe(300);
        (0, vitest_1.expect)(result.totalExpenses).toBe(0);
        (0, vitest_1.expect)(result.netBalance).toBe(300);
        (0, vitest_1.expect)(result.transactionCount).toBe(2);
    });
    (0, vitest_1.it)('sums expenses correctly', () => {
        const transactions = [
            createTx({ amount: -50 }),
            createTx({ amount: -75.5 }),
        ];
        const result = (0, aggregations_1.calculateSummary)(transactions);
        (0, vitest_1.expect)(result.totalIncome).toBe(0);
        (0, vitest_1.expect)(result.totalExpenses).toBe(125.5);
        (0, vitest_1.expect)(result.netBalance).toBe(-125.5);
    });
    (0, vitest_1.it)('handles mixed income and expenses', () => {
        const transactions = [
            createTx({ amount: 1000 }),
            createTx({ amount: -200 }),
            createTx({ amount: -300 }),
        ];
        const result = (0, aggregations_1.calculateSummary)(transactions);
        (0, vitest_1.expect)(result.totalIncome).toBe(1000);
        (0, vitest_1.expect)(result.totalExpenses).toBe(500);
        (0, vitest_1.expect)(result.netBalance).toBe(500);
    });
    (0, vitest_1.it)('excludes pending reimbursements from income/expenses', () => {
        const transactions = [
            createTx({ amount: 1000 }),
            createTx({ amount: -200 }),
            createTx({
                amount: -150,
                reimbursement: { type: 'work', status: 'pending', note: null, linkedTransactionId: null, clearedAt: null },
            }),
        ];
        const result = (0, aggregations_1.calculateSummary)(transactions);
        (0, vitest_1.expect)(result.totalIncome).toBe(1000);
        (0, vitest_1.expect)(result.totalExpenses).toBe(200);
        (0, vitest_1.expect)(result.pendingReimbursements).toBe(150);
        (0, vitest_1.expect)(result.netBalance).toBe(800);
    });
    (0, vitest_1.it)('includes cleared reimbursements in expenses', () => {
        const transactions = [
            createTx({
                amount: -100,
                reimbursement: { type: 'work', status: 'cleared', note: null, linkedTransactionId: 'x', clearedAt: mockTimestamp('2024-01-20') },
            }),
        ];
        const result = (0, aggregations_1.calculateSummary)(transactions);
        (0, vitest_1.expect)(result.totalExpenses).toBe(100);
        (0, vitest_1.expect)(result.pendingReimbursements).toBe(0);
    });
});
// ============================================================================
// calculateCategorySpending
// ============================================================================
(0, vitest_1.describe)('calculateCategorySpending', () => {
    const categories = new Map([
        ['food', { name: 'Food', icon: '🍽️', color: '#C9A227', parentId: null, order: 0, isSystem: true }],
        ['food-groceries', { name: 'Groceries', icon: '🛒', color: '#C9A227', parentId: 'food', order: 0, isSystem: true }],
        ['transport', { name: 'Transport', icon: '🚗', color: '#4A6FA5', parentId: null, order: 1, isSystem: true }],
    ]);
    (0, vitest_1.it)('handles empty array', () => {
        const result = (0, aggregations_1.calculateCategorySpending)([], categories);
        (0, vitest_1.expect)(result).toEqual([]);
    });
    (0, vitest_1.it)('groups expenses by category', () => {
        const transactions = [
            createTx({ amount: -50, categoryId: 'food' }),
            createTx({ amount: -30, categoryId: 'food' }),
            createTx({ amount: -20, categoryId: 'transport' }),
        ];
        const result = (0, aggregations_1.calculateCategorySpending)(transactions, categories);
        (0, vitest_1.expect)(result).toHaveLength(2);
        const food = result.find(r => r.categoryId === 'food');
        (0, vitest_1.expect)(food?.amount).toBe(80);
        (0, vitest_1.expect)(food?.transactionCount).toBe(2);
        (0, vitest_1.expect)(food?.categoryName).toBe('Food');
        const transport = result.find(r => r.categoryId === 'transport');
        (0, vitest_1.expect)(transport?.amount).toBe(20);
        (0, vitest_1.expect)(transport?.transactionCount).toBe(1);
    });
    (0, vitest_1.it)('calculates percentages correctly', () => {
        const transactions = [
            createTx({ amount: -75, categoryId: 'food' }),
            createTx({ amount: -25, categoryId: 'transport' }),
        ];
        const result = (0, aggregations_1.calculateCategorySpending)(transactions, categories);
        const food = result.find(r => r.categoryId === 'food');
        (0, vitest_1.expect)(food?.percentage).toBe(75);
        const transport = result.find(r => r.categoryId === 'transport');
        (0, vitest_1.expect)(transport?.percentage).toBe(25);
    });
    (0, vitest_1.it)('excludes income (positive amounts)', () => {
        const transactions = [
            createTx({ amount: 1000, categoryId: 'food' }),
            createTx({ amount: -50, categoryId: 'food' }),
        ];
        const result = (0, aggregations_1.calculateCategorySpending)(transactions, categories);
        (0, vitest_1.expect)(result).toHaveLength(1);
        (0, vitest_1.expect)(result[0].amount).toBe(50);
    });
    (0, vitest_1.it)('excludes pending reimbursements', () => {
        const transactions = [
            createTx({ amount: -50, categoryId: 'food' }),
            createTx({
                amount: -100,
                categoryId: 'food',
                reimbursement: { type: 'work', status: 'pending', note: null, linkedTransactionId: null, clearedAt: null },
            }),
        ];
        const result = (0, aggregations_1.calculateCategorySpending)(transactions, categories);
        (0, vitest_1.expect)(result).toHaveLength(1);
        (0, vitest_1.expect)(result[0].amount).toBe(50);
    });
    (0, vitest_1.it)('handles uncategorized transactions', () => {
        const transactions = [
            createTx({ amount: -50, categoryId: null }),
        ];
        const result = (0, aggregations_1.calculateCategorySpending)(transactions, categories);
        (0, vitest_1.expect)(result).toHaveLength(1);
        (0, vitest_1.expect)(result[0].categoryId).toBe('uncategorized');
        (0, vitest_1.expect)(result[0].categoryName).toBe('Uncategorized');
    });
    (0, vitest_1.it)('handles split transactions', () => {
        const transactions = [
            createTx({
                amount: -100,
                categoryId: 'food',
                isSplit: true,
                splits: [
                    { amount: 60, categoryId: 'food-groceries', note: null },
                    { amount: 40, categoryId: 'transport', note: null },
                ],
            }),
        ];
        const result = (0, aggregations_1.calculateCategorySpending)(transactions, categories);
        const groceries = result.find(r => r.categoryId === 'food-groceries');
        (0, vitest_1.expect)(groceries?.amount).toBe(60);
        const transport = result.find(r => r.categoryId === 'transport');
        (0, vitest_1.expect)(transport?.amount).toBe(40);
    });
    (0, vitest_1.it)('sorts by amount descending', () => {
        const transactions = [
            createTx({ amount: -20, categoryId: 'transport' }),
            createTx({ amount: -80, categoryId: 'food' }),
        ];
        const result = (0, aggregations_1.calculateCategorySpending)(transactions, categories);
        (0, vitest_1.expect)(result[0].categoryId).toBe('food');
        (0, vitest_1.expect)(result[1].categoryId).toBe('transport');
    });
});
// ============================================================================
// calculateTimelineData
// ============================================================================
(0, vitest_1.describe)('calculateTimelineData', () => {
    (0, vitest_1.it)('handles empty array with date range', () => {
        const start = new Date('2024-01-01');
        const end = new Date('2024-01-03');
        const result = (0, aggregations_1.calculateTimelineData)([], start, end);
        (0, vitest_1.expect)(result).toHaveLength(3);
        (0, vitest_1.expect)(result.every(d => d.income === 0 && d.expenses === 0)).toBe(true);
    });
    (0, vitest_1.it)('zero-fills days without transactions', () => {
        const start = new Date('2024-01-01');
        const end = new Date('2024-01-05');
        const transactions = [
            createTx({ amount: -50, date: '2024-01-03' }),
        ];
        const result = (0, aggregations_1.calculateTimelineData)(transactions, start, end);
        (0, vitest_1.expect)(result).toHaveLength(5);
        // Jan 1 and Jan 2 should be zero
        (0, vitest_1.expect)(result[0].income).toBe(0);
        (0, vitest_1.expect)(result[0].expenses).toBe(0);
        // Jan 3 should have data
        const jan3 = result.find(d => d.dateKey === '2024-01-03');
        (0, vitest_1.expect)(jan3?.expenses).toBe(50);
    });
    (0, vitest_1.it)('separates income and expenses', () => {
        const start = new Date('2024-01-01');
        const end = new Date('2024-01-01');
        const transactions = [
            createTx({ amount: 200, date: '2024-01-01' }),
            createTx({ amount: -50, date: '2024-01-01' }),
        ];
        const result = (0, aggregations_1.calculateTimelineData)(transactions, start, end);
        (0, vitest_1.expect)(result[0].income).toBe(200);
        (0, vitest_1.expect)(result[0].expenses).toBe(50);
    });
    (0, vitest_1.it)('excludes pending reimbursements', () => {
        const start = new Date('2024-01-01');
        const end = new Date('2024-01-01');
        const transactions = [
            createTx({ amount: -100, date: '2024-01-01' }),
            createTx({
                amount: -50,
                date: '2024-01-01',
                reimbursement: { type: 'work', status: 'pending', note: null, linkedTransactionId: null, clearedAt: null },
            }),
        ];
        const result = (0, aggregations_1.calculateTimelineData)(transactions, start, end);
        (0, vitest_1.expect)(result[0].expenses).toBe(100);
    });
    (0, vitest_1.it)('includes dateKey in yyyy-MM-dd format', () => {
        const start = new Date('2024-01-15');
        const end = new Date('2024-01-15');
        const result = (0, aggregations_1.calculateTimelineData)([], start, end);
        (0, vitest_1.expect)(result[0].dateKey).toBe('2024-01-15');
    });
    (0, vitest_1.it)('returns formatted date string', () => {
        const start = new Date('2024-01-15');
        const end = new Date('2024-01-15');
        const result = (0, aggregations_1.calculateTimelineData)([], start, end);
        (0, vitest_1.expect)(result[0].date).toBe('Jan 15');
    });
});
// ============================================================================
// calculateSpendingByCategory
// ============================================================================
(0, vitest_1.describe)('calculateSpendingByCategory', () => {
    const categories = new Map([
        ['food', { name: 'Food', icon: '🍽️', color: '#C9A227', parentId: null, order: 0, isSystem: true }],
        ['food-groceries', { name: 'Groceries', icon: '🛒', color: '#C9A227', parentId: 'food', order: 0, isSystem: true }],
        ['transport', { name: 'Transport', icon: '🚗', color: '#4A6FA5', parentId: null, order: 1, isSystem: true }],
    ]);
    (0, vitest_1.it)('handles empty array', () => {
        const result = (0, aggregations_1.calculateSpendingByCategory)([], categories);
        (0, vitest_1.expect)(result.size).toBe(0);
    });
    (0, vitest_1.it)('sums spending by category', () => {
        const transactions = [
            createTx({ amount: -50, categoryId: 'food' }),
            createTx({ amount: -30, categoryId: 'food' }),
        ];
        const result = (0, aggregations_1.calculateSpendingByCategory)(transactions, categories);
        (0, vitest_1.expect)(result.get('food')).toBe(80);
    });
    (0, vitest_1.it)('rolls up child spending to parent', () => {
        const transactions = [
            createTx({ amount: -50, categoryId: 'food-groceries' }),
        ];
        const result = (0, aggregations_1.calculateSpendingByCategory)(transactions, categories);
        (0, vitest_1.expect)(result.get('food-groceries')).toBe(50);
        (0, vitest_1.expect)(result.get('food')).toBe(50); // parent rollup
    });
    (0, vitest_1.it)('handles split transactions with parent rollup', () => {
        const transactions = [
            createTx({
                amount: -100,
                categoryId: 'food',
                isSplit: true,
                splits: [
                    { amount: 60, categoryId: 'food-groceries', note: null },
                    { amount: 40, categoryId: 'transport', note: null },
                ],
            }),
        ];
        const result = (0, aggregations_1.calculateSpendingByCategory)(transactions, categories);
        (0, vitest_1.expect)(result.get('food-groceries')).toBe(60);
        (0, vitest_1.expect)(result.get('food')).toBe(60); // parent rollup from groceries split
        (0, vitest_1.expect)(result.get('transport')).toBe(40);
    });
    (0, vitest_1.it)('skips income transactions', () => {
        const transactions = [
            createTx({ amount: 1000, categoryId: 'food' }),
        ];
        const result = (0, aggregations_1.calculateSpendingByCategory)(transactions, categories);
        (0, vitest_1.expect)(result.size).toBe(0);
    });
    (0, vitest_1.it)('excludes pending reimbursements', () => {
        const transactions = [
            createTx({ amount: -100, categoryId: 'food' }),
            createTx({
                amount: -50,
                categoryId: 'food',
                reimbursement: { type: 'work', status: 'pending', note: null, linkedTransactionId: null, clearedAt: null },
            }),
        ];
        const result = (0, aggregations_1.calculateSpendingByCategory)(transactions, categories);
        (0, vitest_1.expect)(result.get('food')).toBe(100);
    });
});
// ============================================================================
// calculateBudgetProgress
// ============================================================================
(0, vitest_1.describe)('calculateBudgetProgress', () => {
    const categories = new Map([
        ['food', { name: 'Food', icon: '🍽️', color: '#C9A227', parentId: null, order: 0, isSystem: true }],
        ['transport', { name: 'Transport', icon: '🚗', color: '#4A6FA5', parentId: null, order: 1, isSystem: true }],
    ]);
    (0, vitest_1.it)('handles empty budgets', () => {
        const result = (0, aggregations_1.calculateBudgetProgress)([], new Map(), categories);
        (0, vitest_1.expect)(result).toEqual([]);
    });
    (0, vitest_1.it)('calculates safe status', () => {
        const budgets = [
            { id: 'b1', doc: { name: 'Food Budget', categoryId: 'food', monthlyLimit: 200, alertThreshold: 80, isActive: true } },
        ];
        const spending = new Map([['food', 100]]);
        const result = (0, aggregations_1.calculateBudgetProgress)(budgets, spending, categories);
        (0, vitest_1.expect)(result).toHaveLength(1);
        (0, vitest_1.expect)(result[0].status).toBe('safe');
        (0, vitest_1.expect)(result[0].spent).toBe(100);
        (0, vitest_1.expect)(result[0].remaining).toBe(100);
        (0, vitest_1.expect)(result[0].percentage).toBe(50);
        (0, vitest_1.expect)(result[0].categoryName).toBe('Food');
    });
    (0, vitest_1.it)('calculates warning status', () => {
        const budgets = [
            { id: 'b1', doc: { name: 'Food Budget', categoryId: 'food', monthlyLimit: 100, alertThreshold: 80, isActive: true } },
        ];
        const spending = new Map([['food', 85]]);
        const result = (0, aggregations_1.calculateBudgetProgress)(budgets, spending, categories);
        (0, vitest_1.expect)(result[0].status).toBe('warning');
    });
    (0, vitest_1.it)('calculates exceeded status', () => {
        const budgets = [
            { id: 'b1', doc: { name: 'Food Budget', categoryId: 'food', monthlyLimit: 100, alertThreshold: 80, isActive: true } },
        ];
        const spending = new Map([['food', 150]]);
        const result = (0, aggregations_1.calculateBudgetProgress)(budgets, spending, categories);
        (0, vitest_1.expect)(result[0].status).toBe('exceeded');
        (0, vitest_1.expect)(result[0].remaining).toBe(0);
        (0, vitest_1.expect)(result[0].percentage).toBe(150);
    });
    (0, vitest_1.it)('filters inactive budgets', () => {
        const budgets = [
            { id: 'b1', doc: { name: 'Food Budget', categoryId: 'food', monthlyLimit: 100, alertThreshold: 80, isActive: false } },
        ];
        const result = (0, aggregations_1.calculateBudgetProgress)(budgets, new Map(), categories);
        (0, vitest_1.expect)(result).toHaveLength(0);
    });
    (0, vitest_1.it)('sorts by percentage descending', () => {
        const budgets = [
            { id: 'b1', doc: { name: 'Food Budget', categoryId: 'food', monthlyLimit: 100, alertThreshold: 80, isActive: true } },
            { id: 'b2', doc: { name: 'Transport Budget', categoryId: 'transport', monthlyLimit: 100, alertThreshold: 80, isActive: true } },
        ];
        const spending = new Map([['food', 30], ['transport', 70]]);
        const result = (0, aggregations_1.calculateBudgetProgress)(budgets, spending, categories);
        (0, vitest_1.expect)(result[0].budgetId).toBe('b2');
        (0, vitest_1.expect)(result[1].budgetId).toBe('b1');
    });
    (0, vitest_1.it)('handles missing category gracefully', () => {
        const budgets = [
            { id: 'b1', doc: { name: 'Unknown Budget', categoryId: 'nonexistent', monthlyLimit: 100, alertThreshold: 80, isActive: true } },
        ];
        const result = (0, aggregations_1.calculateBudgetProgress)(budgets, new Map(), categories);
        (0, vitest_1.expect)(result[0].categoryName).toBe('Unknown');
        (0, vitest_1.expect)(result[0].categoryIcon).toBe('📁');
    });
});
// ============================================================================
// calculateReimbursementSummary
// ============================================================================
(0, vitest_1.describe)('calculateReimbursementSummary', () => {
    (0, vitest_1.it)('handles empty arrays', () => {
        const result = (0, aggregations_1.calculateReimbursementSummary)([], []);
        (0, vitest_1.expect)(result).toEqual({
            pendingCount: 0,
            pendingTotal: 0,
            pendingWorkTotal: 0,
            pendingPersonalTotal: 0,
            clearedCount: 0,
            clearedTotal: 0,
        });
    });
    (0, vitest_1.it)('calculates pending totals with work/personal breakdown', () => {
        const pending = [
            createTx({
                amount: -100,
                reimbursement: { type: 'work', status: 'pending', note: null, linkedTransactionId: null, clearedAt: null },
            }),
            createTx({
                amount: -50,
                reimbursement: { type: 'personal', status: 'pending', note: null, linkedTransactionId: null, clearedAt: null },
            }),
            createTx({
                amount: -75,
                reimbursement: { type: 'work', status: 'pending', note: null, linkedTransactionId: null, clearedAt: null },
            }),
        ];
        const result = (0, aggregations_1.calculateReimbursementSummary)(pending, []);
        (0, vitest_1.expect)(result.pendingCount).toBe(3);
        (0, vitest_1.expect)(result.pendingTotal).toBe(225);
        (0, vitest_1.expect)(result.pendingWorkTotal).toBe(175);
        (0, vitest_1.expect)(result.pendingPersonalTotal).toBe(50);
    });
    (0, vitest_1.it)('calculates cleared totals', () => {
        const cleared = [
            createTx({
                amount: -200,
                reimbursement: { type: 'work', status: 'cleared', note: null, linkedTransactionId: 'x', clearedAt: mockTimestamp('2024-01-20') },
            }),
        ];
        const result = (0, aggregations_1.calculateReimbursementSummary)([], cleared);
        (0, vitest_1.expect)(result.clearedCount).toBe(1);
        (0, vitest_1.expect)(result.clearedTotal).toBe(200);
    });
    (0, vitest_1.it)('handles mixed pending and cleared', () => {
        const pending = [
            createTx({
                amount: -100,
                reimbursement: { type: 'work', status: 'pending', note: null, linkedTransactionId: null, clearedAt: null },
            }),
        ];
        const cleared = [
            createTx({
                amount: -50,
                reimbursement: { type: 'work', status: 'cleared', note: null, linkedTransactionId: 'x', clearedAt: mockTimestamp('2024-01-20') },
            }),
        ];
        const result = (0, aggregations_1.calculateReimbursementSummary)(pending, cleared);
        (0, vitest_1.expect)(result.pendingCount).toBe(1);
        (0, vitest_1.expect)(result.pendingTotal).toBe(100);
        (0, vitest_1.expect)(result.clearedCount).toBe(1);
        (0, vitest_1.expect)(result.clearedTotal).toBe(50);
    });
});
// ============================================================================
// serializeTransaction
// ============================================================================
(0, vitest_1.describe)('serializeTransaction', () => {
    (0, vitest_1.it)('serializes dates as ISO strings', () => {
        const tx = createTx({ amount: -50, date: '2024-01-15T12:00:00Z' });
        const result = (0, aggregations_1.serializeTransaction)(tx.id, tx.doc);
        (0, vitest_1.expect)(typeof result.date).toBe('string');
        (0, vitest_1.expect)(typeof result.importedAt).toBe('string');
        (0, vitest_1.expect)(typeof result.updatedAt).toBe('string');
    });
    (0, vitest_1.it)('serializes reimbursement clearedAt as ISO string', () => {
        const tx = createTx({
            amount: -50,
            reimbursement: { type: 'work', status: 'cleared', note: null, linkedTransactionId: 'x', clearedAt: mockTimestamp('2024-01-20') },
        });
        const result = (0, aggregations_1.serializeTransaction)(tx.id, tx.doc);
        (0, vitest_1.expect)(result.reimbursement?.clearedAt).toContain('2024-01-20');
    });
    (0, vitest_1.it)('handles null reimbursement', () => {
        const tx = createTx({ amount: -50 });
        const result = (0, aggregations_1.serializeTransaction)(tx.id, tx.doc);
        (0, vitest_1.expect)(result.reimbursement).toBeNull();
    });
    (0, vitest_1.it)('preserves all transaction fields', () => {
        const tx = createTx({
            amount: -100,
            categoryId: 'food',
            description: 'Test',
            counterparty: 'Store',
            currency: 'EUR',
            categorySource: 'manual',
            categoryConfidence: 0.95,
            isSplit: true,
            splits: [{ amount: 50, categoryId: 'food', note: 'lunch' }],
        });
        const result = (0, aggregations_1.serializeTransaction)(tx.id, tx.doc);
        (0, vitest_1.expect)(result.amount).toBe(-100);
        (0, vitest_1.expect)(result.categoryId).toBe('food');
        (0, vitest_1.expect)(result.description).toBe('Test');
        (0, vitest_1.expect)(result.counterparty).toBe('Store');
        (0, vitest_1.expect)(result.isSplit).toBe(true);
        (0, vitest_1.expect)(result.splits).toHaveLength(1);
    });
});
//# sourceMappingURL=aggregations.test.js.map