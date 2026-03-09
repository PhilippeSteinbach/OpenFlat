import { test, expect } from '@playwright/test';

/**
 * E2E: Cleaning Board journey (US2)
 * Validates: create task → view Kanban board → open detail panel →
 * edit task → delete task
 */

test.describe('Cleaning Board', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByText('Alex').click();
    await expect(page.getByText(/hey, alex/i)).toBeVisible({ timeout: 5000 });

    // Navigate to Cleaning Board
    await page.getByRole('button', { name: 'Cleaning Board' }).click();
    await expect(page.getByText('🧹 Cleaning Board')).toBeVisible({ timeout: 5000 });
  });

  test('should display Kanban columns', async ({ page }) => {
    await expect(page.getByText('TO DO')).toBeVisible();
    await expect(page.getByText('IN PROGRESS')).toBeVisible();
    await expect(page.getByText('AWAITING REVIEW')).toBeVisible();
    await expect(page.getByText('DONE')).toBeVisible();
  });

  test('should create a new task', async ({ page }) => {
    await page.getByRole('button', { name: /Create Task/i }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('Create Task')).toBeVisible();

    await page.getByLabel('Title').fill('Clean the kitchen');
    await page.getByLabel('Points').fill('15');
    await dialog.getByRole('button', { name: 'Create Task' }).click();

    // Task appears in TO DO column
    await expect(page.getByText('Clean the kitchen')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('15 pts')).toBeVisible();
  });

  test('should open task detail panel', async ({ page }) => {
    // Create a task first
    await page.getByRole('button', { name: /Create Task/i }).click();
    await page.getByLabel('Title').fill('Vacuum living room');
    await page.getByLabel('Points').fill('10');
    await page.getByRole('dialog').getByRole('button', { name: 'Create Task' }).click();
    await expect(page.getByText('Vacuum living room')).toBeVisible({ timeout: 5000 });

    // Click the comment button to open detail panel
    const taskCard = page.getByRole('article', { name: /Vacuum living room/ });
    await taskCard.getByRole('button', { name: /comment/i }).click();

    // Detail panel opens
    const panel = page.getByRole('dialog', { name: /Vacuum living room/i });
    await expect(panel).toBeVisible({ timeout: 3000 });
    await expect(panel.getByText('💬 Comments')).toBeVisible();

    // Close panel
    await panel.getByRole('button', { name: 'Close' }).click();
    await expect(panel).not.toBeVisible();
  });

  test('should edit a task', async ({ page }) => {
    // Create a task
    await page.getByRole('button', { name: /Create Task/i }).click();
    await page.getByLabel('Title').fill('Mop the floors');
    await page.getByLabel('Points').fill('8');
    await page.getByRole('dialog').getByRole('button', { name: 'Create Task' }).click();
    await expect(page.getByText('Mop the floors')).toBeVisible({ timeout: 5000 });

    // Click edit on the task card
    const taskCard = page.getByRole('article', { name: /Mop the floors/ });
    await taskCard.getByRole('button', { name: 'Edit' }).click();

    // Edit dialog appears
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Edit Task')).toBeVisible();
    await page.getByLabel('Title').fill('Mop all floors');
    await dialog.getByRole('button', { name: 'Save' }).click();

    // Updated title visible
    await expect(page.getByText('Mop all floors')).toBeVisible({ timeout: 5000 });
  });

  test('should delete a task', async ({ page }) => {
    // Create a task
    await page.getByRole('button', { name: /Create Task/i }).click();
    await page.getByLabel('Title').fill('Wash dishes');
    await page.getByLabel('Points').fill('5');
    await page.getByRole('dialog').getByRole('button', { name: 'Create Task' }).click();
    await expect(page.getByText('Wash dishes')).toBeVisible({ timeout: 5000 });

    // Click delete on the task card
    const taskCard = page.getByRole('article', { name: /Wash dishes/ });
    await taskCard.getByRole('button', { name: 'Delete' }).click();

    // Confirm deletion
    const confirmDialog = page.getByRole('dialog');
    await expect(confirmDialog.getByText('Delete Task?')).toBeVisible();
    await confirmDialog.getByRole('button', { name: 'Delete' }).click();

    // Task removed from board
    await expect(page.getByText('Wash dishes')).not.toBeVisible({ timeout: 5000 });
  });

  test('should assign a task', async ({ page }) => {
    // Create a task
    await page.getByRole('button', { name: /Create Task/i }).click();
    await page.getByLabel('Title').fill('Take out trash');
    await page.getByLabel('Points').fill('3');
    await page.getByRole('dialog').getByRole('button', { name: 'Create Task' }).click();
    await expect(page.getByText('Take out trash')).toBeVisible({ timeout: 5000 });

    // Task should show "Unassigned"
    const taskCard = page.getByRole('article', { name: /Take out trash/ });
    await expect(taskCard.getByText('Unassigned')).toBeVisible();

    // Click to assign
    await taskCard.getByRole('button', { name: /Assign/i }).click();

    // Assign dialog appears
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Assign Task')).toBeVisible();
    await dialog.getByText('Jordan').click();

    // Verify task shows Jordan as assignee
    await expect(taskCard.getByText('Jordan')).toBeVisible({ timeout: 5000 });
  });
});
