import { z } from 'zod';

export const syncTransactionsSchema = z.object({
  connectionId: z.string().min(1, 'Connection ID is required'),
});

export const importIcsStatementSchema = z.object({
  statementId: z.string().min(1, 'statementId is required'),
  statementDate: z.string().min(1),
  customerNumber: z.string(),
  totalNewExpenses: z.number(),
  estimatedDebitDate: z.string().min(1),
  debitIban: z.string(),
  transactions: z
    .array(
      z.object({
        transactionDate: z.string(),
        bookingDate: z.string(),
        description: z.string(),
        city: z.string(),
        country: z.string(),
        foreignAmount: z.number().nullable(),
        foreignCurrency: z.string().nullable(),
        exchangeRate: z.number().nullable(),
        amountEur: z.number(),
        direction: z.enum(['Af', 'Bij']),
      })
    )
    .min(1, 'At least one transaction is required'),
});

export const deleteIcsImportSchema = z.object({
  statementId: z.string().min(1, 'statementId is required'),
});

export const initBankConnectionSchema = z.object({
  bankName: z.string().min(1, 'Bank name is required'),
  bankCountry: z.string().length(2).default('NL'),
});
