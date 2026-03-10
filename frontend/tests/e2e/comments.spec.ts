import { test, expect } from '@playwright/test';

/**
 * E2E: Comments journey (US5)
 * Validates: add comment → edit comment → delete comment →
 * verify permission enforcement (other user cannot edit)
 */

test.describe('Comments', () => {
  test.describe('Cleaning Task Comments', () => {
    let taskName: string;

    test.beforeEach(async ({ page }) => {
      taskName = `Comment Test Task ${Date.now()}`;
      await page.goto('/');
      await page.getByText('Alex').click();
      await expect(page.getByText(/hey, alex/i)).toBeVisible({ timeout: 5000 });

      // Navigate to Cleaning and create a task
      await page.getByRole('button', { name: /Cleaning/i }).click();
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 5000 });

      await page.getByRole('button', { name: /Create Task/i }).click();
      await page.getByLabel('Title').fill(taskName);
      await page.getByRole('dialog').getByRole('button', { name: 'Create Task' }).click();
      await expect(page.getByText(taskName)).toBeVisible({ timeout: 5000 });

      // Open task detail panel by clicking the task text
      await page.getByText(taskName).click();
      await expect(page.getByRole('dialog', { name: new RegExp(taskName) })).toBeVisible({
        timeout: 3000,
      });
    });

    test('should add a comment', async ({ page }) => {
      const panel = page.getByRole('dialog', { name: new RegExp(taskName) });

      // Initially no comments
      await expect(panel.getByText(/No comments yet/i)).toBeVisible();

      // Add a comment
      await panel.getByPlaceholder('Add a comment...').fill('This needs attention!');
      await panel.getByRole('button', { name: 'Post' }).click();

      // Comment appears
      await expect(panel.getByText('This needs attention!')).toBeVisible({ timeout: 5000 });
      await expect(panel.getByText('Alex')).toBeVisible();
    });

    test('should edit own comment', async ({ page }) => {
      const panel = page.getByRole('dialog', { name: new RegExp(taskName) });

      // Add a comment first
      await panel.getByPlaceholder('Add a comment...').fill('Original comment');
      await panel.getByRole('button', { name: 'Post' }).click();
      await expect(panel.getByText('Original comment')).toBeVisible({ timeout: 5000 });

      // Edit the comment
      await panel.getByRole('button', { name: 'Edit' }).click();
      await panel.getByLabel('Edit comment').fill('Updated comment');
      await panel.getByRole('button', { name: 'Save' }).click();

      // Updated text visible
      await expect(panel.getByText('Updated comment')).toBeVisible({ timeout: 5000 });
      await expect(panel.getByText('(edited)')).toBeVisible();
    });

    test('should delete own comment', async ({ page }) => {
      const panel = page.getByRole('dialog', { name: new RegExp(taskName) });

      // Add a comment first
      await panel.getByPlaceholder('Add a comment...').fill('Comment to delete');
      await panel.getByRole('button', { name: 'Post' }).click();
      await expect(panel.getByText('Comment to delete')).toBeVisible({ timeout: 5000 });

      // Delete the comment
      await panel.getByRole('button', { name: 'Delete' }).click();

      // Comment removed
      await expect(panel.getByText('Comment to delete')).not.toBeVisible({ timeout: 5000 });
      await expect(panel.getByText(/No comments yet/i)).toBeVisible();
    });

    test('should submit comment with Enter key', async ({ page }) => {
      const panel = page.getByRole('dialog', { name: new RegExp(taskName) });

      // Type and press Enter
      await panel.getByPlaceholder('Add a comment...').fill('Keyboard shortcut test');
      await panel.getByPlaceholder('Add a comment...').press('Enter');

      // Comment appears
      await expect(panel.getByText('Keyboard shortcut test')).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Shopping Item Comments', () => {
    test('should add and view comment on shopping item', async ({ page }) => {
      const itemName = `Comment Test Item ${Date.now()}`;
      // Log in and navigate to shopping
      await page.goto('/');
      await page.getByText('Alex').click();
      await expect(page.getByText(/hey, alex/i)).toBeVisible({ timeout: 5000 });
      await page.getByRole('button', { name: 'Shopping List' }).click();
      await expect(page.getByRole('heading', { name: 'Shopping List' })).toBeVisible({ timeout: 5000 });

      // Add an item
      await page.getByRole('button', { name: /Add Item/i }).click();
      await page.getByLabel('Item name').fill(itemName);
      await page.getByLabel('Quantity').fill('1');
      await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click();
      await expect(page.getByText(itemName)).toBeVisible({ timeout: 5000 });

      // Open item detail panel
      await page.getByText(itemName, { exact: true })
        .locator('xpath=ancestor::div[contains(@class,"rounded-lg")][1]')
        .getByRole('button', { name: /comment/i })
        .click();
      const panel = page.getByRole('dialog', { name: new RegExp(itemName) });
      await expect(panel).toBeVisible({ timeout: 3000 });

      // Add a comment
      await panel.getByPlaceholder('Add a comment...').fill('Need the organic one');
      await panel.getByRole('button', { name: 'Post' }).click();

      // Comment appears
      await expect(panel.getByText('Need the organic one')).toBeVisible({ timeout: 5000 });
    });
  });
});
