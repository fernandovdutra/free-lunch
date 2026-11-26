import { test, expect } from '@playwright/test';
import { login } from './fixtures/auth';
import { deleteDoc, projectId, setDoc, TEST_UID, txnFields } from './fixtures/emulator';

test.use({ viewport: { width: 390, height: 844 } });

test('allocates a reimbursement through MCP, retries and clears a late expense', async ({ page, request }) => {
  const collection = `users/${TEST_UID}/transactions`;
  const credit = 'e2e-bundle-credit';
  const first = 'e2e-bundle-first';
  const late = 'e2e-bundle-late';
  const stage = (id: string, amount: number) => setDoc(`${collection}/${id}`, txnFields({
    date: new Date(), description: id, counterparty: id, amount,
    categoryId: null, reimbursement: null,
  }));
  const allocate = async (expenseTransactionId: string, amount: number) => {
    const response = await request.post(`http://127.0.0.1:5001/${projectId()}/europe-west1/mcp`, {
      headers: { Authorization: 'Bearer demo-bundle-test', Accept: 'application/json, text/event-stream' },
      data: { jsonrpc: '2.0', id: 1, method: 'tools/call', params: {
        name: 'record_bundled_reimbursement', arguments: {
          incomeTransactionId: credit, type: 'work', allocations: [{ expenseTransactionId, amount }],
        },
      } },
    });
    expect(response.ok()).toBeTruthy();
    const { result } = await response.json();
    expect(result.isError, result.content[0].text).toBeFalsy();
    return JSON.parse(result.content[0].text);
  };

  try {
    await Promise.all([stage(credit, 100), stage(first, -90)]);
    const partial = await allocate(first, 75);
    expect(partial).toMatchObject({ allocatedAmount: 75, unallocatedAmount: 25 });
    expect(await allocate(first, 75)).toEqual(partial);
    await stage(late, -25);
    expect(await allocate(late, 25)).toMatchObject({
      allocatedAmount: 100, unallocatedAmount: 0,
      allocations: [{ expenseTransactionId: first, amount: 75 }, { expenseTransactionId: late, amount: 25 }],
    });
    await login(page);
    await page.goto('/transactions');
    await page.getByPlaceholder(/search description or payee/i).fill(first);
    await page.getByRole('button').filter({ hasText: first }).first().click();
    await expect(page.getByText(/Reimbursed ✓/i).last()).toBeVisible();
    await expect(page.getByLabel('Amount owed')).toHaveValue('75.00');
    await test.info().attach('cleared-bundle-expense', { body: await page.screenshot(), contentType: 'image/png' });
  } finally {
    await Promise.all([credit, first, late].map(id => deleteDoc(`${collection}/${id}`)));
  }
});
