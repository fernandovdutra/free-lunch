import { db, userId } from '../firebase.js';
import { Timestamp } from 'firebase-admin/firestore';

export async function getSpendingSummary(startDate: string, endDate: string) {
  const [txnSnap, catSnap] = await Promise.all([
    db
      .collection('users')
      .doc(userId)
      .collection('transactions')
      .where('date', '>=', Timestamp.fromDate(new Date(startDate)))
      .where('date', '<=', Timestamp.fromDate(new Date(endDate)))
      .get(),
    db.collection('users').doc(userId).collection('categories').get(),
  ]);

  const categories = new Map<string, { name: string; color: string; parentId: string | null }>();
  catSnap.docs.forEach((doc) => {
    const data = doc.data();
    categories.set(doc.id, { name: data.name, color: data.color, parentId: data.parentId });
  });

  let totalIncome = 0;
  let totalExpenses = 0;
  const byCat = new Map<string, { name: string; amount: number; count: number }>();

  for (const doc of txnSnap.docs) {
    const data = doc.data();
    if (data.excludeFromTotals) continue;
    if (data.reimbursement?.status === 'pending') continue;

    if (data.amount > 0) {
      totalIncome += data.amount;
    } else {
      totalExpenses += Math.abs(data.amount);
      const catId = data.categoryId ?? 'uncategorized';
      const cat = categories.get(catId);
      const existing = byCat.get(catId) ?? { name: cat?.name ?? 'Uncategorized', amount: 0, count: 0 };
      existing.amount += Math.abs(data.amount);
      existing.count += 1;
      byCat.set(catId, existing);
    }
  }

  const categoryBreakdown = Array.from(byCat.entries())
    .map(([id, data]) => ({
      categoryId: id,
      categoryName: data.name,
      amount: Math.round(data.amount * 100) / 100,
      transactionCount: data.count,
      percentage: totalExpenses > 0 ? Math.round((data.amount / totalExpenses) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  return {
    period: { startDate, endDate },
    totalIncome: Math.round(totalIncome * 100) / 100,
    totalExpenses: Math.round(totalExpenses * 100) / 100,
    netBalance: Math.round((totalIncome - totalExpenses) * 100) / 100,
    transactionCount: txnSnap.size,
    categoryBreakdown,
  };
}

export async function getCategoryTrends(categoryId: string, months = 6) {
  const now = new Date();
  const results = [];

  for (let i = 0; i < months; i++) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);

    const snapshot = await db
      .collection('users')
      .doc(userId)
      .collection('transactions')
      .where('date', '>=', Timestamp.fromDate(monthDate))
      .where('date', '<=', Timestamp.fromDate(monthEnd))
      .where('categoryId', '==', categoryId)
      .get();

    let total = 0;
    let count = 0;
    for (const doc of snapshot.docs) {
      const data = doc.data();
      if (data.amount < 0) {
        total += Math.abs(data.amount);
        count++;
      }
    }

    results.push({
      month: monthDate.toISOString().slice(0, 7),
      amount: Math.round(total * 100) / 100,
      transactionCount: count,
    });
  }

  return results.reverse();
}
