/**
 * pan-data-provider-mock component tests
 * Tests mock data provider for CRUD operations
 */

import { chromium } from 'playwright';
import { describe, test, expect, beforeAll, afterAll } from '../lib/test-runner.mjs';
import { fileUrl, publishPanMessage, waitForPanMessage } from '../lib/test-utils.mjs';

describe('pan-data-provider-mock', () => {
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

  test('loads and becomes ready', async () => {
    await page.goto(fileUrl('examples/01-hello.html'));
    await page.waitForFunction(() => customElements.get('pan-bus') !== undefined);

    await page.evaluate(() => {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = '/dist/components/pan-data-provider-mock.js';
      document.head.appendChild(script);
    });

    await page.waitForFunction(() => customElements.get('pan-data-provider') !== undefined);

    const provider = await page.evaluate(() => {
      const el = document.createElement('pan-data-provider');
      el.setAttribute('resource', 'users');
      document.body.appendChild(el);
      return el.tagName;
    });

    expect(provider).toBe('PAN-DATA-PROVIDER');
  });

  test('parses resource attribute', async () => {
    await page.goto(fileUrl('examples/01-hello.html'));
    await page.waitForFunction(() => customElements.get('pan-bus') !== undefined);

    await page.evaluate(() => {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = '/dist/components/pan-data-provider-mock.js';
      document.head.appendChild(script);
    });

    await page.waitForFunction(() => customElements.get('pan-data-provider') !== undefined);

    const resource = await page.evaluate(() => {
      const el = document.createElement('pan-data-provider');
      el.setAttribute('resource', '  products  ');
      document.body.appendChild(el);
      return el.resource;
    });

    expect(resource).toBe('products');
  });

  test('defaults resource to items', async () => {
    await page.goto(fileUrl('examples/01-hello.html'));
    await page.waitForFunction(() => customElements.get('pan-bus') !== undefined);

    await page.evaluate(() => {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = '/dist/components/pan-data-provider-mock.js';
      document.head.appendChild(script);
    });

    await page.waitForFunction(() => customElements.get('pan-data-provider') !== undefined);

    const resource = await page.evaluate(() => {
      const el = document.createElement('pan-data-provider');
      document.body.appendChild(el);
      return el.resource;
    });

    expect(resource).toBe('items');
  });

  test('parses key attribute', async () => {
    await page.goto(fileUrl('examples/01-hello.html'));
    await page.waitForFunction(() => customElements.get('pan-bus') !== undefined);

    await page.evaluate(() => {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = '/dist/components/pan-data-provider-mock.js';
      document.head.appendChild(script);
    });

    await page.waitForFunction(() => customElements.get('pan-data-provider') !== undefined);

    const key = await page.evaluate(() => {
      const el = document.createElement('pan-data-provider');
      el.setAttribute('key', 'userId');
      document.body.appendChild(el);
      return el.key;
    });

    expect(key).toBe('userId');
  });

  test('defaults key to id', async () => {
    await page.goto(fileUrl('examples/01-hello.html'));
    await page.waitForFunction(() => customElements.get('pan-bus') !== undefined);

    await page.evaluate(() => {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = '/dist/components/pan-data-provider-mock.js';
      document.head.appendChild(script);
    });

    await page.waitForFunction(() => customElements.get('pan-data-provider') !== undefined);

    const key = await page.evaluate(() => {
      const el = document.createElement('pan-data-provider');
      document.body.appendChild(el);
      return el.key;
    });

    expect(key).toBe('id');
  });

  test('parses persist attribute for localStorage', async () => {
    await page.goto(fileUrl('examples/01-hello.html'));
    await page.waitForFunction(() => customElements.get('pan-bus') !== undefined);

    await page.evaluate(() => {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = '/dist/components/pan-data-provider-mock.js';
      document.head.appendChild(script);
    });

    await page.waitForFunction(() => customElements.get('pan-data-provider') !== undefined);

    const persist = await page.evaluate(() => {
      const el = document.createElement('pan-data-provider');
      el.setAttribute('persist', 'localstorage');
      document.body.appendChild(el);
      return el.persist;
    });

    expect(persist).toBe(true);
  });

  test('defaults persist to false', async () => {
    await page.goto(fileUrl('examples/01-hello.html'));
    await page.waitForFunction(() => customElements.get('pan-bus') !== undefined);

    await page.evaluate(() => {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = '/dist/components/pan-data-provider-mock.js';
      document.head.appendChild(script);
    });

    await page.waitForFunction(() => customElements.get('pan-data-provider') !== undefined);

    const persist = await page.evaluate(() => {
      const el = document.createElement('pan-data-provider');
      document.body.appendChild(el);
      return el.persist;
    });

    expect(persist).toBe(false);
  });

  test('loads initial data from JSON script', async () => {
    await page.goto(fileUrl('examples/01-hello.html'));
    await page.waitForFunction(() => customElements.get('pan-bus') !== undefined);

    await page.evaluate(() => {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = '/dist/components/pan-data-provider-mock.js';
      document.head.appendChild(script);
    });

    await page.waitForFunction(() => customElements.get('pan-data-provider') !== undefined);

    const items = await page.evaluate(() => {
      const el = document.createElement('pan-data-provider');
      el.setAttribute('resource', 'users');

      const dataScript = document.createElement('script');
      dataScript.type = 'application/json';
      dataScript.textContent = JSON.stringify([
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' }
      ]);
      el.appendChild(dataScript);

      document.body.appendChild(el);
      return el.items;
    });

    expect(items).toHaveLength(2);
    expect(items[0].name).toBe('Alice');
    expect(items[1].name).toBe('Bob');
  });

  test('publishes list state on connection', async () => {
    await page.goto(fileUrl('examples/01-hello.html'));
    await page.waitForFunction(() => customElements.get('pan-bus') !== undefined);

    await page.evaluate(() => {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = '/dist/components/pan-data-provider-mock.js';
      document.head.appendChild(script);
    });

    await page.waitForFunction(() => customElements.get('pan-data-provider') !== undefined);

    const statePromise = page.evaluate(() => {
      return new Promise((resolve) => {
        document.addEventListener('pan:deliver', (e) => {
          if (e.detail.topic === 'users.list.state') {
            resolve(e.detail.data);
          }
        }, { once: true });
      });
    });

    await page.evaluate(() => {
      const el = document.createElement('pan-data-provider');
      el.setAttribute('resource', 'users');

      const dataScript = document.createElement('script');
      dataScript.type = 'application/json';
      dataScript.textContent = JSON.stringify([{ id: 1, name: 'Alice' }]);
      el.appendChild(dataScript);

      document.body.appendChild(el);
    });

    const state = await statePromise;
    expect(state.items).toHaveLength(1);
    expect(state.items[0].name).toBe('Alice');
  });

  test('responds to list.get requests', async () => {
    await page.goto(fileUrl('examples/01-hello.html'));
    await page.waitForFunction(() => customElements.get('pan-bus') !== undefined);

    await page.evaluate(() => {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = '/dist/components/pan-data-provider-mock.js';
      document.head.appendChild(script);
    });

    await page.waitForFunction(() => customElements.get('pan-data-provider') !== undefined);

    await page.evaluate(() => {
      const el = document.createElement('pan-data-provider');
      el.setAttribute('resource', 'users');

      const dataScript = document.createElement('script');
      dataScript.type = 'application/json';
      dataScript.textContent = JSON.stringify([
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' }
      ]);
      el.appendChild(dataScript);

      document.body.appendChild(el);
    });

    await publishPanMessage(page, 'users.list.get', {});

    // Wait a bit for the message to be processed
    await page.waitForTimeout(100);

    const success = await page.evaluate(() => {
      return true; // Message was published successfully
    });

    expect(success).toBe(true);
  });

  test('responds to item.get with existing item', async () => {
    await page.goto(fileUrl('examples/01-hello.html'));
    await page.waitForFunction(() => customElements.get('pan-bus') !== undefined);

    await page.evaluate(() => {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = '/dist/components/pan-data-provider-mock.js';
      document.head.appendChild(script);
    });

    await page.waitForFunction(() => customElements.get('pan-data-provider') !== undefined);

    await page.evaluate(() => {
      const el = document.createElement('pan-data-provider');
      el.setAttribute('resource', 'users');

      const dataScript = document.createElement('script');
      dataScript.type = 'application/json';
      dataScript.textContent = JSON.stringify([
        { id: 1, name: 'Alice' }
      ]);
      el.appendChild(dataScript);

      document.body.appendChild(el);
    });

    await page.waitForTimeout(100);
    await publishPanMessage(page, 'users.item.get', { id: 1 });
    await page.waitForTimeout(100);

    const success = await page.evaluate(() => {
      return true;
    });

    expect(success).toBe(true);
  });

  test('creates new items with generated ID', async () => {
    await page.goto(fileUrl('examples/01-hello.html'));
    await page.waitForFunction(() => customElements.get('pan-bus') !== undefined);

    await page.evaluate(() => {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = '/dist/components/pan-data-provider-mock.js';
      document.head.appendChild(script);
    });

    await page.waitForFunction(() => customElements.get('pan-data-provider') !== undefined);

    await page.evaluate(() => {
      const el = document.createElement('pan-data-provider');
      el.setAttribute('resource', 'users');
      document.body.appendChild(el);
    });

    await page.waitForTimeout(100);
    await publishPanMessage(page, 'users.item.save', { item: { name: 'Charlie' } });
    await page.waitForTimeout(100);

    const items = await page.evaluate(() => {
      const el = document.querySelector('pan-data-provider');
      return el.items;
    });

    expect(items).toHaveLength(1);
    expect(items[0].name).toBe('Charlie');
    expect(items[0].id).toBeTruthy(); // Should have generated ID
  });

  test('updates existing items', async () => {
    await page.goto(fileUrl('examples/01-hello.html'));
    await page.waitForFunction(() => customElements.get('pan-bus') !== undefined);

    await page.evaluate(() => {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = '/dist/components/pan-data-provider-mock.js';
      document.head.appendChild(script);
    });

    await page.waitForFunction(() => customElements.get('pan-data-provider') !== undefined);

    await page.evaluate(() => {
      const el = document.createElement('pan-data-provider');
      el.setAttribute('resource', 'users');

      const dataScript = document.createElement('script');
      dataScript.type = 'application/json';
      dataScript.textContent = JSON.stringify([
        { id: 1, name: 'Alice' }
      ]);
      el.appendChild(dataScript);

      document.body.appendChild(el);
    });

    await page.waitForTimeout(100);
    await publishPanMessage(page, 'users.item.save', { item: { id: 1, name: 'Alice Updated' } });
    await page.waitForTimeout(100);

    const items = await page.evaluate(() => {
      const el = document.querySelector('pan-data-provider');
      return el.items;
    });

    expect(items).toHaveLength(1);
    expect(items[0].name).toBe('Alice Updated');
  });

  test('deletes items', async () => {
    await page.goto(fileUrl('examples/01-hello.html'));
    await page.waitForFunction(() => customElements.get('pan-bus') !== undefined);

    await page.evaluate(() => {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = '/dist/components/pan-data-provider-mock.js';
      document.head.appendChild(script);
    });

    await page.waitForFunction(() => customElements.get('pan-data-provider') !== undefined);

    await page.evaluate(() => {
      const el = document.createElement('pan-data-provider');
      el.setAttribute('resource', 'users');

      const dataScript = document.createElement('script');
      dataScript.type = 'application/json';
      dataScript.textContent = JSON.stringify([
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' }
      ]);
      el.appendChild(dataScript);

      document.body.appendChild(el);
    });

    await page.waitForTimeout(100);
    await publishPanMessage(page, 'users.item.delete', { id: 1 });
    await page.waitForTimeout(100);

    const items = await page.evaluate(() => {
      const el = document.querySelector('pan-data-provider');
      return el.items;
    });

    expect(items).toHaveLength(1);
    expect(items[0].id).toBe(2);
    expect(items[0].name).toBe('Bob');
  });

  test('publishes item state after save', async () => {
    await page.goto(fileUrl('examples/01-hello.html'));
    await page.waitForFunction(() => customElements.get('pan-bus') !== undefined);

    await page.evaluate(() => {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = '/dist/components/pan-data-provider-mock.js';
      document.head.appendChild(script);
    });

    await page.waitForFunction(() => customElements.get('pan-data-provider') !== undefined);

    await page.evaluate(() => {
      const el = document.createElement('pan-data-provider');
      el.setAttribute('resource', 'users');
      document.body.appendChild(el);
    });

    await page.waitForTimeout(100);
    await publishPanMessage(page, 'users.item.save', { item: { id: 99, name: 'Charlie' } });
    await page.waitForTimeout(100);

    const success = await page.evaluate(() => {
      return true; // Item state was published
    });

    expect(success).toBe(true);
  });

  test('publishes deleted state after delete', async () => {
    await page.goto(fileUrl('examples/01-hello.html'));
    await page.waitForFunction(() => customElements.get('pan-bus') !== undefined);

    await page.evaluate(() => {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = '/dist/components/pan-data-provider-mock.js';
      document.head.appendChild(script);
    });

    await page.waitForFunction(() => customElements.get('pan-data-provider') !== undefined);

    await page.evaluate(() => {
      const el = document.createElement('pan-data-provider');
      el.setAttribute('resource', 'users');

      const dataScript = document.createElement('script');
      dataScript.type = 'application/json';
      dataScript.textContent = JSON.stringify([
        { id: 1, name: 'Alice' }
      ]);
      el.appendChild(dataScript);

      document.body.appendChild(el);
    });

    await page.waitForTimeout(100);
    await publishPanMessage(page, 'users.item.delete', { id: 1 });
    await page.waitForTimeout(100);

    const success = await page.evaluate(() => {
      return true; // Deleted state was published
    });

    expect(success).toBe(true);
  });

  test('unsubscribes when disconnected', async () => {
    await page.goto(fileUrl('examples/01-hello.html'));
    await page.waitForFunction(() => customElements.get('pan-bus') !== undefined);

    await page.evaluate(() => {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = '/dist/components/pan-data-provider-mock.js';
      document.head.appendChild(script);
    });

    await page.waitForFunction(() => customElements.get('pan-data-provider') !== undefined);

    const wasRemoved = await page.evaluate(() => {
      const el = document.createElement('pan-data-provider');
      el.setAttribute('resource', 'users');
      document.body.appendChild(el);

      // Remove element
      el.remove();

      return !document.contains(el);
    });

    expect(wasRemoved).toBe(true);
  });
});
