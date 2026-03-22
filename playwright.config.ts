import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'test-results/html' }],
  ],
  use: {
    baseURL: 'http://localhost:3200',
    screenshot: 'on',
    trace: 'on-first-retry',
    video: 'off',
    ...devices['Desktop Chrome'],
  },
  outputDir: 'test-results/artifacts',
  webServer: {
    command: 'npx next dev -p 3200',
    port: 3200,
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
