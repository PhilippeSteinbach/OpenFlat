import { test, expect } from '@playwright/test';

/**
 * E2E: Shopping List journey (US3)
 * Validates: add item → buy item → undo → verify Recently Bought →
 * edit item → delete item
 */

test.describe('Shopping List', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByText('Alex').click();
    await expect(page.getByText(/hey, alex/i)).toBeVisible({ timeout: 5000 });

    // Navigate to Shopping List
    await page.getByRole('button', { name: 'Shopping List' }).click();
    await expect(page.getByText('Shopping List')).toBeVisible({ timeout: 5000 });
  });

  test('should display Active and Recently Bought sections', async ({ page }) => {
    await expect(page.getByText('Active Items')).toBeVisible();
  });

  test('should add a new item', async ({ page }) => {
    await page.getByRole('button', { name: /Add Item/i }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('Add Item')).toBeVisible();

    await page.getByLabel('Item name').fill('Milk');
    await page.getByLabel('Quantity').fill('2');
    await dialog.getByRole('button', { name: 'Save' }).click();

    // Item appears in Active section
    await expect(page.getByText('Milk')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('×2')).toBeVisible();
  });

  test('should buy an item and show in Recently Bought', async ({ page }) => {
    // Add item
    await page.getByRole('button', { name: /Add Item/i }).click();
    await page.getByLabel('Item name').fill('Bread');
    await page.getByLabel('Quantity').fill('1');
    await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Bread')).toBeVisible({ timeout: 5000 });

    // Buy the item
    await page.getByRole('button', { name: 'Mark as bought' }).click();

    // Item moves to Recently Bought
    await expect(page.getByText('Recently Bought')).toBeVisible({ timeout: 5000 });
  });

  test('should undo a bought item back to active', async ({ page }) => {
    // Add item
    await page.getByRole('button', { name: /Add Item/i }).click();
    await page.getByLabel('Item name').fill('Eggs');
    await page.getByLabel('Quantity').fill('1');
    await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Eggs')).toBeVisible({ timeout: 5000 });

    // Buy the item
    await page.getByRole('button', { name: 'Mark as bought' }).click();
    await expect(page.getByText('Recently Bought')).toBeVisible({ timeout: 5000 });

    // Undo the buy
    await page.getByRole('button', { name: 'Move back to active' }).click();

    // Item should be back in Active section
    await expect(page.getByText('Eggs')).toBeVisible({ timeout: 5000 });
  });

  test('should edit an item', async ({ page }) => {
    // Add item
    await page.getByRole('button', { name: /Add Item/i }).click();
    await page.getByLabel('Item name').fill('Cheese');
    await page.getByLabel('Quantity').fill('1');
    await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Cheese')).toBeVisible({ timeout: 5000 });

    // Edit the item
    await page.getByRole('button', { name: 'Edit' }).first().click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Edit Item')).toBeVisible();
    await page.getByLabel('Item name').fill('Gouda cheese');
    await dialog.getByRole('button', { name: 'Save' }).click();

    // Updated name visible
    await expect(page.getByText('Gouda cheese')).toBeVisible({ timeout: 5000 });
  });

  test('should delete an item', async ({ page }) => {
    // Add item
    await page.getByRole('button', { name: /Add Item/i }).click();
    await page.getByLabel('Item name').fill('Butter');
    await page.getByLabel('Quantity').fill('1');
    await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Butter')).toBeVisible({ timeout: 5000 });

    // Delete the item
    await page.getByRole('button', { name: 'Delete' }).first().click();

    // Confirm deletion
    const confirmDialog = page.getByRole('dialog');
    await expect(confirmDialog.getByText('Confirm Delete')).toBeVisible();
    await confirmDialog.getByRole('button', { name: 'Delete' }).click();

    // Item removed
    await expect(page.getByText('Butter')).not.toBeVisible({ timeout: 5000 });
  });

  test('should open item detail panel', async ({ page }) => {
    // Add item
    await page.getByRole('button', { name: /Add Item/i }).click();
    await page.getByLabel('Item name').fill('Rice');
    await page.getByLabel('Quantity').fill('3');
    await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Rice')).toBeVisible({ timeout: 5000 });

    // Click comment button to open detail panel
    await page.getByRole('button', { name: /comment/i }).first().click();

    // Detail panel opens with comment thread
    const panel = page.getByRole('dialog', { name: /Rice/i });
    await expect(panel).toBeVisible({ timeout: 3000 });
    await expect(panel.getByText('💬 Comments')).toBeVisible();

    // Close panel
    await panel.getByRole('button', { name: 'Close' }).click();
    await expect(panel).not.toBeVisible();
  });
});
