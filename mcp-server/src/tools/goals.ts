import { db, userId } from '../firebase.js';

export async function getGoals() {
  const snapshot = await db
    .collection('users')
    .doc(userId)
    .collection('goals')
    .orderBy('name')
    .get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    const pct = data.targetAmount > 0
      ? Math.round(((data.currentAmount ?? 0) / data.targetAmount) * 1000) / 10
      : 0;
    return {
      id: doc.id,
      name: data.name,
      type: data.type,
      targetAmount: data.targetAmount,
      currentAmount: data.currentAmount ?? 0,
      progressPct: pct,
      status: data.status,
      startDate: data.startDate?.toDate?.()?.toISOString() ?? null,
      targetDate: data.targetDate?.toDate?.()?.toISOString() ?? null,
      notes: data.notes ?? null,
    };
  });
}
