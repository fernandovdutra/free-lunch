import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';

export interface InsightData {
  type: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'on_demand';
  periodStart: Date;
  periodEnd: Date;
  summary: string;
  highlights: { label: string; value: string; trend?: string; sentiment: string }[];
  recommendations: {
    priority: string;
    category: string;
    text: string;
    potentialSavings?: number;
  }[];
  anomalies: { description: string; severity: string; transactionId?: string }[];
  goalProgress: {
    goalId: string;
    goalName: string;
    progressPct: number;
    onTrack: boolean;
    note: string;
  }[];
  investmentSummary?: {
    totalValue: number;
    totalGain: number;
    returnPct: number;
    periodChange: number;
  } | null;
  narrative: string;
}

/**
 * Store a generated insight in Firestore.
 */
export async function storeInsight(
  userId: string,
  insight: InsightData
): Promise<string> {
  const db = getFirestore();
  const ref = db.collection('users').doc(userId).collection('insights').doc();

  await ref.set({
    ...insight,
    periodStart: Timestamp.fromDate(insight.periodStart),
    periodEnd: Timestamp.fromDate(insight.periodEnd),
    generatedAt: FieldValue.serverTimestamp(),
    emailSentAt: null,
    isRead: false,
  });

  return ref.id;
}

/**
 * Mark insight as emailed.
 */
export async function markInsightEmailed(
  userId: string,
  insightId: string
): Promise<void> {
  const db = getFirestore();
  await db
    .collection('users')
    .doc(userId)
    .collection('insights')
    .doc(insightId)
    .update({ emailSentAt: FieldValue.serverTimestamp() });
}

/**
 * Get the most recent insight of a given type for continuity.
 */
export async function getPreviousInsight(
  userId: string,
  type: InsightData['type']
): Promise<{ narrative: string } | null> {
  const db = getFirestore();
  const snapshot = await db
    .collection('users')
    .doc(userId)
    .collection('insights')
    .where('type', '==', type)
    .orderBy('generatedAt', 'desc')
    .limit(1)
    .get();

  if (snapshot.empty) return null;
  const data = snapshot.docs[0].data();
  return { narrative: data.narrative ?? '' };
}
