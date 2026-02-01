"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBankStatus = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
exports.getBankStatus = (0, https_1.onCall)({
    region: 'europe-west1',
    cors: true,
}, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Must be logged in');
    }
    const userId = request.auth.uid;
    const db = (0, firestore_1.getFirestore)();
    const connectionsRef = db.collection('users').doc(userId).collection('bankConnections');
    const snapshot = await connectionsRef.get();
    return snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
            id: doc.id,
            bankName: data.bankName,
            status: data.status,
            accountCount: data.accounts?.length ?? 0,
            lastSync: data.lastSync instanceof firestore_1.Timestamp ? data.lastSync.toDate().toISOString() : null,
            consentExpiresAt: data.consentExpiresAt instanceof firestore_1.Timestamp
                ? data.consentExpiresAt.toDate().toISOString()
                : null,
        };
    });
});
//# sourceMappingURL=getBankStatus.js.map