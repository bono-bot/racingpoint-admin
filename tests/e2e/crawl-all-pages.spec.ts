import { test, expect } from '@playwright/test';

const BASE = 'http://192.168.31.23:3201';
const PIN = '1234'; // admin PIN

const ROUTES = [
  '/',
  '/analytics',
  '/sessions',
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
  '/staff/manage',
  '/staff',
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
];

test.describe('Admin Page Crawler', () => {
  test('login and screenshot all pages', async ({ page }) => {
    // Login
    await page.goto(`${BASE}/login`);
    await page.waitForLoadState('networkidle');

    // Enter PIN
    for (const digit of PIN) {
      await page.click(`button:has-text("${digit}")`);
    }
    await page.click('button:has-text("Unlock")');
    await page.waitForURL('**/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const results: { route: string; status: string; issue?: string }[] = [];

    for (const route of ROUTES) {
      try {
        const response = await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle', timeout: 15000 });
        await page.waitForTimeout(1500);

        const url = page.url();
        const httpStatus = response?.status() ?? 0;
        const bodyText = await page.textContent('main') || await page.textContent('body') || '';

        // Screenshot
        const safeName = route === '/' ? 'index' : route.replace(/\//g, '_').replace(/^_/, '');
        await page.screenshot({ path: `test-results/crawl/${safeName}.png`, fullPage: true });

        // Check for issues
        let issue: string | undefined;

        if (url.includes('/login')) {
          issue = 'REDIRECT_TO_LOGIN';
        } else if (httpStatus === 404) {
          issue = '404_NOT_FOUND';
        } else if (httpStatus >= 500) {
          issue = `SERVER_ERROR_${httpStatus}`;
        } else if (bodyText.includes('Admin access required')) {
          issue = 'ADMIN_ACCESS_BLOCKED';
        } else if (bodyText.includes('Coming soon') || bodyText.includes('Not implemented')) {
          issue = 'PLACEHOLDER';
        } else if (bodyText.includes('This page could not be found')) {
          issue = '404_PAGE';
        } else if (bodyText.includes('Something went wrong') || bodyText.includes('Application error')) {
          issue = 'APP_ERROR';
        } else if (bodyText.includes('Failed to load') || bodyText.includes('Failed to fetch')) {
          issue = 'DATA_FETCH_ERROR';
        } else if (bodyText.trim().length < 50) {
          issue = 'EMPTY_OR_MINIMAL_CONTENT';
        }

        results.push({ route, status: issue ? 'BROKEN' : 'OK', issue });
        console.log(`${issue ? '❌' : '✅'} ${route} — ${issue || 'OK'} (HTTP ${httpStatus})`);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        results.push({ route, status: 'ERROR', issue: msg.slice(0, 100) });
        console.log(`💥 ${route} — ERROR: ${msg.slice(0, 100)}`);
      }
    }

    // Summary
    console.log('\n=== CRAWL SUMMARY ===');
    const broken = results.filter(r => r.status !== 'OK');
    const ok = results.filter(r => r.status === 'OK');
    console.log(`Total: ${results.length} | OK: ${ok.length} | Broken: ${broken.length}`);
    if (broken.length > 0) {
      console.log('\nBROKEN PAGES:');
      for (const b of broken) {
        console.log(`  ${b.route} — ${b.issue}`);
      }
    }
  });
});
