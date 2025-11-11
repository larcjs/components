/**
 * pan-theme-provider component tests
 * Tests the theme provider functionality including light/dark/auto modes
 */

import { chromium } from 'playwright';
import { describe, test, expect, beforeAll, afterAll } from '../lib/test-runner.mjs';
import { fileUrl, publishPanMessage } from '../lib/test-utils.mjs';

describe('pan-theme-provider', () => {
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

  test('loads and initializes correctly', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body>
        <pan-theme-provider theme="light"></pan-theme-provider>
        <script type="module" src="${fileUrl('dist/components/pan-theme-provider.js')}"></script>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-theme-provider') !== undefined);

    const providerExists = await page.evaluate(() => {
      return document.querySelector('pan-theme-provider') !== null;
    });
    expect(providerExists).toBeTruthy();
  });

  test('applies light theme correctly', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body>
        <pan-theme-provider theme="light"></pan-theme-provider>
        <script type="module" src="${fileUrl('dist/components/pan-theme-provider.js')}"></script>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-theme-provider') !== undefined);
    await page.waitForTimeout(100);

    const theme = await page.evaluate(() => {
      return document.documentElement.getAttribute('data-theme');
    });
    expect(theme).toBe('light');

    const colorScheme = await page.evaluate(() => {
      return document.documentElement.style.colorScheme;
    });
    expect(colorScheme).toBe('light');
  });

  test('applies dark theme correctly', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body>
        <pan-theme-provider theme="dark"></pan-theme-provider>
        <script type="module" src="${fileUrl('dist/components/pan-theme-provider.js')}"></script>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-theme-provider') !== undefined);
    await page.waitForTimeout(100);

    const theme = await page.evaluate(() => {
      return document.documentElement.getAttribute('data-theme');
    });
    expect(theme).toBe('dark');
  });

  test('handles auto theme based on system preference', async () => {
    await page.emulateMedia({ colorScheme: 'dark' });

    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body>
        <pan-theme-provider theme="auto"></pan-theme-provider>
        <script type="module" src="${fileUrl('dist/components/pan-theme-provider.js')}"></script>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-theme-provider') !== undefined);
    await page.waitForTimeout(100);

    const theme = await page.evaluate(() => {
      return document.documentElement.getAttribute('data-theme');
    });
    expect(theme).toBe('dark');
  });

  test('updates theme when attribute changes', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body>
        <pan-theme-provider theme="light"></pan-theme-provider>
        <script type="module" src="${fileUrl('dist/components/pan-theme-provider.js')}"></script>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-theme-provider') !== undefined);
    await page.waitForTimeout(100);

    // Change theme to dark
    await page.evaluate(() => {
      document.querySelector('pan-theme-provider').setAttribute('theme', 'dark');
    });
    await page.waitForTimeout(100);

    const theme = await page.evaluate(() => {
      return document.documentElement.getAttribute('data-theme');
    });
    expect(theme).toBe('dark');
  });

  test('setTheme method works correctly', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body>
        <pan-theme-provider theme="light"></pan-theme-provider>
        <script type="module" src="${fileUrl('dist/components/pan-theme-provider.js')}"></script>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-theme-provider') !== undefined);
    await page.waitForTimeout(100);

    await page.evaluate(() => {
      const provider = document.querySelector('pan-theme-provider');
      provider.setTheme('dark');
    });
    await page.waitForTimeout(100);

    const theme = await page.evaluate(() => {
      return document.documentElement.getAttribute('data-theme');
    });
    expect(theme).toBe('dark');
  });

  test('getTheme and getEffectiveTheme methods work correctly', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body>
        <pan-theme-provider theme="auto"></pan-theme-provider>
        <script type="module" src="${fileUrl('dist/components/pan-theme-provider.js')}"></script>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-theme-provider') !== undefined);
    await page.waitForTimeout(100);

    const result = await page.evaluate(() => {
      const provider = document.querySelector('pan-theme-provider');
      return {
        theme: provider.getTheme(),
        effective: provider.getEffectiveTheme(),
        system: provider.getSystemTheme()
      };
    });

    expect(result.theme).toBe('auto');
    expect(['light', 'dark'].includes(result.effective)).toBeTruthy();
    expect(['light', 'dark'].includes(result.system)).toBeTruthy();
  });

  test('dispatches theme-change custom event', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body>
        <pan-theme-provider theme="light"></pan-theme-provider>
        <script type="module" src="${fileUrl('dist/components/pan-theme-provider.js')}"></script>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-theme-provider') !== undefined);

    const eventPromise = page.evaluate(() => {
      return new Promise((resolve) => {
        document.addEventListener('theme-change', (e) => {
          resolve(e.detail);
        }, { once: true });

        // Trigger theme change
        setTimeout(() => {
          document.querySelector('pan-theme-provider').setTheme('dark');
        }, 50);
      });
    });

    const eventDetail = await eventPromise;
    expect(eventDetail.theme).toBe('dark');
    expect(eventDetail.effective).toBe('dark');
  });

  test('broadcasts theme.changed message via pan-bus', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body>
        <pan-bus></pan-bus>
        <pan-theme-provider theme="light"></pan-theme-provider>
        <script type="module" src="${fileUrl('dist/core/pan-bus.js')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-theme-provider.js')}"></script>
      </body>
      </html>
    `);

    await page.waitForFunction(() => {
      return customElements.get('pan-bus') !== undefined &&
             customElements.get('pan-theme-provider') !== undefined;
    });

    const messagePromise = page.evaluate(() => {
      return new Promise((resolve) => {
        document.addEventListener('pan:deliver', (e) => {
          if (e.detail.topic === 'theme.changed') {
            resolve(e.detail);
          }
        }, { once: true });

        // Trigger theme change
        setTimeout(() => {
          document.querySelector('pan-theme-provider').setTheme('dark');
        }, 50);
      });
    });

    const message = await messagePromise;
    expect(message.topic).toBe('theme.changed');
    expect(message.data.theme).toBe('dark');
    expect(message.data.effective).toBe('dark');
  });

  test('rejects invalid theme values', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body>
        <pan-theme-provider theme="light"></pan-theme-provider>
        <script type="module" src="${fileUrl('dist/components/pan-theme-provider.js')}"></script>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-theme-provider') !== undefined);
    await page.waitForTimeout(100);

    await page.evaluate(() => {
      const provider = document.querySelector('pan-theme-provider');
      provider.setTheme('invalid');
    });
    await page.waitForTimeout(100);

    // Theme should remain unchanged
    const theme = await page.evaluate(() => {
      return document.querySelector('pan-theme-provider').getTheme();
    });
    expect(theme).toBe('light');
  });

  test('responds to system theme changes when in auto mode', async () => {
    await page.emulateMedia({ colorScheme: 'light' });

    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body>
        <pan-theme-provider theme="auto"></pan-theme-provider>
        <script type="module" src="${fileUrl('dist/components/pan-theme-provider.js')}"></script>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-theme-provider') !== undefined);
    await page.waitForTimeout(100);

    let theme = await page.evaluate(() => {
      return document.documentElement.getAttribute('data-theme');
    });
    expect(theme).toBe('light');

    // Change system preference to dark
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.waitForTimeout(200);

    theme = await page.evaluate(() => {
      return document.documentElement.getAttribute('data-theme');
    });
    expect(theme).toBe('dark');
  });
});
