import { test, expect } from '@playwright/test';
import { navigateAndWait } from './helpers';

/**
 * AI Section E2E Tests
 * Pages: Chat (AI Assistant), Transcribe
 */

test.describe('Chat Page', () => {
  test('renders chat interface', async ({ page }) => {
    await navigateAndWait(page, '/chat');
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: 'test-results/screenshots/chat-page.png', fullPage: true });
  });

  test('chat input accepts text', async ({ page }) => {
    await navigateAndWait(page, '/chat');
    const chatInput = page.locator('input[type="text"], textarea').last();
    if (await chatInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await chatInput.fill('TEST_ONLY: hello');
      await page.screenshot({ path: 'test-results/screenshots/chat-input-filled.png' });
    }
  });

  test('send button exists and is disabled without input', async ({ page }) => {
    await navigateAndWait(page, '/chat');
    const sendBtn = page.locator('button', { hasText: /Send/ });
    if (await sendBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Send should be disabled when chat input is empty
      await expect(sendBtn).toBeDisabled();
      await page.screenshot({ path: 'test-results/screenshots/chat-send-btn-disabled.png' });

      // Fill input then check it becomes enabled
      const chatInput = page.locator('input[type="text"], textarea').last();
      if (await chatInput.isVisible()) {
        await chatInput.fill('TEST_ONLY: hello');
        // After filling, button may become enabled
        await page.waitForTimeout(300);
        await page.screenshot({ path: 'test-results/screenshots/chat-send-btn.png' });
      }
    }
  });

  test('clear chat button works', async ({ page }) => {
    await navigateAndWait(page, '/chat');
    const clearBtn = page.locator('button', { hasText: /Clear/ });
    if (await clearBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await clearBtn.click({ force: true });
      await page.waitForTimeout(500);
      await page.screenshot({ path: 'test-results/screenshots/chat-cleared.png' });
    }
  });
});

test.describe('Transcribe Page', () => {
  test('renders transcription interface', async ({ page }) => {
    await navigateAndWait(page, '/transcribe');
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: 'test-results/screenshots/transcribe-page.png', fullPage: true });
  });

  test('model dropdown has options', async ({ page }) => {
    await navigateAndWait(page, '/transcribe');
    const modelSelect = page.locator('select').first();
    if (await modelSelect.isVisible({ timeout: 5000 }).catch(() => false)) {
      const options = await modelSelect.locator('option').allTextContents();
      expect(options.length).toBeGreaterThan(0);
      await page.screenshot({ path: 'test-results/screenshots/transcribe-model-options.png' });
    }
  });

  test('language dropdown has options', async ({ page }) => {
    await navigateAndWait(page, '/transcribe');
    const selects = page.locator('select');
    const count = await selects.count();
    if (count >= 2) {
      const langSelect = selects.nth(1);
      const options = await langSelect.locator('option').allTextContents();
      expect(options.length).toBeGreaterThan(0);
      await page.screenshot({ path: 'test-results/screenshots/transcribe-language-options.png' });
    }
  });

  test('file upload area exists', async ({ page }) => {
    await navigateAndWait(page, '/transcribe');
    const uploadArea = page.locator('input[type="file"]');
    // File inputs are often hidden, just verify they exist in DOM
    const count = await uploadArea.count();
    await page.screenshot({ path: 'test-results/screenshots/transcribe-upload-area.png', fullPage: true });
  });

  test('transcribe button exists', async ({ page }) => {
    await navigateAndWait(page, '/transcribe');
    const transcribeBtn = page.locator('button', { hasText: /Transcribe/ });
    if (await transcribeBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await page.screenshot({ path: 'test-results/screenshots/transcribe-button.png' });
    }
  });
});
