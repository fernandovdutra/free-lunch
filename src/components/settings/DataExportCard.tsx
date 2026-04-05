import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { exportTransactionsAsCSV, exportTransactionsAsJSON } from '@/lib/export';
import type { Transaction, Category } from '@/types';

interface DataExportCardProps {
  transactions: Transaction[];
  categories: Category[];
  isLoading: boolean;
}

export function DataExportCard({ transactions, categories, isLoading }: DataExportCardProps) {
  const [isExporting, setIsExporting] = useState<'csv' | 'json' | null>(null);

  const handleExportCSV = async () => {
    setIsExporting('csv');
    try {
      await new Promise((resolve) => setTimeout(resolve, 100));
      exportTransactionsAsCSV(transactions, categories);
    } finally {
      setIsExporting(null);
    }
  };

  const handleExportJSON = async () => {
    setIsExporting('json');
    try {
      await new Promise((resolve) => setTimeout(resolve, 100));
      exportTransactionsAsJSON(transactions, categories);
    } finally {
      setIsExporting(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Data Export</CardTitle>
        <CardDescription>
          Export your transaction data ({transactions.length} transaction
          {transactions.length !== 1 ? 's' : ''})
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <Button
          variant="outline"
          className="w-full"
          onClick={() => void handleExportCSV()}
          disabled={isExporting !== null || isLoading || transactions.length === 0}
        >
          {isExporting === 'csv' ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          Export as CSV
        </Button>
        <Button
          variant="outline"
          className="w-full"
          onClick={() => void handleExportJSON()}
          disabled={isExporting !== null || isLoading || transactions.length === 0}
        >
          {isExporting === 'json' ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          Export as JSON
        </Button>
        {transactions.length === 0 && !isLoading && (
          <p className="text-center text-xs text-muted-foreground">No transactions to export</p>
        )}
      </CardContent>
    </Card>
  );
}
