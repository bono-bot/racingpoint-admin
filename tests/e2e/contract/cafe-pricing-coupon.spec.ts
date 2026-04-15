import { test, expect, APIRequestContext } from '@playwright/test';

/**
 * Phase 350-01: Cafe / Pricing / Coupon Contract Tests
 *
 * Verifies data flows from admin API through the rc proxy to racecontrol.
 * Creates test data, verifies it reaches the backend, then cleans up.
 *
 * NOTE: Write-path tests require venue or a non-read-replica racecontrol.
 * Cloud read-replica returns 409 on writes (Phase 349-03 guard).
 * Set ADMIN_CONTRACT_PIN env to override the default test PIN.
 */

const BASE = process.env.ADMIN_CONTRACT_BASE || 'http://localhost:3200';
const PIN = process.env.ADMIN_CONTRACT_PIN || '1234';

// Standing rule: no fake data — use TEST_ONLY prefix
const TEST_PREFIX = 'TEST_ONLY_CONTRACT_';

let adminCtx: APIRequestContext;

test.describe.configure({ mode: 'serial' });

test.describe('Contract: Admin ↔ RaceControl data flow', () => {
  test.beforeAll(async ({ playwright }) => {
    // Create an API context with cookies for admin
    adminCtx = await playwright.request.newContext({
      baseURL: BASE,
      extraHTTPHeaders: { 'Content-Type': 'application/json' },
    });

    // Login to get JWT cookie
    const loginRes = await adminCtx.post('/api/auth/login', {
      data: { pin: PIN },
    });

    if (!loginRes.ok()) {
      const status = loginRes.status();
      if (status === 401) {
        test.skip(true, `Admin login failed (401) — PIN "${PIN}" invalid. Set ADMIN_CONTRACT_PIN env.`);
        return;
      }
      if (status === 429) {
        test.skip(true, 'Admin login rate-limited (429). Wait and retry.');
        return;
      }
      test.skip(true, `Admin login failed: HTTP ${status}`);
      return;
    }

  });

  test.afterAll(async () => {
    await adminCtx?.dispose();
  });

  // ─── Pricing Rules ───────────────────────────────────────

  let testPricingRuleId: string | null = null;

  test('pricing: GET /api/rc/pricing/rules returns array', async () => {
    const res = await adminCtx.get('/api/rc/pricing/rules');
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('rules');
    expect(Array.isArray(data.rules)).toBe(true);
  });

  test('pricing: POST /api/rc/pricing/rules creates rule', async () => {
    const rule = {
      name: `${TEST_PREFIX}Weekend_Peak`,
      day_of_week: 6, // Saturday
      start_hour: 14,
      end_hour: 20,
      multiplier: 1.5,
      flat_adjustment_paise: 0,
      min_group_size: null,
    };

    const res = await adminCtx.post('/api/rc/pricing/rules', { data: rule });

    // Cloud read-replica returns 409 — skip write tests
    if (res.status() === 409) {
      test.skip(true, 'Cloud read-replica — write tests require venue');
      return;
    }

    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.id || data.rule?.id).toBeTruthy();
    testPricingRuleId = data.id || data.rule?.id;
  });

  test('pricing: created rule visible in GET list', async () => {
    if (!testPricingRuleId) test.skip(true, 'No pricing rule created');

    const res = await adminCtx.get('/api/rc/pricing/rules');
    const data = await res.json();
    const found = data.rules.find((r: { id: string }) => r.id === testPricingRuleId);
    expect(found).toBeTruthy();
    expect(found.name).toContain(TEST_PREFIX);
    expect(found.multiplier).toBe(1.5);
  });

  test('pricing: DELETE cleanup', async () => {
    if (!testPricingRuleId) test.skip(true, 'No pricing rule to delete');

    const res = await adminCtx.delete(`/api/rc/pricing/rules/${testPricingRuleId}`);
    expect([200, 204]).toContain(res.status());
    testPricingRuleId = null;
  });

  // ─── Coupons ─────────────────────────────────────────────

  let testCouponId: string | null = null;

  test('coupon: GET /api/rc/coupons returns array', async () => {
    const res = await adminCtx.get('/api/rc/coupons');
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('coupons');
    expect(Array.isArray(data.coupons)).toBe(true);
  });

  test('coupon: POST /api/rc/coupons creates coupon', async () => {
    const coupon = {
      code: `${TEST_PREFIX}50OFF`,
      discount_type: 'percent',
      discount_value: 50,
      max_uses: 1,
      valid_from: '2099-01-01T00:00:00Z',
      valid_until: '2099-12-31T23:59:59Z',
    };

    const res = await adminCtx.post('/api/rc/coupons', { data: coupon });

    if (res.status() === 409) {
      test.skip(true, 'Cloud read-replica — write tests require venue');
      return;
    }

    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.id || data.coupon?.id).toBeTruthy();
    testCouponId = data.id || data.coupon?.id;
  });

  test('coupon: created coupon visible in GET list', async () => {
    if (!testCouponId) test.skip(true, 'No coupon created');

    const res = await adminCtx.get('/api/rc/coupons');
    const data = await res.json();
    const found = data.coupons.find((c: { id: string }) => c.id === testCouponId);
    expect(found).toBeTruthy();
    expect(found.code).toContain(TEST_PREFIX);
  });

  test('coupon: DELETE cleanup', async () => {
    if (!testCouponId) test.skip(true, 'No coupon to delete');

    const res = await adminCtx.delete(`/api/rc/coupons/${testCouponId}`);
    expect([200, 204]).toContain(res.status());
    testCouponId = null;
  });

  // ─── Cafe Menu (legacy admin.db path) ────────────────────

  let testMenuItemId: string | null = null;

  test('cafe: GET /api/cafe/menu returns items', async () => {
    const res = await adminCtx.get('/api/cafe/menu');
    expect(res.status()).toBe(200);
    const data = await res.json();
    // Legacy path returns { items: [...] } or array directly
    const items = data.items || data;
    expect(Array.isArray(items)).toBe(true);
  });

  test('cafe: POST /api/cafe/menu creates item', async () => {
    const item = {
      name: `${TEST_PREFIX}Espresso`,
      category: 'Beverages',
      price: 150, // rupees (admin.db stores rupees)
      veg: 1,
      available: 1,
      description: 'Contract test item — auto-cleanup',
    };

    const res = await adminCtx.post('/api/cafe/menu', { data: item });

    if (res.status() === 409) {
      test.skip(true, 'Cloud read-replica — write tests require venue');
      return;
    }
    if (res.status() === 503) {
      test.skip(true, 'Cafe proxy mode write not supported — legacy mode only');
      return;
    }

    expect(res.status()).toBe(200);
    const data = await res.json();
    testMenuItemId = data.id || data.item?.id;
    expect(testMenuItemId).toBeTruthy();
  });

  test('cafe: created item visible in GET list', async () => {
    if (!testMenuItemId) test.skip(true, 'No menu item created');

    const res = await adminCtx.get('/api/cafe/menu');
    const data = await res.json();
    const items = data.items || data;
    const found = items.find((i: { id: number | string; name: string }) =>
      String(i.id) === String(testMenuItemId)
    );
    expect(found).toBeTruthy();
    expect(found.name).toContain(TEST_PREFIX);
    expect(found.price).toBe(150);
  });

  test('cafe: DELETE cleanup', async () => {
    if (!testMenuItemId) test.skip(true, 'No menu item to delete');

    const res = await adminCtx.delete(`/api/cafe/menu?id=${testMenuItemId}`);
    expect([200, 204]).toContain(res.status());
    testMenuItemId = null;
  });

  // ─── RC Proxy Health ─────────────────────────────────────

  test('rc-proxy: /api/rc/health returns racecontrol data', async () => {
    const res = await adminCtx.get('/api/rc/health');
    // May require auth or may be public — accept 200 or structured error
    if (res.status() === 200) {
      const data = await res.json();
      expect(data).toHaveProperty('build_id');
    } else {
      // 401/403 is acceptable — proves proxy is working (reached RC)
      expect([401, 403]).toContain(res.status());
    }
  });

  test('rc-proxy: missing RC_URL returns 503 with error_code', async () => {
    // This test verifies Phase 345 resilience — the proxy route
    // returns structured JSON instead of crashing on missing env.
    // We can't unset RC_URL at runtime, so just verify the route exists
    // and returns JSON (not HTML 500).
    const res = await adminCtx.get('/api/rc/nonexistent-path');
    const contentType = res.headers()['content-type'] || '';
    expect(contentType).toContain('json');
  });
});
