import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

// The component tree reaches the Firebase client through the banking hooks —
// stub the module so nothing tries to initialize Auth/Firestore at load.
vi.mock('@/lib/firebase', () => ({ db: {}, auth: {}, functions: {} }));
vi.mock('react-router-dom', () => ({
  useSearchParams: () => [new URLSearchParams(), vi.fn()] as const,
}));

const toast = vi.fn();
vi.mock('@/components/ui/toaster', () => ({ useToast: () => ({ toast }) }));

const initMutate = vi.fn();
const syncMutate = vi.fn();
const disconnectMutateAsync = vi.fn();
let connections: BankConnectionStatus[] = [];

vi.mock('@/hooks/useBankConnection', () => ({
  useAvailableBanks: () => ({
    data: [{ name: 'ABN AMRO', country: 'NL', logo: '', bic: '' }],
    isLoading: false,
  }),
  useBankConnections: () => ({ data: connections }),
  useInitBankConnection: () => ({ mutate: initMutate, isPending: false }),
  useSyncTransactions: () => ({ mutate: syncMutate, isPending: false }),
  useDisconnectBankConnection: () => ({
    mutateAsync: disconnectMutateAsync,
    isPending: false,
  }),
}));

import { BankConnectionCard } from '../BankConnectionCard';
import type { BankConnectionStatus } from '@/lib/bankingFunctions';

function connection(over: Partial<BankConnectionStatus> = {}): BankConnectionStatus {
  return {
    id: 'abn_amro_1',
    bankName: 'ABN AMRO',
    bankId: 'abn_amro',
    status: 'active',
    accountCount: 1,
    accounts: [
      { uid: 'acc-1', iban: 'NL01ABNA0000005787', name: 'F VELHO DUTRA CJ', balance: null },
    ],
    lastSync: '2026-08-01T10:00:00Z',
    consentExpiresAt: '2026-11-01T10:00:00Z',
    lastAutoSyncAt: null,
    lastAutoSyncError: null,
    ...over,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  connections = [];
});

afterEach(() => {
  cleanup();
});

describe('BankConnectionCard — reconnect', () => {
  it('offers RECONNECT instead of a dead SYNC on an expired connection', () => {
    connections = [connection({ status: 'expired' })];
    render(<BankConnectionCard />);

    expect(screen.getByTestId('reconnect-bank').textContent).toContain('RECONNECT');
    expect(screen.queryByText('↻ SYNC')).toBeNull();
  });

  it('re-authorizes the same bank, resolved against the available-banks list', () => {
    connections = [connection({ status: 'expired' })];
    render(<BankConnectionCard />);

    fireEvent.click(screen.getByTestId('reconnect-bank'));

    expect(initMutate).toHaveBeenCalledTimes(1);
    // Same ASPSP as the stored connection — bankCallback matches it back onto
    // the existing doc by IBAN, so no second connection is created.
    expect(initMutate.mock.calls[0]?.[0]).toEqual({
      bankName: 'ABN AMRO',
      bankCountry: 'NL',
    });
  });

  it('reassures that reconnecting keeps existing transactions', () => {
    connections = [connection({ status: 'expired' })];
    render(<BankConnectionCard />);

    expect(screen.getByText(/transactions stay exactly as they are/i)).toBeDefined();
  });

  it('treats an errored connection the same as an expired one', () => {
    connections = [connection({ status: 'error' })];
    render(<BankConnectionCard />);

    expect(screen.getByTestId('reconnect-bank')).toBeDefined();
  });

  it('keeps SYNC primary on a healthy connection and offers no reconnect', () => {
    connections = [connection()];
    render(<BankConnectionCard />);

    expect(screen.getByText('↻ SYNC')).toBeDefined();
    expect(screen.queryByTestId('reconnect-bank')).toBeNull();
    expect(screen.queryByTestId('reconnect-bank-early')).toBeNull();
  });

  it('offers an early reconnect while an active consent is about to lapse', () => {
    const soon = new Date(Date.now() + 3 * 86_400_000).toISOString();
    connections = [connection({ consentExpiresAt: soon })];
    render(<BankConnectionCard />);

    // SYNC still works right up to expiry, so it stays the primary action.
    expect(screen.getByText('↻ SYNC')).toBeDefined();
    fireEvent.click(screen.getByTestId('reconnect-bank-early'));
    expect(initMutate).toHaveBeenCalledWith(
      { bankName: 'ABN AMRO', bankCountry: 'NL' },
      expect.anything()
    );
  });

  it('does not show the "expires soon" banner for an already-expired connection', () => {
    connections = [
      connection({ status: 'expired', consentExpiresAt: '2026-08-01T10:00:00Z' }),
    ];
    render(<BankConnectionCard />);

    expect(screen.queryByText(/Bank consent expires soon/i)).toBeNull();
  });

  it('points at Reconnect from the destructive disconnect dialog', () => {
    connections = [connection({ status: 'expired' })];
    render(<BankConnectionCard />);

    fireEvent.click(screen.getByText('DISCONNECT'));

    expect(screen.getByText(/delete all of its transactions/i)).toBeDefined();
    expect(screen.getByText(/keeps everything/i)).toBeDefined();
  });

  it('surfaces a failed re-authorization instead of leaving a stuck spinner', () => {
    initMutate.mockImplementation(
      (_vars: unknown, opts?: { onError?: (err: Error) => void }) => {
        opts?.onError?.(new Error('Failed to start bank connection'));
      }
    );
    connections = [connection({ status: 'expired' })];
    render(<BankConnectionCard />);

    fireEvent.click(screen.getByTestId('reconnect-bank'));

    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Reconnect failed', variant: 'destructive' })
    );
    // Button is usable again for a retry.
    expect(screen.getByTestId<HTMLButtonElement>('reconnect-bank').disabled).toBe(false);
  });
});
