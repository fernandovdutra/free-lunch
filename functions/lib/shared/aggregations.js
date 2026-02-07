"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.serializeTransaction = serializeTransaction;
exports.calculateSummary = calculateSummary;
exports.calculateCategorySpending = calculateCategorySpending;
exports.calculateTimelineData = calculateTimelineData;
exports.calculateSpendingByCategory = calculateSpendingByCategory;
exports.calculateBudgetProgress = calculateBudgetProgress;
exports.calculateReimbursementSummary = calculateReimbursementSummary;
const date_fns_1 = require("date-fns");
// ============================================================================
// Helper: convert Firestore Timestamp to Date
// ============================================================================
function toDate(ts) {
    return ts.toDate();
}
function toISOString(ts) {
    return ts.toDate().toISOString();
}
// ============================================================================
// Serialization
// ============================================================================
function serializeTransaction(id, doc) {
    return {
        id,
        externalId: doc.externalId ?? null,
        date: toISOString(doc.date),
        description: doc.description,
        amount: doc.amount,
        currency: doc.currency ?? 'EUR',
        counterparty: doc.counterparty ?? null,
        categoryId: doc.categoryId ?? null,
        categorySource: doc.categorySource ?? 'manual',
        categoryConfidence: doc.categoryConfidence ?? 0,
        isSplit: doc.isSplit ?? false,
        splits: doc.splits ?? null,
        reimbursement: doc.reimbursement
            ? {
                type: doc.reimbursement.type,
                status: doc.reimbursement.status,
                note: doc.reimbursement.note ?? null,
                linkedTransactionId: doc.reimbursement.linkedTransactionId ?? null,
                clearedAt: doc.reimbursement.clearedAt
                    ? toISOString(doc.reimbursement.clearedAt)
                    : null,
            }
            : null,
        bankAccountId: doc.bankAccountId ?? null,
        importedAt: toISOString(doc.importedAt),
        updatedAt: toISOString(doc.updatedAt),
        excludeFromTotals: doc.excludeFromTotals ?? undefined,
        icsStatementId: doc.icsStatementId ?? undefined,
        source: doc.source ?? undefined,
    };
}
// ============================================================================
// Helper: resolve top-level category ID
// ============================================================================
function getTopLevelCategoryId(categoryId, categories) {
    if (!categoryId)
        return 'uncategorized';
    const cat = categories.get(categoryId);
    if (!cat)
        return categoryId;
    if (cat.parentId)
        return cat.parentId;
    return categoryId;
}
// ============================================================================
// calculateSummary
// ============================================================================
function calculateSummary(transactions, categories) {
    let totalIncome = 0;
    let totalExpenses = 0;
    let pendingReimbursements = 0;
    for (const { doc } of transactions) {
        if (doc.excludeFromTotals)
            continue;
        if (categories && doc.categoryId) {
            const topLevel = getTopLevelCategoryId(doc.categoryId, categories);
            if (topLevel === 'transfer')
                continue;
        }
        if (doc.reimbursement?.status === 'pending') {
            pendingReimbursements += Math.abs(doc.amount);
        }
        else if (doc.amount > 0) {
            totalIncome += doc.amount;
        }
        else {
            totalExpenses += Math.abs(doc.amount);
        }
    }
    return {
        totalIncome,
        totalExpenses,
        netBalance: totalIncome - totalExpenses,
        pendingReimbursements,
        transactionCount: transactions.length,
    };
}
// ============================================================================
// calculateCategorySpending
// (Fixed: now handles split transactions — ports budget progress approach)
// ============================================================================
function calculateCategorySpending(transactions, categories) {
    // Only count expenses (negative amounts), exclude pending reimbursements, excluded, and Transfer category
    const expenses = transactions.filter(({ doc }) => {
        if (doc.amount >= 0)
            return false;
        if (doc.reimbursement?.status === 'pending')
            return false;
        if (doc.excludeFromTotals)
            return false;
        const topLevel = getTopLevelCategoryId(doc.categoryId, categories);
        if (topLevel === 'transfer')
            return false;
        return true;
    });
    // Group by category, handling splits
    const spending = new Map();
    for (const { doc } of expenses) {
        if (doc.isSplit && doc.splits) {
            // Handle split transactions: each split counted toward its own category
            for (const split of doc.splits) {
                if (split.amount <= 0)
                    continue; // splits use positive amounts
                const key = split.categoryId || 'uncategorized';
                const current = spending.get(key) ?? { amount: 0, count: 0 };
                spending.set(key, {
                    amount: current.amount + split.amount,
                    count: current.count + 1,
                });
            }
        }
        else {
            // Regular transaction
            const key = doc.categoryId ?? 'uncategorized';
            const current = spending.get(key) ?? { amount: 0, count: 0 };
            spending.set(key, {
                amount: current.amount + Math.abs(doc.amount),
                count: current.count + 1,
            });
        }
    }
    // Calculate total for percentages
    const total = Array.from(spending.values()).reduce((sum, s) => sum + s.amount, 0);
    // Convert to result array
    const result = [];
    spending.forEach((value, categoryId) => {
        const category = categories.get(categoryId);
        result.push({
            categoryId,
            categoryName: category?.name ?? 'Uncategorized',
            categoryColor: category?.color ?? '#9CA3AF',
            amount: value.amount,
            percentage: total > 0 ? (value.amount / total) * 100 : 0,
            transactionCount: value.count,
        });
    });
    // Sort by amount descending
    return result.sort((a, b) => b.amount - a.amount);
}
// ============================================================================
// calculateTimelineData
// ============================================================================
function calculateTimelineData(transactions, startDate, endDate, categories) {
    // Create a map of date -> amounts
    const dailyData = new Map();
    // Initialize all days in range
    const days = (0, date_fns_1.eachDayOfInterval)({ start: startDate, end: endDate });
    for (const day of days) {
        dailyData.set((0, date_fns_1.format)(day, 'yyyy-MM-dd'), { income: 0, expenses: 0 });
    }
    // Aggregate transactions by day
    for (const { doc } of transactions) {
        if (doc.excludeFromTotals)
            continue;
        if (doc.reimbursement?.status === 'pending')
            continue; // Skip pending reimbursements
        if (categories && doc.categoryId) {
            const topLevel = getTopLevelCategoryId(doc.categoryId, categories);
            if (topLevel === 'transfer')
                continue;
        }
        const dateKey = (0, date_fns_1.format)(toDate(doc.date), 'yyyy-MM-dd');
        const current = dailyData.get(dateKey) ?? { income: 0, expenses: 0 };
        if (doc.amount > 0) {
            current.income += doc.amount;
        }
        else {
            current.expenses += Math.abs(doc.amount);
        }
        dailyData.set(dateKey, current);
    }
    // Convert to array with formatted dates
    return Array.from(dailyData.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([dateKey, data]) => ({
        date: (0, date_fns_1.format)(new Date(dateKey), 'MMM d'),
        dateKey,
        income: data.income,
        expenses: data.expenses,
    }));
}
// ============================================================================
// calculateSpendingByCategory (with parent rollup + split handling)
// ============================================================================
function calculateSpendingByCategory(transactions, categories) {
    const spending = new Map();
    for (const { doc } of transactions) {
        // Skip income, pending reimbursements, excluded, and Transfer category
        if (doc.excludeFromTotals)
            continue;
        if (doc.amount >= 0)
            continue;
        if (doc.reimbursement?.status === 'pending')
            continue;
        const topLevelId = getTopLevelCategoryId(doc.categoryId, categories);
        if (topLevelId === 'transfer')
            continue;
        const absAmount = Math.abs(doc.amount);
        if (doc.isSplit && doc.splits) {
            // Handle split transactions — each split counts toward its category
            for (const split of doc.splits) {
                if (split.amount <= 0)
                    continue; // splits use positive amounts
                const current = spending.get(split.categoryId) ?? 0;
                spending.set(split.categoryId, current + split.amount);
                // Also add to parent category if exists
                const category = categories.get(split.categoryId);
                if (category?.parentId) {
                    const parentCurrent = spending.get(category.parentId) ?? 0;
                    spending.set(category.parentId, parentCurrent + split.amount);
                }
            }
        }
        else if (doc.categoryId) {
            // Regular transaction
            const current = spending.get(doc.categoryId) ?? 0;
            spending.set(doc.categoryId, current + absAmount);
            // Also add to parent category if exists
            const category = categories.get(doc.categoryId);
            if (category?.parentId) {
                const parentCurrent = spending.get(category.parentId) ?? 0;
                spending.set(category.parentId, parentCurrent + absAmount);
            }
        }
    }
    return spending;
}
// ============================================================================
// calculateBudgetProgress
// ============================================================================
function calculateBudgetProgress(budgets, spendingMap, categories) {
    return budgets
        .filter(({ doc }) => doc.isActive)
        .map(({ id, doc: budget }) => {
        const category = categories.get(budget.categoryId);
        const spent = spendingMap.get(budget.categoryId) ?? 0;
        const remaining = Math.max(0, budget.monthlyLimit - spent);
        const percentage = budget.monthlyLimit > 0 ? (spent / budget.monthlyLimit) * 100 : 0;
        let status = 'safe';
        if (percentage >= 100) {
            status = 'exceeded';
        }
        else if (percentage >= budget.alertThreshold) {
            status = 'warning';
        }
        return {
            budgetId: id,
            budgetName: budget.name,
            categoryId: budget.categoryId,
            categoryName: category?.name ?? 'Unknown',
            categoryIcon: category?.icon ?? '📁',
            categoryColor: category?.color ?? '#9CA3AF',
            monthlyLimit: budget.monthlyLimit,
            alertThreshold: budget.alertThreshold,
            spent,
            remaining,
            percentage,
            status,
        };
    })
        .sort((a, b) => b.percentage - a.percentage);
}
// ============================================================================
// calculateReimbursementSummary
// ============================================================================
function calculateReimbursementSummary(pendingTransactions, clearedTransactions) {
    const pendingTotal = pendingTransactions.reduce((sum, { doc }) => sum + Math.abs(doc.amount), 0);
    const pendingWorkTotal = pendingTransactions
        .filter(({ doc }) => doc.reimbursement?.type === 'work')
        .reduce((sum, { doc }) => sum + Math.abs(doc.amount), 0);
    const pendingPersonalTotal = pendingTransactions
        .filter(({ doc }) => doc.reimbursement?.type === 'personal')
        .reduce((sum, { doc }) => sum + Math.abs(doc.amount), 0);
    const clearedTotal = clearedTransactions.reduce((sum, { doc }) => sum + Math.abs(doc.amount), 0);
    return {
        pendingCount: pendingTransactions.length,
        pendingTotal,
        pendingWorkTotal,
        pendingPersonalTotal,
        clearedCount: clearedTransactions.length,
        clearedTotal,
    };
}
//# sourceMappingURL=aggregations.js.map