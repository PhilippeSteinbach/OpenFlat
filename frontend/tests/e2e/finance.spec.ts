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
    await expect(page.getByText('Finance Tracker')).toBeVisible({ timeout: 5000 });
  });

  test('should display Expenses and Settlement tabs', async ({ page }) => {
    await expect(page.getByRole('tab', { name: 'Expenses' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Settlement' })).toBeVisible();
    // Expenses tab active by default
    await expect(page.getByRole('tab', { name: 'Expenses' })).toHaveAttribute('aria-selected', 'true');
  });

  test('should log a new expense', async ({ page }) => {
    await page.getByRole('button', { name: /Log Expense/i }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('Log Expense')).toBeVisible();

    await page.getByLabel('Amount (€)').fill('42.50');
    await page.getByLabel('Description').fill('Weekly groceries');
    await dialog.getByRole('button', { name: 'Save' }).click();

    // Expense appears in list
    await expect(page.getByText('Weekly groceries')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('€42.50')).toBeVisible();
  });

  test('should edit an expense', async ({ page }) => {
    // Log expense first
    await page.getByRole('button', { name: /Log Expense/i }).click();
    await page.getByLabel('Amount (€)').fill('15.00');
    await page.getByLabel('Description').fill('Bus ticket');
    await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Bus ticket')).toBeVisible({ timeout: 5000 });

    // Edit the expense (own expense should show edit button)
    await page.getByRole('button', { name: 'Edit' }).first().click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Edit Expense')).toBeVisible();
    await page.getByLabel('Description').fill('Metro ticket');
    await dialog.getByRole('button', { name: 'Save' }).click();

    // Updated description visible
    await expect(page.getByText('Metro ticket')).toBeVisible({ timeout: 5000 });
  });

  test('should delete an expense', async ({ page }) => {
    // Log expense first
    await page.getByRole('button', { name: /Log Expense/i }).click();
    await page.getByLabel('Amount (€)').fill('8.00');
    await page.getByLabel('Description').fill('Coffee');
    await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Coffee')).toBeVisible({ timeout: 5000 });

    // Delete
    await page.getByRole('button', { name: 'Delete' }).first().click();
    const confirmDialog = page.getByRole('dialog');
    await expect(confirmDialog.getByText('Delete Expense')).toBeVisible();
    await confirmDialog.getByRole('button', { name: 'Delete' }).click();

    // Expense removed
    await expect(page.getByText('Coffee')).not.toBeVisible({ timeout: 5000 });
  });

  test('should show settlement view', async ({ page }) => {
    // Log an expense so settlement has data
    await page.getByRole('button', { name: /Log Expense/i }).click();
    await page.getByLabel('Amount (€)').fill('100.00');
    await page.getByLabel('Description').fill('Rent contribution');
    await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Rent contribution')).toBeVisible({ timeout: 5000 });

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
