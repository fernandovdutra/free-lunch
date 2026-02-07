"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getIcsBreakdown = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const date_fns_1 = require("date-fns");
const aggregations_js_1 = require("../shared/aggregations.js");
// ============================================================================
// Helper: resolve a transaction's top-level category
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
exports.getIcsBreakdown = (0, https_1.onCall)({
    region: 'europe-west1',
    cors: true,
}, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Must be logged in');
    }
    const userId = request.auth.uid;
    const { statementId, startDate, endDate, categoryId, counterparty, breakdownMonthKey, } = request.data;
    if (!statementId) {
        throw new https_1.HttpsError('invalid-argument', 'statementId is required');
    }
    const db = (0, firestore_1.getFirestore)();
    // Fetch ICS transactions for this statement and categories in parallel
    const [transactionsSnapshot, categoriesSnapshot] = await Promise.all([
        db
            .collection('users')
            .doc(userId)
            .collection('transactions')
            .where('icsStatementId', '==', statementId)
            .where('source', '==', 'ics_import')
            .orderBy('date', 'desc')
            .get(),
        db
            .collection('users')
            .doc(userId)
            .collection('categories')
            .orderBy('order')
            .get(),
    ]);
    const allTransactions = transactionsSnapshot.docs.map((doc) => ({
        id: doc.id,
        doc: doc.data(),
    }));
    const categories = new Map();
    categoriesSnapshot.docs.forEach((doc) => {
        categories.set(doc.id, doc.data());
    });
    // ========================================================================
    // Calculate 6-month totals across ALL ICS transactions (not just this statement)
    // ========================================================================
    // Determine the date range for the 6-month window based on provided dates
    // or fall back to the transactions' own dates
    let windowStart;
    let windowEnd;
    if (startDate && endDate) {
        const selectedStart = new Date(startDate);
        const selectedEnd = new Date(endDate);
        windowStart = (0, date_fns_1.startOfMonth)((0, date_fns_1.subMonths)(selectedStart, 5));
        windowEnd = (0, date_fns_1.endOfMonth)(selectedEnd);
    }
    else if (allTransactions.length > 0) {
        // Use the most recent transaction's date as the reference point
        const latestDate = allTransactions[0].doc.date.toDate();
        windowStart = (0, date_fns_1.startOfMonth)((0, date_fns_1.subMonths)(latestDate, 5));
        windowEnd = (0, date_fns_1.endOfMonth)(latestDate);
    }
    else {
        // No transactions, use current date
        const now = new Date();
        windowStart = (0, date_fns_1.startOfMonth)((0, date_fns_1.subMonths)(now, 5));
        windowEnd = (0, date_fns_1.endOfMonth)(now);
    }
    // Fetch ALL ICS transactions in the 6-month window for the chart
    const allIcsSnapshot = await db
        .collection('users')
        .doc(userId)
        .collection('transactions')
        .where('source', '==', 'ics_import')
        .where('date', '>=', firestore_1.Timestamp.fromDate(windowStart))
        .where('date', '<=', firestore_1.Timestamp.fromDate(windowEnd))
        .get();
    const allIcsTransactions = allIcsSnapshot.docs.map((doc) => ({
        id: doc.id,
        doc: doc.data(),
    }));
    // Build monthly totals from ALL ICS transactions
    const monthlyMap = new Map();
    // Initialize all 6 months
    const referenceDate = startDate ? new Date(startDate) : (allTransactions.length > 0 ? allTransactions[0].doc.date.toDate() : new Date());
    for (let i = 5; i >= 0; i--) {
        const monthDate = (0, date_fns_1.subMonths)(referenceDate, i);
        const key = (0, date_fns_1.format)(monthDate, 'yyyy-MM');
        monthlyMap.set(key, { amount: 0, count: 0 });
    }
    for (const { doc } of allIcsTransactions) {
        const monthKey = (0, date_fns_1.format)(doc.date.toDate(), 'yyyy-MM');
        const entry = monthlyMap.get(monthKey);
        if (entry) {
            entry.amount += Math.abs(doc.amount);
            entry.count += 1;
        }
    }
    const monthlyTotals = Array.from(monthlyMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, data]) => ({
        month: (0, date_fns_1.format)(new Date(key + '-01'), 'MMM yyyy'),
        monthKey: key,
        amount: Math.round(data.amount * 100) / 100,
        transactionCount: data.count,
    }));
    // ========================================================================
    // Current month data (from this statement's transactions)
    // ========================================================================
    const globalMonthKey = (0, date_fns_1.format)(referenceDate, 'yyyy-MM');
    const effectiveMonthKey = breakdownMonthKey ?? globalMonthKey;
    const effectiveMonthStart = (0, date_fns_1.startOfMonth)(new Date(effectiveMonthKey + '-01'));
    const currentTotal = allTransactions.reduce((sum, { doc }) => sum + Math.abs(doc.amount), 0);
    const currentMonth = (0, date_fns_1.format)(effectiveMonthStart, 'MMMM yyyy');
    // ========================================================================
    // Level-specific response
    // ========================================================================
    // Counterparty level: return transactions for that counterparty within a category
    if (counterparty && categoryId) {
        const filtered = allTransactions.filter(({ doc }) => {
            if (doc.counterparty !== counterparty)
                return false;
            const topLevel = getTopLevelCategoryId(doc.categoryId, categories);
            return doc.categoryId === categoryId || topLevel === categoryId;
        });
        return {
            currentTotal: Math.round(filtered.reduce((sum, { doc }) => sum + Math.abs(doc.amount), 0) * 100) / 100,
            currentMonth,
            monthlyTotals,
            transactions: filtered.map(({ id, doc }) => (0, aggregations_js_1.serializeTransaction)(id, doc)),
        };
    }
    // Category level: return transactions for that category
    if (categoryId) {
        const filtered = allTransactions.filter(({ doc }) => {
            const topLevel = getTopLevelCategoryId(doc.categoryId, categories);
            return doc.categoryId === categoryId || topLevel === categoryId;
        });
        return {
            currentTotal: Math.round(filtered.reduce((sum, { doc }) => sum + Math.abs(doc.amount), 0) * 100) / 100,
            currentMonth,
            monthlyTotals,
            transactions: filtered.map(({ id, doc }) => (0, aggregations_js_1.serializeTransaction)(id, doc)),
        };
    }
    // Top level: group by top-level categories
    const spending = new Map();
    for (const { doc } of allTransactions) {
        const topLevel = getTopLevelCategoryId(doc.categoryId, categories);
        const current = spending.get(topLevel) ?? { amount: 0, count: 0 };
        spending.set(topLevel, {
            amount: current.amount + Math.abs(doc.amount),
            count: current.count + 1,
        });
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
        currentTotal: Math.round(currentTotal * 100) / 100,
        currentMonth,
        monthlyTotals,
        categories: categoryBreakdown,
    };
});
//# sourceMappingURL=getIcsBreakdown.js.map