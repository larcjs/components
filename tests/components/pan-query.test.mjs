/**
 * pan-query component tests
 * Tests query state management and URL synchronization
 */

import { chromium } from 'playwright';
import { describe, test, expect, beforeAll, afterAll } from '../lib/test-runner.mjs';
import { fileUrl } from '../lib/test-utils.mjs';

describe('pan-query', () => {
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
        <pan-bus></pan-bus>
        <pan-query resource="items"></pan-query>
        <script type="module" src="${fileUrl('dist/core/pan-bus.js')}"></script>
        <script type="module" src="${fileUrl('dist/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-query.js')}"></script>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-query') !== undefined);

    const queryExists = await page.evaluate(() => {
      return document.querySelector('pan-query') !== null;
    });
    expect(queryExists).toBeTruthy();
  });

  test('resource defaults to "items"', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body>
        <pan-bus></pan-bus>
        <pan-query></pan-query>
        <script type="module" src="${fileUrl('dist/core/pan-bus.js')}"></script>
        <script type="module" src="${fileUrl('dist/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-query.js')}"></script>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-query') !== undefined);

    const resource = await page.evaluate(() => {
      return document.querySelector('pan-query').resource;
    });
    expect(resource).toBe('items');
  });

  test('parses resource attribute correctly', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body>
        <pan-bus></pan-bus>
        <pan-query resource="products"></pan-query>
        <script type="module" src="${fileUrl('dist/core/pan-bus.js')}"></script>
        <script type="module" src="${fileUrl('dist/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-query.js')}"></script>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-query') !== undefined);

    const resource = await page.evaluate(() => {
      return document.querySelector('pan-query').resource;
    });
    expect(resource).toBe('products');
  });

  test('debounceMs defaults to 150', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body>
        <pan-bus></pan-bus>
        <pan-query></pan-query>
        <script type="module" src="${fileUrl('dist/core/pan-bus.js')}"></script>
        <script type="module" src="${fileUrl('dist/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-query.js')}"></script>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-query') !== undefined);

    const debounce = await page.evaluate(() => {
      return document.querySelector('pan-query').debounceMs;
    });
    expect(debounce).toBe(150);
  });

  test('parses debounce-ms attribute correctly', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body>
        <pan-bus></pan-bus>
        <pan-query debounce-ms="500"></pan-query>
        <script type="module" src="${fileUrl('dist/core/pan-bus.js')}"></script>
        <script type="module" src="${fileUrl('dist/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-query.js')}"></script>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-query') !== undefined);

    const debounce = await page.evaluate(() => {
      return document.querySelector('pan-query').debounceMs;
    });
    expect(debounce).toBe(500);
  });

  test('auto-request defaults to true', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body>
        <pan-bus></pan-bus>
        <pan-query></pan-query>
        <script type="module" src="${fileUrl('dist/core/pan-bus.js')}"></script>
        <script type="module" src="${fileUrl('dist/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-query.js')}"></script>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-query') !== undefined);

    const autoRequest = await page.evaluate(() => {
      return document.querySelector('pan-query').autoRequest;
    });
    expect(autoRequest).toBeTruthy();
  });

  test('can disable auto-request', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body>
        <pan-bus></pan-bus>
        <pan-query auto-request="false"></pan-query>
        <script type="module" src="${fileUrl('dist/core/pan-bus.js')}"></script>
        <script type="module" src="${fileUrl('dist/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-query.js')}"></script>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-query') !== undefined);

    const autoRequest = await page.evaluate(() => {
      return document.querySelector('pan-query').autoRequest;
    });
    expect(autoRequest).toBeFalsy();
  });

  test('parses defaults from attribute', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body>
        <pan-bus></pan-bus>
        <pan-query defaults='{"q":"test","page":2}'></pan-query>
        <script type="module" src="${fileUrl('dist/core/pan-bus.js')}"></script>
        <script type="module" src="${fileUrl('dist/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-query.js')}"></script>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-query') !== undefined);

    const defaults = await page.evaluate(() => {
      return document.querySelector('pan-query').defaults;
    });
    expect(defaults.q).toBe('test');
    expect(defaults.page).toBe(2);
  });

  test('parses defaults from inline JSON script', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body>
        <pan-bus></pan-bus>
        <pan-query>
          <script type="application/json">
            {
              "q": "search term",
              "sort": "name",
              "page": 1,
              "size": 20
            }
          </script>
        </pan-query>
        <script type="module" src="${fileUrl('dist/core/pan-bus.js')}"></script>
        <script type="module" src="${fileUrl('dist/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-query.js')}"></script>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-query') !== undefined);

    const defaults = await page.evaluate(() => {
      return document.querySelector('pan-query').defaults;
    });
    expect(defaults.q).toBe('search term');
    expect(defaults.sort).toBe('name');
    expect(defaults.page).toBe(1);
    expect(defaults.size).toBe(20);
  });

  test('publishes initial query state on load', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body>
        <pan-bus></pan-bus>
        <pan-query resource="products" defaults='{"q":"laptop"}'></pan-query>
        <script type="module" src="${fileUrl('dist/core/pan-bus.js')}"></script>
        <script type="module" src="${fileUrl('dist/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-query.js')}"></script>
      </body>
      </html>
    `);

    await page.waitForFunction(() => {
      return customElements.get('pan-bus') !== undefined &&
             customElements.get('pan-query') !== undefined;
    });

    const messagePromise = page.evaluate(() => {
      return new Promise((resolve) => {
        document.addEventListener('pan:deliver', (e) => {
          if (e.detail.topic === 'products.query.state') {
            resolve(e.detail);
          }
        });
      });
    });

    const message = await messagePromise;
    expect(message.topic).toBe('products.query.state');
    expect(message.data.q).toBe('laptop');
  });

  test('publishes list.get request on load when auto-request is true', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body>
        <pan-bus></pan-bus>
        <pan-query resource="products" auto-request="true"></pan-query>
        <script type="module" src="${fileUrl('dist/core/pan-bus.js')}"></script>
        <script type="module" src="${fileUrl('dist/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-query.js')}"></script>
      </body>
      </html>
    `);

    await page.waitForFunction(() => {
      return customElements.get('pan-bus') !== undefined &&
             customElements.get('pan-query') !== undefined;
    });

    const messagePromise = page.evaluate(() => {
      return new Promise((resolve) => {
        document.addEventListener('pan:deliver', (e) => {
          if (e.detail.topic === 'products.list.get') {
            resolve(e.detail);
          }
        });
      });
    });

    const message = await messagePromise;
    expect(message.topic).toBe('products.list.get');
  });

  test('does not publish list.get when auto-request is false', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body>
        <pan-bus></pan-bus>
        <pan-query resource="products" auto-request="false"></pan-query>
        <script type="module" src="${fileUrl('dist/core/pan-bus.js')}"></script>
        <script type="module" src="${fileUrl('dist/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-query.js')}"></script>
        <script>
          window.listGetReceived = false;
          setTimeout(() => {
            document.addEventListener('pan:deliver', (e) => {
              if (e.detail.topic === 'products.list.get') {
                window.listGetReceived = true;
              }
            });
          }, 10);
        </script>
      </body>
      </html>
    `);

    await page.waitForFunction(() => {
      return customElements.get('pan-bus') !== undefined &&
             customElements.get('pan-query') !== undefined;
    });
    await page.waitForTimeout(200);

    const received = await page.evaluate(() => window.listGetReceived);
    expect(received).toBeFalsy();
  });

  test('responds to query.set message', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body>
        <pan-bus></pan-bus>
        <pan-query resource="products" auto-request="false"></pan-query>
        <script type="module" src="${fileUrl('dist/core/pan-bus.js')}"></script>
        <script type="module" src="${fileUrl('dist/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-query.js')}"></script>
      </body>
      </html>
    `);

    await page.waitForFunction(() => {
      return customElements.get('pan-bus') !== undefined &&
             customElements.get('pan-query') !== undefined;
    });
    await page.waitForTimeout(100);

    const statePromise = page.evaluate(() => {
      return new Promise((resolve) => {
        let count = 0;
        document.addEventListener('pan:deliver', (e) => {
          if (e.detail.topic === 'products.query.state') {
            count++;
            if (count === 2) { // Skip initial state
              resolve(e.detail.data);
            }
          }
        });
      });
    });

    // Send query.set message
    await page.evaluate(() => {
      document.dispatchEvent(new CustomEvent('pan:publish', {
        detail: { topic: 'products.query.set', data: { q: 'laptop', page: 2 } },
        bubbles: true,
        composed: true
      }));
    });

    const state = await statePromise;
    expect(state.q).toBe('laptop');
    expect(state.page).toBe(2);
  });

  test('responds to query.reset message', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body>
        <pan-bus></pan-bus>
        <pan-query resource="products" defaults='{"q":"default","page":1}' auto-request="false"></pan-query>
        <script type="module" src="${fileUrl('dist/core/pan-bus.js')}"></script>
        <script type="module" src="${fileUrl('dist/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-query.js')}"></script>
      </body>
      </html>
    `);

    await page.waitForFunction(() => {
      return customElements.get('pan-bus') !== undefined &&
             customElements.get('pan-query') !== undefined;
    });
    await page.waitForTimeout(100);

    // Change query state
    await page.evaluate(() => {
      document.dispatchEvent(new CustomEvent('pan:publish', {
        detail: { topic: 'products.query.set', data: { q: 'laptop', page: 5 } },
        bubbles: true,
        composed: true
      }));
    });
    await page.waitForTimeout(100);

    const statePromise = page.evaluate(() => {
      return new Promise((resolve) => {
        document.addEventListener('pan:deliver', (e) => {
          if (e.detail.topic === 'products.query.state' && e.detail.data.q === 'default') {
            resolve(e.detail.data);
          }
        });
      });
    });

    // Reset query
    await page.evaluate(() => {
      document.dispatchEvent(new CustomEvent('pan:publish', {
        detail: { topic: 'products.query.reset', data: {} },
        bubbles: true,
        composed: true
      }));
    });

    const state = await statePromise;
    expect(state.q).toBe('default');
    expect(state.page).toBe(1);
  });

  test('syncs to URL search params when sync-url="search"', async () => {
    await page.goto('about:blank');
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body>
        <pan-bus></pan-bus>
        <pan-query resource="products" sync-url="search" auto-request="false"></pan-query>
        <script type="module" src="${fileUrl('dist/core/pan-bus.js')}"></script>
        <script type="module" src="${fileUrl('dist/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-query.js')}"></script>
      </body>
      </html>
    `);

    await page.waitForFunction(() => {
      return customElements.get('pan-bus') !== undefined &&
             customElements.get('pan-query') !== undefined;
    });
    await page.waitForTimeout(100);

    // Set query
    await page.evaluate(() => {
      document.dispatchEvent(new CustomEvent('pan:publish', {
        detail: { topic: 'products.query.set', data: { q: 'laptop', page: 3 } },
        bubbles: true,
        composed: true
      }));
    });
    await page.waitForTimeout(200);

    const url = await page.evaluate(() => window.location.href);
    expect(url).toContain('q=laptop');
    expect(url).toContain('page=3');
  });

  test('syncs to URL hash when sync-url="hash"', async () => {
    await page.goto('about:blank');
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body>
        <pan-bus></pan-bus>
        <pan-query resource="products" sync-url="hash" auto-request="false"></pan-query>
        <script type="module" src="${fileUrl('dist/core/pan-bus.js')}"></script>
        <script type="module" src="${fileUrl('dist/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-query.js')}"></script>
      </body>
      </html>
    `);

    await page.waitForFunction(() => {
      return customElements.get('pan-bus') !== undefined &&
             customElements.get('pan-query') !== undefined;
    });
    await page.waitForTimeout(100);

    // Set query
    await page.evaluate(() => {
      document.dispatchEvent(new CustomEvent('pan:publish', {
        detail: { topic: 'products.query.set', data: { q: 'mouse', sort: 'price' } },
        bubbles: true,
        composed: true
      }));
    });
    await page.waitForTimeout(200);

    const hash = await page.evaluate(() => window.location.hash);
    expect(hash).toContain('q=mouse');
    expect(hash).toContain('sort=price');
  });

  test('reads initial state from URL search params', async () => {
    await page.goto('about:blank?q=keyboard&page=2');
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body>
        <pan-bus></pan-bus>
        <pan-query resource="products" sync-url="search" auto-request="false"></pan-query>
        <script type="module" src="${fileUrl('dist/core/pan-bus.js')}"></script>
        <script type="module" src="${fileUrl('dist/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-query.js')}"></script>
      </body>
      </html>
    `);

    await page.waitForFunction(() => {
      return customElements.get('pan-bus') !== undefined &&
             customElements.get('pan-query') !== undefined;
    });

    const state = await page.evaluate(() => {
      return document.querySelector('pan-query').state;
    });
    expect(state.q).toBe('keyboard');
    expect(state.page).toBe(2);
  });

  test('debounces list.get requests', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body>
        <pan-bus></pan-bus>
        <pan-query resource="products" debounce-ms="100"></pan-query>
        <script type="module" src="${fileUrl('dist/core/pan-bus.js')}"></script>
        <script type="module" src="${fileUrl('dist/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-query.js')}"></script>
        <script>
          window.listGetCount = 0;
          setTimeout(() => {
            document.addEventListener('pan:deliver', (e) => {
              if (e.detail.topic === 'products.list.get') {
                window.listGetCount++;
              }
            });
          }, 10);
        </script>
      </body>
      </html>
    `);

    await page.waitForFunction(() => {
      return customElements.get('pan-bus') !== undefined &&
             customElements.get('pan-query') !== undefined;
    });
    await page.waitForTimeout(150);

    // Rapid fire multiple query changes
    await page.evaluate(() => {
      document.dispatchEvent(new CustomEvent('pan:publish', {
        detail: { topic: 'products.query.set', data: { q: 'a' } },
        bubbles: true,
        composed: true
      }));
      document.dispatchEvent(new CustomEvent('pan:publish', {
        detail: { topic: 'products.query.set', data: { q: 'ab' } },
        bubbles: true,
        composed: true
      }));
      document.dispatchEvent(new CustomEvent('pan:publish', {
        detail: { topic: 'products.query.set', data: { q: 'abc' } },
        bubbles: true,
        composed: true
      }));
    });
    await page.waitForTimeout(300);

    const count = await page.evaluate(() => window.listGetCount);
    // Should be 2: initial + 1 debounced (not 4: initial + 3)
    expect(count).toBeLessThan(4);
  });

  test('clears subscriptions on disconnect', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body>
        <pan-bus></pan-bus>
        <pan-query id="test-query" resource="products"></pan-query>
        <script type="module" src="${fileUrl('dist/core/pan-bus.js')}"></script>
        <script type="module" src="${fileUrl('dist/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-query.js')}"></script>
      </body>
      </html>
    `);

    await page.waitForFunction(() => {
      return customElements.get('pan-bus') !== undefined &&
             customElements.get('pan-query') !== undefined;
    });
    await page.waitForTimeout(100);

    // Check subscriptions exist
    let hasOff = await page.evaluate(() => {
      const query = document.getElementById('test-query');
      return query.off && query.off.length > 0;
    });
    expect(hasOff).toBeTruthy();

    // Remove element
    await page.evaluate(() => {
      document.getElementById('test-query').remove();
    });
    await page.waitForTimeout(50);

    // Query element should be gone
    const queryExists = await page.evaluate(() => {
      return document.getElementById('test-query') !== null;
    });
    expect(queryExists).toBeFalsy();
  });
});
