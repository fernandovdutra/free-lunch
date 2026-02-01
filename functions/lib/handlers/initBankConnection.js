"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initBankConnection = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const crypto_1 = require("crypto");
const client_js_1 = require("../enableBanking/client.js");
const config_js_1 = require("../config.js");
exports.initBankConnection = (0, https_1.onCall)({
    region: 'europe-west1',
    cors: true,
    secrets: ['ENABLE_BANKING_APP_ID', 'ENABLE_BANKING_PRIVATE_KEY', 'ENABLE_BANKING_API_URL'],
}, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Must be logged in');
    }
    const { bankName, bankCountry = 'NL' } = request.data;
    if (!bankName) {
        throw new https_1.HttpsError('invalid-argument', 'Bank name is required');
    }
    const userId = request.auth.uid;
    const db = (0, firestore_1.getFirestore)();
    // Generate state token for OAuth verification
    const state = (0, crypto_1.randomBytes)(32).toString('hex');
    // Calculate access validity (90 days max per PSD2)
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 90);
    // Store pending connection in Firestore
    const pendingRef = db.collection('pendingBankConnections').doc(state);
    await pendingRef.set({
        userId,
        bankName,
        bankCountry,
        createdAt: firestore_1.FieldValue.serverTimestamp(),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 min expiry
    });
    const client = new client_js_1.EnableBankingClient(config_js_1.config.enableBankingApiUrl, {
        privateKey: config_js_1.config.enableBankingPrivateKey,
        applicationId: config_js_1.config.enableBankingAppId,
    });
    try {
        const callbackUrl = `https://europe-west1-${process.env.GCLOUD_PROJECT}.cloudfunctions.net/bankCallback`;
        const authResponse = await client.startAuthorization({
            aspsp: {
                name: bankName,
                country: bankCountry,
            },
            redirect_url: callbackUrl,
            psu_type: 'personal',
            access: {
                valid_until: validUntil.toISOString(),
            },
            state,
        });
        return {
            authUrl: authResponse.url,
            state,
        };
    }
    catch (error) {
        console.error('Error starting bank authorization:', error);
        await pendingRef.delete();
        throw new https_1.HttpsError('internal', 'Failed to start bank connection');
    }
});
//# sourceMappingURL=initBankConnection.js.map