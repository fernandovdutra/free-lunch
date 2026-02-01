import { generateJWT, type JWTConfig } from './auth.js';
import type {
  ASPSP,
  AuthResponse,
  SessionResponse,
  TransactionResponse,
} from './types.js';

export class EnableBankingClient {
  private baseUrl: string;
  private jwtConfig: JWTConfig;

  constructor(baseUrl: string, jwtConfig: Omit<JWTConfig, 'apiUrl'>) {
    this.baseUrl = baseUrl;
    this.jwtConfig = { ...jwtConfig, apiUrl: baseUrl };
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const token = generateJWT(this.jwtConfig);

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

    return response.json() as Promise<T>;
  }

  async getASPSPs(country: string): Promise<ASPSP[]> {
    // Enable Banking API returns { aspsps: ASPSP[] }
    const response = await this.request<{ aspsps: ASPSP[] }>(
      'GET',
      `/aspsps?country=${country}`
    );
    return response.aspsps;
  }

  async startAuthorization(params: {
    aspsp: { name: string; country: string };
    redirect_url: string;
    psu_type: 'personal' | 'business';
    access: {
      valid_until: string;
    };
    state?: string;
  }): Promise<AuthResponse> {
    return this.request<AuthResponse>('POST', '/auth', params);
  }

  async createSession(code: string): Promise<SessionResponse> {
    return this.request<SessionResponse>('POST', '/sessions', { code });
  }

  async getSession(sessionId: string): Promise<SessionResponse> {
    return this.request<SessionResponse>('GET', `/sessions/${sessionId}`);
  }

  async getTransactions(
    accountId: string,
    params?: { date_from?: string; date_to?: string; continuation_key?: string }
  ): Promise<TransactionResponse> {
    const query = new URLSearchParams();
    if (params?.date_from) query.set('date_from', params.date_from);
    if (params?.date_to) query.set('date_to', params.date_to);
    if (params?.continuation_key) query.set('continuation_key', params.continuation_key);

    const queryString = query.toString();
    const path = `/accounts/${accountId}/transactions${queryString ? `?${queryString}` : ''}`;

    return this.request<TransactionResponse>('GET', path);
  }

  async getBalances(accountId: string) {
    return this.request('GET', `/accounts/${accountId}/balances`);
  }
}
