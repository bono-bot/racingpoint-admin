import { test, expect, APIRequestContext } from '@playwright/test';

/**
 * Phase 350-02: Staff PIN Contract Test
 *
 * Verifies the PIN change flow through the admin dashboard proxy:
 *   Admin UI → /api/rc/staff/{id} PUT → racecontrol → validate-pin
 *
 * Uses the 70s sync-wait pattern from Phase 343-04 to catch silent
 * reverts where cloud sync overwrites the PIN change.
 *
 * Runtime: ~120s (two sync wait periods)
 * Requires: ADMIN_CONTRACT_PIN env var for admin authentication
 */

const BASE = process.env.ADMIN_CONTRACT_BASE || 'http://localhost:3200';
const PIN = process.env.ADMIN_CONTRACT_PIN || '1234';

// Phase 343-04 sync-wait: sync_interval_secs(30) * 2 + 10s safety margin
const SYNC_WAIT_MS = 70_000;

const TEST_STAFF_PIN_INITIAL = '9997';
const TEST_STAFF_PIN_CHANGED = '9996';
const TEST_STAFF_NAME = `TEST_ONLY_PIN_CONTRACT_${Date.now()}`;

test.describe.configure({ mode: 'serial' });

test.describe('Contract: Staff PIN lifecycle via admin proxy', () => {
  let adminCtx: APIRequestContext;
  let testStaffId: string | null = null;

  test.beforeAll(async ({ playwright }) => {
    adminCtx = await playwright.request.newContext({
      baseURL: BASE,
      extraHTTPHeaders: { 'Content-Type': 'application/json' },
    });

    const loginRes = await adminCtx.post('/api/auth/login', {
      data: { pin: PIN },
    });

    if (!loginRes.ok()) {
      test.skip(true, `Admin login failed (${loginRes.status()}). Set ADMIN_CONTRACT_PIN env.`);
      return;
    }
  });

  test.afterAll(async () => {
    // Cleanup: delete test staff
    if (testStaffId && adminCtx) {
      await adminCtx.delete(`/api/rc/staff/${testStaffId}`).catch(() => {});
    }
    await adminCtx?.dispose();
  });

  test('1. create test staff with PIN via admin proxy', async () => {
    test.setTimeout(15_000);

    const res = await adminCtx.post('/api/rc/staff', {
      data: {
        name: TEST_STAFF_NAME,
        phone: '',
        pin: TEST_STAFF_PIN_INITIAL,
      },
    });

    if (res.status() === 409) {
      test.skip(true, 'Cloud read-replica — staff write tests require venue or cloud-authoritative');
      return;
    }

    expect(res.status(), `create staff failed: ${await res.text()}`).toBe(200);
    const data = await res.json();
    testStaffId = String(data.id);
    expect(testStaffId).toBeTruthy();
  });

  test('2. validate initial PIN via admin proxy', async () => {
    if (!testStaffId) test.skip(true, 'No test staff created');

    const res = await adminCtx.post('/api/rc/staff/validate-pin', {
      data: { pin: TEST_STAFF_PIN_INITIAL },
    });

    expect(res.status(), `validate-pin failed: ${await res.text()}`).toBe(200);
    const data = await res.json();
    expect(data.staff_id).toBe(testStaffId);
  });

  test('3. change PIN via admin proxy (change_staff_pin_safe)', async () => {
    if (!testStaffId) test.skip(true, 'No test staff created');

    const res = await adminCtx.put(`/api/rc/staff/${testStaffId}`, {
      data: { pin: TEST_STAFF_PIN_CHANGED },
    });

    expect(res.status(), `PIN change failed: ${await res.text()}`).toBe(200);
  });

  test('4. validate new PIN immediately (t+2s)', async () => {
    if (!testStaffId) test.skip(true, 'No test staff created');
    test.setTimeout(10_000);

    await new Promise(r => setTimeout(r, 2000));

    const res = await adminCtx.post('/api/rc/staff/validate-pin', {
      data: { pin: TEST_STAFF_PIN_CHANGED },
    });

    expect(res.status(), `new PIN rejected immediately: ${await res.text()}`).toBe(200);
  });

  test('5. old PIN rejected immediately', async () => {
    if (!testStaffId) test.skip(true, 'No test staff created');

    const res = await adminCtx.post('/api/rc/staff/validate-pin', {
      data: { pin: TEST_STAFF_PIN_INITIAL },
    });

    expect(res.status()).toBe(401);
  });

  test('6. wait 70s sync cycle — validate new PIN survives (silent-revert check)', async () => {
    if (!testStaffId) test.skip(true, 'No test staff created');
    test.setTimeout(SYNC_WAIT_MS + 30_000);

    await new Promise(r => setTimeout(r, SYNC_WAIT_MS));

    const res = await adminCtx.post('/api/rc/staff/validate-pin', {
      data: { pin: TEST_STAFF_PIN_CHANGED },
    });

    expect(
      res.status(),
      `PIN 9996 reverted after sync cycle! Silent-revert bug detected.`
    ).toBe(200);
  });

  test('7. cleanup — delete test staff', async () => {
    if (!testStaffId) test.skip(true, 'No test staff to delete');

    const res = await adminCtx.delete(`/api/rc/staff/${testStaffId}`);
    expect([200, 204]).toContain(res.status());
    testStaffId = null;
  });
});
