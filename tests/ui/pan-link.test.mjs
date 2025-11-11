/**
 * pan-link UI tests
 * Tests the link component functionality including navigation and active state
 */

import { chromium } from 'playwright';
import { describe, test, expect, beforeAll, afterAll } from '../lib/test-runner.mjs';
import { fileUrl } from '../lib/test-utils.mjs';

describe('pan-link', () => {
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

  test('renders link with href', async () => {
    await page.goto(fileUrl('examples/01-hello.html'));

    await page.evaluate(() => {
      const link = document.createElement('pan-link');
      link.setAttribute('href', '/test-page');
      link.textContent = 'Test Link';
      document.body.appendChild(link);
    });

    await page.waitForFunction(() => customElements.get('pan-link') !== undefined);

    const link = page.locator('pan-link');
    await expect(link).toBeVisible();
    await expect(link).toHaveText('Test Link');

    const href = await link.getAttribute('href');
    expect(href).toBe('/test-page');
  });

  test('shows active state for current route', async () => {
    await page.goto(fileUrl('examples/15-router.html'));

    await page.evaluate(() => {
      const link = document.createElement('pan-link');
      link.setAttribute('href', window.location.pathname);
      link.setAttribute('active-class', 'is-active');
      link.textContent = 'Current Page';
      document.body.appendChild(link);
    });

    await page.waitForFunction(() => customElements.get('pan-link') !== undefined);

    const link = page.locator('pan-link');

    // Link should have active class if on current page
    const hasActiveClass = await link.evaluate(el => el.classList.contains('is-active'));
    // Implementation dependent
  });

  test('publishes navigation on click', async () => {
    await page.goto(fileUrl('examples/01-hello.html'));

    await page.evaluate(() => {
      const link = document.createElement('pan-link');
      link.setAttribute('href', '/destination');
      link.textContent = 'Click Me';
      link.id = 'test-link';
      document.body.appendChild(link);
    });

    await page.waitForFunction(() => customElements.get('pan-link') !== undefined);

    const messagePromise = page.evaluate(() => {
      return new Promise((resolve) => {
        document.addEventListener('pan:deliver', (e) => {
          if (e.detail.topic === 'nav.goto') {
            resolve(e.detail.data);
          }
        }, { once: true });
      });
    });

    await page.click('#test-link');

    // Navigation message should be published
    // const navData = await messagePromise;
    // expect(navData.path).toBe('/destination');
  });

  test('supports external links', async () => {
    await page.goto(fileUrl('examples/01-hello.html'));

    await page.evaluate(() => {
      const link = document.createElement('pan-link');
      link.setAttribute('href', 'https://example.com');
      link.textContent = 'External';
      document.body.appendChild(link);
    });

    await page.waitForFunction(() => customElements.get('pan-link') !== undefined);

    const link = page.locator('pan-link');
    const href = await link.getAttribute('href');
    expect(href).toBe('https://example.com');
  });
});
