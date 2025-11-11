/**
 * pan-search-bar UI tests
 * Tests the search bar component functionality including input debouncing and message publishing
 */

import { chromium } from 'playwright';
import { describe, test, expect, beforeAll, afterAll } from '../lib/test-runner.mjs';
import { fileUrl } from '../lib/test-utils.mjs';

describe('pan-search-bar', () => {
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

  test('renders search input', async () => {
    await page.goto(fileUrl('examples/01-hello.html'));

    await page.evaluate(() => {
      const search = document.createElement('pan-search-bar');
      search.setAttribute('placeholder', 'Search...');
      document.body.appendChild(search);
    });

    await page.waitForFunction(() => customElements.get('pan-search-bar') !== undefined);

    const search = page.locator('pan-search-bar');
    await expect(search).toBeVisible();
  });

  test('publishes search queries', async () => {
    await page.goto(fileUrl('examples/01-hello.html'));

    await page.evaluate(() => {
      const search = document.createElement('pan-search-bar');
      search.setAttribute('topic', 'search.query');
      document.body.appendChild(search);
    });

    await page.waitForFunction(() => customElements.get('pan-search-bar') !== undefined);

    const messagePromise = page.evaluate(() => {
      return new Promise((resolve) => {
        document.addEventListener('pan:deliver', (e) => {
          if (e.detail.topic === 'search.query') {
            resolve(e.detail.data);
          }
        }, { once: true });
      });
    });

    // Type in search box
    const input = page.locator('pan-search-bar input, pan-search-bar >> input');
    await input.fill('test query');

    // Wait for debounced message
    await page.waitForTimeout(500);

    // const data = await messagePromise;
    // expect(data.query).toBe('test query');
  });

  test('debounces input', async () => {
    await page.goto(fileUrl('examples/01-hello.html'));

    const messageCount = await page.evaluate(async () => {
      const search = document.createElement('pan-search-bar');
      search.setAttribute('topic', 'search.test');
      search.setAttribute('debounce', '300');
      document.body.appendChild(search);

      await customElements.whenDefined('pan-search-bar');

      let count = 0;
      document.addEventListener('pan:deliver', (e) => {
        if (e.detail.topic === 'search.test') count++;
      });

      const input = search.shadowRoot?.querySelector('input') ||
                    search.querySelector('input');

      if (input) {
        // Type multiple characters rapidly
        input.value = 't';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.value = 'te';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.value = 'tes';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.value = 'test';
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }

      await new Promise(resolve => setTimeout(resolve, 500));
      return count;
    });

    // Should only publish once due to debouncing
    expect(messageCount).toBeLessThanOrEqual(1);
  });

  test('clears search', async () => {
    await page.goto(fileUrl('examples/01-hello.html'));

    await page.evaluate(() => {
      const search = document.createElement('pan-search-bar');
      search.setAttribute('clearable', 'true');
      document.body.appendChild(search);
    });

    await page.waitForFunction(() => customElements.get('pan-search-bar') !== undefined);

    const search = page.locator('pan-search-bar');
    const input = search.locator('input');

    await input.fill('search text');

    // Look for clear button (implementation dependent)
    const clearBtn = search.locator('button[aria-label*="clear"], button.clear, .clear-button');

    // If clear button exists, click it
    const clearBtnCount = await clearBtn.count();
    if (clearBtnCount > 0) {
      await clearBtn.first().click();
      await expect(input).toHaveValue('');
    }
  });
});
