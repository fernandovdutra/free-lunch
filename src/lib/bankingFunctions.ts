import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';

// Types
export interface Bank {
  name: string;
  country: string;
  logo: string;
  bic: string;
}

export interface BankConnectionStatus {
  id: string;
  bankName: string;
  status: 'active' | 'expired' | 'error';
  accountCount: number;
  lastSync: string | null;
  consentExpiresAt: string | null;
}

export interface InitConnectionResponse {
  authUrl: string;
  state: string;
}

export interface SyncResult {
  success: boolean;
  totalNew: number;
  totalUpdated: number;
  results: Array<{
    accountId: string;
    newTransactions: number;
    updatedTransactions: number;
    errors: string[];
  }>;
}

// Function wrappers
export const getAvailableBanks = httpsCallable<{ country?: string }, Bank[]>(
  functions,
  'getAvailableBanks'
);

export const initBankConnection = httpsCallable<
  { bankName: string; bankCountry?: string },
  InitConnectionResponse
>(functions, 'initBankConnection');

export const getBankStatus = httpsCallable<undefined, BankConnectionStatus[]>(
  functions,
  'getBankStatus'
);

export const syncTransactions = httpsCallable<{ connectionId: string }, SyncResult>(
  functions,
  'syncTransactions'
);
