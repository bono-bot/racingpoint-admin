import { test, expect } from '@playwright/test';
import { SignJWT } from 'jose';
import { TEST_JWT_SECRET } from '../../playwright.smoke.config';

// Hermetic test: forges admin JWT (same secret dev server uses) + stubs
// /api/rc/business-rules at network layer. No real RC required.
async function mintAdminJwt(): Promise<string> {
  const secret = new TextEncoder().encode(TEST_JWT_SECRET);
  return await new SignJWT({ role: 'staff' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject('admin')
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(secret);
}

test.describe('Business Rules — A3 graceful empty state (hermetic)', () => {
  test.beforeEach(async ({ context }) => {
    const token = await mintAdminJwt();
    await context.addCookies([
      {
        name: 'rp-admin-token',
        value: token,
        domain: 'localhost',
        path: '/',
        httpOnly: true,
        sameSite: 'Lax',
      },
    ]);
  });

  test('shows Phase 356 backend-pending banner when RC returns 404', async ({ page }) => {
    // Intercept the rcFetch proxy call and force 404 (simulates missing RC route).
    await page.route('**/api/rc/business-rules', (route) =>
      route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'not_found', detail: 'route missing' }),
      })
    );

    await page.goto('/settings/business-rules', { waitUntil: 'networkidle', timeout: 15_000 });
    // Allow load() catch + setState to settle.
    await page.waitForTimeout(500);

    await page.screenshot({
      path: 'test-results/business-rules-smoke.png',
      fullPage: true,
    });

    const banner = page.getByText('Backend pending — Phase 356');
    await expect(banner).toBeVisible({ timeout: 5_000 });

    const endpointRef = page.getByText('GET /api/v1/business-rules');
    await expect(endpointRef).toBeVisible();

    const errorToast = page.locator('[data-sonner-toast]').filter({ hasText: 'Failed to load' });
    await expect(errorToast).toHaveCount(0);
  });
});
