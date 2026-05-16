import { defineConfig, devices } from '@playwright/test';

// Integration test config for the /api/rc/[...path] proxy chain.
// Uses port 3298 (avoiding 3200/3299 conflicts) and points RC_URL at the
// real cloud racecontrol on localhost:8080. NOT fully hermetic — depends
// on cloud RC being up. Full hermetic with mock RC is a follow-up.
//
// Why: MMA Q4 drift-prevention requires a journey-level integration test
// that gates CI. This test asserts admin -> proxy -> RC round-trip works
// end-to-end with a forged JWT cookie.

const TEST_JWT_SECRET = 'test-hermetic-secret-api-v1-proxy-smoke-do-not-use-in-prod';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/api-v1-proxy-smoke.spec.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:3298',
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
    ...devices['Desktop Chrome'],
  },
  outputDir: 'test-results/api-v1-proxy-artifacts',
  webServer: {
    command: 'npx next dev -p 3298',
    port: 3298,
    reuseExistingServer: false,
    timeout: 60_000,
    env: {
      RC_JWT_SECRET: TEST_JWT_SECRET,
      RC_URL: 'http://localhost:8080',
      NODE_ENV: 'development',
    },
  },
});

export { TEST_JWT_SECRET };
