import { defineConfig, devices } from '@playwright/test';

// Hermetic config for the auth-journey smoke test.
// Uses port 3299 to avoid conflict with pm2 racingpoint-web (port 3200).
// Sibling of playwright.smoke.config.ts — same hermetic shape, different port.

const TEST_JWT_SECRET = 'test-hermetic-secret-auth-journey-smoke-do-not-use-in-prod';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/auth-journey-smoke.spec.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:3299',
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
    ...devices['Desktop Chrome'],
  },
  outputDir: 'test-results/auth-journey-artifacts',
  webServer: {
    command: 'npx next dev -p 3299',
    port: 3299,
    reuseExistingServer: false,
    timeout: 60_000,
    env: {
      RC_JWT_SECRET: TEST_JWT_SECRET,
      RC_URL: 'http://127.0.0.1:65535',
      ADMIN_COMING_SOON_GATE: '',
      NODE_ENV: 'development',
    },
  },
});

export { TEST_JWT_SECRET };
