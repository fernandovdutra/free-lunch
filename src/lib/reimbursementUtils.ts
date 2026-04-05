import type { Transaction } from '@/types';

export interface ReimbursementSummaryData {
  pendingCount: number;
  pendingTotal: number;
  pendingWorkTotal: number;
  pendingPersonalTotal: number;
  clearedCount: number;
  clearedTotal: number;
}

/**
 * Calculate summary statistics from reimbursement data
 */
export function calculateReimbursementSummary(
  pending: Transaction[],
  cleared: Transaction[]
): ReimbursementSummaryData {
  const pendingTotal = pending.reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const pendingWorkTotal = pending
    .filter((t) => t.reimbursement?.type === 'work')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const pendingPersonalTotal = pending
    .filter((t) => t.reimbursement?.type === 'personal')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const clearedTotal = cleared.reduce((sum, t) => sum + Math.abs(t.amount), 0);

  return {
    pendingCount: pending.length,
    pendingTotal,
    pendingWorkTotal,
    pendingPersonalTotal,
    clearedCount: cleared.length,
    clearedTotal,
  };
}
