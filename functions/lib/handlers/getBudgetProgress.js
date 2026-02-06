"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBudgetProgress = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const date_fns_1 = require("date-fns");
const aggregations_js_1 = require("../shared/aggregations.js");
exports.getBudgetProgress = (0, https_1.onCall)({
    region: 'europe-west1',
    cors: true,
}, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Must be logged in');
    }
    const userId = request.auth.uid;
    const data = (request.data ?? {});
    const now = new Date();
    const start = data.startDate ? new Date(data.startDate) : (0, date_fns_1.startOfMonth)(now);
    const end = data.endDate ? new Date(data.endDate) : (0, date_fns_1.endOfMonth)(now);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new https_1.HttpsError('invalid-argument', 'startDate and endDate must be valid ISO date strings');
    }
    const db = (0, firestore_1.getFirestore)();
    const userRef = db.collection('users').doc(userId);
    // Fetch transactions, categories, and budgets in parallel
    const [transactionsSnapshot, categoriesSnapshot, budgetsSnapshot] = await Promise.all([
        userRef
            .collection('transactions')
            .where('date', '>=', firestore_1.Timestamp.fromDate(start))
            .where('date', '<=', firestore_1.Timestamp.fromDate(end))
            .orderBy('date', 'desc')
            .get(),
        userRef.collection('categories').orderBy('order').get(),
        userRef.collection('budgets').where('isActive', '==', true).get(),
    ]);
    // Build data structures
    const transactions = transactionsSnapshot.docs.map((doc) => ({
        id: doc.id,
        doc: doc.data(),
    }));
    const categories = new Map();
    categoriesSnapshot.docs.forEach((doc) => {
        categories.set(doc.id, doc.data());
    });
    const budgets = budgetsSnapshot.docs.map((doc) => ({
        id: doc.id,
        doc: doc.data(),
    }));
    // Calculate spending and budget progress
    const spendingMap = (0, aggregations_js_1.calculateSpendingByCategory)(transactions, categories);
    const budgetProgress = (0, aggregations_js_1.calculateBudgetProgress)(budgets, spendingMap, categories);
    const response = { budgetProgress };
    // Optionally compute suggestions (3-month average spending)
    if (data.suggestions) {
        const threeMonthsAgo = (0, date_fns_1.subMonths)((0, date_fns_1.startOfMonth)(now), 3);
        const endOfLastMonth = (0, date_fns_1.endOfMonth)((0, date_fns_1.subMonths)(now, 1));
        const suggestionsSnapshot = await userRef
            .collection('transactions')
            .where('date', '>=', firestore_1.Timestamp.fromDate(threeMonthsAgo))
            .where('date', '<=', firestore_1.Timestamp.fromDate(endOfLastMonth))
            .orderBy('date', 'desc')
            .get();
        const suggestionsTransactions = suggestionsSnapshot.docs.map((doc) => ({
            id: doc.id,
            doc: doc.data(),
        }));
        const suggestionsSpending = (0, aggregations_js_1.calculateSpendingByCategory)(suggestionsTransactions, categories);
        // Divide by 3 for average
        const suggestions = {};
        suggestionsSpending.forEach((amount, categoryId) => {
            suggestions[categoryId] = Math.round((amount / 3) * 100) / 100;
        });
        response.suggestions = suggestions;
    }
    return response;
});
//# sourceMappingURL=getBudgetProgress.js.map