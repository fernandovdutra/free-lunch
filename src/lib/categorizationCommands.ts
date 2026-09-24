import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';

export interface CorrectionPreview {
  proposalId: string;
  chunkCount: number;
  counts: { eligible: number; alreadyCorrect: number; protected: number; splits: number; ambiguous: number };
  merchant: string | null;
  expiresAt: number;
}
export interface CorrectionOperation {
  id: string;
  status: 'pending' | 'complete' | 'cancelled' | 'undone';
  total: number; updated: number; skipped: number; processed: number;
}
export const previewCategorizationChange = httpsCallable<{
  transactionId: string; categoryId: string | null; past: boolean; future: boolean;
}, CorrectionPreview>(functions, 'previewCategorizationChange');
export const applyCategorizationChange = httpsCallable<{
  proposalId: string; operationId: string;
}, CorrectionOperation>(functions, 'applyCategorizationChange');
export const getCategorizationOperation = httpsCallable<{ operationId: string }, CorrectionOperation>(functions, 'getCategorizationOperation');
export const undoCategorizationOperation = httpsCallable<{ operationId: string }, { restored: number; conflicts: number }>(functions, 'undoCategorizationOperation');
export interface ReviewItem { id: string; merchant: string | null; description: string; amount: number; date: string | null }
export const listCategorizationReviewQueue = httpsCallable<{ cursor?: string; pageSize?: number }, {
  unresolved: ReviewItem[]; scanned: number; nextCursor: string | null; complete: boolean;
}>(functions, 'listCategorizationReviewQueue');
export const upsertCategorizationRule = httpsCallable<{
  id?: string; expectedVersion?: number; pattern: string; matchType: 'exact' | 'contains';
  targetField: 'counterparty' | 'description' | 'combined'; categoryId: string; enabled: boolean;
}, { id: string; version: number }>(functions, 'upsertCategorizationRule');
export const getCategorizationProposalMatches = httpsCallable<{ proposalId: string; page: number }, {
  page: number; chunkCount: number; entries: Array<{ id: string; date: string | null; description: string; amount: number; categoryId: string | null }>;
}>(functions, 'getCategorizationProposalMatches');
