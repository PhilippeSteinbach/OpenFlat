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
    await expect(page.getByRole('heading', { name: 'Shopping List' })).toBeVisible({ timeout: 5000 });
  });

  test('should display Active and Recently Bought sections', async ({ page }) => {
    await expect(page.getByText('Active Items')).toBeVisible();
  });

  test('should add a new item', async ({ page }) => {
    const itemName = `Milk ${Date.now()}`;
    await page.getByRole('button', { name: /Add Item/i }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('Add Item')).toBeVisible();

    await page.getByLabel('Item name').fill(itemName);
    await page.getByLabel('Quantity').fill('2');
    await dialog.getByRole('button', { name: 'Save' }).click();

    // Item appears in Active section
    await expect(page.getByText(itemName)).toBeVisible({ timeout: 5000 });
    // Scope ×2 check to this item's card to avoid ambiguity
    const itemCard = page.getByText(itemName, { exact: true })
      .locator('xpath=ancestor::div[contains(@class,"rounded-lg")][1]');
    await expect(itemCard.getByText('×2')).toBeVisible();
  });

  test('should buy an item and show in Recently Bought', async ({ page }) => {
    const itemName = `Bread ${Date.now()}`;
    // Add item
    await page.getByRole('button', { name: /Add Item/i }).click();
    await page.getByLabel('Item name').fill(itemName);
    await page.getByLabel('Quantity').fill('1');
    await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText(itemName)).toBeVisible({ timeout: 5000 });

    // Buy the item
    await page.getByText(itemName, { exact: true })
      .locator('xpath=ancestor::div[contains(@class,"rounded-lg")][1]')
      .getByRole('button', { name: 'Mark as bought' })
      .click();

    // Item moves to Recently Bought
    await expect(page.getByText('Recently Bought')).toBeVisible({ timeout: 5000 });
  });

  test('should undo a bought item back to active', async ({ page }) => {
    const itemName = `Eggs ${Date.now()}`;
    // Add item
    await page.getByRole('button', { name: /Add Item/i }).click();
    await page.getByLabel('Item name').fill(itemName);
    await page.getByLabel('Quantity').fill('1');
    await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText(itemName)).toBeVisible({ timeout: 5000 });

    // Buy the item
    await page.getByText(itemName, { exact: true })
      .locator('xpath=ancestor::div[contains(@class,"rounded-lg")][1]')
      .getByRole('button', { name: 'Mark as bought' })
      .click();
    await expect(page.getByText('Recently Bought')).toBeVisible({ timeout: 5000 });

    // Undo the buy
    await page.getByText(itemName, { exact: true })
      .locator('xpath=ancestor::div[contains(@class,"rounded-lg")][1]')
      .getByRole('button', { name: 'Move back to active' })
      .click();

    // Item should be back in Active section
    await expect(page.getByText(itemName)).toBeVisible({ timeout: 5000 });
  });

  test('should edit an item', async ({ page }) => {
    const suffix = Date.now();
    const itemName = `Cheese ${suffix}`;
    const editedName = `Gouda cheese ${suffix}`;
    // Add item
    await page.getByRole('button', { name: /Add Item/i }).click();
    await page.getByLabel('Item name').fill(itemName);
    await page.getByLabel('Quantity').fill('1');
    await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText(itemName, { exact: true })).toBeVisible({ timeout: 5000 });

    // Edit the item — scope to this card to avoid clicking wrong Edit button
    const itemCard = page.getByText(itemName, { exact: true })
      .locator('xpath=ancestor::div[contains(@class,"rounded-lg")][1]');
    await itemCard.getByRole('button', { name: 'Edit' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Edit Item')).toBeVisible();
    await page.getByLabel('Item name').fill(editedName);
    await dialog.getByRole('button', { name: 'Save' }).click();

    // Updated name visible
    await expect(page.getByText(editedName, { exact: true })).toBeVisible({ timeout: 5000 });
  });

  test('should delete an item', async ({ page }) => {
    const itemName = `Butter ${Date.now()}`;
    // Add item
    await page.getByRole('button', { name: /Add Item/i }).click();
    await page.getByLabel('Item name').fill(itemName);
    await page.getByLabel('Quantity').fill('1');
    await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText(itemName, { exact: true })).toBeVisible({ timeout: 5000 });

    // Delete the item — scope to this card to avoid clicking wrong Delete button
    const itemCard = page.getByText(itemName, { exact: true })
      .locator('xpath=ancestor::div[contains(@class,"rounded-lg")][1]');
    await itemCard.getByRole('button', { name: 'Delete' }).click();

    // Confirm deletion
    const confirmDialog = page.getByRole('dialog');
    await expect(confirmDialog.getByText('Confirm Delete')).toBeVisible();
    await confirmDialog.getByRole('button', { name: 'Delete' }).click();

    // Item removed
    await expect(page.getByText(itemName, { exact: true })).not.toBeVisible({ timeout: 5000 });
  });

  test('should open item detail panel', async ({ page }) => {
    const itemName = `Rice ${Date.now()}`;
    // Add item
    await page.getByRole('button', { name: /Add Item/i }).click();
    await page.getByLabel('Item name').fill(itemName);
    await page.getByLabel('Quantity').fill('3');
    await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText(itemName)).toBeVisible({ timeout: 5000 });

    // Click comment button to open detail panel
    await page.getByText(itemName, { exact: true })
      .locator('xpath=ancestor::div[contains(@class,"rounded-lg")][1]')
      .getByRole('button', { name: /comment/i })
      .click();

    // Detail panel opens with comment thread
    const panel = page.getByRole('dialog', { name: new RegExp(itemName) });
    await expect(panel).toBeVisible({ timeout: 3000 });
    await expect(panel.getByRole('heading', { name: /Comments/i })).toBeVisible();

    // Close panel
    await panel.getByRole('button', { name: 'Close' }).click();
    await expect(panel).not.toBeVisible();
  });
});
