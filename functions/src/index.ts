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
export { getDashboardData } from './handlers/getDashboardData.js';
export { getBudgetProgress } from './handlers/getBudgetProgress.js';
export { getReimbursementSummary } from './handlers/getReimbursementSummary.js';
export { createDefaultCategories } from './handlers/createDefaultCategories.js';
export { getSpendingExplorer } from './handlers/getSpendingExplorer.js';
export { importIcsStatement } from './handlers/importIcsStatement.js';
export { getIcsBreakdown } from './handlers/getIcsBreakdown.js';
export { deleteIcsImport } from './handlers/deleteIcsImport.js';
