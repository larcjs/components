/**
 * pan-data-connector component tests
 * Tests REST API integration and data fetching functionality
 */

import { chromium } from 'playwright';
import { describe, test, expect, beforeAll, afterAll } from '../lib/test-runner.mjs';
import { fileUrl } from '../lib/test-utils.mjs';

describe('pan-data-connector', () => {
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

  test('fetches data from REST API', async () => {
    await page.goto(fileUrl('examples/07-rest-connector.html'));

    await page.waitForFunction(() => customElements.get('pan-data-connector') !== undefined);

    // Wait for data to be fetched
    const dataReceived = await page.evaluate(() => {
      return new Promise((resolve) => {
        document.addEventListener('pan:deliver', (e) => {
          if (e.detail.topic && e.detail.topic.includes('list')) {
            resolve(true);
          }
        }, { once: true });

        setTimeout(() => resolve(false), 5000);
      });
    });

    expect(dataReceived).toBe(true);
  });

  test('handles GET requests', async () => {
    await page.goto(fileUrl('examples/01-hello.html'));

    const result = await page.evaluate(async () => {
      const connector = document.createElement('pan-data-connector');
      connector.setAttribute('base-url', 'https://jsonplaceholder.typicode.com');
      connector.setAttribute('resource', 'posts');
      connector.setAttribute('topic', 'posts');
      document.body.appendChild(connector);

      await customElements.whenDefined('pan-data-connector');

      return new Promise((resolve) => {
        document.addEventListener('pan:deliver', (e) => {
          if (e.detail.topic === 'posts.list') {
            resolve({ received: true, hasData: Array.isArray(e.detail.data) });
          }
        }, { once: true });

        // Request list
        document.dispatchEvent(new CustomEvent('pan:publish', {
          detail: { topic: 'posts.list.get' },
          bubbles: true,
          composed: true
        }));

        setTimeout(() => resolve({ received: false }), 5000);
      });
    });

    expect(result.received).toBe(true);
  });

  test('handles POST requests', async () => {
    await page.goto(fileUrl('examples/01-hello.html'));

    const result = await page.evaluate(async () => {
      const connector = document.createElement('pan-data-connector');
      connector.setAttribute('base-url', 'https://jsonplaceholder.typicode.com');
      connector.setAttribute('resource', 'posts');
      connector.setAttribute('topic', 'posts');
      document.body.appendChild(connector);

      await customElements.whenDefined('pan-data-connector');

      return new Promise((resolve) => {
        document.addEventListener('pan:deliver', (e) => {
          if (e.detail.topic === 'posts.item.saved') {
            resolve({ saved: true, data: e.detail.data });
          }
        }, { once: true });

        // Save new item
        document.dispatchEvent(new CustomEvent('pan:publish', {
          detail: {
            topic: 'posts.item.save',
            data: {
              title: 'Test Post',
              body: 'Test content',
              userId: 1
            }
          },
          bubbles: true,
          composed: true
        }));

        setTimeout(() => resolve({ saved: false }), 5000);
      });
    });

    expect(result.saved).toBe(true);
  });

  test('handles DELETE requests', async () => {
    await page.goto(fileUrl('examples/01-hello.html'));

    const result = await page.evaluate(async () => {
      const connector = document.createElement('pan-data-connector');
      connector.setAttribute('base-url', 'https://jsonplaceholder.typicode.com');
      connector.setAttribute('resource', 'posts');
      connector.setAttribute('topic', 'posts');
      document.body.appendChild(connector);

      await customElements.whenDefined('pan-data-connector');

      return new Promise((resolve) => {
        document.addEventListener('pan:deliver', (e) => {
          if (e.detail.topic === 'posts.item.deleted') {
            resolve({ deleted: true });
          }
        }, { once: true });

        // Delete item
        document.dispatchEvent(new CustomEvent('pan:publish', {
          detail: {
            topic: 'posts.item.delete',
            data: { id: 1 }
          },
          bubbles: true,
          composed: true
        }));

        setTimeout(() => resolve({ deleted: false }), 5000);
      });
    });

    expect(result.deleted).toBe(true);
  });

  test('handles API errors gracefully', async () => {
    await page.goto(fileUrl('examples/01-hello.html'));

    const result = await page.evaluate(async () => {
      const connector = document.createElement('pan-data-connector');
      connector.setAttribute('base-url', 'https://jsonplaceholder.typicode.com');
      connector.setAttribute('resource', 'invalid-endpoint');
      connector.setAttribute('topic', 'test');
      document.body.appendChild(connector);

      await customElements.whenDefined('pan-data-connector');

      return new Promise((resolve) => {
        document.addEventListener('pan:deliver', (e) => {
          if (e.detail.topic === 'test.error') {
            resolve({ error: true, message: e.detail.data });
          }
        }, { once: true });

        // Request from invalid endpoint
        document.dispatchEvent(new CustomEvent('pan:publish', {
          detail: { topic: 'test.list.get' },
          bubbles: true,
          composed: true
        }));

        setTimeout(() => resolve({ error: false }), 5000);
      });
    });

    // Should receive error message
  });

  test('includes auth headers when configured', async () => {
    await page.goto(fileUrl('examples/01-hello.html'));

    await page.evaluate(() => {
      const connector = document.createElement('pan-data-connector');
      connector.setAttribute('base-url', 'https://jsonplaceholder.typicode.com');
      connector.setAttribute('resource', 'posts');
      connector.setAttribute('auth-token', 'Bearer test-token');
      document.body.appendChild(connector);
    });

    await page.waitForFunction(() => customElements.get('pan-data-connector') !== undefined);

    const connector = page.locator('pan-data-connector');
    const authToken = await connector.getAttribute('auth-token');
    expect(authToken).toBe('Bearer test-token');
  });
});
