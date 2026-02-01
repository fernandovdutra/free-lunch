import type { Transaction, Category } from '@/types';
import { format } from 'date-fns';

/**
 * Escape a value for CSV format
 * - Wrap in quotes if contains comma, quote, or newline
 * - Escape quotes by doubling them
 */
function escapeCSV(value: string | null | undefined): string {
  if (value === null || value === undefined) return '';
  if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Format amount for export
 */
function formatExportAmount(amount: number): string {
  return amount.toFixed(2);
}

/**
 * Convert transactions to CSV format
 */
export function transactionsToCSV(transactions: Transaction[], categories: Category[]): string {
  const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

  const headers = [
    'Date',
    'Description',
    'Amount',
    'Category',
    'Counterparty',
    'Reimbursement Status',
    'Reimbursement Type',
    'Note',
  ];

  const rows = transactions.map((t) => {
    const categoryName = t.categoryId
      ? (categoryMap.get(t.categoryId) ?? 'Unknown')
      : 'Uncategorized';
    const reimbursementStatus = t.reimbursement?.status ?? '';
    const reimbursementType = t.reimbursement?.type ?? '';
    const note = t.reimbursement?.note ?? '';

    return [
      format(t.date, 'yyyy-MM-dd'),
      escapeCSV(t.description),
      formatExportAmount(t.amount),
      escapeCSV(categoryName),
      escapeCSV(t.counterparty),
      reimbursementStatus,
      reimbursementType,
      escapeCSV(note),
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

/**
 * Convert transactions to JSON format with resolved category names
 */
export function transactionsToJSON(transactions: Transaction[], categories: Category[]): string {
  const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

  const exportData = transactions.map((t) => ({
    date: format(t.date, 'yyyy-MM-dd'),
    description: t.description,
    amount: t.amount,
    currency: t.currency,
    category: t.categoryId ? (categoryMap.get(t.categoryId) ?? 'Unknown') : null,
    categoryId: t.categoryId,
    counterparty: t.counterparty,
    reimbursement: t.reimbursement
      ? {
          type: t.reimbursement.type,
          status: t.reimbursement.status,
          note: t.reimbursement.note,
          clearedAt: t.reimbursement.clearedAt
            ? format(t.reimbursement.clearedAt, 'yyyy-MM-dd')
            : null,
        }
      : null,
    isSplit: t.isSplit,
    splits: t.splits,
    importedAt: format(t.importedAt, "yyyy-MM-dd'T'HH:mm:ss"),
  }));

  return JSON.stringify(exportData, null, 2);
}

/**
 * Download a file with the given content
 */
export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export transactions as CSV and trigger download
 */
export function exportTransactionsAsCSV(transactions: Transaction[], categories: Category[]): void {
  const csv = transactionsToCSV(transactions, categories);
  const filename = `free-lunch-transactions-${format(new Date(), 'yyyy-MM-dd')}.csv`;
  downloadFile(csv, filename, 'text/csv;charset=utf-8');
}

/**
 * Export transactions as JSON and trigger download
 */
export function exportTransactionsAsJSON(
  transactions: Transaction[],
  categories: Category[]
): void {
  const json = transactionsToJSON(transactions, categories);
  const filename = `free-lunch-transactions-${format(new Date(), 'yyyy-MM-dd')}.json`;
  downloadFile(json, filename, 'application/json');
}
