import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Building2, RefreshCw, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useAvailableBanks,
  useBankConnections,
  useInitBankConnection,
  useSyncTransactions,
} from '@/hooks/useBankConnection';
import { formatDate } from '@/lib/utils';

export function BankConnectionCard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedBank, setSelectedBank] = useState<string>('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const { data: banks = [], isLoading: banksLoading } = useAvailableBanks();
  const { data: connections = [] } = useBankConnections();
  const initConnection = useInitBankConnection();
  const sync = useSyncTransactions();

  // Handle callback messages from URL
  useEffect(() => {
    const bankConnected = searchParams.get('bank_connected');
    const bankError = searchParams.get('bank_error');

    if (bankConnected) {
      setMessage({ type: 'success', text: 'Bank account connected successfully!' });
      setSearchParams({});
    } else if (bankError) {
      const errorMessages: Record<string, string> = {
        missing_params: 'Authorization failed - missing parameters',
        invalid_state: 'Authorization failed - invalid session',
        expired: 'Authorization session expired - please try again',
        session_failed: 'Failed to create bank session',
      };
      setMessage({
        type: 'error',
        text: errorMessages[bankError] || `Authorization error: ${bankError}`,
      });
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  const handleConnect = () => {
    if (!selectedBank) return;
    initConnection.mutate({ bankName: selectedBank });
  };

  const handleSync = (connectionId: string) => {
    sync.mutate(connectionId);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case 'expired':
        return <Clock className="h-4 w-4 text-amber-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bank Connection</CardTitle>
        <CardDescription>Connect your bank account to sync transactions</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status messages */}
        {message && (
          <div
            className={`rounded-md p-3 text-sm ${
              message.type === 'success'
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-red-50 text-red-700'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Existing connections */}
        {connections.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Connected Accounts</p>
            {connections.map((connection) => (
              <div
                key={connection.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="flex items-center gap-3">
                  {getStatusIcon(connection.status)}
                  <div>
                    <p className="font-medium">{connection.bankName}</p>
                    <p className="text-sm text-muted-foreground">
                      {connection.accountCount} account{connection.accountCount !== 1 ? 's' : ''}
                      {connection.lastSync && (
                        <>
                          {' · '}Last synced {formatDate(new Date(connection.lastSync), 'relative')}
                        </>
                      )}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    handleSync(connection.id);
                  }}
                  disabled={sync.isPending || connection.status === 'expired'}
                >
                  {sync.isPending ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Sync
                    </>
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Add new connection */}
        <div className="space-y-3">
          <p className="text-sm font-medium">
            {connections.length > 0 ? 'Add Another Bank' : 'Connect Your Bank'}
          </p>
          <div className="flex gap-2">
            <Select value={selectedBank} onValueChange={setSelectedBank}>
              <SelectTrigger className="flex-1" data-testid="bank-selector">
                <SelectValue placeholder="Select your bank" />
              </SelectTrigger>
              <SelectContent>
                {banksLoading ? (
                  <SelectItem value="loading" disabled>
                    Loading banks...
                  </SelectItem>
                ) : (
                  banks.map((bank) => (
                    <SelectItem key={bank.name} value={bank.name}>
                      <span className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        {bank.name}
                      </span>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <Button onClick={handleConnect} disabled={!selectedBank || initConnection.isPending}>
              {initConnection.isPending ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                'Connect'
              )}
            </Button>
          </div>
        </div>

        {/* Consent expiry warning */}
        {connections.some((c) => {
          if (!c.consentExpiresAt) return false;
          const daysUntilExpiry = Math.ceil(
            (new Date(c.consentExpiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
          );
          return daysUntilExpiry <= 7;
        }) && (
          <div className="rounded-md bg-amber-50 p-3 text-sm text-amber-700">
            <AlertTriangle className="mr-2 inline h-4 w-4" />
            Bank consent expires soon. You may need to reconnect to continue syncing.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
