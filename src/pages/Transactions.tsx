import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function Transactions() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
        <p className="text-muted-foreground">View and manage your transactions</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-[400px] items-center justify-center text-muted-foreground">
            Transaction list with search, filter, and pagination will go here
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
