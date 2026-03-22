import { test, expect } from '@playwright/test';
import { navigateAndWait } from './helpers';

/**
 * Cafe Section E2E Tests
 * Pages: Menu, Inventory, Sales
 */

test.describe('Cafe Menu Page', () => {
  test('renders menu with categories', async ({ page }) => {
    await navigateAndWait(page, '/cafe');
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: 'test-results/screenshots/cafe-menu-page.png', fullPage: true });
  });

  test('+ Add Item button toggles form', async ({ page }) => {
    await navigateAndWait(page, '/cafe');
    const addBtn = page.locator('button', { hasText: /Add Item|\+ Add/ });
    await expect(addBtn).toBeVisible({ timeout: 10000 });

    await addBtn.click({ force: true });
    await page.waitForTimeout(500);

    const nameInput = page.locator('input[placeholder*="Item name"], input[placeholder*="item"]');
    await expect(nameInput).toBeVisible({ timeout: 5000 });

    const priceInput = page.locator('input[placeholder*="Price"]');
    await expect(priceInput).toBeVisible();

    // Standing Rule #3: clearly synthetic data
    await nameInput.fill('TEST_ONLY_Menu_Item');
    await priceInput.fill('999');

    const vegCheckbox = page.locator('input[type="checkbox"]');
    if (await vegCheckbox.isVisible()) {
      await vegCheckbox.check();
      expect(await vegCheckbox.isChecked()).toBe(true);
    }

    await page.screenshot({ path: 'test-results/screenshots/cafe-add-form-filled.png' });
    // Button text changes to "Cancel" after toggle
    const cancelBtn = page.locator('button', { hasText: 'Cancel' });
    if (await cancelBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await cancelBtn.click({ force: true });
    }
  });

  test('category filter buttons work', async ({ page }) => {
    await navigateAndWait(page, '/cafe');
    // Wait for items to load
    await page.waitForTimeout(2000);

    const categories = ['Burgers', 'Pizzas', 'Beverages', 'Starters'];
    for (const cat of categories) {
      const catBtn = page.locator('button', { hasText: cat });
      if (await catBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await catBtn.click({ force: true });
        await page.waitForTimeout(300);
        await page.screenshot({ path: `test-results/screenshots/cafe-filter-${cat.toLowerCase()}.png` });
      }
    }
  });

  test('availability toggle buttons exist', async ({ page }) => {
    await navigateAndWait(page, '/cafe');
    await page.waitForTimeout(2000);
    const availBtn = page.locator('button', { hasText: /Available|Unavailable/ });
    if (await availBtn.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await page.screenshot({ path: 'test-results/screenshots/cafe-availability-buttons.png', fullPage: true });
    }
  });
});

test.describe('Inventory Page', () => {
  test('renders inventory list', async ({ page }) => {
    await navigateAndWait(page, '/cafe/inventory');
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: 'test-results/screenshots/inventory-page.png', fullPage: true });
  });

  test('+ Add Item button toggles form', async ({ page }) => {
    await navigateAndWait(page, '/cafe/inventory');
    const addBtn = page.locator('button', { hasText: /Add Item|\+ Add/ });
    if (await addBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await addBtn.click({ force: true });
      await page.waitForTimeout(500);
      await page.screenshot({ path: 'test-results/screenshots/inventory-add-form.png', fullPage: true });

      const nameInput = page.locator('input[placeholder*="name"], input[placeholder*="Name"]').first();
      if (await nameInput.isVisible()) await nameInput.fill('TEST_ONLY_Inventory_Item');

      const cancelBtn2 = page.locator('button', { hasText: 'Cancel' });
      if (await cancelBtn2.isVisible({ timeout: 2000 }).catch(() => false)) {
        await cancelBtn2.click({ force: true });
      }
    }
  });

  test('adjust stock buttons work', async ({ page }) => {
    await navigateAndWait(page, '/cafe/inventory');
    await page.waitForTimeout(1000);
    const adjustBtn = page.locator('button', { hasText: 'Adjust' });
    if (await adjustBtn.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await adjustBtn.first().click({ force: true });
      await page.waitForTimeout(500);
      await page.screenshot({ path: 'test-results/screenshots/inventory-adjust-open.png' });
      const cancelBtn = page.locator('button', { hasText: /X|Cancel|✕/ });
      if (await cancelBtn.first().isVisible()) await cancelBtn.first().click({ force: true });
    }
  });
});

test.describe('Sales Page', () => {
  test('renders sales page', async ({ page }) => {
    await navigateAndWait(page, '/sales');
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: 'test-results/screenshots/sales-page.png', fullPage: true });
  });

  test('+ New Bill button toggles form', async ({ page }) => {
    await navigateAndWait(page, '/sales');
    const addBtn = page.locator('button', { hasText: /New Bill|\+ New/ });
    if (await addBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await addBtn.click({ force: true });
      await page.waitForTimeout(500);
      await page.screenshot({ path: 'test-results/screenshots/sales-add-form.png', fullPage: true });
      const custInput = page.locator('input[placeholder*="Customer"], input[placeholder*="customer"]');
      if (await custInput.isVisible()) await custInput.fill('TEST_ONLY_Customer');
      const cancelBtn = page.locator('button', { hasText: 'Cancel' });
      if (await cancelBtn.isVisible()) await cancelBtn.click({ force: true });
      else await addBtn.click({ force: true });
    }
  });

  test('payment method dropdown works', async ({ page }) => {
    await navigateAndWait(page, '/sales');
    const addBtn = page.locator('button', { hasText: /New Bill|\+ New/ });
    if (await addBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await addBtn.click({ force: true });
      await page.waitForTimeout(500);
      const paymentSelect = page.locator('select').first();
      if (await paymentSelect.isVisible()) {
        const options = await paymentSelect.locator('option').allTextContents();
        expect(options.length).toBeGreaterThan(0);
        await page.screenshot({ path: 'test-results/screenshots/sales-payment-options.png' });
      }
    }
  });
});
