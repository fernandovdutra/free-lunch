import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

import { getTransactions, searchTransactions } from './tools/transactions.js';
import { getSpendingSummary, getCategoryTrends } from './tools/spending.js';
import { getBudgetProgress } from './tools/budgets.js';
import { getGoals } from './tools/goals.js';
import { getInvestments } from './tools/investments.js';
import { getInsights, getAdvisorMemory } from './tools/insights.js';
import { getRecurringExpenses } from './tools/recurring.js';

const server = new McpServer({
  name: 'free-lunch-finance',
  version: '1.0.0',
});

// ============================================================================
// Tools
// ============================================================================

server.tool(
  'get_transactions',
  'Query bank transactions with filters (date range, category, counterparty, amount, direction)',
  {
    startDate: z.string().optional().describe('Start date (ISO format, e.g., 2026-01-01)'),
    endDate: z.string().optional().describe('End date (ISO format)'),
    categoryId: z.string().optional().describe('Filter by category ID'),
    counterparty: z.string().optional().describe('Filter by counterparty name (partial match)'),
    minAmount: z.number().optional().describe('Minimum absolute amount'),
    maxAmount: z.number().optional().describe('Maximum absolute amount'),
    direction: z.enum(['income', 'expense', 'all']).optional().describe('Filter by direction'),
    limit: z.number().optional().describe('Max results (default 50)'),
  },
  async (args) => {
    const results = await getTransactions(args);
    return { content: [{ type: 'text' as const, text: JSON.stringify(results, null, 2) }] };
  }
);

server.tool(
  'search_transactions',
  'Full-text search across transaction descriptions and counterparties',
  {
    query: z.string().describe('Search text'),
    limit: z.number().optional().describe('Max results (default 50)'),
  },
  async (args) => {
    const results = await searchTransactions(args.query, args.limit);
    return { content: [{ type: 'text' as const, text: JSON.stringify(results, null, 2) }] };
  }
);

server.tool(
  'get_spending_summary',
  'Get spending totals broken down by category for a date range',
  {
    startDate: z.string().describe('Start date (ISO format)'),
    endDate: z.string().describe('End date (ISO format)'),
  },
  async (args) => {
    const results = await getSpendingSummary(args.startDate, args.endDate);
    return { content: [{ type: 'text' as const, text: JSON.stringify(results, null, 2) }] };
  }
);

server.tool(
  'get_category_trends',
  'Get month-over-month spending trends for a specific category',
  {
    categoryId: z.string().describe('Category ID'),
    months: z.number().optional().describe('Number of months to look back (default 6)'),
  },
  async (args) => {
    const results = await getCategoryTrends(args.categoryId, args.months);
    return { content: [{ type: 'text' as const, text: JSON.stringify(results, null, 2) }] };
  }
);

server.tool(
  'get_budget_progress',
  'Get current month budget progress — spending vs limits for all active budgets',
  {},
  async () => {
    const results = await getBudgetProgress();
    return { content: [{ type: 'text' as const, text: JSON.stringify(results, null, 2) }] };
  }
);

server.tool(
  'get_goals',
  'List all financial goals with progress percentages',
  {},
  async () => {
    const results = await getGoals();
    return { content: [{ type: 'text' as const, text: JSON.stringify(results, null, 2) }] };
  }
);

server.tool(
  'get_investments',
  'Get investment portfolio overview with current values, gains, and returns',
  {},
  async () => {
    const results = await getInvestments();
    return { content: [{ type: 'text' as const, text: JSON.stringify(results, null, 2) }] };
  }
);

server.tool(
  'get_insights',
  'Retrieve past AI-generated financial insights',
  {
    type: z.enum(['daily', 'weekly', 'monthly', 'yearly', 'on_demand']).optional().describe('Filter by insight type'),
    limit: z.number().optional().describe('Max results (default 10)'),
  },
  async (args) => {
    const results = await getInsights(args.type, args.limit);
    return { content: [{ type: 'text' as const, text: JSON.stringify(results, null, 2) }] };
  }
);

server.tool(
  'get_advisor_memory',
  "Load the AI advisor's persistent memory — financial profile, recurring expenses, goals, past advice",
  {},
  async () => {
    const results = await getAdvisorMemory();
    return { content: [{ type: 'text' as const, text: JSON.stringify(results, null, 2) }] };
  }
);

server.tool(
  'get_recurring_expenses',
  'Detect recurring/subscription expenses based on transaction patterns',
  {},
  async () => {
    const results = await getRecurringExpenses();
    return { content: [{ type: 'text' as const, text: JSON.stringify(results, null, 2) }] };
  }
);

// ============================================================================
// Start server
// ============================================================================

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Free Lunch MCP server running on stdio');
}

main().catch(console.error);
