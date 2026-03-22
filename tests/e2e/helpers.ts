import { Page } from '@playwright/test';

/**
 * Navigate to a page and wait for React hydration.
 * Uses 'load' event then waits for sidebar to appear.
 * Dismisses Next.js dev error overlay if present.
 */
export async function navigateAndWait(page: Page, path: string) {
  await page.goto(path, { waitUntil: 'load', timeout: 30000 });
  // Wait for sidebar — indicates React client-side hydration complete
  await page.waitForSelector('aside', { timeout: 15000 });
  // Dismiss dev overlay if present (nextjs-portal intercepts clicks)
  await dismissDevOverlay(page);
}

/**
 * Dismiss the Next.js dev error overlay if it's blocking interactions.
 */
export async function dismissDevOverlay(page: Page) {
  try {
    const overlay = page.locator('nextjs-portal');
    if (await overlay.isVisible({ timeout: 500 }).catch(() => false)) {
      // Try clicking the close/dismiss button or pressing Escape
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
    }
  } catch {
    // No overlay — continue
  }
}
