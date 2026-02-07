"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSpendingExplorer = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const date_fns_1 = require("date-fns");
const aggregations_js_1 = require("../shared/aggregations.js");
// ============================================================================
// Helper: filter transactions by direction, excluding pending reimbursements
// ============================================================================
function filterByDirection(transactions, direction, categories) {
    return transactions.filter(({ doc }) => {
        // Exclude transactions marked for exclusion (e.g. ABN AMRO ICS lump sums)
        if (doc.excludeFromTotals)
            return false;
        // Exclude pending reimbursements
        if (doc.reimbursement?.status === 'pending')
            return false;
        // Exclude Transfer category from both expenses and income views
        if (doc.categoryId) {
            const topLevel = getTopLevelCategoryId(doc.categoryId, categories);
            if (topLevel === 'transfer')
                return false;
        }
        return direction === 'expenses' ? doc.amount < 0 : doc.amount > 0;
    });
}
// ============================================================================
// Helper: get effective amount (always positive)
// ============================================================================
function effectiveAmount(amount) {
    return Math.abs(amount);
}
// ============================================================================
// Helper: resolve a transaction's effective category (rolls up to parent if needed)
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
// Cloud Function
// ============================================================================
exports.getSpendingExplorer = (0, https_1.onCall)({
    region: 'europe-west1',
    cors: true,
}, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Must be logged in');
    }
    const userId = request.auth.uid;
    const { direction, startDate, endDate, categoryId, subcategoryId, counterparty, breakdownMonthKey, } = request.data;
    // Validate required params
    if (!direction || (direction !== 'expenses' && direction !== 'income')) {
        throw new https_1.HttpsError('invalid-argument', 'direction must be "expenses" or "income"');
    }
    if (!startDate || !endDate) {
        throw new https_1.HttpsError('invalid-argument', 'startDate and endDate are required');
    }
    const selectedStart = new Date(startDate);
    const selectedEnd = new Date(endDate);
    if (isNaN(selectedStart.getTime()) || isNaN(selectedEnd.getTime())) {
        throw new https_1.HttpsError('invalid-argument', 'startDate and endDate must be valid ISO date strings');
    }
    // Calculate 6-month window: selected month + 5 previous months
    const sixMonthStart = (0, date_fns_1.startOfMonth)((0, date_fns_1.subMonths)(selectedStart, 5));
    const sixMonthEnd = (0, date_fns_1.endOfMonth)(selectedEnd);
    const db = (0, firestore_1.getFirestore)();
    // Fetch transactions for 6-month window and categories in parallel
    const [transactionsSnapshot, categoriesSnapshot] = await Promise.all([
        db
            .collection('users')
            .doc(userId)
            .collection('transactions')
            .where('date', '>=', firestore_1.Timestamp.fromDate(sixMonthStart))
            .where('date', '<=', firestore_1.Timestamp.fromDate(sixMonthEnd))
            .orderBy('date', 'desc')
            .get(),
        db
            .collection('users')
            .doc(userId)
            .collection('categories')
            .orderBy('order')
            .get(),
    ]);
    // Build data structures
    const allTransactions = transactionsSnapshot.docs.map((doc) => ({
        id: doc.id,
        doc: doc.data(),
    }));
    const categories = new Map();
    categoriesSnapshot.docs.forEach((doc) => {
        categories.set(doc.id, doc.data());
    });
    // Filter by direction
    const directedTransactions = filterByDirection(allTransactions, direction, categories);
    // ========================================================================
    // Calculate 6-month totals
    // ========================================================================
    const monthlyMap = new Map();
    // Initialize all 6 months
    for (let i = 5; i >= 0; i--) {
        const monthDate = (0, date_fns_1.subMonths)(selectedStart, i);
        const key = (0, date_fns_1.format)(monthDate, 'yyyy-MM');
        monthlyMap.set(key, { amount: 0, count: 0 });
    }
    // If filtering by specific counterparty within category context
    if (counterparty && categoryId && subcategoryId) {
        for (const { doc } of directedTransactions) {
            if (doc.counterparty !== counterparty)
                continue;
            // Also filter by subcategory
            const matchesSubcategory = doc.isSplit && doc.splits
                ? doc.splits.some((s) => s.categoryId === subcategoryId)
                : doc.categoryId === subcategoryId;
            if (!matchesSubcategory)
                continue;
            const monthKey = (0, date_fns_1.format)(doc.date.toDate(), 'yyyy-MM');
            const entry = monthlyMap.get(monthKey);
            if (entry) {
                entry.amount += effectiveAmount(doc.amount);
                entry.count += 1;
            }
        }
    }
    else if (subcategoryId && categoryId) {
        // Filter by subcategory
        for (const { doc } of directedTransactions) {
            const matchesSubcategory = doc.isSplit && doc.splits
                ? doc.splits.some((s) => s.categoryId === subcategoryId)
                : doc.categoryId === subcategoryId;
            if (!matchesSubcategory)
                continue;
            const monthKey = (0, date_fns_1.format)(doc.date.toDate(), 'yyyy-MM');
            const entry = monthlyMap.get(monthKey);
            if (entry) {
                if (doc.isSplit && doc.splits) {
                    for (const split of doc.splits) {
                        if (split.categoryId === subcategoryId) {
                            entry.amount += split.amount;
                            entry.count += 1;
                        }
                    }
                }
                else {
                    entry.amount += effectiveAmount(doc.amount);
                    entry.count += 1;
                }
            }
        }
    }
    else if (categoryId) {
        // Filter by top-level category (include subcategories)
        for (const { doc } of directedTransactions) {
            const topLevel = doc.isSplit && doc.splits
                ? null // handled per split
                : getTopLevelCategoryId(doc.categoryId, categories);
            const monthKey = (0, date_fns_1.format)(doc.date.toDate(), 'yyyy-MM');
            const entry = monthlyMap.get(monthKey);
            if (!entry)
                continue;
            if (doc.isSplit && doc.splits) {
                for (const split of doc.splits) {
                    const splitTopLevel = getTopLevelCategoryId(split.categoryId, categories);
                    if (splitTopLevel === categoryId) {
                        entry.amount += split.amount;
                        entry.count += 1;
                    }
                }
            }
            else if (topLevel === categoryId) {
                entry.amount += effectiveAmount(doc.amount);
                entry.count += 1;
            }
        }
    }
    else {
        // All transactions for this direction
        for (const { doc } of directedTransactions) {
            const monthKey = (0, date_fns_1.format)(doc.date.toDate(), 'yyyy-MM');
            const entry = monthlyMap.get(monthKey);
            if (entry) {
                entry.amount += effectiveAmount(doc.amount);
                entry.count += 1;
            }
        }
    }
    // Convert to sorted array
    const monthlyTotals = Array.from(monthlyMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, data]) => ({
        month: (0, date_fns_1.format)(new Date(key + '-01'), 'MMM yyyy'),
        monthKey: key,
        amount: Math.round(data.amount * 100) / 100,
        transactionCount: data.count,
    }));
    // ========================================================================
    // Current month data
    // ========================================================================
    // Determine which month to show breakdown for
    const effectiveMonthKey = breakdownMonthKey ?? (0, date_fns_1.format)(selectedStart, 'yyyy-MM');
    const effectiveMonthDate = new Date(effectiveMonthKey + '-01');
    const effectiveMonthStart = (0, date_fns_1.startOfMonth)(effectiveMonthDate);
    const effectiveMonthEnd = (0, date_fns_1.endOfMonth)(effectiveMonthDate);
    const currentMonthTotal = monthlyMap.get(effectiveMonthKey);
    const currentTotal = Math.round((currentMonthTotal?.amount ?? 0) * 100) / 100;
    const currentMonth = (0, date_fns_1.format)(effectiveMonthStart, 'MMMM yyyy');
    // Filter to breakdown month for category/transaction detail
    const selectedMonthTransactions = directedTransactions.filter(({ doc }) => {
        const txDate = doc.date.toDate();
        return txDate >= effectiveMonthStart && txDate <= effectiveMonthEnd;
    });
    // ========================================================================
    // Level-specific response
    // ========================================================================
    // Counterparty level: return transactions for that counterparty in selected month
    if (counterparty && categoryId && subcategoryId) {
        const counterpartyTransactions = selectedMonthTransactions.filter(({ doc }) => {
            if (doc.counterparty !== counterparty)
                return false;
            if (doc.isSplit && doc.splits) {
                return doc.splits.some((s) => s.categoryId === subcategoryId);
            }
            return doc.categoryId === subcategoryId;
        });
        return {
            currentTotal,
            currentMonth,
            monthlyTotals,
            transactions: counterpartyTransactions.map(({ id, doc }) => (0, aggregations_js_1.serializeTransaction)(id, doc)),
        };
    }
    // Subcategory level: return transactions for that subcategory
    if (subcategoryId && categoryId) {
        const subcatTransactions = selectedMonthTransactions.filter(({ doc }) => {
            if (doc.isSplit && doc.splits) {
                return doc.splits.some((s) => s.categoryId === subcategoryId);
            }
            return doc.categoryId === subcategoryId;
        });
        return {
            currentTotal,
            currentMonth,
            monthlyTotals,
            transactions: subcatTransactions.map(({ id, doc }) => (0, aggregations_js_1.serializeTransaction)(id, doc)),
        };
    }
    // Category level: return subcategory breakdown
    if (categoryId) {
        // Find subcategories of this category
        const subcategories = new Map();
        categories.forEach((cat, id) => {
            if (cat.parentId === categoryId) {
                subcategories.set(id, cat);
            }
        });
        // If no subcategories (leaf category), return transactions
        if (subcategories.size === 0) {
            const catTransactions = selectedMonthTransactions.filter(({ doc }) => {
                if (doc.isSplit && doc.splits) {
                    return doc.splits.some((s) => {
                        const topLevel = getTopLevelCategoryId(s.categoryId, categories);
                        return topLevel === categoryId;
                    });
                }
                const topLevel = getTopLevelCategoryId(doc.categoryId, categories);
                return topLevel === categoryId;
            });
            return {
                currentTotal,
                currentMonth,
                monthlyTotals,
                transactions: catTransactions.map(({ id, doc }) => (0, aggregations_js_1.serializeTransaction)(id, doc)),
            };
        }
        // Calculate subcategory breakdown
        const spending = new Map();
        for (const { doc } of selectedMonthTransactions) {
            if (doc.isSplit && doc.splits) {
                for (const split of doc.splits) {
                    // Check if split belongs to this parent category
                    const cat = categories.get(split.categoryId);
                    if (cat?.parentId === categoryId || split.categoryId === categoryId) {
                        const key = cat?.parentId === categoryId ? split.categoryId : categoryId;
                        const current = spending.get(key) ?? { amount: 0, count: 0 };
                        spending.set(key, {
                            amount: current.amount + split.amount,
                            count: current.count + 1,
                        });
                    }
                }
            }
            else {
                const txCatId = doc.categoryId;
                if (!txCatId)
                    continue;
                const cat = categories.get(txCatId);
                // Transaction is directly in this parent category or in one of its subcategories
                if (cat?.parentId === categoryId || txCatId === categoryId) {
                    const key = cat?.parentId === categoryId ? txCatId : categoryId;
                    const current = spending.get(key) ?? { amount: 0, count: 0 };
                    spending.set(key, {
                        amount: current.amount + effectiveAmount(doc.amount),
                        count: current.count + 1,
                    });
                }
            }
        }
        const total = Array.from(spending.values()).reduce((sum, s) => sum + s.amount, 0);
        const categoryBreakdown = Array.from(spending.entries())
            .map(([id, data]) => {
            const cat = categories.get(id);
            return {
                categoryId: id,
                categoryName: cat?.name ?? 'Uncategorized',
                categoryIcon: cat?.icon ?? '📁',
                categoryColor: cat?.color ?? '#9CA3AF',
                amount: Math.round(data.amount * 100) / 100,
                percentage: total > 0 ? Math.round((data.amount / total) * 1000) / 10 : 0,
                transactionCount: data.count,
            };
        })
            .sort((a, b) => b.amount - a.amount);
        return {
            currentTotal,
            currentMonth,
            monthlyTotals,
            categories: categoryBreakdown,
        };
    }
    // Top level: group by top-level categories
    const spending = new Map();
    for (const { doc } of selectedMonthTransactions) {
        if (doc.isSplit && doc.splits) {
            for (const split of doc.splits) {
                const topLevel = getTopLevelCategoryId(split.categoryId, categories);
                const current = spending.get(topLevel) ?? { amount: 0, count: 0 };
                spending.set(topLevel, {
                    amount: current.amount + split.amount,
                    count: current.count + 1,
                });
            }
        }
        else {
            const topLevel = getTopLevelCategoryId(doc.categoryId, categories);
            const current = spending.get(topLevel) ?? { amount: 0, count: 0 };
            spending.set(topLevel, {
                amount: current.amount + effectiveAmount(doc.amount),
                count: current.count + 1,
            });
        }
    }
    const total = Array.from(spending.values()).reduce((sum, s) => sum + s.amount, 0);
    const categoryBreakdown = Array.from(spending.entries())
        .map(([id, data]) => {
        const cat = categories.get(id);
        return {
            categoryId: id,
            categoryName: cat?.name ?? 'Uncategorized',
            categoryIcon: cat?.icon ?? '📁',
            categoryColor: cat?.color ?? '#9CA3AF',
            amount: Math.round(data.amount * 100) / 100,
            percentage: total > 0 ? Math.round((data.amount / total) * 1000) / 10 : 0,
            transactionCount: data.count,
        };
    })
        .sort((a, b) => b.amount - a.amount);
    return {
        currentTotal,
        currentMonth,
        monthlyTotals,
        categories: categoryBreakdown,
    };
});
//# sourceMappingURL=getSpendingExplorer.js.map