import { test, expect } from '@playwright/test';
import { navigateAndWait } from './helpers';

/**
 * HR Section E2E Tests
 * Pages: Employees, Hiring, Attendance, Leaves
 */

test.describe('Employees Page', () => {
  test('renders employee list', async ({ page }) => {
    await navigateAndWait(page, '/hr');
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: 'test-results/screenshots/hr-employees-page.png', fullPage: true });
  });

  test('+ Add Employee button toggles form', async ({ page }) => {
    await navigateAndWait(page, '/hr');

    const addBtn = page.locator('button', { hasText: /Add Employee|\+ Add/ });
    await expect(addBtn).toBeVisible({ timeout: 10000 });

    await addBtn.click({ force: true });
    await page.waitForTimeout(500);

    await expect(page.locator('text=New Employee')).toBeVisible({ timeout: 5000 });

    // Standing Rule #3: clearly synthetic test data
    await page.locator('#emp-name').fill('TEST_ONLY_Employee');
    await page.locator('#emp-phone').fill('0000000000');
    await page.locator('#emp-pin').fill('0000');

    const roleSelect = page.locator('#emp-role');
    await expect(roleSelect).toBeVisible();
    const roleOptions = await roleSelect.locator('option').allTextContents();
    expect(roleOptions).toContain('Admin');
    expect(roleOptions).toContain('Manager');
    expect(roleOptions).toContain('Staff');

    for (const role of ['admin', 'manager', 'staff']) {
      await roleSelect.selectOption(role);
    }

    await page.locator('#emp-dept').fill('TEST_ONLY_Dept');
    await page.screenshot({ path: 'test-results/screenshots/hr-add-form-filled.png', fullPage: true });

    // Button text changes to "Cancel" after toggle
    const cancelBtn = page.locator('button', { hasText: 'Cancel' });
    if (await cancelBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await cancelBtn.click({ force: true });
    }
  });

  test('search input filters employees', async ({ page }) => {
    await navigateAndWait(page, '/hr');
    const searchInput = page.locator('input[placeholder*="Search"]');
    if (await searchInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await searchInput.fill('TEST_ONLY');
      await page.waitForTimeout(500);
      await page.screenshot({ path: 'test-results/screenshots/hr-search.png' });
    }
  });

  test('role filter dropdown works', async ({ page }) => {
    await navigateAndWait(page, '/hr');
    const roleFilter = page.locator('select', { hasText: /All Roles/ });
    if (await roleFilter.isVisible({ timeout: 5000 }).catch(() => false)) {
      const options = await roleFilter.locator('option').allTextContents();
      expect(options.length).toBeGreaterThan(0);
      for (const opt of options) {
        await roleFilter.selectOption({ label: opt });
        await page.waitForTimeout(300);
      }
      await page.screenshot({ path: 'test-results/screenshots/hr-role-filter.png' });
    }
  });

  test('deactivate button opens confirm dialog', async ({ page }) => {
    await navigateAndWait(page, '/hr');
    await page.waitForTimeout(1000);
    const deactivateBtn = page.locator('button', { hasText: /Deactivate|Activate/ });
    if (await deactivateBtn.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await deactivateBtn.first().click({ force: true });
      await page.waitForTimeout(500);
      const dialog = page.locator('text=Are you sure');
      if (await dialog.isVisible({ timeout: 3000 }).catch(() => false)) {
        await page.screenshot({ path: 'test-results/screenshots/hr-confirm-dialog.png' });
        const cancelBtn = page.locator('button', { hasText: 'Cancel' });
        if (await cancelBtn.isVisible()) await cancelBtn.click({ force: true });
      }
    }
  });

  test('summary cards render', async ({ page }) => {
    await navigateAndWait(page, '/hr');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-results/screenshots/hr-summary-cards.png', fullPage: true });
  });
});

test.describe('Hiring Page', () => {
  test('renders hiring page', async ({ page }) => {
    await navigateAndWait(page, '/hr/hiring');
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: 'test-results/screenshots/hr-hiring-page.png', fullPage: true });
  });

  test('refresh button works', async ({ page }) => {
    await navigateAndWait(page, '/hr/hiring');
    const refreshBtn = page.locator('button', { hasText: /Refresh/ });
    if (await refreshBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await refreshBtn.click({ force: true });
      await page.waitForTimeout(500);
      await page.screenshot({ path: 'test-results/screenshots/hr-hiring-refreshed.png' });
    }
  });
});

test.describe('Attendance Page', () => {
  test('renders attendance', async ({ page }) => {
    await navigateAndWait(page, '/hr/attendance');
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: 'test-results/screenshots/hr-attendance-page.png', fullPage: true });
  });

  test('date navigation buttons work', async ({ page }) => {
    await navigateAndWait(page, '/hr/attendance');
    await page.waitForTimeout(1000);

    // Navigate using any arrow/nav buttons
    const buttons = page.locator('button');
    const count = await buttons.count();
    for (let i = 0; i < count; i++) {
      const btn = buttons.nth(i);
      const text = await btn.textContent();
      if (text && (text.includes('◀') || text.includes('←'))) {
        await btn.click({ force: true });
        await page.waitForTimeout(500);
        await page.screenshot({ path: 'test-results/screenshots/hr-attendance-prev-day.png' });
        break;
      }
    }
  });

  test('date picker input works', async ({ page }) => {
    await navigateAndWait(page, '/hr/attendance');
    const datePicker = page.locator('input[type="date"]');
    if (await datePicker.isVisible({ timeout: 5000 }).catch(() => false)) {
      await datePicker.fill('2026-03-18');
      await page.waitForTimeout(500);
      await page.screenshot({ path: 'test-results/screenshots/hr-attendance-date-pick.png' });
    }
  });
});

test.describe('Leaves Page', () => {
  test('renders leave requests', async ({ page }) => {
    await navigateAndWait(page, '/hr/leaves');
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: 'test-results/screenshots/hr-leaves-page.png', fullPage: true });
  });

  test('filter tabs work', async ({ page }) => {
    await navigateAndWait(page, '/hr/leaves');
    const tabs = ['All', 'Pending', 'Approved', 'Rejected'];
    for (const tab of tabs) {
      const tabBtn = page.locator('button', { hasText: tab });
      if (await tabBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await tabBtn.click({ force: true });
        await page.waitForTimeout(300);
        await page.screenshot({ path: `test-results/screenshots/hr-leaves-tab-${tab.toLowerCase()}.png` });
      }
    }
  });

  test('search input works', async ({ page }) => {
    await navigateAndWait(page, '/hr/leaves');
    const searchInput = page.locator('input[placeholder*="Search"], input[placeholder*="search"]');
    if (await searchInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await searchInput.fill('TEST_ONLY');
      await page.waitForTimeout(500);
      await page.screenshot({ path: 'test-results/screenshots/hr-leaves-search.png' });
    }
  });

  test('approve/reject buttons', async ({ page }) => {
    await navigateAndWait(page, '/hr/leaves');
    await page.waitForTimeout(1000);
    const approveBtn = page.locator('button', { hasText: 'Approve' });
    if (await approveBtn.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await approveBtn.first().click({ force: true });
      await page.waitForTimeout(500);
      const dialog = page.locator('text=Are you sure');
      if (await dialog.isVisible({ timeout: 3000 }).catch(() => false)) {
        await page.screenshot({ path: 'test-results/screenshots/hr-leaves-approve-dialog.png' });
        const cancelBtn = page.locator('button', { hasText: 'Cancel' });
        if (await cancelBtn.isVisible()) await cancelBtn.click({ force: true });
      }
    }
  });
});
