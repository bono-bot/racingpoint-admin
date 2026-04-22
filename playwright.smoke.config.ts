import { defineConfig, devices } from '@playwright/test';

// Hermetic config for smoke tests that mock RC backend + forge admin JWT.
// Runs isolated dev server on port 3200 with a test-only JWT secret.
// Do not merge this secret with production; it exists so tests can sign a JWT
// that admin middleware (jose jwtVerify) will accept.
const TEST_JWT_SECRET = 'test-hermetic-secret-business-rules-smoke-do-not-use-in-prod';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/*-smoke.spec.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:3200',
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
    ...devices['Desktop Chrome'],
  },
  outputDir: 'test-results/smoke-artifacts',
  webServer: {
    command: 'npx next dev -p 3200',
    port: 3200,
    reuseExistingServer: false,
    timeout: 60_000,
    env: {
      RC_JWT_SECRET: TEST_JWT_SECRET,
      RC_URL: 'http://127.0.0.1:65535',
      NODE_ENV: 'development',
    },
  },
});

export { TEST_JWT_SECRET };
