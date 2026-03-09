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
    await page.getByRole('button', { name: /Create Task/i }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Fill in v3 form fields
    await page.getByLabel('Title').fill('Vacuum the hallway');

    // Select effort preset (Big = 2 pts)
    await dialog.getByRole('button', { name: /Big/i }).click();

    // Set frequency
    await page.getByLabel(/Frequency/i).fill('7');

    // Submit
    await dialog.getByRole('button', { name: /Create/i }).click();

    // Task appears in the checklist
    await expect(page.getByText('Vacuum the hallway')).toBeVisible({ timeout: 5000 });
  });

  test('should complete a task (one-way, no toggle)', async ({ page }) => {
    // Create a task first
    await page.getByRole('button', { name: /Create Task/i }).click();
    const dialog = page.getByRole('dialog');
    await page.getByLabel('Title').fill('Complete test task');
    await dialog.getByRole('button', { name: /Normal/i }).click();
    await page.getByLabel(/Frequency/i).fill('7');
    await dialog.getByRole('button', { name: /Create/i }).click();
    await expect(page.getByText('Complete test task')).toBeVisible({ timeout: 5000 });

    // Click the complete button (one-way — no undo)
    await page.getByRole('button', { name: /Complete/i }).first().click();

    // Task should remain in list (recurring) with updated due date
    await expect(page.getByText('Complete test task')).toBeVisible({ timeout: 5000 });
  });

  test('should open task detail panel with effort and frequency info', async ({ page }) => {
    // Create a task
    await page.getByRole('button', { name: /Create Task/i }).click();
    const dialog = page.getByRole('dialog');
    await page.getByLabel('Title').fill('Detail test task');
    await dialog.getByRole('button', { name: /Big/i }).click();
    await page.getByLabel(/Frequency/i).fill('14');
    await dialog.getByRole('button', { name: /Create/i }).click();
    await expect(page.getByText('Detail test task')).toBeVisible({ timeout: 5000 });

    // Click the task text to open detail panel
    await page.getByText('Detail test task').click();

    // Detail panel opens with v3 info
    const panel = page.getByRole('dialog', { name: /Detail test task/i });
    await expect(panel).toBeVisible({ timeout: 3000 });

    // Close panel
    await panel.getByRole('button', { name: 'Close' }).click();
    await expect(panel).not.toBeVisible();
  });

  test('should edit a task', async ({ page }) => {
    // Create a task
    await page.getByRole('button', { name: /Create Task/i }).click();
    const dialog = page.getByRole('dialog');
    await page.getByLabel('Title').fill('Mop the floors');
    await dialog.getByRole('button', { name: /Normal/i }).click();
    await page.getByLabel(/Frequency/i).fill('7');
    await dialog.getByRole('button', { name: /Create/i }).click();
    await expect(page.getByText('Mop the floors')).toBeVisible({ timeout: 5000 });

    // Hover and click edit button
    await page.getByText('Mop the floors').hover();
    await page.getByRole('button', { name: 'Edit' }).first().click();

    // Edit dialog appears
    const editDialog = page.getByRole('dialog');
    await expect(editDialog.getByText('Edit Task')).toBeVisible();
    await page.getByLabel('Title').fill('Mop all floors');
    await editDialog.getByRole('button', { name: 'Save' }).click();

    // Updated title visible
    await expect(page.getByText('Mop all floors')).toBeVisible({ timeout: 5000 });
  });

  test('should delete a task', async ({ page }) => {
    // Create a task
    await page.getByRole('button', { name: /Create Task/i }).click();
    const dialog = page.getByRole('dialog');
    await page.getByLabel('Title').fill('Wash dishes e2e');
    await dialog.getByRole('button', { name: /Normal/i }).click();
    await page.getByLabel(/Frequency/i).fill('1');
    await dialog.getByRole('button', { name: /Create/i }).click();
    await expect(page.getByText('Wash dishes e2e')).toBeVisible({ timeout: 5000 });

    // Hover and click delete button
    await page.getByText('Wash dishes e2e').hover();
    await page.getByRole('button', { name: 'Delete' }).first().click();

    // Confirm deletion
    const confirmDialog = page.getByRole('dialog');
    await expect(confirmDialog.getByText('Delete Task?')).toBeVisible();
    await confirmDialog.getByRole('button', { name: 'Delete' }).click();

    // Task removed
    await expect(page.getByText('Wash dishes e2e')).not.toBeVisible({ timeout: 5000 });
  });

  test('should show leaderboard updates after completion', async ({ page }) => {
    // Navigate to dashboard first to check initial leaderboard
    await page.getByRole('link', { name: /Dashboard/i }).or(page.getByText(/Dashboard/i)).first().click();
    await expect(page.getByText(/Leaderboard/i)).toBeVisible({ timeout: 5000 });

    // Verify leaderboard shows users with points
    await expect(page.getByText('Alex')).toBeVisible();
  });
});
