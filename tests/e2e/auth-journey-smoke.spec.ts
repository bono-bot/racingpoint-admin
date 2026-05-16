import { test, expect } from '@playwright/test';

// Hermetic auth-journey integration test.
// Asserts the structural change after removing ADMIN_COMING_SOON_GATE:
//  (1) /login renders without redirect to /coming-soon (gate is gone)
//  (2) protected routes redirect unauthenticated users to /login (JWT middleware restored)
//  (3) /api/auth/me without cookie returns 401 (not the gate's 503)
//
// Does NOT exercise the full PIN→RC→JWT round-trip (RC_URL points to port 65535
// in playwright.smoke.config.ts — unreachable). Round-trip is verified by live
// probe; this test is the structural CI gate per MMA Q4 drift-prevention.

test.describe('Auth journey — gate decommissioned, JWT middleware restored', () => {
  test('GET /login (no cookie) renders PIN pad — no /coming-soon redirect', async ({ page }) => {
    const response = await page.goto('/login', { waitUntil: 'networkidle' });

    expect(response, '/login should respond').not.toBeNull();
    expect(response!.status(), 'no 5xx/4xx on /login').toBeLessThan(400);

    // Final URL must be /login itself, NOT /coming-soon
    expect(page.url(), 'no redirect to /coming-soon').not.toContain('/coming-soon');
    expect(page.url(), 'landed on /login').toContain('/login');

    // PIN pad markers — the LoginPage renders the PinPad component
    const racingPointHeading = page.getByRole('heading', { name: /RacingPoint/i });
    await expect(racingPointHeading, 'Login page header rendered').toBeVisible({ timeout: 10_000 });
  });

  test('GET / (no cookie) redirects to /login — not /coming-soon', async ({ page }) => {
    const response = await page.goto('/', { waitUntil: 'networkidle' });

    expect(response, '/ should respond').not.toBeNull();
    expect(page.url(), 'no redirect to /coming-soon').not.toContain('/coming-soon');
    expect(page.url(), 'redirected to /login').toContain('/login');
  });

  test('GET /api/auth/me (no cookie) returns 401 — not 503 gate', async ({ request }) => {
    const response = await request.get('/api/auth/me');
    expect(response.status(), '/api/auth/me without cookie returns 401').toBe(401);

    const body = await response.json();
    expect(body.error, 'standard auth error message').toMatch(/not authenticated/i);
  });
});
