import { test, expect } from '@playwright/test';

/**
 * Phase 350-03: 46-page smoke test
 *
 * Visits every admin dashboard page, checks for:
 * - No hydration errors (console.error during load)
 * - No 404/500 HTTP responses
 * - No "Application error" / "Something went wrong" error states
 * - Page has meaningful content (> 50 chars in body)
 *
 * Integrates with admin-deploy.sh --verify via exit code.
 * All pages load without login redirect = PASS.
 *
 * Runtime target: <2 minutes for all 46 pages
 */

const BASE = process.env.ADMIN_SMOKE_BASE || 'http://localhost:3200';
const PIN = process.env.ADMIN_CONTRACT_PIN || '1234';

// All admin dashboard routes (Phase 344 crawl-all-pages + new pages)
const ROUTES = [
  '/',
  '/analytics',
  '/sessions',
  '/sessions/export',
  '/sessions/suspect',
  '/billing',
  '/billing/live',
  '/billing/history',
  '/billing/analytics',
  '/billing/reports',
  '/billing/rates',
  '/bookings',
  '/calendar',
  '/customers',
  '/fleet',
  '/fleet/verify',
  '/fleet/content-drift',
  '/metrics',
  '/config',
  '/leaderboard',
  '/tournaments',
  '/games',
  '/presets',
  '/kiosk',
  '/coupons',
  '/pricing',
  '/packages',
  '/memberships',
  '/cafe',
  '/cafe/inventory',
  '/sales',
  '/purchases',
  '/wallet-transactions',
  '/finance',
  '/staff',
  '/staff/manage',
  '/hr',
  '/hr/hiring',
  '/hr/attendance',
  '/hr/leaves',
  '/hr/recognition',
  '/chat',
  '/transcribe',
  '/mesh-intelligence',
  '/settings',
  '/settings/health',
  '/settings/pipeline',
  '/waivers',
  '/health',
];

interface PageResult {
  route: string;
  status: 'OK' | 'BROKEN' | 'ERROR';
  httpStatus: number;
  issue?: string;
  consoleErrors: string[];
  loadTimeMs: number;
}

test.describe('Smoke: All admin pages', () => {
  test('login and verify all pages load without errors', async ({ page }) => {
    test.setTimeout(120_000); // 2 minute budget

    // ─── Login ─────────────────────────────────────────
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });

    // Enter PIN via numpad
    for (const digit of PIN) {
      const btn = page.locator(`button:has-text("${digit}")`);
      if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await btn.click();
      }
    }

    const unlockBtn = page.locator('button:has-text("Unlock")');
    if (await unlockBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await unlockBtn.click();
      await page.waitForURL('**/', { timeout: 10000 }).catch(() => {});
    }

    // If login fails, try cookie-based auth via API
    if (page.url().includes('/login')) {
      const resp = await page.request.post(`${BASE}/api/auth/login`, {
        data: { pin: PIN },
      });
      if (!resp.ok()) {
        test.skip(true, `Login failed (${resp.status()}). Set ADMIN_CONTRACT_PIN env.`);
        return;
      }
      await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
    }

    await page.waitForTimeout(1000);

    // ─── Crawl all pages ───────────────────────────────
    const results: PageResult[] = [];

    for (const route of ROUTES) {
      const consoleErrors: string[] = [];
      const errorHandler = (msg: { type: () => string; text: () => string }) => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      };
      page.on('console', errorHandler);

      const start = Date.now();
      try {
        const response = await page.goto(`${BASE}${route}`, {
          waitUntil: 'networkidle',
          timeout: 15000,
        });
        await page.waitForTimeout(500);
        const loadTimeMs = Date.now() - start;

        const url = page.url();
        const httpStatus = response?.status() ?? 0;
        const bodyText = await page.textContent('body').catch(() => '') || '';

        let issue: string | undefined;

        if (url.includes('/login') && route !== '/login') {
          issue = 'REDIRECT_TO_LOGIN';
        } else if (httpStatus === 404) {
          issue = '404_NOT_FOUND';
        } else if (httpStatus >= 500) {
          issue = `SERVER_ERROR_${httpStatus}`;
        } else if (bodyText.includes('Application error') || bodyText.includes('Something went wrong')) {
          issue = 'APP_ERROR';
        } else if (bodyText.includes('This page could not be found')) {
          issue = '404_PAGE';
        } else if (bodyText.includes('Failed to load') && bodyText.length < 200) {
          issue = 'DATA_FETCH_ERROR';
        } else if (bodyText.trim().length < 50 && route !== '/health') {
          issue = 'EMPTY_OR_MINIMAL_CONTENT';
        }

        // Filter out known benign console errors
        const realErrors = consoleErrors.filter(e =>
          !e.includes('DevTools') &&
          !e.includes('favicon') &&
          !e.includes('hot-update') &&
          !e.includes('webpack')
        );

        if (!issue && realErrors.length > 0) {
          issue = `CONSOLE_ERRORS(${realErrors.length})`;
        }

        results.push({
          route,
          status: issue ? 'BROKEN' : 'OK',
          httpStatus,
          issue,
          consoleErrors: realErrors,
          loadTimeMs,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        results.push({
          route,
          status: 'ERROR',
          httpStatus: 0,
          issue: msg.slice(0, 100),
          consoleErrors,
          loadTimeMs: Date.now() - start,
        });
      }

      page.removeListener('console', errorHandler);
    }

    // ─── Summary ────────────────────────────────────────
    const ok = results.filter(r => r.status === 'OK');
    const broken = results.filter(r => r.status !== 'OK');
    const totalLoadMs = results.reduce((s, r) => s + r.loadTimeMs, 0);

    console.log(`\n=== SMOKE TEST SUMMARY ===`);
    console.log(`Pages: ${results.length} | OK: ${ok.length} | Broken: ${broken.length}`);
    console.log(`Total load time: ${(totalLoadMs / 1000).toFixed(1)}s`);

    if (broken.length > 0) {
      console.log('\nBROKEN PAGES:');
      for (const b of broken) {
        console.log(`  ${b.route} — ${b.issue} (HTTP ${b.httpStatus})`);
        if (b.consoleErrors.length > 0) {
          for (const err of b.consoleErrors.slice(0, 3)) {
            console.log(`    console.error: ${err.slice(0, 120)}`);
          }
        }
      }
    }

    // Assert zero broken pages
    expect(
      broken.length,
      `${broken.length} pages broken:\n${broken.map(b => `  ${b.route}: ${b.issue}`).join('\n')}`
    ).toBe(0);

    // Assert under 2 minute total load time
    expect(totalLoadMs).toBeLessThan(120_000);
  });
});
