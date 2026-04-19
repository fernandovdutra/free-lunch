import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';

export interface AdvisorMemoryData {
  financialProfile: string;
  recurringExpenses: { counterparty: string; amount: number; frequency: string }[];
  activeGoals: { goalId: string; name: string; summary: string }[];
  investmentProfile: string;
  pastAdvice: { date: Date; advice: string; outcome?: string }[];
  updatedAt: Date;
}

/**
 * Load advisor memory for a user. Returns null if not yet initialized.
 */
export async function loadAdvisorMemory(
  userId: string
): Promise<AdvisorMemoryData | null> {
  const db = getFirestore();
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
    pastAdvice: (data.pastAdvice ?? []).map(
      (a: { date: Timestamp; advice: string; outcome?: string }) => ({
        ...a,
        date: a.date?.toDate?.() ?? new Date(),
      })
    ),
    updatedAt: data.updatedAt?.toDate?.() ?? new Date(),
  };
}

/**
 * Initialize or update advisor memory.
 * Keeps only the most recent 20 pieces of past advice (rolling window).
 */
export async function updateAdvisorMemory(
  userId: string,
  updates: Partial<Omit<AdvisorMemoryData, 'updatedAt'>>
): Promise<void> {
  const db = getFirestore();
  const ref = db
    .collection('users')
    .doc(userId)
    .collection('advisorMemory')
    .doc('current');

  const existing = await ref.get();

  if (!existing.exists) {
    // Initialize
    await ref.set({
      financialProfile: updates.financialProfile ?? '',
      recurringExpenses: updates.recurringExpenses ?? [],
      activeGoals: updates.activeGoals ?? [],
      investmentProfile: updates.investmentProfile ?? '',
      pastAdvice: (updates.pastAdvice ?? []).map((a) => ({
        ...a,
        date: Timestamp.fromDate(a.date),
      })),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return;
  }

  const data = existing.data()!;
  const existingAdvice: { date: Timestamp; advice: string; outcome?: string }[] =
    data.pastAdvice ?? [];
  const newAdvice = (updates.pastAdvice ?? []).map((a) => ({
    ...a,
    date: Timestamp.fromDate(a.date),
  }));
  const mergedAdvice = [...existingAdvice, ...newAdvice].slice(-20);

  const updateData: Record<string, unknown> = {
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (updates.financialProfile !== undefined)
    updateData.financialProfile = updates.financialProfile;
  if (updates.recurringExpenses !== undefined)
    updateData.recurringExpenses = updates.recurringExpenses;
  if (updates.activeGoals !== undefined) updateData.activeGoals = updates.activeGoals;
  if (updates.investmentProfile !== undefined)
    updateData.investmentProfile = updates.investmentProfile;
  if (updates.pastAdvice !== undefined) updateData.pastAdvice = mergedAdvice;

  await ref.update(updateData);
}

/**
 * Format advisor memory as a prompt-friendly string.
 */
export function formatMemoryForPrompt(memory: AdvisorMemoryData): string {
  const parts: string[] = [];

  if (memory.financialProfile) {
    parts.push(`Financial Profile: ${memory.financialProfile}`);
  }

  if (memory.recurringExpenses.length > 0) {
    const recurring = memory.recurringExpenses
      .map((r) => `  - ${r.counterparty}: €${r.amount.toFixed(2)} (${r.frequency})`)
      .join('\n');
    parts.push(`Known Recurring Expenses:\n${recurring}`);
  }

  if (memory.activeGoals.length > 0) {
    const goals = memory.activeGoals
      .map((g) => `  - ${g.name}: ${g.summary}`)
      .join('\n');
    parts.push(`Active Goals:\n${goals}`);
  }

  if (memory.investmentProfile) {
    parts.push(`Investment Profile: ${memory.investmentProfile}`);
  }

  if (memory.pastAdvice.length > 0) {
    const recent = memory.pastAdvice.slice(-5);
    const advice = recent
      .map((a) => `  - ${a.advice}${a.outcome ? ` → ${a.outcome}` : ''}`)
      .join('\n');
    parts.push(`Recent Advice Given:\n${advice}`);
  }

  return parts.join('\n\n');
}
