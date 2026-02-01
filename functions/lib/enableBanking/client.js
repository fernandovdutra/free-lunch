"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnableBankingClient = void 0;
const auth_js_1 = require("./auth.js");
class EnableBankingClient {
    baseUrl;
    jwtConfig;
    constructor(baseUrl, jwtConfig) {
        this.baseUrl = baseUrl;
        this.jwtConfig = { ...jwtConfig, apiUrl: baseUrl };
    }
    async request(method, path, body) {
        const token = (0, auth_js_1.generateJWT)(this.jwtConfig);
        const response = await fetch(`${this.baseUrl}${path}`, {
            method,
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: body ? JSON.stringify(body) : undefined,
        });
        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Enable Banking API error: ${response.status} - ${error}`);
        }
        return response.json();
    }
    async getASPSPs(country) {
        // Enable Banking API returns { aspsps: ASPSP[] }
        const response = await this.request('GET', `/aspsps?country=${country}`);
        return response.aspsps;
    }
    async startAuthorization(params) {
        return this.request('POST', '/auth', params);
    }
    async createSession(code) {
        return this.request('POST', '/sessions', { code });
    }
    async getSession(sessionId) {
        return this.request('GET', `/sessions/${sessionId}`);
    }
    async getTransactions(accountId, params) {
        const query = new URLSearchParams();
        if (params?.date_from)
            query.set('date_from', params.date_from);
        if (params?.date_to)
            query.set('date_to', params.date_to);
        if (params?.continuation_key)
            query.set('continuation_key', params.continuation_key);
        const queryString = query.toString();
        const path = `/accounts/${accountId}/transactions${queryString ? `?${queryString}` : ''}`;
        return this.request('GET', path);
    }
    async getBalances(accountId) {
        return this.request('GET', `/accounts/${accountId}/balances`);
    }
}
exports.EnableBankingClient = EnableBankingClient;
//# sourceMappingURL=client.js.map