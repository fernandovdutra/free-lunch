import { initializeApp } from 'firebase-admin/app';

// Initialize Firebase Admin
initializeApp();

// Export handlers
export { initBankConnection } from './handlers/initBankConnection.js';
export { bankCallback } from './handlers/bankCallback.js';
export { syncTransactions } from './handlers/syncTransactions.js';
export { getBankStatus } from './handlers/getBankStatus.js';
export { getAvailableBanks } from './handlers/getAvailableBanks.js';
export { recategorizeTransactions } from './handlers/recategorizeTransactions.js';
