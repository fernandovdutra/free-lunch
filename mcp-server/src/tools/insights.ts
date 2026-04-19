import { db, userId } from '../firebase.js';

export async function getInsights(type?: string, limit = 10) {
  let ref = db
    .collection('users')
    .doc(userId)
    .collection('insights')
    .orderBy('generatedAt', 'desc') as FirebaseFirestore.Query;

  if (type) {
    ref = ref.where('type', '==', type);
  }

  const snapshot = await ref.limit(limit).get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      type: data.type,
      periodStart: data.periodStart?.toDate?.()?.toISOString() ?? null,
      periodEnd: data.periodEnd?.toDate?.()?.toISOString() ?? null,
      generatedAt: data.generatedAt?.toDate?.()?.toISOString() ?? null,
      summary: data.summary,
      highlights: data.highlights ?? [],
      recommendations: data.recommendations ?? [],
      anomalies: data.anomalies ?? [],
      narrative: data.narrative ?? '',
      isRead: data.isRead ?? false,
    };
  });
}

export async function getAdvisorMemory() {
  const doc = await db
    .collection('users')
    .doc(userId)
    .collection('advisorMemory')
    .doc('current')
    .get();

  if (!doc.exists) return null;

  const data = doc.data()!;
  return {
    financialProfile: data.financialProfile ?? '',
    recurringExpenses: data.recurringExpenses ?? [],
    activeGoals: data.activeGoals ?? [],
    investmentProfile: data.investmentProfile ?? '',
    pastAdvice: (data.pastAdvice ?? []).map((a: { date: { toDate?: () => Date }; advice: string; outcome?: string }) => ({
      date: a.date?.toDate?.()?.toISOString() ?? null,
      advice: a.advice,
      outcome: a.outcome,
    })),
    updatedAt: data.updatedAt?.toDate?.()?.toISOString() ?? null,
  };
}
