import type { SpendingSummaryResult, CategorySpendingResult } from './aggregations.js';
import type { Anomaly } from './anomalyDetection.js';

interface DailyPromptData {
  date: string;
  summary: SpendingSummaryResult;
  categorySpending: CategorySpendingResult[];
  anomalies: Anomaly[];
  previousInsightNarrative?: string;
}

export interface FixedCost {
  name: string;
  amount: number;
  frequency: 'monthly' | 'annual' | 'weekly';
}

export interface UserProfile {
  monthlySalary?: number;
  savingsRateTarget?: number;
  householdSize?: number;
  hasChildren?: boolean;
  housingType?: 'rent' | 'mortgage' | 'own';
  financialGoalDescription?: string;
}

interface WeeklyPromptData {
  weekStart: string;
  weekEnd: string;
  summary: SpendingSummaryResult;
  categorySpending: CategorySpendingResult[];
  previousWeekSummary?: SpendingSummaryResult;
  previousWeekCategorySpending?: CategorySpendingResult[];
  anomalies: Anomaly[];
  previousInsightNarrative?: string;
  advisorMemory?: string;
  goalProgress?: { goalName: string; progressPct: number; onTrack: boolean }[];
  investmentSummary?: { totalValue: number; totalGain: number; returnPct: number };
  fixedCosts?: FixedCost[];
  userProfile?: UserProfile;
}

export function buildDailyInsightPrompt(data: DailyPromptData): string {
  const { date, summary, categorySpending, anomalies, previousInsightNarrative } = data;

  const topCategories = categorySpending
    .slice(0, 5)
    .map((c) => `- ${c.categoryName}: €${c.amount.toFixed(2)} (${c.transactionCount} txns)`)
    .join('\n');

  const anomalyList =
    anomalies.length > 0
      ? anomalies
          .map((a) => `- [${a.severity.toUpperCase()}] ${a.description}`)
          .join('\n')
      : 'None detected';

  const continuity = previousInsightNarrative
    ? `\n\nPREVIOUS DAILY INSIGHT (for continuity):\n${previousInsightNarrative}`
    : '';

  return `You are a personal finance advisor analyzing daily transaction data for a user in the Netherlands.

DATE: ${date}

SPENDING SUMMARY:
- Total income: €${summary.totalIncome.toFixed(2)}
- Total expenses: €${summary.totalExpenses.toFixed(2)}
- Net: €${summary.netBalance.toFixed(2)}
- Pending reimbursements: €${summary.pendingReimbursements.toFixed(2)}
- Transaction count: ${summary.transactionCount}

TOP SPENDING CATEGORIES:
${topCategories || 'No expenses recorded'}

ANOMALIES:
${anomalyList}
${continuity}

VERBOSITY RULE: Scale your response to the signal strength of today's data.
- If there are NO anomalies AND total expenses are below €50 AND transaction count is 3 or fewer:
  write a single short paragraph for "narrative" (1-2 sentences). Example: "Quiet Sunday — one uncategorized transaction (€24.50), nothing to flag."
  Keep highlights to at most 1 item and recommendations empty.
- Only write 2-3 paragraphs if there is something genuinely notable (anomaly, high spend, unusual pattern).
- Never pad with generic financial tips when there is nothing specific to say.

Respond with a JSON object (no markdown code blocks) with this exact structure:
{
  "summary": "One-sentence overview of today's finances",
  "highlights": [{"label": "...", "value": "...", "trend": "up|down|stable", "sentiment": "positive|negative|neutral"}],
  "recommendations": [{"priority": "high|medium|low", "category": "...", "text": "...", "potentialSavings": <number or null>}],
  "narrative": "Scaled to signal strength — see VERBOSITY RULE above"
}

Keep it concise and actionable. Use € currency. Reference specific amounts and categories.`;
}

