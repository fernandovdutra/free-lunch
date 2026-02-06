"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getReimbursementSummary = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const aggregations_js_1 = require("../shared/aggregations.js");
exports.getReimbursementSummary = (0, https_1.onCall)({
    region: 'europe-west1',
    cors: true,
}, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Must be logged in');
    }
    const userId = request.auth.uid;
    const data = (request.data ?? {});
    const clearedLimit = data.clearedLimit ?? 10;
    const db = (0, firestore_1.getFirestore)();
    // Single query fetching all transactions ordered by date desc
    const snapshot = await db
        .collection('users')
        .doc(userId)
        .collection('transactions')
        .orderBy('date', 'desc')
        .get();
    // Filter for pending and cleared reimbursements server-side
    const pending = [];
    const cleared = [];
    for (const docSnap of snapshot.docs) {
        const doc = docSnap.data();
        // Only expenses (amount < 0) with reimbursement info
        if (doc.amount >= 0 || !doc.reimbursement)
            continue;
        if (doc.reimbursement.status === 'pending') {
            pending.push({ id: docSnap.id, doc });
        }
        else if (doc.reimbursement.status === 'cleared') {
            cleared.push({ id: docSnap.id, doc });
        }
    }
    // Calculate summary from full arrays
    const summary = (0, aggregations_js_1.calculateReimbursementSummary)(pending, cleared);
    // Limit cleared for response
    const limitedCleared = cleared.slice(0, clearedLimit);
    return {
        summary,
        pendingTransactions: pending.map(({ id, doc }) => (0, aggregations_js_1.serializeTransaction)(id, doc)),
        clearedTransactions: limitedCleared.map(({ id, doc }) => (0, aggregations_js_1.serializeTransaction)(id, doc)),
    };
});
//# sourceMappingURL=getReimbursementSummary.js.map