import { db, userId } from '../firebase.js';
import { Timestamp } from 'firebase-admin/firestore';

export async function getBudgetProgress() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const [budgetSnap, txnSnap, catSnap] = await Promise.all([
    db.collection('users').doc(userId).collection('budgets').get(),
    db
      .collection('users')
      .doc(userId)
      .collection('transactions')
      .where('date', '>=', Timestamp.fromDate(monthStart))
      .where('date', '<=', Timestamp.fromDate(monthEnd))
      .get(),
    db.collection('users').doc(userId).collection('categories').get(),
  ]);

  const categories = new Map<string, { name: string; parentId: string | null }>();
  catSnap.docs.forEach((doc) => {
    const data = doc.data();
    categories.set(doc.id, { name: data.name, parentId: data.parentId });
  });

  // Calculate spending by category
  const spending = new Map<string, number>();
  for (const doc of txnSnap.docs) {
    const data = doc.data();
    if (data.amount >= 0 || data.excludeFromTotals) continue;
    const catId = data.categoryId;
    if (!catId) continue;
    const current = spending.get(catId) ?? 0;
    spending.set(catId, current + Math.abs(data.amount));
    // Also roll up to parent
    const cat = categories.get(catId);
    if (cat?.parentId) {
      const parentCurrent = spending.get(cat.parentId) ?? 0;
      spending.set(cat.parentId, parentCurrent + Math.abs(data.amount));
    }
  }

  return budgetSnap.docs
    .filter((doc) => doc.data().isActive !== false)
    .map((doc) => {
      const data = doc.data();
      const spent = Math.round((spending.get(data.categoryId) ?? 0) * 100) / 100;
      const limit = data.monthlyLimit;
      const pct = limit > 0 ? Math.round((spent / limit) * 1000) / 10 : 0;
      const cat = categories.get(data.categoryId);
      return {
        id: doc.id,
        name: data.name,
        categoryId: data.categoryId,
        categoryName: cat?.name ?? 'Unknown',
        monthlyLimit: limit,
        spent,
        remaining: Math.max(0, Math.round((limit - spent) * 100) / 100),
        percentage: pct,
        status: pct >= 100 ? 'exceeded' : pct >= (data.alertThreshold ?? 80) ? 'warning' : 'safe',
      };
    })
    .sort((a, b) => b.percentage - a.percentage);
}
