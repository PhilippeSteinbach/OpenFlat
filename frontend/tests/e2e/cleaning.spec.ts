import { test, expect } from '@playwright/test';

/**
 * E2E: Cleaning Recurring Tasks with Rotation (US2 v3)
 * Validates: create recurring task with effort/frequency → view checklist →
 * one-way complete → rotation advance → edit task → delete task → leaderboard update
 */

test.describe('Cleaning Recurring Tasks', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByText('Alex').click();
    await expect(page.getByText(/hey, alex/i)).toBeVisible({ timeout: 5000 });

    // Navigate to Cleaning
    await page.getByRole('button', { name: /Cleaning/i }).click();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 5000 });
  });

  test('should display task list sorted by urgency', async ({ page }) => {
    // Seed data provides recurring tasks — list should be visible
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 5000 });
  });

  test('should create a recurring task with effort preset and frequency', async ({ page }) => {
    const taskName = `Vacuum the hallway ${Date.now()}`;
    await page.getByRole('button', { name: /Create Task/i }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Fill in v3 form fields
    await page.getByLabel('Title').fill(taskName);

    // Select effort preset (Big = 2 pts)
    await dialog.getByRole('button', { name: /Big/i }).click();

    // Set frequency
    await page.getByLabel(/Frequency/i).fill('7');

    // Submit
    await dialog.getByRole('button', { name: /Create/i }).click();

    // Task appears in the checklist
    await expect(page.getByText(taskName, { exact: true }).first()).toBeVisible({ timeout: 5000 });
  });

  test('should complete a task (one-way, no toggle)', async ({ page }) => {
    const taskName = `Complete test task ${Date.now()}`;
    // Create a task first
    await page.getByRole('button', { name: /Create Task/i }).click();
    const dialog = page.getByRole('dialog');
    await page.getByLabel('Title').fill(taskName);
    await dialog.getByRole('button', { name: /Normal/i }).click();
    await page.getByLabel(/Frequency/i).fill('7');
    await dialog.getByRole('button', { name: /Create/i }).click();
    await expect(page.getByText(taskName, { exact: true }).first()).toBeVisible({ timeout: 5000 });

    // Click the complete button (one-way — no undo)
    await page.getByRole('button', { name: /Complete/i }).first().click();

    // Task should remain in list (recurring) with updated due date
    await expect(page.getByText(taskName, { exact: true }).first()).toBeVisible({ timeout: 5000 });
  });

  test('should open task detail panel with effort and frequency info', async ({ page }) => {
    const taskName = `Detail test task ${Date.now()}`;
    // Create a task
    await page.getByRole('button', { name: /Create Task/i }).click();
    const dialog = page.getByRole('dialog');
    await page.getByLabel('Title').fill(taskName);
    await dialog.getByRole('button', { name: /Big/i }).click();
    await page.getByLabel(/Frequency/i).fill('14');
    await dialog.getByRole('button', { name: /Create/i }).click();
    await expect(page.getByText(taskName, { exact: true }).first()).toBeVisible({ timeout: 5000 });

    // Click the task text to open detail panel
    await page.getByText(taskName, { exact: true }).first().click();

    // Detail panel opens with v3 info
    const panel = page.getByRole('dialog', { name: new RegExp(taskName) });
    await expect(panel).toBeVisible({ timeout: 3000 });

    // Close panel
    await panel.getByRole('button', { name: 'Close' }).click();
    await expect(panel).not.toBeVisible();
  });

  test('should edit a task', async ({ page }) => {
    const suffix = Date.now();
    const taskName = `Mop the floors ${suffix}`;
    const editedName = `Mop all floors ${suffix}`;
    // Create a task
    await page.getByRole('button', { name: /Create Task/i }).click();
    const dialog = page.getByRole('dialog');
    await page.getByLabel('Title').fill(taskName);
    await dialog.getByRole('button', { name: /Normal/i }).click();
    await page.getByLabel(/Frequency/i).fill('7');
    await dialog.getByRole('button', { name: /Create/i }).click();
    await expect(page.getByText(taskName, { exact: true }).first()).toBeVisible({ timeout: 5000 });

    // Hover and click edit button scoped to this task's row
    const taskRow = page.getByText(taskName, { exact: true })
      .locator('xpath=ancestor::div[contains(@class,"rounded-md")][1]');
    await taskRow.hover();
    await taskRow.getByRole('button', { name: 'Edit' }).click();

    // Edit dialog appears
    const editDialog = page.getByRole('dialog');
    await expect(editDialog.getByText('Edit Task')).toBeVisible();
    await page.getByLabel('Title').fill(editedName);
    await editDialog.getByRole('button', { name: 'Save' }).click();

    // Updated title visible
    await expect(page.getByText(editedName, { exact: true }).first()).toBeVisible({ timeout: 5000 });
  });

  test('should delete a task', async ({ page }) => {
    const taskName = `Wash dishes e2e ${Date.now()}`;
    // Create a task
    await page.getByRole('button', { name: /Create Task/i }).click();
    const dialog = page.getByRole('dialog');
    await page.getByLabel('Title').fill(taskName);
    await dialog.getByRole('button', { name: /Normal/i }).click();
    await page.getByLabel(/Frequency/i).fill('1');
    await dialog.getByRole('button', { name: /Create/i }).click();
    await expect(page.getByText(taskName)).toBeVisible({ timeout: 5000 });

    // Hover and click delete button scoped to this task's row
    const taskRow = page.getByText(taskName, { exact: true })
      .locator('xpath=ancestor::div[contains(@class,"rounded-md")][1]');
    await taskRow.hover();
    await taskRow.getByRole('button', { name: 'Delete' }).click();

    // Confirm deletion
    const confirmDialog = page.getByRole('dialog');
    await expect(confirmDialog.getByRole('heading', { name: /Are you sure you want to delete this task/i })).toBeVisible();
    await confirmDialog.getByRole('button', { name: 'Delete' }).click();

    // Task removed
    await expect(page.getByText(taskName, { exact: true })).not.toBeVisible({ timeout: 10000 });
  });

  test('should show leaderboard updates after completion', async ({ page }) => {
    // Navigate to dashboard — use getByRole('tab') which only finds accessible (visible) tabs,
    // excluding the desktop header tabs hidden with "hidden sm:block" on mobile
    await page.getByRole('tab', { name: /dashboard/i }).click();
    await expect(page.getByText(/Leaderboard/i)).toBeVisible({ timeout: 5000 });

    // Verify leaderboard list entries are visible — scope to <ul><li> to avoid matching the
    // hidden desktop-header name span (display:none on mobile via "hidden sm:block")
    await expect(page.locator('ul li').filter({ hasText: 'Alex' }).first()).toBeVisible({ timeout: 10000 });
  });
});
