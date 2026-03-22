# Testing Patterns

**Analysis Date:** 2026-03-22

## Test Framework

**Runner:**
- Playwright v1.58.2 (E2E testing framework)
- Config: `playwright.config.ts` at project root
- No unit test framework detected (Jest, Vitest not in dependencies)
- No integration tests outside E2E suite

**Assertion Library:**
- Playwright's built-in assertions (`expect()`)
- No additional assertion libraries

**Run Commands:**
```bash
npx playwright test                    # Run all E2E tests
npx playwright test --headed          # Run with browser visible
npx playwright test --debug           # Debug mode with inspector
npx playwright show-report            # View HTML test report
npx playwright test tests/e2e/01-navigation.spec.ts  # Run specific suite
```

## Playwright Configuration

**Key Settings from `playwright.config.ts`:**
- Test directory: `./tests/e2e` — all E2E tests grouped here
- Single worker: `workers: 1` — tests run sequentially, not parallel
- No retries: `retries: 0` — failed tests not automatically retried
- Timeouts:
  - Global: `timeout: 30_000` (30 seconds per test)
  - Expect: `expect: { timeout: 10_000 }` (10 seconds for assertions)
- Base URL: `http://localhost:3200` (Next.js dev server)
- Screenshot capture: `screenshot: 'on'` — captures on every test
- Trace recording: `trace: 'on-first-retry'` (would be used if retries enabled)
- Video: `video: 'off'` — disabled
- Browser: Desktop Chrome via `devices['Desktop Chrome']`
- Reporter output: List format + HTML at `test-results/html/`
- Artifacts: `test-results/artifacts/`

**Web Server Configuration:**
- Auto-starts: `npx next dev -p 3200`
- Reuses existing server: `reuseExistingServer: true`
- Startup timeout: `timeout: 60_000` (60 seconds to start)

## Test File Organization

**Location:** `tests/e2e/` — all E2E tests in single directory
- `01-navigation.spec.ts` — sidebar, search, quick actions
- `02-dashboard.spec.ts` — dashboard stats, system status, settings
- `03-operations.spec.ts` — (not examined)
- ... `04-09` — other modules

**Naming:** Sequential number + feature name + `.spec.ts`
- Numbering enforces test execution order
- Names match feature areas (Racing, Cafe, Finance, etc.)

**Shared Utilities:** `helpers.ts` — common helper functions
- `navigateAndWait(page: Page, path: string)` — navigate + wait for hydration
- `dismissDevOverlay(page: Page)` — close Next.js error overlay if blocking

## Test Structure

**Suite Organization:**

```typescript
// From tests/e2e/01-navigation.spec.ts
import { test, expect } from '@playwright/test';
import { navigateAndWait } from './helpers';

/**
 * Navigation & Layout E2E Tests
 * Tests: sidebar links, Ctrl+K search, sidebar toggle, quick actions
 */

test.describe('Sidebar Navigation', () => {
  test('every sidebar link navigates to correct page', async ({ page }) => {
    // Test implementation
  });

  test('sidebar toggle collapses and expands', async ({ page }) => {
    // Test implementation
  });
});

test.describe('Search Modal (Ctrl+K)', () => {
  test('opens with Ctrl+K and closes with Escape', async ({ page }) => {
    // Test implementation
  });

  // More tests in describe block
});
```

**Patterns:**
- Each `.spec.ts` file has multiple `test.describe()` blocks
- Related tests grouped logically (e.g., all search tests together)
- File-level comment documents scope
- One test per feature/behavior
- Tests are independent and can run in any order within file (but files run sequentially)

## Navigation & Page Loading Pattern

**Standard Setup:**
```typescript
async function loadBookings() {
  setLoading(true);
  try {
    const params: Record<string, string> = {};
    if (search) params.search = search;
    const data = await api.getBookings(params);
    setBookings(data.bookings);
  } catch (err) {
    console.error('Failed to load bookings', err);
  }
  setLoading(false);
}

useEffect(() => { loadBookings(); }, [search, sourceFilter, statusFilter]);
```

**Test Helper Pattern:**
```typescript
/**
 * Navigate to a page and wait for React hydration.
 * Uses 'load' event then waits for sidebar to appear.
 * Dismisses Next.js dev error overlay if present.
 */
export async function navigateAndWait(page: Page, path: string) {
  await page.goto(path, { waitUntil: 'load', timeout: 30000 });
  // Wait for sidebar — indicates React client-side hydration complete
  await page.waitForSelector('aside', { timeout: 15000 });
  // Dismiss dev overlay if present
  await dismissDevOverlay(page);
}

// Usage in tests
await navigateAndWait(page, '/');
```

## Assertion Patterns

