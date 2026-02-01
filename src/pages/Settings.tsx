import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { BankConnectionCard } from '@/components/settings/BankConnectionCard';

export function Settings() {
  const { user } = useAuth();

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
            <CardDescription>Export your transaction data</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full">
              Export as CSV
            </Button>
            <Button variant="outline" className="w-full">
              Export as JSON
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
