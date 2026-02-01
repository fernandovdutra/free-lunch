"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAvailableBanks = void 0;
const https_1 = require("firebase-functions/v2/https");
const client_js_1 = require("../enableBanking/client.js");
const config_js_1 = require("../config.js");
exports.getAvailableBanks = (0, https_1.onCall)({
    region: 'europe-west1',
    cors: true,
    secrets: ['ENABLE_BANKING_APP_ID', 'ENABLE_BANKING_PRIVATE_KEY', 'ENABLE_BANKING_API_URL'],
}, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Must be logged in');
    }
    const { country = 'NL' } = request.data;
    const client = new client_js_1.EnableBankingClient(config_js_1.config.enableBankingApiUrl, {
        privateKey: config_js_1.config.enableBankingPrivateKey,
        applicationId: config_js_1.config.enableBankingAppId,
    });
    try {
        const aspsps = await client.getASPSPs(country);
        // Return simplified bank list
        return aspsps.map((aspsp) => ({
            name: aspsp.name,
            country: aspsp.country,
            logo: aspsp.logo,
            bic: aspsp.bic,
        }));
    }
    catch (error) {
        console.error('Error fetching banks:', error);
        throw new https_1.HttpsError('internal', 'Failed to fetch available banks');
    }
});
//# sourceMappingURL=getAvailableBanks.js.map