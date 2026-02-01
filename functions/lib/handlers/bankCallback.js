"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bankCallback = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const client_js_1 = require("../enableBanking/client.js");
const config_js_1 = require("../config.js");
exports.bankCallback = (0, https_1.onRequest)({
    region: 'europe-west1',
    cors: true,
    secrets: ['ENABLE_BANKING_APP_ID', 'ENABLE_BANKING_PRIVATE_KEY', 'ENABLE_BANKING_API_URL'],
}, async (req, res) => {
    const { code, state, error } = req.query;
    const appUrl = config_js_1.config.appUrl;
    // Handle authorization error
    if (error) {
        console.error('Bank authorization error:', error);
        res.redirect(`${appUrl}/settings?bank_error=${encodeURIComponent(error)}`);
        return;
    }
    // Verify state and code
    if (!state || !code) {
        res.redirect(`${appUrl}/settings?bank_error=missing_params`);
        return;
    }
    const db = (0, firestore_1.getFirestore)();
    const pendingRef = db.collection('pendingBankConnections').doc(state);
    const pendingDoc = await pendingRef.get();
    if (!pendingDoc.exists) {
        res.redirect(`${appUrl}/settings?bank_error=invalid_state`);
        return;
    }
    const pendingData = pendingDoc.data();
    const userId = pendingData.userId;
    const bankName = pendingData.bankName;
    // Check if pending connection has expired
    const expiresAt = pendingData.expiresAt.toDate();
    if (new Date() > expiresAt) {
        await pendingRef.delete();
        res.redirect(`${appUrl}/settings?bank_error=expired`);
        return;
    }
    const client = new client_js_1.EnableBankingClient(config_js_1.config.enableBankingApiUrl, {
        privateKey: config_js_1.config.enableBankingPrivateKey,
        applicationId: config_js_1.config.enableBankingAppId,
    });
    try {
        // Exchange code for session
        const session = await client.createSession(code);
        // Store bank connection in user's document
        const connectionId = `${bankName.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`;
        const connectionRef = db
            .collection('users')
            .doc(userId)
            .collection('bankConnections')
            .doc(connectionId);
        await connectionRef.set({
            id: connectionId,
            provider: 'enable_banking',
            bankId: bankName.toLowerCase().replace(/\s+/g, '_'),
            bankName: session.aspsp.name,
            status: 'active',
            sessionId: session.session_id,
            accounts: session.accounts.map((acc) => ({
                uid: acc.uid,
                iban: acc.iban || acc.account_id?.iban,
                name: acc.name,
                currency: acc.currency,
            })),
            consentExpiresAt: new Date(session.access.valid_until),
            lastSync: null,
            createdAt: firestore_1.FieldValue.serverTimestamp(),
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        });
        // Clean up pending connection
        await pendingRef.delete();
        // Redirect back to app with success
        res.redirect(`${appUrl}/settings?bank_connected=${connectionId}`);
    }
    catch (err) {
        console.error('Error creating bank session:', err);
        await pendingRef.delete();
        res.redirect(`${appUrl}/settings?bank_error=session_failed`);
    }
});
//# sourceMappingURL=bankCallback.js.map