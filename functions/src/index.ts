import { initializeApp } from 'firebase-admin/app';

// Initialize Firebase Admin
initializeApp();

// Export handlers
export { initBankConnection } from './handlers/initBankConnection.js';
export { bankCallback } from './handlers/bankCallback.js';
export { syncTransactions } from './handlers/syncTransactions.js';
export { autoSyncTransactions } from './handlers/autoSyncTransactions.js';
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
export { generateDailyInsight } from './handlers/generateDailyInsight.js';
export { generateWeeklyInsight } from './handlers/generateWeeklyInsight.js';
export { generateOnDemandInsight } from './handlers/generateOnDemandInsight.js';
export { getMonthlyAnalysisData } from './handlers/getMonthlyAnalysisData.js';
export { getYearlyAnalysisData } from './handlers/getYearlyAnalysisData.js';
export { storeInsightEndpoint } from './handlers/storeInsight.js';
export { refreshAdvisorMemory } from './handlers/refreshAdvisorMemory.js';
export { inviteMember } from './handlers/inviteMember.js';
export { acceptInvitation } from './handlers/acceptInvitation.js';
export { removeMember } from './handlers/removeMember.js';
export { cancelInvitation } from './handlers/cancelInvitation.js';
export { repairSharing } from './handlers/repairSharing.js';
export { refreshMarketData } from './handlers/refreshMarketData.js';
export { getLiveQuote } from './handlers/getLiveQuote.js';
export { refreshBenchmarks } from './handlers/refreshBenchmarks.js';
export { mcp } from './mcp/handler.js';
