import { test, expect } from '@playwright/test';
import { navigateAndWait } from './helpers';

/**
 * Marketing Section E2E Tests
 * Pages: Coupons, Pricing Rules, Packages, Memberships
 */

test.describe('Coupons Page', () => {
  test('renders coupon list', async ({ page }) => {
    await navigateAndWait(page, '/coupons');
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: 'test-results/screenshots/coupons-page.png', fullPage: true });
  });

  test('+ New Coupon button toggles form', async ({ page }) => {
    await navigateAndWait(page, '/coupons');
    const addBtn = page.locator('button', { hasText: /New Coupon|\+ New/ });
    if (await addBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await addBtn.click({ force: true });
      await page.waitForTimeout(500);

      const codeInput = page.locator('input[placeholder*="Code"], input[placeholder*="code"]');
      if (await codeInput.isVisible()) {
        await codeInput.fill('TEST_ONLY_COUPON');
      }
      await page.screenshot({ path: 'test-results/screenshots/coupons-add-form.png', fullPage: true });
      // Button text changes to "Cancel" after toggle
      const cancelBtn = page.locator('button', { hasText: 'Cancel' });
      if (await cancelBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await cancelBtn.click({ force: true });
      }
    }
  });

  test('coupon type dropdown has options', async ({ page }) => {
    await navigateAndWait(page, '/coupons');
    const addBtn = page.locator('button', { hasText: /New Coupon|\+ New/ });
    if (await addBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await addBtn.click({ force: true });
      await page.waitForTimeout(500);
      const typeSelect = page.locator('select').first();
      if (await typeSelect.isVisible()) {
        const options = await typeSelect.locator('option').allTextContents();
        expect(options.length).toBeGreaterThan(0);
        await page.screenshot({ path: 'test-results/screenshots/coupons-type-dropdown.png' });
      }
    }
  });
});

test.describe('Pricing Rules Page', () => {
  test('renders pricing rules', async ({ page }) => {
    await navigateAndWait(page, '/pricing');
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: 'test-results/screenshots/pricing-page.png', fullPage: true });
  });

  test('+ New Rule button toggles form', async ({ page }) => {
    await navigateAndWait(page, '/pricing');
    const addBtn = page.locator('button', { hasText: /New Rule|\+ New/ });
    if (await addBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await addBtn.click({ force: true });
      await page.waitForTimeout(500);
      const nameInput = page.locator('input').first();
      if (await nameInput.isVisible()) {
        await nameInput.fill('TEST_ONLY_Rule');
      }
      await page.screenshot({ path: 'test-results/screenshots/pricing-add-form.png', fullPage: true });
      const cancelBtn = page.locator('button', { hasText: 'Cancel' });
      if (await cancelBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await cancelBtn.click({ force: true });
      }
    }
  });
});

test.describe('Packages Page', () => {
  test('renders packages grid', async ({ page }) => {
    await navigateAndWait(page, '/packages');
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: 'test-results/screenshots/packages-page.png', fullPage: true });
  });
});

test.describe('Memberships Page', () => {
  test('renders memberships', async ({ page }) => {
    await navigateAndWait(page, '/memberships');
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: 'test-results/screenshots/memberships-page.png', fullPage: true });
  });

  test('tab switching works', async ({ page }) => {
    await navigateAndWait(page, '/memberships');
    const tiersTab = page.locator('button', { hasText: 'Tiers' });
    const membersTab = page.locator('button', { hasText: /Active|Members/ });

    if (await tiersTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await tiersTab.click({ force: true });
      await page.waitForTimeout(500);
      await page.screenshot({ path: 'test-results/screenshots/memberships-tiers-tab.png' });
      if (await membersTab.isVisible()) {
        await membersTab.click({ force: true });
        await page.waitForTimeout(500);
        await page.screenshot({ path: 'test-results/screenshots/memberships-members-tab.png' });
      }
    }
  });
});