export function buildWeeklyInsightPrompt(data: WeeklyPromptData): string {
  const {
    weekStart,
    weekEnd,
    summary,
    categorySpending,
    previousWeekSummary,
    previousWeekCategorySpending,
    anomalies,
    previousInsightNarrative,
    advisorMemory,
    goalProgress,
    investmentSummary,
    fixedCosts,
    userProfile,
  } = data;

  const topCategories = categorySpending
    .slice(0, 8)
    .map((c) => `- ${c.categoryName}: €${c.amount.toFixed(2)} (${c.transactionCount} txns)`)
    .join('\n');

  let wowComparison = '';
  if (previousWeekSummary) {
    const expDiff = summary.totalExpenses - previousWeekSummary.totalExpenses;
    const incDiff = summary.totalIncome - previousWeekSummary.totalIncome;
    wowComparison = `\n\nWEEK-OVER-WEEK COMPARISON:
- Expenses: €${previousWeekSummary.totalExpenses.toFixed(2)} → €${summary.totalExpenses.toFixed(2)} (${expDiff >= 0 ? '+' : ''}€${expDiff.toFixed(2)})
- Income: €${previousWeekSummary.totalIncome.toFixed(2)} → €${summary.totalIncome.toFixed(2)} (${incDiff >= 0 ? '+' : ''}€${incDiff.toFixed(2)})`;

    if (previousWeekCategorySpending) {
      const prevMap = new Map(previousWeekCategorySpending.map((c) => [c.categoryId, c.amount]));
      const changes = categorySpending
        .slice(0, 5)
        .map((c) => {
          const prev = prevMap.get(c.categoryId) ?? 0;
          const diff = c.amount - prev;
          return `- ${c.categoryName}: ${diff >= 0 ? '+' : ''}€${diff.toFixed(2)}`;
        })
        .join('\n');
      wowComparison += `\n\nCategory changes:\n${changes}`;
    }
  }

  const anomalyList =
    anomalies.length > 0
      ? anomalies
          .map((a) => `- [${a.severity.toUpperCase()}] ${a.description}`)
          .join('\n')
      : 'None detected';

  const continuity = previousInsightNarrative
    ? `\n\nPREVIOUS WEEKLY INSIGHT:\n${previousInsightNarrative}`
    : '';

  const memory = advisorMemory ? `\n\nADVISOR MEMORY:\n${advisorMemory}` : '';

  let goalSection = '';
  if (goalProgress && goalProgress.length > 0) {
    goalSection = `\n\nGOAL PROGRESS:\n${goalProgress
      .map((g) => `- ${g.goalName}: ${g.progressPct.toFixed(0)}% ${g.onTrack ? '(on track)' : '(behind)'}`)
      .join('\n')}`;
  }

  let investSection = '';
  if (investmentSummary) {
    investSection = `\n\nINVESTMENT PORTFOLIO:
- Total value: €${investmentSummary.totalValue.toFixed(2)}
- Total gain: €${investmentSummary.totalGain.toFixed(2)} (${investmentSummary.returnPct.toFixed(1)}%)`;
  }

  let fixedCostsSection = '';
  if (fixedCosts && fixedCosts.length > 0) {
    const monthlyEquivalent = fixedCosts.reduce((sum, fc) => {
      const monthly = fc.frequency === 'annual' ? fc.amount / 12 : fc.frequency === 'weekly' ? fc.amount * 4.33 : fc.amount;
      return sum + monthly;
    }, 0);
    fixedCostsSection = `\n\nFIXED / RECURRING COSTS (user-defined):
${fixedCosts.map((fc) => `- ${fc.name}: €${fc.amount.toFixed(2)}/${fc.frequency}`).join('\n')}
Total monthly fixed burden: €${monthlyEquivalent.toFixed(2)}

When these fixed costs appear in this week's spending, do NOT treat them as anomalies or flag them as "high spend". Focus variable spending analysis on discretionary items only.`;
  }

  let profileSection = '';
  if (userProfile) {
    const parts: string[] = [];
    if (userProfile.monthlySalary) parts.push(`Monthly salary: €${userProfile.monthlySalary.toFixed(0)}`);
    if (userProfile.savingsRateTarget) parts.push(`Savings rate target: ${userProfile.savingsRateTarget}%`);
    if (userProfile.householdSize) parts.push(`Household size: ${userProfile.householdSize}`);
    if (userProfile.hasChildren !== undefined) parts.push(`Has children: ${userProfile.hasChildren ? 'yes' : 'no'}`);
    if (userProfile.housingType) parts.push(`Housing: ${userProfile.housingType}`);
    if (userProfile.financialGoalDescription) parts.push(`Primary goal: ${userProfile.financialGoalDescription}`);
    if (parts.length > 0) {
      profileSection = `\n\nUSER FINANCIAL PROFILE:\n${parts.map((p) => `- ${p}`).join('\n')}`;
    }
  }

  return `You are a personal finance advisor doing a weekly review for a user in the Netherlands.

WEEK: ${weekStart} to ${weekEnd}

SPENDING SUMMARY:
- Total income: €${summary.totalIncome.toFixed(2)}
- Total expenses: €${summary.totalExpenses.toFixed(2)}
- Net: €${summary.netBalance.toFixed(2)}
- Pending reimbursements: €${summary.pendingReimbursements.toFixed(2)}
- Transaction count: ${summary.transactionCount}

TOP SPENDING CATEGORIES:
${topCategories || 'No expenses recorded'}
${wowComparison}

ANOMALIES THIS WEEK:
${anomalyList}
${goalSection}${investSection}${fixedCostsSection}${profileSection}${memory}${continuity}

Respond with a JSON object (no markdown code blocks) with this exact structure:
{
  "summary": "One-sentence overview of the week",
  "highlights": [{"label": "...", "value": "...", "trend": "up|down|stable", "sentiment": "positive|negative|neutral"}],
  "recommendations": [{"priority": "high|medium|low", "category": "...", "text": "...", "potentialSavings": <number or null>}],
  "goalProgress": [{"goalId": "...", "goalName": "...", "progressPct": <number>, "onTrack": <boolean>, "note": "..."}],
  "investmentSummary": {"totalValue": <number>, "totalGain": <number>, "returnPct": <number>, "periodChange": <number>} | null,
  "narrative": "3-5 paragraph weekly analysis with trends, patterns, and actionable advice"
}

Be specific with numbers. Highlight positive patterns too. Use € currency.`;
}
