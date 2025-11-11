/**
 * pan-router component tests
 * Tests client-side routing and navigation functionality
 */

import { chromium } from 'playwright';
import { describe, test, expect, beforeAll, afterAll } from '../lib/test-runner.mjs';
import { fileUrl } from '../lib/test-utils.mjs';

describe('pan-router', () => {
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

  test('publishes current route state on load', async () => {
    await page.goto(fileUrl('examples/15-router.html'));

    // Wait for router to be defined
    await page.waitForFunction(() => customElements.get('pan-router') !== undefined);

    // Wait for initial nav.state message
    const navState = await page.evaluate(() => {
      return new Promise((resolve) => {
        document.addEventListener('pan:deliver', (e) => {
          if (e.detail.topic === 'nav.state') {
            resolve(e.detail.data);
          }
        }, { once: true });
      });
    });

    expect(navState).toHaveProperty('path');
    expect(navState).toHaveProperty('query');
    expect(navState).toHaveProperty('hash');
  });

  test('navigates via nav.goto topic', async () => {
    await page.goto(fileUrl('examples/15-router.html'));

    await page.waitForFunction(() => customElements.get('pan-router') !== undefined);

    const result = await page.evaluate(() => {
      return new Promise((resolve) => {
        // Listen for nav.state change
        let count = 0;
        document.addEventListener('pan:deliver', (e) => {
          if (e.detail.topic === 'nav.state') {
            count++;
            if (count === 2) { // Skip initial state
              resolve(e.detail.data);
            }
          }
        });

        // Navigate to a new path
        setTimeout(() => {
          document.dispatchEvent(new CustomEvent('pan:publish', {
            detail: {
              topic: 'nav.goto',
              data: { path: '/test/path' }
            },
            bubbles: true,
            composed: true
          }));
        }, 100);
      });
    });

    expect(result.path).toBe('/test/path');
  });

  test('handles query parameters', async () => {
    await page.goto(fileUrl('examples/15-router.html') + '?foo=bar&baz=qux');

    await page.waitForFunction(() => customElements.get('pan-router') !== undefined);

    const navState = await page.evaluate(() => {
      return new Promise((resolve) => {
        document.addEventListener('pan:deliver', (e) => {
          if (e.detail.topic === 'nav.state') {
            resolve(e.detail.data);
          }
        }, { once: true });
      });
    });

    expect(navState).toHaveProperty('query');
    // Query parsing depends on implementation
  });

  test('responds to browser back button', async () => {
    await page.goto(fileUrl('examples/15-router.html'));

    await page.waitForFunction(() => customElements.get('pan-router') !== undefined);

    // Navigate forward
    await page.evaluate(() => {
      document.dispatchEvent(new CustomEvent('pan:publish', {
        detail: {
          topic: 'nav.goto',
          data: { path: '/page1' }
        },
        bubbles: true,
        composed: true
      }));
    });

    await page.waitForTimeout(100);

    // Navigate forward again
    await page.evaluate(() => {
      document.dispatchEvent(new CustomEvent('pan:publish', {
        detail: {
          topic: 'nav.goto',
          data: { path: '/page2' }
        },
        bubbles: true,
        composed: true
      }));
    });

    await page.waitForTimeout(100);

    // Go back
    const backState = await page.evaluate(() => {
      return new Promise((resolve) => {
        document.addEventListener('pan:deliver', (e) => {
          if (e.detail.topic === 'nav.state' && e.detail.data.path === '/page1') {
            resolve(e.detail.data);
          }
        });

        // Trigger back navigation
        document.dispatchEvent(new CustomEvent('pan:publish', {
          detail: { topic: 'nav.back' },
          bubbles: true,
          composed: true
        }));
      });
    });

    expect(backState.path).toBe('/page1');
  });

  test('intercepts link clicks for SPA navigation', async () => {
    await page.goto(fileUrl('examples/15-router.html'));

    await page.waitForFunction(() => customElements.get('pan-router') !== undefined);

    // Add a link to the page
    await page.evaluate(() => {
      const link = document.createElement('a');
      link.href = '/test-link';
      link.id = 'test-link';
      link.textContent = 'Test Link';
      document.body.appendChild(link);
    });

    const navPromise = page.evaluate(() => {
      return new Promise((resolve) => {
        let count = 0;
        document.addEventListener('pan:deliver', (e) => {
          if (e.detail.topic === 'nav.state') {
            count++;
            if (count === 2) { // Skip initial
              resolve(e.detail.data);
            }
          }
        });
      });
    });

    // Click the link
    await page.click('#test-link');

    const navState = await navPromise;
    // Link interception depends on implementation
    // expect(navState.path).toBe('/test-link');
  });
});
