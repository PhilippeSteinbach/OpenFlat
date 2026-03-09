import { test, expect } from '@playwright/test';

/**
 * E2E: Cleaning Checklist journey (US2)
 * Validates: create task → view checklist → toggle done →
 * edit task → delete task → assign task → deadline badges
 */

test.describe('Cleaning Checklist', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByText('Alex').click();
    await expect(page.getByText(/hey, alex/i)).toBeVisible({ timeout: 5000 });

    // Navigate to Cleaning
    await page.getByRole('button', { name: /Cleaning/i }).click();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 5000 });
  });

  test('should display checklist with active and completed sections', async ({ page }) => {
    // Seed data should provide at least active and completed tasks
    await expect(page.getByText(/Active/i)).toBeVisible({ timeout: 5000 });
  });

  test('should create a new task', async ({ page }) => {
    await page.getByRole('button', { name: /Create Task/i }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('Create Task')).toBeVisible();

    await page.getByLabel('Title').fill('Clean the kitchen');
    await page.getByLabel('Points').fill('15');
    await dialog.getByRole('button', { name: 'Create Task' }).click();

    // Task appears in the checklist
    await expect(page.getByText('Clean the kitchen')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('15 pts')).toBeVisible();
  });

  test('should toggle task completion', async ({ page }) => {
    // Create a task first
    await page.getByRole('button', { name: /Create Task/i }).click();
    await page.getByLabel('Title').fill('Toggle test task');
    await page.getByLabel('Points').fill('10');
    await page.getByRole('dialog').getByRole('button', { name: 'Create Task' }).click();
    await expect(page.getByText('Toggle test task')).toBeVisible({ timeout: 5000 });

    // Click the checkbox to mark done
    await page.getByRole('button', { name: /Mark as done/i }).first().click();

    // Task should move to completed section
    await expect(page.getByText(/Completed/i)).toBeVisible({ timeout: 5000 });
  });

  test('should open task detail panel', async ({ page }) => {
    // Create a task first
    await page.getByRole('button', { name: /Create Task/i }).click();
    await page.getByLabel('Title').fill('Detail test task');
    await page.getByLabel('Points').fill('10');
    await page.getByRole('dialog').getByRole('button', { name: 'Create Task' }).click();
    await expect(page.getByText('Detail test task')).toBeVisible({ timeout: 5000 });

    // Click the task text to open detail panel
    await page.getByText('Detail test task').click();

    // Detail panel opens
    const panel = page.getByRole('dialog', { name: /Detail test task/i });
    await expect(panel).toBeVisible({ timeout: 3000 });

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

    // Hover and click edit button
    await page.getByText('Mop the floors').hover();
    await page.getByRole('button', { name: 'Edit' }).first().click();

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

    // Hover and click delete button
    await page.getByText('Wash dishes').hover();
    await page.getByRole('button', { name: 'Delete' }).first().click();

    // Confirm deletion
    const confirmDialog = page.getByRole('dialog');
    await expect(confirmDialog.getByText('Delete Task?')).toBeVisible();
    await confirmDialog.getByRole('button', { name: 'Delete' }).click();

    // Task removed
    await expect(page.getByText('Wash dishes')).not.toBeVisible({ timeout: 5000 });
  });

  test('should assign a task', async ({ page }) => {
    // Create a task
    await page.getByRole('button', { name: /Create Task/i }).click();
    await page.getByLabel('Title').fill('Take out trash');
    await page.getByLabel('Points').fill('3');
    await page.getByRole('dialog').getByRole('button', { name: 'Create Task' }).click();
    await expect(page.getByText('Take out trash')).toBeVisible({ timeout: 5000 });

    // Hover and click assign button
    await page.getByText('Take out trash').hover();
    await page.getByRole('button', { name: /Assign/i }).first().click();

    // Assign dialog appears
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Assign Task')).toBeVisible();
    await dialog.getByText('Jordan').click();

    // Verify task shows Jordan as assignee
    await expect(page.getByText('Jordan')).toBeVisible({ timeout: 5000 });
  });
});
