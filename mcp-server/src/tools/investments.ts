import { db, userId } from '../firebase.js';

export async function getInvestments() {
  const snapshot = await db
    .collection('users')
    .doc(userId)
    .collection('investments')
    .orderBy('name')
    .get();

  let totalValue = 0;
  let totalCost = 0;

  const investments = snapshot.docs.map((doc) => {
    const data = doc.data();
    const entries = data.entries ?? [];
    const latest = entries.length > 0 ? entries[entries.length - 1] : null;
    const marketValue = latest?.marketValue ?? 0;
    const costBasis = latest?.costBasis ?? 0;
    totalValue += marketValue;
    totalCost += costBasis;

    return {
      id: doc.id,
      name: data.name,
      platform: data.platform,
      type: data.type,
      currency: data.currency ?? 'EUR',
      currentValue: marketValue,
      costBasis,
      gain: Math.round((marketValue - costBasis) * 100) / 100,
      returnPct: costBasis > 0 ? Math.round(((marketValue - costBasis) / costBasis) * 1000) / 10 : 0,
      lastUpdated: latest?.date?.toDate?.()?.toISOString() ?? null,
      entryCount: entries.length,
      notes: data.notes ?? null,
    };
  });

  return {
    portfolio: {
      totalValue: Math.round(totalValue * 100) / 100,
      totalCostBasis: Math.round(totalCost * 100) / 100,
      totalGain: Math.round((totalValue - totalCost) * 100) / 100,
      totalReturnPct: totalCost > 0 ? Math.round(((totalValue - totalCost) / totalCost) * 1000) / 10 : 0,
    },
    investments,
  };
}
