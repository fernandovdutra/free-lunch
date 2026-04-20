import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { BankConnectionCard } from '@/components/settings/BankConnectionCard';
import { IcsImportCard } from '@/components/settings/IcsImportCard';
import { BuiltInRulesCard } from '@/components/settings/BuiltInRulesCard';
import { DataExportCard } from '@/components/settings/DataExportCard';
import { AutoCategorizationCard } from '@/components/settings/AutoCategorizationCard';
import { CategorizationRulesCard } from '@/components/settings/CategorizationRulesCard';
import { DangerZoneCard } from '@/components/settings/DangerZoneCard';
import { useTransactions } from '@/hooks/useTransactions';
import { useCategories } from '@/hooks/useCategories';
import { useAdvisorMemoryMeta, useRefreshAdvisorMemory } from '@/hooks/useAdvisorMemory';
import { useToast } from '@/components/ui/toaster';
import { Brain, RefreshCw, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();

  // Fetch all transactions for export (no date filter)
  const { data: transactions = [], isLoading: isLoadingTransactions } = useTransactions({});
  const { data: categories = [] } = useCategories();

  // Advisor memory
  const { data: memoryMeta } = useAdvisorMemoryMeta();
  const refreshMemoryMutation = useRefreshAdvisorMemory();

  const handleRefreshMemory = async () => {
    try {
      const result = await refreshMemoryMutation.mutateAsync();
      toast({
        title: 'Memory refreshed',
        description: `Built ${result.baselines} category baselines, ${result.merchants} merchants, ${result.patterns} patterns.`,
      });
    } catch {
      toast({
        variant: 'destructive',
        title: 'Refresh failed',
        description: 'Could not refresh advisor memory. Please try again.',
      });
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
        <IcsImportCard />

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
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Financial Advisor Memory
            </CardTitle>
            <CardDescription>
              The advisor learns your spending patterns over time. Refresh to rebuild from all transactions.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {memoryMeta?.updatedAt ? (
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>Last updated: {formatDistanceToNow(memoryMeta.updatedAt, { addSuffix: true })}</p>
                {memoryMeta.consolidatedAt && (
                  <p>Last full consolidation: {formatDistanceToNow(memoryMeta.consolidatedAt, { addSuffix: true })}</p>
                )}
                {memoryMeta.baselinesCount > 0 && (
                  <p>
                    {memoryMeta.baselinesCount} category baselines · {memoryMeta.merchantsCount} known merchants
                    {(memoryMeta.behavioralPatternsCount + memoryMeta.temporalPatternsCount) > 0 &&
                      ` · ${memoryMeta.behavioralPatternsCount + memoryMeta.temporalPatternsCount} patterns learned`}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No memory built yet. Run a refresh to initialise.
              </p>
            )}
            <Button
              variant="outline"
              onClick={() => void handleRefreshMemory()}
              disabled={refreshMemoryMutation.isPending}
              className="w-full"
            >
              {refreshMemoryMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              {refreshMemoryMutation.isPending ? 'Rebuilding memory…' : 'Refresh Financial Memory'}
            </Button>
            <p className="text-xs text-muted-foreground">
              Reads all transactions and rebuilds spending baselines, merchant knowledge, and behavioural patterns. Takes 10–30 seconds. Also runs automatically every Sunday.
            </p>
          </CardContent>
        </Card>

        <DataExportCard
          transactions={transactions}
          categories={categories}
          isLoading={isLoadingTransactions}
        />
      </div>

      <AutoCategorizationCard hasTransactions={transactions.length > 0} />
      <CategorizationRulesCard categories={categories} />
      <BuiltInRulesCard />
      <DangerZoneCard transactionCount={transactions.length} />
    </div>
  );
}
