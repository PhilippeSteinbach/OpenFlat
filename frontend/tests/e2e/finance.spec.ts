import { test, expect } from '@playwright/test';

/**
 * E2E: Finance Tracker journey (US4)
 * Validates: log expense → view expenses → edit expense →
 * check settlement → delete expense
 */

test.describe('Finance Tracker', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByText('Alex').click();
    await expect(page.getByText(/hey, alex/i)).toBeVisible({ timeout: 5000 });

    // Navigate to Finance Tracker
    await page.getByRole('button', { name: 'Finance Tracker' }).click();
    await expect(page.getByRole('heading', { name: 'Finance Tracker' })).toBeVisible({ timeout: 5000 });
  });

  test('should display Expenses and Settlement tabs', async ({ page }) => {
    await expect(page.getByRole('tab', { name: 'Expenses' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Settlement' })).toBeVisible();
    // Expenses tab active by default
    await expect(page.getByRole('tab', { name: 'Expenses' })).toHaveAttribute('aria-selected', 'true');
  });

  test('should log a new expense', async ({ page }) => {
    const expenseName = `Weekly groceries ${Date.now()}`;
    await page.getByRole('button', { name: /Log Expense/i }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('Log Expense')).toBeVisible();

    await page.getByLabel('Amount (€)').fill('42.50');
    await page.getByLabel('Description').fill(expenseName);
    await dialog.getByRole('button', { name: 'Save' }).click();

    // Expense appears in list
    await expect(page.getByText(expenseName)).toBeVisible({ timeout: 5000 });
    // Scope amount check to this expense's row to avoid ambiguity
    const expenseRow = page.getByText(expenseName, { exact: true })
      .locator('xpath=ancestor::div[contains(@class,"rounded-lg")][1]');
    await expect(expenseRow.getByText('€42.50')).toBeVisible();
  });

  test('should edit an expense', async ({ page }) => {
    const suffix = Date.now();
    const origName = `Bus ticket ${suffix}`;
    const editedName = `Metro ticket ${suffix}`;
    // Log expense first
    await page.getByRole('button', { name: /Log Expense/i }).click();
    await page.getByLabel('Amount (€)').fill('15.00');
    await page.getByLabel('Description').fill(origName);
    await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText(origName, { exact: true })).toBeVisible({ timeout: 5000 });

    // Edit the expense — scope to this row to avoid clicking wrong Edit button
    const expenseRow = page.getByText(origName, { exact: true })
      .locator('xpath=ancestor::div[contains(@class,"rounded-lg")][1]');
    await expenseRow.getByRole('button', { name: 'Edit' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Edit Expense')).toBeVisible();
    await page.getByLabel('Description').fill(editedName);
    await dialog.getByRole('button', { name: 'Save' }).click();

    // Updated description visible
    await expect(page.getByText(editedName, { exact: true })).toBeVisible({ timeout: 5000 });
  });

  test('should delete an expense', async ({ page }) => {
    const expenseName = `Coffee ${Date.now()}`;
    // Log expense first
    await page.getByRole('button', { name: /Log Expense/i }).click();
    await page.getByLabel('Amount (€)').fill('8.00');
    await page.getByLabel('Description').fill(expenseName);
    await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText(expenseName, { exact: true })).toBeVisible({ timeout: 5000 });

    // Delete — scope to this row
    const expenseRow = page.getByText(expenseName, { exact: true })
      .locator('xpath=ancestor::div[contains(@class,"rounded-lg")][1]');
    await expenseRow.getByRole('button', { name: 'Delete' }).click();
    const confirmDialog = page.getByRole('dialog');
    await expect(confirmDialog.getByText('Delete Expense')).toBeVisible();
    await confirmDialog.getByRole('button', { name: 'Delete' }).click();

    // Expense removed
    await expect(page.getByText(expenseName, { exact: true })).not.toBeVisible({ timeout: 5000 });
  });

  test('should show settlement view', async ({ page }) => {
    const expenseName = `Rent contribution ${Date.now()}`;
    // Log an expense so settlement has data
    await page.getByRole('button', { name: /Log Expense/i }).click();
    await page.getByLabel('Amount (€)').fill('100.00');
    await page.getByLabel('Description').fill(expenseName);
    await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText(expenseName, { exact: true })).toBeVisible({ timeout: 5000 });

    // Switch to Settlement tab
    await page.getByRole('tab', { name: 'Settlement' }).click();

    // Settlement view shows summary
    await expect(page.getByText(/Total expenses/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/Per person/i)).toBeVisible();
  });

  test('should show settlement balances', async ({ page }) => {
    // Switch to Settlement tab (even with no expenses, it should render)
    await page.getByRole('tab', { name: 'Settlement' }).click();

    // Either shows "All settled up!" or the balances section
    const settled = page.getByText(/All settled up/i);
    const balances = page.getByText(/BALANCES/i);
    await expect(settled.or(balances).first()).toBeVisible({ timeout: 5000 });
  });
});
