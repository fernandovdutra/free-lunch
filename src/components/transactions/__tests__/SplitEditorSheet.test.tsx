import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';

// The nested CategoryPicker pulls in useCategories, which transitively imports
// the Firebase client (initializes Auth/Firestore at load) — stub it.
vi.mock('@/lib/firebase', () => ({ db: {}, auth: {}, functions: {} }));

import { SplitEditorSheet } from '../SplitEditorSheet';
import type { Category, Transaction } from '@/types';

function category(id: string, name: string, parentId: string | null = null): Category {
  return {
    id,
    name,
    icon: 'circle',
    color: '#888888',
    parentId,
    order: 0,
    isSystem: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

const categories: Category[] = [
  category('groceries', 'Groceries'),
  category('household', 'Household'),
];

function txn(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 'txn-1',
    externalId: null,
    date: new Date('2026-07-01'),
    bookingDate: null,
    transactionDate: null,
    description: 'Albert Heijn 1234',
    bankDescription: null,
    amount: -85.5,
    currency: 'EUR',
    counterparty: 'Albert Heijn',
    categoryId: 'groceries',
    categoryConfidence: 1,
    categorySource: 'manual',
    isSplit: false,
    splits: null,
    reimbursement: null,
    note: null,
    bankAccountId: null,
    importedAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Transaction;
}

function renderEditor(transaction: Transaction) {
  const onSave = vi.fn();
  const onOpenChange = vi.fn();
  render(
    <SplitEditorSheet
      open
      onOpenChange={onOpenChange}
      transaction={transaction}
      categories={categories}
      onSave={onSave}
    />
  );
  return { onSave, onOpenChange };
}

function amountInput(index: number): HTMLInputElement {
  return screen.getByTestId(`split-amount-${index}`);
}

function saveButton(): HTMLButtonElement {
  return screen.getByTestId('split-save');
}

beforeEach(() => {
  vi.clearAllMocks();
});

// Vitest globals are off in this repo, so RTL's automatic cleanup doesn't
// register — without this the portal-rendered sheets accumulate across tests.
afterEach(cleanup);

describe('SplitEditorSheet', () => {
  it('prefills a fresh split with the full amount + current category and an empty second row', () => {
    renderEditor(txn());

    expect(amountInput(0).value).toBe('85.50');
    expect(amountInput(1).value).toBe('');
    // Row 1 carries the transaction's category, row 2 is unpicked.
    expect(screen.getByTestId('split-category-0').textContent).toContain('Groceries');
    expect(screen.getByTestId('split-category-1').textContent).toContain('Pick category…');
  });

  it('disables save while amounts do not sum to the transaction amount (live remainder)', () => {
    renderEditor(txn());

    fireEvent.change(amountInput(0), { target: { value: '65' } });

    // €20.50 unallocated → remainder shown, save gated.
    expect(screen.getByText(/20,50/)).toBeTruthy();
    expect(saveButton().disabled).toBe(true);
  });

  it('assigns the remainder to the last row in one tap and enables save', async () => {
    renderEditor(txn());

    fireEvent.change(amountInput(0), { target: { value: '65' } });
    fireEvent.click(screen.getByRole('button', { name: /assign to last row/i }));

    expect(amountInput(1).value).toBe('20.50');
    await waitFor(() => {
      expect(saveButton().disabled).toBe(false);
    });
  });

  it('saves the stored shape (positive amounts, categoryId, note|null) once valid', async () => {
    const { onSave } = renderEditor(txn());

    fireEvent.change(amountInput(0), { target: { value: '65' } });
    fireEvent.click(screen.getByRole('button', { name: /assign to last row/i }));
    fireEvent.change(screen.getByLabelText('Note for split 2'), {
      target: { value: ' cleaning ' },
    });

    // Row 2 has no category yet — submit must be rejected by validation.
    fireEvent.click(saveButton());
    expect(await screen.findByText('Pick a category')).toBeTruthy();
    expect(onSave).not.toHaveBeenCalled();

    // Pick a category for row 2 via the nested picker.
    fireEvent.click(screen.getByTestId('split-category-1'));
    fireEvent.click(await screen.findByRole('button', { name: /All Household/i }));

    fireEvent.click(saveButton());
    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith([
        { amount: 65, categoryId: 'groceries', note: null },
        { amount: 20.5, categoryId: 'household', note: 'cleaning' },
      ]);
    });
  });

  it('prefills existing splits when editing an already-split transaction', () => {
    renderEditor(
      txn({
        isSplit: true,
        splits: [
          { amount: 65, categoryId: 'groceries', note: null },
          { amount: 20.5, categoryId: 'household', note: 'cleaning' },
        ],
      })
    );

    expect(amountInput(0).value).toBe('65.00');
    expect(amountInput(1).value).toBe('20.50');
    expect(saveButton().disabled).toBe(false);
  });

  it('removing down to one row turns save into "remove split" and unsets via onSave(null)', () => {
    const { onSave } = renderEditor(
      txn({
        isSplit: true,
        splits: [
          { amount: 65, categoryId: 'groceries', note: null },
          { amount: 20.5, categoryId: 'household', note: null },
        ],
      })
    );

    fireEvent.click(screen.getByRole('button', { name: 'Remove split 2' }));

    expect(screen.getByText(/saving now removes the split/i)).toBeTruthy();
    const button = saveButton();
    expect(button.textContent).toMatch(/remove split/i);

    fireEvent.click(button);
    // Un-split falls back to the surviving row's category.
    expect(onSave).toHaveBeenCalledWith(null, 'groceries');
  });

  it('hides the row remove control once a single row is left (no path to zero rows)', () => {
    renderEditor(
      txn({
        isSplit: true,
        splits: [
          { amount: 65, categoryId: 'groceries', note: null },
          { amount: 20.5, categoryId: 'household', note: null },
        ],
      })
    );

    fireEvent.click(screen.getByRole('button', { name: 'Remove split 2' }));

    // The last row keeps no ✕ — removing it would leave zero rows and a save
    // button that can never be re-enabled.
    expect(screen.queryByRole('button', { name: 'Remove split 1' })).toBeNull();
    expect(amountInput(0).value).toBe('65.00');
  });

  it('shows the saving state and gates save while the write is in flight', () => {
    render(
      <SplitEditorSheet
        open
        onOpenChange={vi.fn()}
        transaction={txn({
          isSplit: true,
          splits: [
            { amount: 65, categoryId: 'groceries', note: null },
            { amount: 20.5, categoryId: 'household', note: null },
          ],
        })}
        categories={categories}
        onSave={vi.fn()}
        isSaving
      />
    );

    const button = saveButton();
    expect(button.disabled).toBe(true);
    expect(button.textContent).toMatch(/saving/i);
  });
});
