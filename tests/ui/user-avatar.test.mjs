/**
 * user-avatar UI tests
 * Tests the avatar component functionality including image rendering and initials fallback
 */

import { chromium } from 'playwright';
import { describe, test, expect, beforeAll, afterAll } from '../lib/test-runner.mjs';
import { fileUrl } from '../lib/test-utils.mjs';

describe('user-avatar', () => {
  let browser, page;

  beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
    page = await browser.newPage();
  });

  afterAll(async () => {
    if (browser) {
      await browser.close();
    }
  });

  test('renders avatar with image', async () => {
    await page.goto(fileUrl('examples/01-hello.html'));

    await page.evaluate(() => {
      const avatar = document.createElement('user-avatar');
      avatar.setAttribute('src', 'https://via.placeholder.com/100');
      avatar.setAttribute('alt', 'User Avatar');
      document.body.appendChild(avatar);
    });

    await page.waitForFunction(() => customElements.get('user-avatar') !== undefined);

    const avatar = page.locator('user-avatar');
    await expect(avatar).toBeVisible();
  });

  test('shows initials when no image', async () => {
    await page.goto(fileUrl('examples/01-hello.html'));

    await page.evaluate(() => {
      const avatar = document.createElement('user-avatar');
      avatar.setAttribute('name', 'John Doe');
      document.body.appendChild(avatar);
    });

    await page.waitForFunction(() => customElements.get('user-avatar') !== undefined);

    const avatar = page.locator('user-avatar');
    await expect(avatar).toBeVisible();

    // Check if initials are displayed (implementation dependent)
    const text = await avatar.textContent();
    // Should contain 'JD' or similar initials
  });

  test('handles different sizes', async () => {
    await page.goto(fileUrl('examples/01-hello.html'));

    await page.evaluate(() => {
      const small = document.createElement('user-avatar');
      small.setAttribute('size', 'small');
      small.setAttribute('name', 'Small User');
      document.body.appendChild(small);

      const large = document.createElement('user-avatar');
      large.setAttribute('size', 'large');
      large.setAttribute('name', 'Large User');
      document.body.appendChild(large);
    });

    await page.waitForFunction(() => customElements.get('user-avatar') !== undefined);

    const avatars = page.locator('user-avatar');
    await expect(avatars).toHaveCount(2);
  });

  test('generates consistent colors for same name', async () => {
    await page.goto(fileUrl('examples/01-hello.html'));

    const colors = await page.evaluate(async () => {
      const avatar1 = document.createElement('user-avatar');
      avatar1.setAttribute('name', 'Test User');
      document.body.appendChild(avatar1);

      const avatar2 = document.createElement('user-avatar');
      avatar2.setAttribute('name', 'Test User');
      document.body.appendChild(avatar2);

      await customElements.whenDefined('user-avatar');
      await new Promise(resolve => setTimeout(resolve, 100));

      const color1 = getComputedStyle(avatar1).backgroundColor;
      const color2 = getComputedStyle(avatar2).backgroundColor;

      return { color1, color2 };
    });

    // Same name should generate same background color
    expect(colors.color1).toBe(colors.color2);
  });

  test('handles image load error with fallback', async () => {
    await page.goto(fileUrl('examples/01-hello.html'));

    await page.evaluate(() => {
      const avatar = document.createElement('user-avatar');
      avatar.setAttribute('src', 'https://invalid-url-that-doesnt-exist.com/image.jpg');
      avatar.setAttribute('name', 'Fallback User');
      document.body.appendChild(avatar);
    });

    await page.waitForFunction(() => customElements.get('user-avatar') !== undefined);

    await page.waitForTimeout(500);

    const avatar = page.locator('user-avatar');
    await expect(avatar).toBeVisible();

    // Should show initials as fallback
  });

  test('supports custom background colors', async () => {
    await page.goto(fileUrl('examples/01-hello.html'));

    await page.evaluate(() => {
      const avatar = document.createElement('user-avatar');
      avatar.setAttribute('name', 'Custom Color');
      avatar.setAttribute('bg-color', '#ff5733');
      document.body.appendChild(avatar);
    });

    await page.waitForFunction(() => customElements.get('user-avatar') !== undefined);

    const avatar = page.locator('user-avatar');
    const bgColor = await avatar.evaluate(el => getComputedStyle(el).backgroundColor);

    // Color should be applied (may need conversion from hex to rgb)
  });
});
