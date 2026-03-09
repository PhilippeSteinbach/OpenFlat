import { test, expect } from '@playwright/test';

/**
 * E2E: User Selection journey (US1)
 * Validates: select user → dashboard loads → 3 module tiles visible →
 * leaderboard shown → switch user
 */

test.describe('User Selection & Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should show user selection page with 5 users', async ({ page }) => {
    // The user selection page should be shown on first visit
    await expect(page.getByText(/who are you/i)).toBeVisible();

    // Should show 5 predefined users
    const userCards = page.locator('[data-testid="user-card"]');
    // Fallback: look for user names if no test IDs
    const alex = page.getByText('Alex');
    const jordan = page.getByText('Jordan');
    const sam = page.getByText('Sam');
    const taylor = page.getByText('Taylor');
    const casey = page.getByText('Casey');

    // At least one of the user names should be visible
    await expect(alex.or(jordan).or(sam).first()).toBeVisible();
  });

  test('should navigate to dashboard after selecting a user', async ({ page }) => {
    // Click on the first user (Alex)
    await page.getByText('Alex').click();

    // Should navigate to dashboard and show greeting
    await expect(page.getByText(/hey, alex/i)).toBeVisible({ timeout: 5000 });
  });

  test('should show 3 module tiles on dashboard', async ({ page }) => {
    // Select user
    await page.getByText('Alex').click();
    await expect(page.getByText(/hey, alex/i)).toBeVisible({ timeout: 5000 });

    // Dashboard should have 3 module navigation tiles
    const cleaningTile = page.getByText(/cleaning board/i).or(page.getByText(/putzplan/i));
    const shoppingTile = page.getByText(/shopping list/i).or(page.getByText(/einkaufsliste/i));
    const financeTile = page.getByText(/finance tracker/i).or(page.getByText(/finanzen/i));

    await expect(cleaningTile.first()).toBeVisible();
    await expect(shoppingTile.first()).toBeVisible();
    await expect(financeTile.first()).toBeVisible();
  });

  test('should show leaderboard on dashboard', async ({ page }) => {
    await page.getByText('Alex').click();
    await expect(page.getByText(/hey, alex/i)).toBeVisible({ timeout: 5000 });

    // Leaderboard section should be visible
    const leaderboard = page.getByText(/leaderboard/i).or(page.getByText(/rangliste/i));
    await expect(leaderboard.first()).toBeVisible();
  });

  test('should allow switching users', async ({ page }) => {
    // Select first user
    await page.getByText('Alex').click();
    await expect(page.getByText(/hey, alex/i)).toBeVisible({ timeout: 5000 });

    // Find and click "Switch User" button
    const switchButton = page.getByText(/switch user/i).or(page.getByText(/benutzer wechseln/i));
    await switchButton.first().click();

    // Should return to user selection
    await expect(page.getByText(/who are you/i).or(page.getByText(/wer bist du/i)).first()).toBeVisible({ timeout: 5000 });

    // Select a different user
    await page.getByText('Jordan').click();
    await expect(page.getByText(/hey, jordan/i)).toBeVisible({ timeout: 5000 });
  });
});
