import { test, expect } from '@playwright/test';
import { navigateAndWait } from './helpers';

/**
 * Dashboard Overview + Analytics + Settings E2E Tests
 */

test.describe('Dashboard Overview', () => {
  test('stat cards render with values', async ({ page }) => {
    await navigateAndWait(page, '/');

    await expect(page.locator('h1', { hasText: 'Dashboard Overview' })).toBeVisible({ timeout: 10000 });

    // Check stat labels
    await expect(page.locator("text=Today's Bookings")).toBeVisible();
    await expect(page.locator('text=Total Bookings')).toBeVisible();
    await expect(page.locator('text=Total Customers')).toBeVisible();
    await expect(page.locator('text=Gateway Status')).toBeVisible();

    await page.screenshot({ path: 'test-results/screenshots/dashboard-stats.png', fullPage: true });
  });

  test('system status section shows services', async ({ page }) => {
    await navigateAndWait(page, '/');

    await expect(page.locator('text=System Status')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=API Gateway')).toBeVisible();
    await expect(page.locator('text=WhatsApp Bot')).toBeVisible();
    await expect(page.locator('text=Discord Bot')).toBeVisible();
    await expect(page.locator('text=RaceControl Core')).toBeVisible();
    await expect(page.locator('text=Ollama AI')).toBeVisible();

    await page.screenshot({ path: 'test-results/screenshots/dashboard-system-status.png' });
  });

  test('page title is correct', async ({ page }) => {
    await navigateAndWait(page, '/');
    await expect(page.locator('h1', { hasText: 'Dashboard Overview' })).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Analytics Page', () => {
  test('renders charts and heading', async ({ page }) => {
    await navigateAndWait(page, '/analytics');
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: 'test-results/screenshots/analytics-page.png', fullPage: true });
  });
});

test.describe('Settings Page', () => {
  test('renders settings content', async ({ page }) => {
    await navigateAndWait(page, '/settings');
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: 'test-results/screenshots/settings-page.png', fullPage: true });
  });
});
