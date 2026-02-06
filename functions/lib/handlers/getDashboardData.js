"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDashboardData = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const aggregations_js_1 = require("../shared/aggregations.js");
exports.getDashboardData = (0, https_1.onCall)({
    region: 'europe-west1',
    cors: true,
}, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Must be logged in');
    }
    const userId = request.auth.uid;
    const { startDate, endDate } = request.data;
    if (!startDate || !endDate) {
        throw new https_1.HttpsError('invalid-argument', 'startDate and endDate are required');
    }
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new https_1.HttpsError('invalid-argument', 'startDate and endDate must be valid ISO date strings');
    }
    const db = (0, firestore_1.getFirestore)();
    // Fetch transactions and categories in parallel
    const [transactionsSnapshot, categoriesSnapshot] = await Promise.all([
        db
            .collection('users')
            .doc(userId)
            .collection('transactions')
            .where('date', '>=', firestore_1.Timestamp.fromDate(start))
            .where('date', '<=', firestore_1.Timestamp.fromDate(end))
            .orderBy('date', 'desc')
            .get(),
        db
            .collection('users')
            .doc(userId)
            .collection('categories')
            .orderBy('order')
            .get(),
    ]);
    // Build transactions array
    const transactions = transactionsSnapshot.docs.map((doc) => ({
        id: doc.id,
        doc: doc.data(),
    }));
    // Build categories map
    const categories = new Map();
    categoriesSnapshot.docs.forEach((doc) => {
        categories.set(doc.id, doc.data());
    });
    // Compute aggregations
    const summary = (0, aggregations_js_1.calculateSummary)(transactions);
    const categorySpending = (0, aggregations_js_1.calculateCategorySpending)(transactions, categories);
    const timeline = (0, aggregations_js_1.calculateTimelineData)(transactions, start, end);
    // Recent transactions (first 5, already sorted desc)
    const recentTransactions = transactions
        .slice(0, 5)
        .map(({ id, doc }) => (0, aggregations_js_1.serializeTransaction)(id, doc));
    return {
        summary,
        categorySpending,
        timeline,
        recentTransactions,
    };
});
//# sourceMappingURL=getDashboardData.js.map