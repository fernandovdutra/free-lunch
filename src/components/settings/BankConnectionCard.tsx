import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
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
import type { BankConnectionStatus } from '@/lib/bankingFunctions';

const STATUS_TONE: Record<BankConnectionStatus['status'], string> = {
  active: 'text-accent',
  expired: 'text-warn',
  error: 'text-warn',
};

const STATUS_LABEL: Record<BankConnectionStatus['status'], string> = {
  active: 'CONNECTED',
  expired: 'EXPIRED',
  error: 'ERROR',
};

const ERROR_MESSAGES: Record<string, string> = {
  missing_params: 'Authorization failed — missing parameters',
  invalid_state: 'Authorization failed — invalid session',
  expired: 'Authorization session expired — please try again',
  session_failed: 'Failed to create bank session',
};

interface BankCardProps {
  connection: BankConnectionStatus;
  onSync: (id: string) => void;
  syncing: boolean;
}

function BankCard({ connection, onSync, syncing }: BankCardProps) {
  const tone = STATUS_TONE[connection.status];
  const dotShadow =
    connection.status === 'active' ? '0 0 5px var(--accent)' : 'none';

  return (
    <div className="mb-3 border border-rule bg-surface">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-rule px-[14px] py-3">
        <div>
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.06em] text-textLo">
            <span
              aria-hidden
              className={`inline-block h-[5px] w-[5px] rounded-full ${connection.status === 'active' ? 'bg-accent' : 'bg-warn'}`}
              style={{ boxShadow: dotShadow }}
            />
            <span className={tone}>{STATUS_LABEL[connection.status]}</span>
          </div>
          <div className="mt-1 text-[16px] font-medium tracking-[-0.2px] text-textHi">
            {connection.bankName}
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            onSync(connection.id);
          }}
          disabled={syncing || connection.status === 'expired'}
          className="border border-ruleHi px-[10px] py-[5px] font-mono text-[10.5px] tracking-[0.04em] text-textMid disabled:opacity-40 active:opacity-60"
        >
          {syncing ? '↻ …' : '↻ SYNC'}
        </button>
      </div>

      {/* Account rows */}
      {connection.accounts.map((account, idx) => {
        const last4 = account.iban.slice(-4);
        const kind = (account.name?.toLowerCase().includes('saving')
          ? 'SAVINGS'
          : 'CHECKING'
        ).toUpperCase();
        return (
          <div
            key={account.uid}
            className={`flex items-center justify-between gap-[10px] px-[14px] py-3 ${idx > 0 ? 'border-t border-rule' : ''}`}
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2 font-mono text-[9.5px] uppercase tracking-[0.06em] text-textLo">
                <span>{kind}</span>
                <span aria-hidden>·</span>
                <span>··{last4}</span>
              </div>
              <div className="mt-[2px] truncate text-[14px] text-textHi">
                {account.name || `Account ${last4}`}
              </div>
            </div>
            {account.balance ? (
              <div className="nums font-mono text-[14px] tracking-[-0.3px] text-textHi">
                {new Intl.NumberFormat('nl-NL', {
                  style: 'currency',
                  currency: account.balance.currency,
                  maximumFractionDigits: 2,
                }).format(account.balance.amount)}
              </div>
            ) : (
              <span className="font-mono text-[12px] text-textLo">—</span>
            )}
          </div>
        );
      })}

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-rule px-[14px] py-[10px] font-mono text-[10px] uppercase tracking-[0.04em] text-textLo">
        <span>
          LAST SYNC{' '}
          {connection.lastSync
            ? formatDate(new Date(connection.lastSync), 'relative').toUpperCase()
            : 'NEVER'}
        </span>
        <button
          type="button"
          onClick={() => {
            // Disconnect not yet implemented in the hook; surface as no-op.
          }}
          className="text-textMid"
        >
          DISCONNECT
        </button>
      </div>
    </div>
  );
}

/**
 * Flat-rewrite of the original shadcn-card bank connection UI. Renders
 * connected banks per v8's "Settings · Accounts & Sync" frame and an
 * inline "Add another bank" tile that opens a Select for the supported
 * institutions list. Fully replaces the previous Card/Card{Header,Content}
 * + lucide-icon styling with surface tokens + mono labels.
 */