**Visibility Assertions:**
```typescript
// Wait for element with timeout
await expect(page.locator('h1', { hasText: 'Dashboard Overview' }))
  .toBeVisible({ timeout: 10000 });

// Assert not visible
await expect(searchInput).not.toBeVisible();
```

**URL Assertions:**
```typescript
// Check URL contains path
expect(page.url()).toContain('/hr');

// Wait for URL to match before asserting
await page.waitForURL('**/hr');
expect(page.url()).toContain('/hr');
```

**Locator Patterns:**
```typescript
// By text content
const link = page.locator(`aside a[href="${link.href}"]`);

// Multiple selectors with filters
const results = page.locator('.fixed a');
await expect(results.filter({ hasText: 'Bookings' })).toBeVisible();

// Input field by placeholder
const searchInput = page.locator('input[placeholder="Search pages..."]');
```

## Screenshot & Debugging

**Screenshot Capture:**
```typescript
// After test actions to document state
await page.screenshot({
  path: 'test-results/screenshots/nav-home.png'
});

// Full page screenshot
await page.screenshot({
  path: 'test-results/screenshots/dashboard-stats.png',
  fullPage: true
});
```

**Keyboard Input:**
```typescript
await page.keyboard.press('Control+k');  // Ctrl+K shortcut
await page.keyboard.press('Escape');      // Dismiss modal
```

**Wait Patterns:**
```typescript
// Wait for specific timeout
await page.waitForTimeout(300);

// Wait for selector to appear
const sidebarVisible = await page.waitForSelector('aside', { timeout: 5000 })
  .catch(() => null);

// Conditional wait - check if overlay visible
const visible = await overlay.isVisible({ timeout: 500 }).catch(() => false);
```

## Error Handling in Tests

**Try-Catch Pattern:**
```typescript
// From 01-navigation.spec.ts
const errors: string[] = [];
for (const link of ALL_NAV_LINKS) {
  try {
    await page.goto(link.href, { waitUntil: 'load', timeout: 30000 });
    const navLink = page.locator(`aside a[href="${link.href}"]`);
    await expect(navLink).toBeVisible({ timeout: 3000 });
  } catch (e) {
    errors.push(`${link.href}: ${(e as Error).message.slice(0, 80)}`);
  }
}
// Log errors but don't fail test for known app bugs
if (errors.length > 0) {
  console.log('Pages with issues (app bugs, not test bugs):', errors);
}
```

**Silent Failures:**
```typescript
// Catch and suppress errors, return null
await page.waitForSelector('aside', { timeout: 5000 }).catch(() => null);

// Optional assertion via conditional
if (sidebarVisible) {
  const navLink = page.locator(`aside a[href="${link.href}"]`);
  await expect(navLink).toBeVisible({ timeout: 3000 });
}
```

## Test Coverage

**Current Scope:**
- **E2E Tests Only:** Navigation, dashboard, operations, racing, marketing, cafe, finance, HR, AI modules
- **No Unit Tests:** No Jest/Vitest configuration found
- **No Integration Tests:** No API contract tests detected
- **No Mock/Stub:** Tests run against real running server

**Files with Tests:**
- `tests/e2e/01-navigation.spec.ts` — 140 lines, ~5 test suites
- `tests/e2e/02-dashboard.spec.ts` — 56 lines, ~3 test suites
- `tests/e2e/03-09.spec.ts` — Similar pattern per module

**No Coverage Requirements:** No coverage threshold configured in `playwright.config.ts`

## Data & Fixtures

**Test Data:**
- No fixture files or factory pattern detected
- Tests use real database with seeded data (from `src/lib/db.ts`)
- Hardcoded test data in navigation spec:
  ```typescript
  const ALL_NAV_LINKS = [
    { href: '/', label: 'Overview' },
    { href: '/analytics', label: 'Analytics' },
    // ... 35+ nav links
  ];
  ```

**Database State:**
- Tables initialized on first `getDb()` call
- Menu seeded with default items if empty
- No cleanup/teardown between tests
- Tests run against shared database state

## Known Testing Limitations

**Single Worker Mode:**
- `workers: 1` enforces sequential test execution
- Slower feedback loop for debugging
- No parallelization for CI speed

**No Retries:**
- `retries: 0` means flaky tests fail immediately
- No built-in resilience for timing issues

**Silent API Failures:**
- Some pages crash when API is down (sessions, wallet-transactions)
- Tests tolerate these with try-catch and logging
- Not ideal for reliability

**Development Mode Only:**
- Tests run against Next.js dev server
- No production build testing

## Running Tests Locally

```bash
# Start development server (if not already running)
npm run dev  # On port 3200

# In another terminal, run E2E tests
npx playwright test

# View results
npx playwright show-report
```

---

*Testing analysis: 2026-03-22*
