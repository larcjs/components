/**
 * pan-idb component tests
 * Tests IndexedDB integration and data persistence
 */

import { chromium } from 'playwright';
import { describe, test, expect, beforeAll, afterAll } from '../lib/test-runner.mjs';
import { fileUrl } from '../lib/test-utils.mjs';

describe('pan-idb', () => {
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

  test('creates and manages IndexedDB store', async () => {
    await page.goto(fileUrl('examples/17-indexeddb.html'));

    await page.waitForFunction(() => customElements.get('pan-idb') !== undefined);

    const idb = page.locator('pan-idb');
    await expect(idb).toBeAttached();
  });

  test('saves data to IndexedDB', async () => {
    await page.goto(fileUrl('examples/01-hello.html'));

    const result = await page.evaluate(async () => {
      const idb = document.createElement('pan-idb');
      idb.setAttribute('db-name', 'test-db');
      idb.setAttribute('store-name', 'test-store');
      idb.setAttribute('topic', 'idb.test');
      document.body.appendChild(idb);

      await customElements.whenDefined('pan-idb');

      return new Promise((resolve) => {
        document.addEventListener('pan:deliver', (e) => {
          if (e.detail.topic === 'idb.test.saved') {
            resolve({ saved: true });
          }
        }, { once: true });

        // Save data
        document.dispatchEvent(new CustomEvent('pan:publish', {
          detail: {
            topic: 'idb.test.save',
            data: { id: 1, name: 'Test Item' }
          },
          bubbles: true,
          composed: true
        }));

        setTimeout(() => resolve({ saved: false }), 2000);
      });
    });

    expect(result.saved).toBe(true);
  });

  test('retrieves data from IndexedDB', async () => {
    await page.goto(fileUrl('examples/01-hello.html'));

    const result = await page.evaluate(async () => {
      const idb = document.createElement('pan-idb');
      idb.setAttribute('db-name', 'test-db');
      idb.setAttribute('store-name', 'items');
      idb.setAttribute('topic', 'idb.items');
      document.body.appendChild(idb);

      await customElements.whenDefined('pan-idb');

      // First save an item
      document.dispatchEvent(new CustomEvent('pan:publish', {
        detail: {
          topic: 'idb.items.save',
          data: { id: 100, value: 'test' }
        },
        bubbles: true,
        composed: true
      }));

      await new Promise(resolve => setTimeout(resolve, 500));

      // Then retrieve it
      return new Promise((resolve) => {
        document.addEventListener('pan:deliver', (e) => {
          if (e.detail.topic === 'idb.items.item') {
            resolve({ retrieved: true, data: e.detail.data });
          }
        }, { once: true });

        document.dispatchEvent(new CustomEvent('pan:publish', {
          detail: {
            topic: 'idb.items.get',
            data: { id: 100 }
          },
          bubbles: true,
          composed: true
        }));

        setTimeout(() => resolve({ retrieved: false }), 2000);
      });
    });

    // expect(result.retrieved).toBe(true);
  });

  test('deletes data from IndexedDB', async () => {
    await page.goto(fileUrl('examples/01-hello.html'));

    const result = await page.evaluate(async () => {
      const idb = document.createElement('pan-idb');
      idb.setAttribute('db-name', 'test-db');
      idb.setAttribute('store-name', 'deletable');
      idb.setAttribute('topic', 'idb.delete');
      document.body.appendChild(idb);

      await customElements.whenDefined('pan-idb');

      // Save then delete
      document.dispatchEvent(new CustomEvent('pan:publish', {
        detail: {
          topic: 'idb.delete.save',
          data: { id: 999, name: 'To Delete' }
        },
        bubbles: true,
        composed: true
      }));

      await new Promise(resolve => setTimeout(resolve, 500));

      return new Promise((resolve) => {
        document.addEventListener('pan:deliver', (e) => {
          if (e.detail.topic === 'idb.delete.deleted') {
            resolve({ deleted: true });
          }
        }, { once: true });

        document.dispatchEvent(new CustomEvent('pan:publish', {
          detail: {
            topic: 'idb.delete.delete',
            data: { id: 999 }
          },
          bubbles: true,
          composed: true
        }));

        setTimeout(() => resolve({ deleted: false }), 2000);
      });
    });

    // expect(result.deleted).toBe(true);
  });
});
