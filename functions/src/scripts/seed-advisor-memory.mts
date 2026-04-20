/**
 * One-time script to seed the advisor memory with personal financial context.
 * Run with: npx tsx src/scripts/seed-advisor-memory.mts
 */

import { initializeApp, applicationDefault, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID ?? 'free-lunch-85447';
const USER_ID = process.env.FREE_LUNCH_USER_ID ?? 'iTLsCrooi9MFYlKV7eP2nsVuffh2';

if (getApps().length === 0) {
  initializeApp({ credential: applicationDefault(), projectId: PROJECT_ID });
}

const db = getFirestore();

const memory = {
  financialProfile: [
    'Salaried employee in the Netherlands, working at a corporate employer.',
    'Monthly net salary: approximately €7,644, with a 4% raise effective April 2026 (now ~€7,950/month net).',
    'In addition: annual holiday allowance (vakantiegeld) of 8% paid once per year (typically May or June), plus irregular STI (short-term incentive) and LTI (long-term incentive) bonuses.',
    'Salary is deposited once a month on the last business day of the month. All other days show €0 income — this is completely normal and should NEVER be flagged, commented on, or used to imply spending is "unsustainable" or problematic.',
    'Household: 2 adults, 2 children (ages ~5 and ~2). Only one income (user\'s salary); partner has no income.',
    'Housing: owns home with a mortgage of €1,286.75/month.',
    'Has two cars: a Tesla (financed, not leased) and a Kia (on a lease contract). The Tesla financing ends October 2026, after which car costs will drop significantly. Do NOT suggest cancelling or renegotiating either car contract — early termination carries large penalties.',
    'Dutch health insurance (zorgverzekering): fixed monthly cost. Can only be switched during the annual open enrollment in November/December. Do not suggest switching outside that window.',
    'Primary financial goal: grow investments. Target: save/invest €500–€1,000/month.',
    'Investments: employer pension, brokerage account (stocks/ETFs), savings account (spaarrekening), and Bitcoin.',
    'Lives in the Netherlands; primary bank is ABN AMRO.',
    'Costs to actively watch and suggest better deals for if they trend up: energy/utilities, subscriptions (streaming, software, memberships), groceries, and online purchases (Amazon, bol.com). For these, proactively flag upward trends and offer to research better alternatives.',
    'Car variable costs to actively monitor: EV charging costs, parking fees, fines, and car maintenance/repairs. Flag immediately if any of these appear unusually high or occur more frequently than normal. Charging and parking should be modest; fines should be flagged regardless of amount.',
    'Alert on: unrecognized merchants, large one-off purchases, budget overruns, and uncategorized transactions.',
  ].join(' '),

  recurringExpenses: [
    { counterparty: 'Mortgage', amount: 1286.75, frequency: 'monthly' },
    { counterparty: 'Tesla Lease', amount: 500, frequency: 'monthly' },
    { counterparty: 'Car Insurance / Leasing (second car)', amount: 160, frequency: 'monthly' },
    { counterparty: 'Health Insurance (zorgverzekering)', amount: 285, frequency: 'monthly' },
    { counterparty: 'Gym / Fitness', amount: 58, frequency: 'monthly' },
  ],

  activeGoals: [
    {
      goalId: 'investment-growth',
      name: 'Grow investments',
      summary: 'Save and invest €500–€1,000/month across brokerage, savings, and Bitcoin. Tesla lease ending October 2026 will free up ~€500/month to redirect.',
    },
  ],
  investmentProfile: 'Diversified: employer pension (automatic), self-directed brokerage (stocks/ETFs), savings account (spaarrekening), and Bitcoin. Goal is long-term wealth building.',
  pastAdvice: [],
  updatedAt: Timestamp.now(),
};

const ref = db
  .collection('users')
  .doc(USER_ID)
  .collection('advisorMemory')
  .doc('current');

await ref.set(memory);
console.log('✅ Advisor memory seeded for user', USER_ID);
process.exit(0);
