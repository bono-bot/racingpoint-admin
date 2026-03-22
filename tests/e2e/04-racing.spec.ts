import { test, expect } from '@playwright/test';
import { navigateAndWait } from './helpers';

/**
 * Racing Section E2E Tests
 * Pages: Leaderboard, Tournaments, Kiosk Control
 */

test.describe('Leaderboard Page', () => {
  test('renders leaderboard', async ({ page }) => {
    await navigateAndWait(page, '/leaderboard');
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: 'test-results/screenshots/leaderboard-page.png', fullPage: true });
  });
});

test.describe('Tournaments Page', () => {
  test('renders tournament list', async ({ page }) => {
    await navigateAndWait(page, '/tournaments');
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: 'test-results/screenshots/tournaments-page.png', fullPage: true });
  });

  test('+ New Tournament button toggles form', async ({ page }) => {
    await navigateAndWait(page, '/tournaments');
    const addBtn = page.locator('button', { hasText: /New Tournament|\+ New/ });
    if (await addBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await addBtn.click({ force: true });
      await page.waitForTimeout(500);
      await page.screenshot({ path: 'test-results/screenshots/tournaments-add-form.png', fullPage: true });

      const nameInput = page.locator('input').first();
      if (await nameInput.isVisible()) {
        await nameInput.fill('TEST_ONLY_Tournament');
      }
      // Cancel — button text changed from "+ New Tournament" to "Cancel"
      const cancelBtn = page.locator('button', { hasText: /Cancel/ });
      if (await cancelBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await cancelBtn.click({ force: true });
      }
    }
  });

  test('generate bracket button visibility', async ({ page }) => {
    await navigateAndWait(page, '/tournaments');
    const bracketBtn = page.locator('button', { hasText: /Generate Bracket|View Matches/ });
    const visible = await bracketBtn.first().isVisible({ timeout: 3000 }).catch(() => false);
    await page.screenshot({ path: 'test-results/screenshots/tournaments-bracket-btn.png' });
  });
});

test.describe('Kiosk Control Page', () => {
  test('renders kiosk settings', async ({ page }) => {
    await navigateAndWait(page, '/kiosk');
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: 'test-results/screenshots/kiosk-page.png', fullPage: true });
  });

  test('toggle switches are clickable', async ({ page }) => {
    await navigateAndWait(page, '/kiosk');
    const toggles = page.locator('button[role="switch"], button:has(.rounded-full)');
    const toggleCount = await toggles.count();

    if (toggleCount > 0) {
      const firstToggle = toggles.first();
      await firstToggle.click({ force: true });
      await page.waitForTimeout(500);
      await page.screenshot({ path: 'test-results/screenshots/kiosk-toggle-clicked.png' });
      await firstToggle.click({ force: true });
    }
    await page.screenshot({ path: 'test-results/screenshots/kiosk-toggles.png', fullPage: true });
  });

  test('+ New Experience button', async ({ page }) => {
    await navigateAndWait(page, '/kiosk');
    const addBtn = page.locator('button', { hasText: /New Experience|\+ New/ });
    if (await addBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await addBtn.click({ force: true });
      await page.waitForTimeout(500);
      await page.screenshot({ path: 'test-results/screenshots/kiosk-add-experience.png', fullPage: true });
      const cancelBtn = page.locator('button', { hasText: 'Cancel' });
      if (await cancelBtn.isVisible()) await cancelBtn.click({ force: true });
    }
  });

  test('pod screen blanking grid', async ({ page }) => {
    await navigateAndWait(page, '/kiosk');
    await page.screenshot({ path: 'test-results/screenshots/kiosk-pod-grid.png', fullPage: true });
  });
});
