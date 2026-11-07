/**
 * Signed accounting for ICS statements.
 *
 * "Totaal nieuwe uitgaven" is GROSS card purchases; refunds ("Bij") lower
 * the amount collected from the bank. All arithmetic uses integer euro cents.
 */
export interface IcsAmountLine {
  amountEur: number;
  direction: 'Af' | 'Bij';
}
export function calculateIcsStatementTotals(lines: IcsAmountLine[]) {
  let purchasesCents = 0;
  let refundsCents = 0;
  for (const line of lines) {
    if (!Number.isFinite(line.amountEur) || line.amountEur < 0) {
      throw new Error('ICS transaction amounts must be nonnegative finite numbers');
    }
    const cents = Math.round(line.amountEur * 100);
    if (line.direction === 'Af') purchasesCents += cents;
    else refundsCents += cents;
  }
  return {
    grossPurchases: purchasesCents / 100,
    refunds: refundsCents / 100,
    netPayment: (purchasesCents - refundsCents) / 100,
  };
}
