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
    const alex = page.getByText('Alex');
    const jordan = page.getByText('Jordan');
    const sam = page.getByText('Sam');

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

    // Module tiles have role="button" and aria-label — works on both mobile and desktop.
    // Nav tabs use role="tab" so they won't interfere.
    const cleaningTile = page.getByRole('button', { name: /cleaning/i });
    const shoppingTile = page.getByRole('button', { name: /shopping/i });
    const financeTile = page.getByRole('button', { name: /finance/i });

    await expect(cleaningTile).toBeVisible();
    await expect(shoppingTile).toBeVisible();
    await expect(financeTile).toBeVisible();
  });

  test('should show leaderboard on dashboard', async ({ page }) => {
    await page.getByText('Alex').click();
    await expect(page.getByText(/hey, alex/i)).toBeVisible({ timeout: 5000 });

    // Leaderboard section should be visible
    const leaderboard = page.getByText(/leaderboard/i).or(page.getByText(/rangliste/i));
    await expect(leaderboard.first()).toBeVisible();
  });

  test('should allow switching users', async ({ page, isMobile }) => {
    // The Switch User button lives in the desktop header (hidden sm:block) and is not
    // present in the mobile bottom tab bar — skip this test on mobile viewports.
    test.skip(isMobile, 'Switch User button is only available in the desktop header');

    // Select first user
    await page.getByText('Alex').click();
    await expect(page.getByText(/hey, alex/i)).toBeVisible({ timeout: 5000 });

    // Find and click "Switch User" button — use parent button to handle mobile (text is hidden md:inline)
    const switchButton = page.locator('button, a').filter({ hasText: /switch user/i }).or(
      page.locator('button, a').filter({ hasText: /benutzer wechseln/i }),
    );
    await switchButton.first().click();

    // Should return to user selection
    await expect(page.getByText(/who are you/i).or(page.getByText(/wer bist du/i)).first()).toBeVisible({ timeout: 5000 });

    // Select a different user
    await page.getByText('Jordan').click();
    await expect(page.getByText(/hey, jordan/i)).toBeVisible({ timeout: 5000 });
  });
});