export function BankConnectionCard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedBank, setSelectedBank] = useState<string>('');
  const [message, setMessage] = useState<
    { type: 'success' | 'error'; text: string } | null
  >(null);

  const { data: banks = [], isLoading: banksLoading } = useAvailableBanks();
  const { data: connections = [] } = useBankConnections();
  const initConnection = useInitBankConnection();
  const sync = useSyncTransactions();

  // Handle callback messages from URL
  useEffect(() => {
    const bankConnected = searchParams.get('bank_connected');
    const bankError = searchParams.get('bank_error');

    if (bankConnected) {
      setMessage({ type: 'success', text: 'Bank account connected.' });
      setSearchParams({});
    } else if (bankError) {
      setMessage({
        type: 'error',
        text: ERROR_MESSAGES[bankError] ?? `Authorization error: ${bankError}`,
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

  const expiringSoon = connections.some((c) => {
    if (!c.consentExpiresAt) return false;
    const days = Math.ceil(
      (new Date(c.consentExpiresAt).getTime() - Date.now()) / 86_400_000
    );
    return days <= 7;
  });

  const supportedNames =
    banks.length > 0
      ? banks.map((b) => b.name.toUpperCase()).slice(0, 6).join(' · ')
      : 'ABN AMRO · ING · RABO · KNAB · BUNQ';

  return (
    <div>
      {message ? (
        <div
          className={`mb-3 border px-3 py-2 text-[12px] ${message.type === 'success' ? 'border-accent/40 bg-accent/10 text-accent' : 'border-warn/40 bg-warn/10 text-warn'}`}
        >
          {message.text}
        </div>
      ) : null}

      {/* Connected banks */}
      {connections.map((connection) => (
        <BankCard
          key={connection.id}
          connection={connection}
          onSync={handleSync}
          syncing={sync.isPending}
        />
      ))}

      {/* Add another bank */}
      <div className="border border-rule bg-surface">
        <div className="flex items-center justify-between gap-3 px-[14px] py-3">
          <div className="min-w-0">
            <div className="text-[14px] font-medium text-textHi">
              {connections.length > 0 ? 'Add another bank' : 'Connect your bank'}
            </div>
            <div className="mt-[3px] font-mono text-[10.5px] uppercase tracking-[0.04em] text-textLo">
              SUPPORTED · {supportedNames}
            </div>
          </div>
          <Select value={selectedBank} onValueChange={setSelectedBank}>
            <SelectTrigger
              className="h-8 w-auto min-w-0 gap-2 border border-ruleHi bg-transparent px-3 font-mono text-[10.5px] uppercase tracking-[0.04em] text-textMid focus:ring-0 focus:ring-offset-0"
              data-testid="bank-selector"
            >
              <SelectValue placeholder="+ ADD BANK" />
            </SelectTrigger>
            <SelectContent>
              {banksLoading ? (
                <SelectItem value="loading" disabled>
                  Loading…
                </SelectItem>
              ) : (
                banks.map((bank) => (
                  <SelectItem key={bank.name} value={bank.name}>
                    {bank.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
        {selectedBank ? (
          <div className="border-t border-rule px-[14px] py-3 flex items-center justify-end">
            <button
              type="button"
              onClick={handleConnect}
              disabled={initConnection.isPending}
              className="border border-accent/60 bg-accent/10 px-3 py-1 font-mono text-[10.5px] uppercase tracking-[0.04em] text-accent disabled:opacity-40 active:opacity-60"
            >
              {initConnection.isPending ? 'CONNECTING…' : `CONNECT ${selectedBank.toUpperCase()}`}
            </button>
          </div>
        ) : null}
      </div>

      {expiringSoon ? (
        <div className="mt-3 border border-warn/40 bg-warn/10 px-3 py-2 text-[12px] text-warn">
          Bank consent expires soon. You may need to reconnect to continue syncing.
        </div>
      ) : null}
    </div>
  );
}
