import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { BankConnectionCard } from '@/components/settings/BankConnectionCard';
import { useTransactions } from '@/hooks/useTransactions';
import { useCategories } from '@/hooks/useCategories';
import { exportTransactionsAsCSV, exportTransactionsAsJSON } from '@/lib/export';

export function Settings() {
  const { user } = useAuth();
  const [isExporting, setIsExporting] = useState<'csv' | 'json' | null>(null);

  // Fetch all transactions for export (no date filter)
  const { data: transactions = [], isLoading: isLoadingTransactions } = useTransactions({});
  const { data: categories = [] } = useCategories();

  const handleExportCSV = async () => {
    setIsExporting('csv');
    try {
      // Small delay to show loading state
      await new Promise((resolve) => setTimeout(resolve, 100));
      exportTransactionsAsCSV(transactions, categories);
    } finally {
      setIsExporting(null);
    }
  };

  const handleExportJSON = async () => {
    setIsExporting('json');
    try {
      // Small delay to show loading state
      await new Promise((resolve) => setTimeout(resolve, 100));
      exportTransactionsAsJSON(transactions, categories);
    } finally {
      setIsExporting(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your account and preferences</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <BankConnectionCard />

        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>Your account information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Email</p>
              <p className="text-sm text-muted-foreground">{user?.email ?? 'Not signed in'}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Display Name</p>
              <p className="text-sm text-muted-foreground">{user?.displayName ?? 'Not set'}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Preferences</CardTitle>
            <CardDescription>Customize your experience</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex h-[100px] items-center justify-center text-muted-foreground">
              Preference settings will go here
            </div>
          </CardContent>
        </Card>

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
              disabled={isExporting !== null || isLoadingTransactions || transactions.length === 0}
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
              disabled={isExporting !== null || isLoadingTransactions || transactions.length === 0}
            >
              {isExporting === 'json' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Export as JSON
            </Button>
            {transactions.length === 0 && !isLoadingTransactions && (
              <p className="text-center text-xs text-muted-foreground">
                No transactions to export
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
