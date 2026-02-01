import { type JWTConfig } from './auth.js';
import type { ASPSP, AuthResponse, SessionResponse, TransactionResponse } from './types.js';
export declare class EnableBankingClient {
    private baseUrl;
    private jwtConfig;
    constructor(baseUrl: string, jwtConfig: JWTConfig);
    private request;
    getASPSPs(country: string): Promise<ASPSP[]>;
    startAuthorization(params: {
        aspsp: {
            name: string;
            country: string;
        };
        redirect_url: string;
        psu_type: 'personal' | 'business';
        access: {
            valid_until: string;
        };
        state?: string;
    }): Promise<AuthResponse>;
    createSession(code: string): Promise<SessionResponse>;
    getSession(sessionId: string): Promise<SessionResponse>;
    getTransactions(accountId: string, params?: {
        date_from?: string;
        date_to?: string;
        continuation_key?: string;
    }): Promise<TransactionResponse>;
    getBalances(accountId: string): Promise<unknown>;
}
