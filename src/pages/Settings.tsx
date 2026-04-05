import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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

export function Settings() {
  const { user } = useAuth();

  // Fetch all transactions for export (no date filter)
  const { data: transactions = [], isLoading: isLoadingTransactions } = useTransactions({});
  const { data: categories = [] } = useCategories();

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
