/**
 * pan-sse component tests
 * Tests Server-Sent Events integration with pan-bus
 */

import { chromium } from 'playwright';
import { describe, test, expect, beforeAll, afterAll } from '../lib/test-runner.mjs';
import { fileUrl } from '../lib/test-utils.mjs';

describe('pan-sse', () => {
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
        <pan-sse src="/events"></pan-sse>
        <script type="module" src="${fileUrl('dist/core/pan-bus.js')}"></script>
        <script type="module" src="${fileUrl('dist/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-sse.js')}"></script>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-sse') !== undefined);

    const sseExists = await page.evaluate(() => {
      return document.querySelector('pan-sse') !== null;
    });
    expect(sseExists).toBeTruthy();
  });

  test('parses src attribute correctly', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body>
        <pan-bus></pan-bus>
        <pan-sse src="/api/events"></pan-sse>
        <script type="module" src="${fileUrl('dist/core/pan-bus.js')}"></script>
        <script type="module" src="${fileUrl('dist/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-sse.js')}"></script>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-sse') !== undefined);

    const src = await page.evaluate(() => {
      return document.querySelector('pan-sse').src;
    });
    expect(src).toBe('/api/events');
  });

  test('parses topics attribute correctly', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body>
        <pan-bus></pan-bus>
        <pan-sse src="/events" topics="user.* order.*"></pan-sse>
        <script type="module" src="${fileUrl('dist/core/pan-bus.js')}"></script>
        <script type="module" src="${fileUrl('dist/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-sse.js')}"></script>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-sse') !== undefined);

    const topics = await page.evaluate(() => {
      return document.querySelector('pan-sse').topics;
    });
    expect(topics).toHaveLength(2);
    expect(topics[0]).toBe('user.*');
    expect(topics[1]).toBe('order.*');
  });

  test('parses with-credentials attribute correctly', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body>
        <pan-bus></pan-bus>
        <pan-sse src="/events" with-credentials="true"></pan-sse>
        <script type="module" src="${fileUrl('dist/core/pan-bus.js')}"></script>
        <script type="module" src="${fileUrl('dist/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-sse.js')}"></script>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-sse') !== undefined);

    const withCreds = await page.evaluate(() => {
      return document.querySelector('pan-sse').withCredentials;
    });
    expect(withCreds).toBeTruthy();
  });

  test('with-credentials defaults to true', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body>
        <pan-bus></pan-bus>
        <pan-sse src="/events"></pan-sse>
        <script type="module" src="${fileUrl('dist/core/pan-bus.js')}"></script>
        <script type="module" src="${fileUrl('dist/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-sse.js')}"></script>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-sse') !== undefined);

    const withCreds = await page.evaluate(() => {
      return document.querySelector('pan-sse').withCredentials;
    });
    expect(withCreds).toBeTruthy();
  });

  test('parses backoff attribute correctly', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body>
        <pan-bus></pan-bus>
        <pan-sse src="/events" backoff="2000,30000"></pan-sse>
        <script type="module" src="${fileUrl('dist/core/pan-bus.js')}"></script>
        <script type="module" src="${fileUrl('dist/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-sse.js')}"></script>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-sse') !== undefined);

    const backoff = await page.evaluate(() => {
      return document.querySelector('pan-sse').backoff;
    });
    expect(backoff.min).toBe(2000);
    expect(backoff.max).toBe(30000);
  });

  test('backoff defaults to 1000,15000', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body>
        <pan-bus></pan-bus>
        <pan-sse src="/events"></pan-sse>
        <script type="module" src="${fileUrl('dist/core/pan-bus.js')}"></script>
        <script type="module" src="${fileUrl('dist/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-sse.js')}"></script>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-sse') !== undefined);

    const backoff = await page.evaluate(() => {
      return document.querySelector('pan-sse').backoff;
    });
    expect(backoff.min).toBe(1000);
    expect(backoff.max).toBe(15000);
  });

  test('parses persist-last-event attribute correctly', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body>
        <pan-bus></pan-bus>
        <pan-sse src="/events" persist-last-event="my-stream"></pan-sse>
        <script type="module" src="${fileUrl('dist/core/pan-bus.js')}"></script>
        <script type="module" src="${fileUrl('dist/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-sse.js')}"></script>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-sse') !== undefined);

    const persistKey = await page.evaluate(() => {
      return document.querySelector('pan-sse').persistKey;
    });
    expect(persistKey).toBe('my-stream');
  });

  test('constructs URL with topics parameter', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body>
        <pan-bus></pan-bus>
        <pan-sse src="http://localhost:3000/events" topics="user.login user.logout"></pan-sse>
        <script type="module" src="${fileUrl('dist/core/pan-bus.js')}"></script>
        <script type="module" src="${fileUrl('dist/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-sse.js')}"></script>
        <script>
          // Mock EventSource to test URL construction
          window.actualEventSourceUrl = null;
          const OriginalEventSource = window.EventSource;
          window.EventSource = class MockEventSource {
            constructor(url, options) {
              window.actualEventSourceUrl = url;
              return {
                addEventListener: () => {},
                close: () => {}
              };
            }
          };
        </script>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-sse') !== undefined);
    await page.waitForTimeout(100);

    const url = await page.evaluate(() => window.actualEventSourceUrl);
    expect(url).toContain('topics=user.login%2Cuser.logout');
  });

  test('constructs URL with lastEventId from localStorage', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body>
        <pan-bus></pan-bus>
        <pan-sse src="http://localhost:3000/events" persist-last-event="test-stream"></pan-sse>
        <script type="module" src="${fileUrl('dist/core/pan-bus.js')}"></script>
        <script type="module" src="${fileUrl('dist/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-sse.js')}"></script>
        <script>
          // Set lastEventId in localStorage
          localStorage.setItem('pan:sse:last:test-stream', 'event-123');

          // Mock EventSource to test URL construction
          window.actualEventSourceUrl = null;
          const OriginalEventSource = window.EventSource;
          window.EventSource = class MockEventSource {
            constructor(url, options) {
              window.actualEventSourceUrl = url;
              return {
                addEventListener: () => {},
                close: () => {}
              };
            }
          };
        </script>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-sse') !== undefined);
    await page.waitForTimeout(100);

    const url = await page.evaluate(() => window.actualEventSourceUrl);
    expect(url).toContain('lastEventId=event-123');
  });

  test('closes EventSource on disconnect', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body>
        <pan-bus></pan-bus>
        <pan-sse id="test-sse" src="/events"></pan-sse>
        <script type="module" src="${fileUrl('dist/core/pan-bus.js')}"></script>
        <script type="module" src="${fileUrl('dist/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-sse.js')}"></script>
        <script>
          window.eventSourceClosed = false;
          const OriginalEventSource = window.EventSource;
          window.EventSource = class MockEventSource {
            constructor(url, options) {
              return {
                addEventListener: () => {},
                close: () => { window.eventSourceClosed = true; }
              };
            }
          };
        </script>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-sse') !== undefined);
    await page.waitForTimeout(100);

    // Remove element
    await page.evaluate(() => {
      document.getElementById('test-sse').remove();
    });
    await page.waitForTimeout(100);

    const closed = await page.evaluate(() => window.eventSourceClosed);
    expect(closed).toBeTruthy();
  });

  test('restarts connection when src attribute changes', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body>
        <pan-bus></pan-bus>
        <pan-sse id="test-sse" src="http://localhost:3000/events1"></pan-sse>
        <script type="module" src="${fileUrl('dist/core/pan-bus.js')}"></script>
        <script type="module" src="${fileUrl('dist/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-sse.js')}"></script>
        <script>
          window.eventSourceUrls = [];
          const OriginalEventSource = window.EventSource;
          window.EventSource = class MockEventSource {
            constructor(url, options) {
              window.eventSourceUrls.push(url);
              return {
                addEventListener: () => {},
                close: () => {}
              };
            }
          };
        </script>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-sse') !== undefined);
    await page.waitForTimeout(100);

    // Change src
    await page.evaluate(() => {
      document.getElementById('test-sse').setAttribute('src', 'http://localhost:3000/events2');
    });
    await page.waitForTimeout(100);

    const urls = await page.evaluate(() => window.eventSourceUrls);
    expect(urls.length).toBe(2);
    expect(urls[0]).toContain('events1');
    expect(urls[1]).toContain('events2');
  });

  test('handles empty src gracefully', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body>
        <pan-bus></pan-bus>
        <pan-sse src=""></pan-sse>
        <script type="module" src="${fileUrl('dist/core/pan-bus.js')}"></script>
        <script type="module" src="${fileUrl('dist/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-sse.js')}"></script>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-sse') !== undefined);

    const es = await page.evaluate(() => {
      return document.querySelector('pan-sse').es;
    });
    expect(es).toBeNull();
  });

  test('enforces minimum backoff time', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body>
        <pan-bus></pan-bus>
        <pan-sse src="/events" backoff="50,100"></pan-sse>
        <script type="module" src="${fileUrl('dist/core/pan-bus.js')}"></script>
        <script type="module" src="${fileUrl('dist/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-sse.js')}"></script>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-sse') !== undefined);

    const backoff = await page.evaluate(() => {
      return document.querySelector('pan-sse').backoff;
    });
    // Should enforce minimum of 100ms
    expect(backoff.min).toBeGreaterThan(99);
  });

  test('ensures max backoff is greater than or equal to min', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body>
        <pan-bus></pan-bus>
        <pan-sse src="/events" backoff="5000,2000"></pan-sse>
        <script type="module" src="${fileUrl('dist/core/pan-bus.js')}"></script>
        <script type="module" src="${fileUrl('dist/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-sse.js')}"></script>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-sse') !== undefined);

    const backoff = await page.evaluate(() => {
      return document.querySelector('pan-sse').backoff;
    });
    expect(backoff.max).toBeGreaterThan(backoff.min - 1);
  });
});
